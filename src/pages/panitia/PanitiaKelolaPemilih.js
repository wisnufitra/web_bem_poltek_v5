// src/pages/panitia/PanitiaKelolaPemilih.js
import React, { useState, useEffect, useMemo } from 'react';
import { useEvent } from '../../layouts/PanitiaLayout';
import { db } from '../../firebase/firebaseConfig';
import { doc, updateDoc, collection, query, where, onSnapshot, deleteField } from 'firebase/firestore';
import { logActivity } from '../../utils/logActivity';
import { UserPlus, UserX, Search, ListFilter, Users, Inbox, ChevronLeft, ChevronRight, UserCheck } from 'lucide-react';

const prodiOptions = ["Semua", "Teknokimia Nuklir", "Elektronika Instrumentasi", "Elektro Mekanika"];
const ITEMS_PER_PAGE = 10;

// --- Komponen UI ---
const Toast = ({ message, clear }) => { useEffect(() => { const timer = setTimeout(clear, 3000); return () => clearTimeout(timer); }, [clear]); return <div className="toast">{message}</div>; };

const ConfirmationModal = ({ modalState, setModalState }) => {
    if (!modalState.isOpen) return null;
    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3 className="modal-title">{modalState.title}</h3>
                <p className="modal-message">{modalState.message}</p>
                <div className="modal-actions">
                    <button className="button button-secondary" onClick={() => setModalState({ isOpen: false })}>Batal</button>
                    <button className="button button-primary" style={{backgroundColor: '#dc2626'}} onClick={() => { modalState.onConfirm(); setModalState({ isOpen: false }); }}>
                        {modalState.confirmText || 'Konfirmasi'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const EmptyState = ({ message }) => (<div className="empty-state"><Inbox size={48} /><p>{message}</p></div>);
const SkeletonLoader = () => (<div className="skeleton-item"><div className="skeleton-line title"></div><div className="skeleton-line subtitle"></div></div>);
const PaginationControls = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;
    return (
        <div className="pagination">
            <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}><ChevronLeft size={16}/> Sebelumnya</button>
            <span>Halaman {currentPage} dari {totalPages}</span>
            <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>Berikutnya <ChevronRight size={16}/></button>
        </div>
    );
};

