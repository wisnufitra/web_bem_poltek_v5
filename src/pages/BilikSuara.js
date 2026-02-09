import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { db, auth } from '../firebase/firebaseConfig';
import { doc, onSnapshot, runTransaction, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { logActivity } from '../utils/logActivity';
import { CheckCircle2, AlertCircle } from 'lucide-react'; // Menambahkan Icon agar lebih rapi

// --- Komponen Helper (CountdownTimer) ---
const CountdownTimer = React.memo(({ targetDate }) => {
    const calculateTimeLeft = () => {
        const difference = +new Date(targetDate) - +new Date();
        let timeLeft = {};
        if (difference > 0) {
            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            if (days > 0) timeLeft.Hari = days;
            timeLeft.Jam = Math.floor((difference / (1000 * 60 * 60)) % 24);
            timeLeft.Menit = Math.floor((difference / 1000 / 60) % 60);
            timeLeft.Detik = Math.floor((difference / 1000) % 60);
        }
        return timeLeft;
    };
    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
    useEffect(() => {
        if (!targetDate) return;
        const timer = setTimeout(() => setTimeLeft(calculateTimeLeft()), 1000);
        return () => clearTimeout(timer);
    });

    if (!Object.keys(timeLeft).length) return <div style={{...styles.countdown, color: '#ef4444'}}>Waktu Habis</div>;
    return (
        <div style={styles.countdown}>
            {Object.entries(timeLeft).map(([unit, value]) => (
                <div key={unit} style={styles.timerSegment}>
                    <span style={styles.timerNumber}>{String(value).padStart(2, '0')}</span>
                    <span style={styles.timerLabel}>{unit}</span>
                </div>
            ))}
        </div>
    );
});

const BilikSuara = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // Cek Mode Kiosk
    const kioskData = location.state?.kioskMode ? location.state.voterData : null;

    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [user, setUser] = useState(null);
    
    const [showVisiMisiModal, setShowVisiMisiModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [votedSuccessfully, setVotedSuccessfully] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const [now, setNow] = useState(new Date());
    
    const placeholderFoto = 'https://placehold.co/400x400/e2e8f0/475569?text=Foto';

    // --- Logic Styles Dinamis (Inti Perubahan) ---
    const containerStyle = useMemo(() => {
        if (kioskData) {
            // GAYA OFFLINE / KIOSK: Fullscreen Menutupi Navbar
            return {
                ...styles.page,
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                zIndex: 9999, // Layer paling atas
                overflowY: 'auto', // Tetap bisa scroll
                paddingTop: '40px'
            };
        } else {
            // GAYA ONLINE: Standard dengan Jarak Navbar
            return {
                ...styles.page,
                paddingTop: '50px' // Sesuaikan dengan tinggi Navbar website Anda
            };
        }
    }, [kioskData]);

    useEffect(() => {
        if (kioskData) {
            setUser({ uid: kioskData.uid, displayName: kioskData.nama });
        } else {
            const unsubscribeAuth = onAuthStateChanged(auth, currentUser => {
                if (currentUser) setUser(currentUser);
                else navigate('/login-pemilih');
            });
            return () => unsubscribeAuth();
        }
    }, [kioskData, navigate]);
        
    useEffect(() => {
        const eventDocRef = doc(db, 'pemilihan_events', eventId);
        const unsubscribeEvent = onSnapshot(eventDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const eventData = { 
                    id: docSnap.id, ...docSnap.data(),
                    tanggalMulai: docSnap.data().tanggalMulai?.toDate(),
                    tanggalSelesai: docSnap.data().tanggalSelesai?.toDate()
                };
                setEvent(eventData);
            }
            setLoading(false);
        });
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => { unsubscribeEvent(); clearInterval(timer); };
    }, [eventId]);

    useEffect(() => {
        if (votedSuccessfully) {
            const delay = kioskData ? 3000 : 5000;
            const timer = setTimeout(() => {
                if (kioskData) {
                    navigate(`/panitia/${eventId}/bilik-login`, { replace: true });
                } else {
                    navigate('/dashboard-pemilih');
                }
            }, delay);
            return () => clearTimeout(timer);
        }
    }, [votedSuccessfully, navigate, kioskData, eventId]);

    const voterAccess = useMemo(() => {
        if (!user || !event) return { canVote: false, hasVoted: false, reason: "Data tidak lengkap." };
        if (event.isOfflineMode && !kioskData) return { canVote: false, hasVoted: false, reason: "Pemilihan ini sedang dalam Mode Offline. Silakan menuju TPS." };
        const isListed = event.pemilih?.some(p => p.uid === user.uid);
        if (!isListed) return { canVote: false, hasVoted: false, reason: "Anda tidak terdaftar." };
        const hasVoted = event.pemilihInfo && event.pemilihInfo[user.uid]?.telahMemilih;
        return { canVote: true, hasVoted: !!hasVoted, reason: "" };
    }, [user, event, kioskData]);
    
    const computedStatus = useMemo(() => {
        if (!event) return 'loading';
        if (event.status === 'berlangsung' || event.status === 'selesai') return event.status;
        if (event.tanggalSelesai && now > event.tanggalSelesai) return 'selesai';
        if (event.tanggalMulai && now >= event.tanggalMulai) return 'berlangsung';
        return 'akan datang';
    }, [event, now]);

    const handleVote = async () => {
        setShowConfirmModal(false);
        setLoading(true);
        setErrorMessage(null);
        const eventDocRef = doc(db, 'pemilihan_events', eventId);
    
        try {
            await runTransaction(db, async (transaction) => {
                const eventDoc = await transaction.get(eventDocRef);
                if (!eventDoc.exists()) throw new Error("Event tidak ditemukan!");
                const currentEventData = eventDoc.data();
                const pemilihInfo = currentEventData.pemilihInfo || {};
                if (pemilihInfo[user.uid]?.telahMemilih) {
                    setVotedSuccessfully(true);
                    return;
                }
                const updates = {
                    [`pemilihInfo.${user.uid}.telahMemilih`]: true,
                    [`pemilihInfo.${user.uid}.via`]: kioskData ? 'kiosk' : 'online'
                };
                if (selectedCandidate.id !== 'abstain') {
                    const currentKandidatArray = currentEventData.kandidat || [];
                    const updatedKandidatArray = currentKandidatArray.map(k => {
                        if (k.id === selectedCandidate.id) return { ...k, suara: (k.suara || 0) + 1 };
                        return k;
                    });
                    updates.kandidat = updatedKandidatArray;
                }
                transaction.update(eventDocRef, updates);
            });

            if (kioskData && kioskData.tokenDocId) {
                try { await deleteDoc(doc(db, 'kiosk_tokens', kioskData.tokenDocId)); } catch (e) {}
            }
            await logActivity(`Memberikan suara untuk "${selectedCandidate.nama}" (${kioskData ? 'Via Kiosk' : 'Online'})`);
            setVotedSuccessfully(true);
        } catch (error) {
            setErrorMessage("Gagal menyimpan suara. Silakan coba lagi.");
            setLoading(false);
            setShowConfirmModal(true);
        }
    };

    if (loading || !user) return <div style={containerStyle}><p style={{textAlign:'center'}}>Memuat bilik suara...</p></div>;
    
    if (!event || !voterAccess.canVote) {
        return (
            <div style={containerStyle}>
                <div style={styles.messageCard}>
                    <AlertCircle size={48} color="#ef4444" style={{marginBottom: 16}} />
                    <h1 style={{color: '#ef4444', margin: 0}}>Akses Ditolak</h1>
                    <p style={{color: '#64748b', marginTop: 8}}>{voterAccess.reason || "Pemilihan tidak ditemukan."}</p>
                    {kioskData ? (
                        <button onClick={() => navigate(`/panitia/${eventId}/bilik-login`)} style={styles.button}>Kembali</button>
                    ) : (
                        <Link to="/dashboard-pemilih" style={styles.button}>Kembali ke Dasbor</Link>
                    )}
                </div>
            </div>
        );
    }
    
    if (voterAccess.hasVoted || votedSuccessfully) {
        return (
            <div style={containerStyle}>
                <div style={{...styles.messageCard, backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0'}}>
                    <CheckCircle2 size={64} color="#16a34a" style={{marginBottom: 16}} />
                    <h1 style={{color: '#166534', margin: 0}}>Terima Kasih!</h1>
                    <p style={{color: '#15803d', fontSize: '1.1rem'}}>Suara Anda telah berhasil direkam.</p>
                    <p style={{color: '#64748b', fontSize: '0.9rem', marginTop: 24}}>
                        {kioskData ? "Kembali ke menu utama dalam 3 detik..." : "Kembali ke dasbor dalam 5 detik..."}
                    </p>
                </div>
            </div>
        );
    }
    
    if (computedStatus !== 'berlangsung') return <div style={containerStyle}><div style={styles.messageCard}><h1>Voting Ditutup</h1><p>Sesi belum dibuka atau sudah berakhir.</p><Link to="/dashboard-pemilih" style={styles.button}>Kembali</Link></div></div>;

    return (
        // Menggunakan containerStyle yang dinamis (Fixed/Normal)
        <div style={containerStyle}>
            <div style={styles.container}>
                {/* HEADER */}
                <div style={styles.header}>
                    <div>
                        <h1 style={styles.pageTitle}>{event.namaEvent}</h1>
                        {kioskData ? (
                            <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px'}}>
                                <div style={{background: '#dbeafe', color: '#1e40af', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold'}}>MODE KIOSK</div>
                                <span style={{color: '#64748b'}}>Pemilih: <strong>{kioskData.nama}</strong></span>
                            </div>
                        ) : (
                            <p style={styles.pageSubtitle}>Penyelenggara: {event.ormawa}</p>
                        )}
                    </div>
                    {!kioskData && (
                        <div style={styles.countdownWrapper}>
                            <CountdownTimer targetDate={event.tanggalSelesai} />
                        </div>
                    )}
                </div>
                
                <p style={styles.instructionText}>Silakan tentukan pilihan Anda. Suara Anda bersifat rahasia.</p>
                
                {/* GRID KANDIDAT */}
                <div style={styles.grid}>
                    {event.kandidat.map((k, index) => (
                        <div key={k.id} style={selectedCandidate?.id === k.id ? styles.selectedCard : styles.candidateCard} onClick={() => setSelectedCandidate(k)} className="candidate-card">
                            {selectedCandidate?.id === k.id && <div style={styles.checkIcon}>✓</div>}
                            <img src={k.fotoUrl || placeholderFoto} alt={k.nama} style={styles.cardImage} />
                            <div style={styles.cardContent}>
                                <span style={styles.candidateNumber}>No. Urut {index + 1}</span>
                                <h4 style={styles.cardTitle}>{k.nama}</h4>
                                <button onClick={(e) => { e.stopPropagation(); setShowVisiMisiModal(true); setSelectedCandidate(k); }} style={styles.secondaryButton}>Visi & Misi</button>
                            </div>
                        </div>
                    ))}
                    {event.allowAbstain && (
                        <div key="abstain" style={selectedCandidate?.id === 'abstain' ? styles.selectedCard : styles.candidateCard} onClick={() => setSelectedCandidate({ id: 'abstain', nama: 'Abstain (Kotak Kosong)'})} className="candidate-card">
                            {selectedCandidate?.id === 'abstain' && <div style={styles.checkIcon}>✓</div>}
                            <div style={styles.abstainBox}>
                                <div style={{textAlign: 'center'}}>
                                    <div style={{width: '60px', height: '60px', border: '3px dashed #cbd5e1', borderRadius: '8px', margin: '0 auto 12px'}}></div>
                                    <span style={{color: '#94a3b8', fontWeight: '600'}}>Kotak Kosong</span>
                                </div>
                            </div>
                            <div style={styles.cardContent}>
                                <h4 style={styles.cardTitle}>Abstain</h4>
                                <p style={{color: '#64748b', fontSize: '0.8rem', margin: 0}}>Pilih ini jika tidak ingin memilih kandidat.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* TOMBOL KIRIM */}
                <div style={styles.submitContainer}>
                    <button onClick={() => setShowConfirmModal(true)} disabled={!selectedCandidate} style={!selectedCandidate ? styles.disabledButton : styles.primaryButton}>
                        {kioskData ? "Simpan Pilihan" : "Kirim Suara"}
                    </button>
                </div>

                {/* MODAL VISI MISI */}
                {showVisiMisiModal && selectedCandidate && (
                    <div style={styles.modalOverlay} onClick={() => setShowVisiMisiModal(false)}>
                        <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                            <div style={{display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px'}}>
                                {selectedCandidate.id !== 'abstain' && <img src={selectedCandidate.fotoUrl || placeholderFoto} alt={selectedCandidate.nama} style={{width: '60px', height: '60px', objectFit: 'cover', borderRadius: '50%'}}/>}
                                <div>
                                    <h3 style={{...styles.modalTitle, margin: 0}}>{selectedCandidate.nama}</h3>
                                    <span style={{fontSize: '0.85rem', color: '#64748b'}}>Detail Visi & Misi</span>
                                </div>
                            </div>
                            <div style={styles.visiMisiContent}><p style={{whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.6}}>{selectedCandidate.visiMisi}</p></div>
                            <div style={{...styles.modalActions, marginTop: '24px'}}>
                                <button onClick={() => setShowVisiMisiModal(false)} style={styles.primaryButton}>Tutup</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL KONFIRMASI */}
                {showConfirmModal && selectedCandidate && (
                    <div style={styles.modalOverlay}>
                        <div style={styles.modalContent}>
                            <h3 style={styles.modalTitle}>Konfirmasi Pilihan</h3>
                            <p style={styles.modalMessage}>Anda akan memberikan suara untuk:</p>
                            <div style={styles.confirmationBox}>
                                {selectedCandidate.id !== 'abstain' && <img src={selectedCandidate.fotoUrl || placeholderFoto} alt={selectedCandidate.nama} style={{width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '4px solid white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />}
                                <h2 style={{margin: '12px 0 0', color: '#1e293b', fontSize: '1.4rem'}}>{selectedCandidate.nama}</h2>
                                <p style={{margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem'}}>Pilihan ini tidak dapat diubah setelah dikirim.</p>
                            </div>

                            {errorMessage && <p style={styles.errorMessage}>{errorMessage}</p>}

                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '24px'}}>
                                <button onClick={() => { setShowConfirmModal(false); setErrorMessage(null); }} style={styles.secondaryButtonModal}>Batal</button>
                                <button onClick={handleVote} style={styles.primaryButton}>Ya, Kirim</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const styles = {
    // Page Style Dasar (Nanti dioverride oleh useMemo di atas)
    page: { fontFamily: "'Inter', sans-serif", background: '#f8fafc', minHeight: '100vh', padding: '20px', boxSizing: 'border-box' },
    
    container: { maxWidth: '1000px', margin: '0 auto' },
    header: { padding: '24px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' },
    pageTitle: { color: '#1e293b', fontSize: '1.5rem', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' },
    pageSubtitle: { color: '#64748b', fontSize: '0.95rem', margin: '4px 0 0 0' },
    countdownWrapper: { backgroundColor: '#f0f9ff', padding: '12px 20px', borderRadius: '12px', border: '1px solid #bae6fd' },
    countdown: { display: 'flex', gap: '16px', fontWeight: '600', fontSize: '0.9rem', color: '#0284c7' },
    timerSegment: { display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: '1' },
    timerNumber: { fontSize: '1.25rem', color: '#0369a1', fontWeight: '800' },
    timerLabel: { fontSize: '0.65rem', color: '#38bdf8', textTransform: 'uppercase', marginTop: '2px' },
    instructionText: { textAlign: 'center', color: '#64748b', fontSize: '1.1rem', marginBottom: '32px', fontWeight: '500' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' },
    candidateCard: { backgroundColor: 'white', border: '2px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s ease-in-out', position: 'relative' },
    selectedCard: { backgroundColor: 'white', border: '2px solid #2563eb', borderRadius: '16px', overflow: 'hidden', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s ease-in-out', transform: 'translateY(-8px)', boxShadow: '0 12px 24px rgba(37, 99, 235, 0.15)', position: 'relative' },
    checkIcon: { position: 'absolute', top: '12px', right: '12px', width: '32px', height: '32px', backgroundColor: '#2563eb', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold', zIndex: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
    cardImage: { 
        width: '100%', 
        // Card TETAP 3:4 (Konsisten)
        aspectRatio: '3/4', 
        
        // UBAH KE 'contain':
        // Artinya: Paksa seluruh gambar masuk ke dalam kotak.
        // Konsekuensinya: Akan ada ruang kosong (atas-bawah atau kiri-kanan) jika rasio gambar beda.
        objectFit: 'contain', 
        
        // Posisikan gambar di tengah-tengah kotak
        objectPosition: 'center', 
        
        // SANGAT PENTING: Beri warna background
        // Karena 'contain' menyisakan ruang kosong, warna ini yang akan mengisi ruang tersebut.
        // Gunakan warna yang senada dengan card (misal putih atau abu-abu sangat muda)
        backgroundColor: '#f8fafc', // Atau 'white'
        
        borderBottom: '1px solid #e2e8f0' 
    },
    cardContent: { padding: '20px' },
    candidateNumber: { display: 'inline-block', background: '#f1f5f9', padding: '4px 10px', borderRadius: '20px', color: '#475569', fontSize: '0.75rem', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase' },
    cardTitle: { margin: '0 0 16px', color: '#1e293b', fontSize: '1.25rem', fontWeight: '700', lineHeight: 1.3 },
    abstainBox: { aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderBottom: '1px solid #f1f5f9' },
    secondaryButton: { width: '100%', padding: '12px', backgroundColor: 'white', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem', transition: '0.2s' },
    submitContainer: { textAlign: 'center', marginTop: '40px', padding: '24px', backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)', borderTop: '1px solid #e2e8f0', position: 'sticky', bottom: 0, zIndex: 50 },
    primaryButton: { padding: '16px 48px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '1.1rem', transition: 'transform 0.1s', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)' },
    disabledButton: { padding: '16px 48px', backgroundColor: '#cbd5e1', color: '#94a3b8', border: 'none', borderRadius: '12px', cursor: 'not-allowed', fontWeight: '700', fontSize: '1.1rem' },
    
    // Modals
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' },
    modalContent: { backgroundColor: 'white', padding: '32px', borderRadius: '20px', maxWidth: '480px', width: '100%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto' },
    modalTitle: { margin: '0 0 12px 0', color: '#1e293b', fontSize: '1.5rem', fontWeight: '800', textAlign: 'center' },
    modalMessage: { margin: '0 0 24px 0', color: '#64748b', lineHeight: '1.6', textAlign: 'center' },
    modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '12px' },
    secondaryButtonModal: { padding: '14px 24px', backgroundColor: 'white', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '1rem' },
    errorMessage: { color: '#b91c1c', backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '12px', borderRadius: '8px', fontSize: '0.9rem', textAlign: 'center', marginTop: '16px' },
    visiMisiContent: { maxHeight: '50vh', overflowY: 'auto', padding: '20px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.95rem', color: '#334155' },
    confirmationBox: { textAlign: 'center', margin: '20px 0', padding: '24px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' },
    
    messageCard: { maxWidth: '500px', margin: '100px auto', padding: '40px', backgroundColor: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
    button: { textDecoration: 'none', display: 'inline-block', marginTop: '24px', padding: '12px 24px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '0.95rem' },
};

const styleSheet = document.createElement("style");
styleSheet.innerHTML = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  body { margin: 0; }
  .candidate-card:hover { transform: translateY(-8px); box-shadow: 0 12px 24px rgba(0,0,0,0.08); }
  button:active { transform: scale(0.98); }
`;
document.head.appendChild(styleSheet);

export default BilikSuara;