const PanitiaKelolaPemilih = () => {
    const { event, eventId } = useEvent();
    const [allVerifiedVoters, setAllVerifiedVoters] = useState([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [loading, setLoading] = useState({});
    const [searchTermTersedia, setSearchTermTersedia] = useState('');
    const [prodiFilterTersedia, setProdiFilterTersedia] = useState('Semua');
    const [searchTermEvent, setSearchTermEvent] = useState('');
    const [prodiFilterEvent, setProdiFilterEvent] = useState('Semua');
    const [angkatanFilterTersedia, setAngkatanFilterTersedia] = useState('Semua');
    const [angkatanFilterEvent, setAngkatanFilterEvent] = useState('Semua');
    const [toastMessage, setToastMessage] = useState('');
    const [modalState, setModalState] = useState({ isOpen: false });
    const [currentPageTersedia, setCurrentPageTersedia] = useState(1);
    const [currentPageEvent, setCurrentPageEvent] = useState(1);

    // --- (Semua logika dan fungsi lainnya tetap sama) ---
    useEffect(() => {
        const q = query(collection(db, 'voters'), where("status", "==", "approved"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setAllVerifiedVoters(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })));
            setInitialLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const availableAngkatan = useMemo(() => {
        const angkatanSet = new Set(
            allVerifiedVoters // Gunakan 'allVerifiedVoters' sebagai sumber
                .map(v => v.nim?.substring(2, 4)) // Ambil '23', '22', dll.
                .filter(Boolean) // Hapus undefined/null
        );
        const sortedAngkatan = Array.from(angkatanSet)
            .map(ang => `20${ang}`)
            .sort((a, b) => b.localeCompare(a)); // Urutkan terbaru dulu
        return ['Semua', ...sortedAngkatan];
    }, [allVerifiedVoters]);

    const { pemilihDiEvent, pemilihTersedia } = useMemo(() => {
        const pemilihDiEventIds = event.pemilih?.map(p => p.uid) || [];
        const pemilihDiEvent = (event.pemilih || []).filter(p => {
            const angkatanTahun = p.nim ? `20${p.nim.substring(2, 4)}` : null;
            const matchesAngkatan = angkatanFilterEvent === 'Semua' || angkatanTahun === angkatanFilterEvent;
            const matchesProdi = prodiFilterEvent === 'Semua' || p.prodi === prodiFilterEvent;
            const matchesSearch = p.nama.toLowerCase().includes(searchTermEvent.toLowerCase());
            return matchesAngkatan && matchesProdi && matchesSearch;
        });
        const pemilihTersedia = allVerifiedVoters.filter(voter => {
            const angkatanTahun = voter.nim ? `20${voter.nim.substring(2, 4)}` : null;
            const matchesAngkatan = angkatanFilterTersedia === 'Semua' || angkatanTahun === angkatanFilterTersedia;
            const matchesProdi = prodiFilterTersedia === 'Semua' || voter.prodi === prodiFilterTersedia;
            const matchesSearch = voter.namaLengkap.toLowerCase().includes(searchTermTersedia.toLowerCase()) || voter.email.toLowerCase().includes(searchTermTersedia.toLowerCase());
            const notInEvent = !pemilihDiEventIds.includes(voter.uid);
            return matchesAngkatan && matchesProdi && matchesSearch && notInEvent;
        });
        return { pemilihDiEvent, pemilihTersedia };
    }, [event.pemilih, allVerifiedVoters, searchTermTersedia, prodiFilterTersedia, searchTermEvent, prodiFilterEvent, angkatanFilterTersedia, angkatanFilterEvent]);
    
    const paginatedTersedia = useMemo(() => { const startIndex = (currentPageTersedia - 1) * ITEMS_PER_PAGE; return pemilihTersedia.slice(startIndex, startIndex + ITEMS_PER_PAGE); }, [pemilihTersedia, currentPageTersedia]);
    const paginatedEvent = useMemo(() => { const startIndex = (currentPageEvent - 1) * ITEMS_PER_PAGE; return pemilihDiEvent.slice(startIndex, startIndex + ITEMS_PER_PAGE); }, [pemilihDiEvent, currentPageEvent]);
    const totalPagesTersedia = Math.ceil(pemilihTersedia.length / ITEMS_PER_PAGE);
    const totalPagesEvent = Math.ceil(pemilihDiEvent.length / ITEMS_PER_PAGE);
    const showToast = (message) => setToastMessage(message);
    const handleTambahPemilihKeEvent = async (voter) => {
        setLoading(prev => ({...prev, [voter.uid]: true}));
        const newPemilih = { uid: voter.uid, nama: voter.namaLengkap, email: voter.email, prodi: voter.prodi, nim: voter.nim };
        const updatedPemilihList = [...(event.pemilih || []), newPemilih];
        try {
            const eventDocRef = doc(db, 'pemilihan_events', eventId);
            await updateDoc(eventDocRef, { pemilih: updatedPemilihList, [`pemilihInfo.${voter.uid}`]: { telahMemilih: false } });
            await logActivity(`Menambahkan pemilih ${voter.namaLengkap} ke event ${event.namaEvent}`);
            showToast(`${voter.namaLengkap} ditambahkan.`);
        } catch (error) { showToast("Gagal menambahkan pemilih."); } 
        finally { setLoading(prev => ({...prev, [voter.uid]: false})); }
    };
    const confirmTambahSemua = () => {
        if (pemilihTersedia.length === 0) return showToast("Tidak ada pemilih untuk ditambahkan.");
        setModalState({
            isOpen: true,
            title: 'Tambahkan Semua Pemilih?',
            message: `Anda akan menambahkan ${pemilihTersedia.length} pemilih hasil filter ke event ini. Lanjutkan?`,
            onConfirm: handleTambahSemua,
            confirmText: `Ya, Tambahkan (${pemilihTersedia.length})`
        });
    };

    const handleTambahSemua = async () => {
        setLoading(prev => ({...prev, all: true}));
        const pemilihBaru = pemilihTersedia.map(voter => ({
            uid: voter.uid,
            nama: voter.namaLengkap,
            email: voter.email,
            prodi: voter.prodi,
            nim: voter.nim
        }));
        const pemilihInfoUpdates = {};
        pemilihTersedia.forEach(voter => {
            pemilihInfoUpdates[`pemilihInfo.${voter.uid}`] = { telahMemilih: false };
        });
        const updatedPemilihList = [...(event.pemilih || []), ...pemilihBaru];
        
        try {
            const eventDocRef = doc(db, 'pemilihan_events', eventId);
            await updateDoc(eventDocRef, { 
                pemilih: updatedPemilihList,
                ...pemilihInfoUpdates
            });
            await logActivity(`Menambahkan ${pemilihTersedia.length} pemilih ke event ${event.namaEvent}`);
            showToast(`${pemilihTersedia.length} pemilih berhasil ditambahkan.`);
        } catch (error) {
            console.error("Add all voters error:", error);
            showToast("Gagal menambahkan semua pemilih.");
        } finally {
            setLoading(prev => ({...prev, all: false}));
        }
    };

    const confirmHapusPemilih = (voterId, voterName) => {
        setModalState({
            isOpen: true,
            title: 'Hapus Pemilih?',
            message: `Anda yakin ingin menghapus ${voterName} dari event ini?`,
            onConfirm: () => handleHapusPemilihDariEvent(voterId, voterName),
            confirmText: 'Ya, Hapus'
        });
    };

    const handleHapusPemilihDariEvent = async (voterId, voterName) => {
        const pemilihBaru = event.pemilih.filter(p => p.uid !== voterId);
        const pemilihInfoUpdates = { [`pemilihInfo.${voterId}`]: deleteField() };

        try {
            const eventDocRef = doc(db, 'pemilihan_events', eventId);
            await updateDoc(eventDocRef, { 
                pemilih: pemilihBaru,
                ...pemilihInfoUpdates
            });
            await logActivity(`Menghapus pemilih ${voterName} dari event ${event.namaEvent}`);
            showToast(`${voterName} dihapus dari event.`);
        } catch (error) {
            console.error("Remove voter error:", error);
            showToast("Gagal menghapus pemilih.");
        }
    };

    const confirmHapusSemuaFiltered = () => {
        // Cek dulu apakah ada pemilih yang terfilter
        if (pemilihDiEvent.length === 0) {
            showToast("Tidak ada pemilih terfilter untuk dihapus.");
            return;
        }
        setModalState({
            isOpen: true,
            title: 'Hapus Semua Pemilih Terfilter?',
            message: `Anda akan menghapus ${pemilihDiEvent.length} pemilih hasil filter dari event ini. Lanjutkan?`,
            onConfirm: handleHapusSemuaFiltered,
            confirmText: `Ya, Hapus (${pemilihDiEvent.length})`
        });
    };

    const handleHapusSemuaFiltered = async () => {
        // Gunakan key 'removeFiltered' untuk state loading
        setLoading(prev => ({...prev, removeFiltered: true}));
        
        // 1. Dapatkan daftar UID yang akan dihapus dari pemilih YANG SUDAH TERFILTER
        const uidsToRemove = new Set(pemilihDiEvent.map(p => p.uid));
        
        // 2. Buat array pemilih baru dengan memfilter dari 'event.pemilih' (data ASLI event)
        const pemilihBaru = event.pemilih.filter(p => !uidsToRemove.has(p.uid));
        
        // 3. Siapkan update untuk menghapus data 'pemilihInfo'
        const pemilihInfoUpdates = {};
        uidsToRemove.forEach(uid => {
            pemilihInfoUpdates[`pemilihInfo.${uid}`] = deleteField();
        });

        try {
            const eventDocRef = doc(db, 'pemilihan_events', eventId);
            await updateDoc(eventDocRef, { 
                pemilih: pemilihBaru,
                ...pemilihInfoUpdates
            });
            await logActivity(`Menghapus ${pemilihDiEvent.length} pemilih terfilter dari event ${event.namaEvent}`);
            showToast(`${pemilihDiEvent.length} pemilih berhasil dihapus.`);
            setCurrentPageEvent(1); // Reset halaman ke 1 setelah hapus
        } catch (error) {
            console.error("Remove filtered voters error:", error);
            showToast("Gagal menghapus pemilih terfilter.");
        } finally {
            setLoading(prev => ({...prev, removeFiltered: false}));
        }
    };

    return (
        <div className="manage-voters-page">
            {toastMessage && <Toast message={toastMessage} clear={() => setToastMessage('')} />}
            <ConfirmationModal modalState={modalState} setModalState={setModalState} />

            <header className="page-header">
                <div>
                    <h1 className="page-title">Kelola Daftar Pemilih</h1>
                    <p className="page-subtitle">Tambahkan atau hapus pemilih yang berhak memberikan suara dalam event ini.</p>
                </div>
            </header>

            <div className="main-grid">
                <div className="card">
                    <h3 className="card-title"><Users size={18} /> Pemilih Tersedia ({pemilihTersedia.length})</h3>
                    <div className="filter-container">
                        <div className="input-with-icon"><Search size={16} /><input className="input" value={searchTermTersedia} onChange={(e) => {setSearchTermTersedia(e.target.value); setCurrentPageTersedia(1);}} placeholder="Cari nama atau email..." /></div>
                        <div className="input-with-icon"><ListFilter size={16} /><select className="input" value={prodiFilterTersedia} onChange={(e) => {setProdiFilterTersedia(e.target.value); setCurrentPageTersedia(1);}}>{prodiOptions.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                        <div className="input-with-icon">
                            <ListFilter size={16} />
                            <select className="input" value={angkatanFilterTersedia} onChange={(e) => {setAngkatanFilterTersedia(e.target.value); setCurrentPageTersedia(1);}}>
                                {availableAngkatan.map(y => <option key={y} value={y}>{y === 'Semua' ? 'Semua Angkatan' : y}</option>)}
                            </select>
                        </div>
                    </div>
                    <button onClick={confirmTambahSemua} className="button button-primary" disabled={loading.all || pemilihTersedia.length === 0}>
                        {loading.all ? 'Menambahkan...' : <><UserPlus size={16} /> Tambah Semua Hasil Filter</>}
                    </button>
                    <div className="voter-list">
                        {initialLoading ? [...Array(5)].map((_, i) => <SkeletonLoader key={i} />)
                         : paginatedTersedia.length > 0 ? paginatedTersedia.map(voter => (
                            <div key={voter.uid} className="voter-item">
                                <div>
                                    <p className="voter-name">{voter.namaLengkap}</p>
                                    <p className="voter-detail">{voter.nim} • {voter.prodi}</p>
                                </div>
                                <button onClick={() => handleTambahPemilihKeEvent(voter)} className="button-icon green" disabled={loading[voter.uid]}>
                                    {loading[voter.uid] ? '...' : <UserPlus size={16} />}
                                </button>
                            </div>
                         ))
                         : <EmptyState message="Tidak ada pemilih tersedia." />}
                    </div>
                    <PaginationControls currentPage={currentPageTersedia} totalPages={totalPagesTersedia} onPageChange={setCurrentPageTersedia} />
                </div>
                <div className="card">
                    <h3 className="card-title"><UserCheck size={18} /> Pemilih di Event Ini ({pemilihDiEvent.length})</h3>
                    <div className="filter-container">
                        <div className="input-with-icon"><Search size={16} /><input className="input" value={searchTermEvent} onChange={(e) => {setSearchTermEvent(e.target.value); setCurrentPageEvent(1);}} placeholder="Cari nama..." /></div>
                        <div className="input-with-icon"><ListFilter size={16} /><select className="input" value={prodiFilterEvent} onChange={(e) => {setProdiFilterEvent(e.target.value); setCurrentPageEvent(1);}}>{prodiOptions.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                        <div className="input-with-icon">
                            <ListFilter size={16} />
                            <select className="input" value={angkatanFilterEvent} onChange={(e) => {setAngkatanFilterEvent(e.target.value); setCurrentPageEvent(1);}}>
                                {availableAngkatan.map(y => <option key={y} value={y}>{y === 'Semua' ? 'Semua Angkatan' : y}</option>)}
                            </select>
                        </div>
                    </div>

                    <button 
                        onClick={confirmHapusSemuaFiltered} 
                        className="button button-primary" // Tombol 'primary' tapi kita beri style merah
                        style={{backgroundColor: '#dc2626'}} // Style merah
                        disabled={loading.removeFiltered || pemilihDiEvent.length === 0}
                    >
                        {loading.removeFiltered ? 'Menghapus...' : (
                            <><UserX size={16} /> Hapus Semua Hasil Filter ({pemilihDiEvent.length})</>
                        )}
                    </button>

                    <div className="voter-list">
                        {event.pemilih?.length > 0 ? (
                            paginatedEvent.length > 0 ? paginatedEvent.map(p => (
                                <div key={p.uid} className="voter-item">
                                    <div>
                                        <p className="voter-name">{p.nama}</p>
                                        <p className="voter-detail">{p.prodi}</p>
                                    </div>
                                    <button onClick={() => confirmHapusPemilih(p.uid, p.nama)} className="button-icon red">
                                        <UserX size={16} />
                                    </button>
                                </div>
                            )) : <EmptyState message="Tidak ada pemilih yang cocok dengan filter." />
                        ) : (
                            <EmptyState message="Belum ada pemilih di event ini." />
                        )}
                    </div>
                    <PaginationControls currentPage={currentPageEvent} totalPages={totalPagesEvent} onPageChange={setCurrentPageEvent} />
                </div>
            </div>
        </div>
    );
};

const styleSheet = document.createElement("style");
styleSheet.innerHTML = `
    .manage-voters-page { font-family: 'Inter', sans-serif; }
    .page-header { margin-bottom: 24px; }
    .page-title { color: #1e293b; font-size: 1.75rem; font-weight: 700; margin: 0; }
    .page-subtitle { color: #64748b; font-size: 1rem; margin: 4px 0 0 0; }
    .main-grid { display: grid; grid-template-columns: 1fr; gap: 24px; }
    .card { background-color: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); display: flex; flex-direction: column; }
    .card-title { margin: 0 0 16px 0; color: #1e293b; font-size: 1.25rem; font-weight: 600; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px; display: flex; align-items: center; gap: 8px; }
    .filter-container { display: grid; grid-template-columns: 1fr; gap: 12px; margin-bottom: 0; }
    .input-with-icon { position: relative; }
    .input-with-icon svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #9ca3af; }
    .input { width: 100%; box-sizing: border-box; padding: 10px 12px 10px 40px; border-radius: 8px; border: 1px solid #cbd5e0; font-size: 0.9rem; background-color: white; }
    .button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.9rem; text-decoration: none; border: 1px solid transparent; transition: all 0.2s; width: 100%; }
    .button-primary { background-color: #1d4ed8; color: white; }
    .button:disabled { background-color: #94a3b8; color: #e2e8f0; cursor: not-allowed; }
    .voter-list { margin-top: 16px; flex-grow: 1; overflow-y: auto; max-height: 50vh; min-height: 200px; padding-right: 8px; }
    .voter-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
    .voter-item:last-child { border-bottom: none; }
    .voter-name { margin: 0; font-weight: 600; color: #1e293b; }
    .voter-detail { margin: 4px 0 0; font-size: 0.85rem; color: #64748b; }
    .button-icon { padding: 8px; border-radius: 6px; cursor: pointer; font-weight: 600; border: 1px solid; display: flex; align-items: center; justify-content: center; }
    .button-icon.green { background-color: #dcfce7; color: #166534; border-color: #86efac; }
    .button-icon.red { background-color: #fee2e2; color: #991b1b; border-color: #fca5a5; }
    .button-icon:disabled { background-color: #e2e8f0; color: #94a3b8; border-color: #cbd5e0; }
    .empty-state { text-align: center; color: #9ca3b8; padding: 40px 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .empty-state svg { color: #cbd5e0; margin-bottom: 16px; }
    .empty-state p { font-size: 0.9rem; font-weight: 500; margin: 0; }
    .skeleton-item { padding: 12px; }
    .skeleton-line { background-color: #e2e8f0; border-radius: 4px; animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    .skeleton-line.title { height: 20px; width: 60%; margin-bottom: 8px; }
    .skeleton-line.subtitle { height: 14px; width: 80%; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .pagination { display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1px solid #f1f5f9; color: #64748b; font-size: 0.9rem; margin-top: auto; }
    .pagination button { display: inline-flex; align-items: center; gap: 4px; padding: 8px 12px; background-color: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; font-weight: 600; }
    .pagination button:disabled { background-color: #f8fafc; color: #cbd5e0; cursor: not-allowed; }
    
    /* ✅ PERBAIKAN UTAMA: Menambahkan kembali styling untuk modal */
    .toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background-color: #1e293b; color: white; padding: 12px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 2000; }
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
    .modal-content { background-color: white; padding: 10px; border-radius: 12px; width: 100%; max-width: 450px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
    .modal-title { margin: 0 0 8px 0; color: #1e293b; font-size: 1.25rem; }
    .modal-message { margin: 0 0 20px 0; color: #475569; line-height: 1.6; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 12px; }
    .button-secondary { background-color: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }

    @media (min-width: 900px) {
        .page-title { font-size: 2rem; }
        .main-grid { grid-template-columns: 1fr 1fr; }
        .filter-container { grid-template-columns: 1fr 1fr 1fr; }
    }
`;
document.head.appendChild(styleSheet);

export default PanitiaKelolaPemilih;