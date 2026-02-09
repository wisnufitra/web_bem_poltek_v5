// src/pages/DaftarPemilihan.js
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase/firebaseConfig';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import poltekLogo from '../assets/logo-poltek.png';

// ✅ PERBAIKAN: Komponen dibungkus dengan React.memo untuk optimisasi
const CountdownTimer = React.memo(({ targetDate, status }) => {
    const calculateTimeLeft = () => {
        // Fungsi ini di-scope di dalam agar tidak perlu jadi dependency
        const difference = +new Date(targetDate) - +new Date();
        let timeLeft = {};

        if (difference > 0) {
            timeLeft = {
                hari: Math.floor(difference / (1000 * 60 * 60 * 24)),
                jam: Math.floor((difference / (1000 * 60 * 60)) % 24),
                menit: Math.floor((difference / 1000 / 60) % 60),
                detik: Math.floor((difference / 1000) % 60)
            };
        }
        return timeLeft;
    };

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        // Timer ini sekarang akan berjalan tanpa interupsi dari parent component
        const timer = setTimeout(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearTimeout(timer);
    }); // sengaja tidak ada dependency array agar menjadi self-updating loop

    if (!targetDate || status === 'selesai') return null;

    const timerComponents = [];
    Object.keys(timeLeft).forEach(interval => {
        if (!timeLeft[interval] && interval !== 'detik') return;
        timerComponents.push(
            <div key={interval} style={styles.timerSegment}>
                <span style={styles.timerNumber}>{String(timeLeft[interval]).padStart(2, '0')}</span>
                <span style={styles.timerLabel}>{interval}</span>
            </div>
        );
    });
    
    if (!timerComponents.length) {
        // Cukup tampilkan null saat waktu habis, karena parent akan mengubah status & tombol
        return null;
    }

    return (
        <div style={styles.countdownContainer}>
            <span style={styles.countdownLabel}>{status === 'berlangsung' ? 'Sisa Waktu:' : 'Dimulai Dalam:'}</span>
            <div style={styles.timerWrapper}>
                {timerComponents}
            </div>
        </div>
    );
});

// --- Helper Component: Skeleton Card ---
const SkeletonCard = () => (
    <div style={{...styles.card, backgroundColor: '#f1f5f9'}}>
        <div style={{...styles.skeleton, height: '24px', width: '70%', marginBottom: '16px'}}></div>
        <div style={{...styles.skeleton, height: '16px', width: '50%', marginBottom: '24px'}}></div>
        <div style={{...styles.skeleton, height: '40px', width: '100%'}}></div>
    </div>
);


const DaftarPemilihan = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('Semua');
    const [searchTerm, setSearchTerm] = useState('');
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const q = query(collection(db, 'pemilihan_events'), orderBy('dibuatPada', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const eventsData = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data(),
                tanggalMulai: doc.data().tanggalMulai?.toDate(),
                tanggalSelesai: doc.data().tanggalSelesai?.toDate()
            }));
            setEvents(eventsData);
            setLoading(false);
        });

        // Interval tetap 1 detik untuk memastikan status event selalu akurat
        const interval = setInterval(() => setNow(new Date()), 1000);

        return () => {
            unsubscribe();
            clearInterval(interval);
        };
    }, []);

    const processedEvents = useMemo(() => {
        // Logika status disamakan dengan halaman pengaturan
        return events.map(event => {
            let computedStatus;

            // Prioritas 1: Cek status manual dari database.
            if (event.status === 'berlangsung' || event.status === 'selesai') {
                computedStatus = event.status;
            } else {
                // Prioritas 2: Jika tidak ada status manual, hitung berdasarkan waktu.
                const startTime = event.tanggalMulai;
                const endTime = event.tanggalSelesai;

                if (endTime && now > endTime) {
                    computedStatus = 'selesai';
                } else if (startTime && now >= startTime) {
                    computedStatus = 'berlangsung';
                } else {
                    computedStatus = 'akan datang';
                }
            }
            return { ...event, computedStatus };
        })
        .sort((a, b) => {
            if (a.computedStatus === 'berlangsung' && b.computedStatus !== 'berlangsung') return -1;
            if (a.computedStatus !== 'berlangsung' && b.computedStatus === 'berlangsung') return 1;
            // Urutan sekunder berdasarkan tanggal mulai (yang lebih baru di atas)
            return (b.tanggalMulai || 0) - (a.tanggalMulai || 0);
        });
    }, [events, now]);

    const filteredEvents = useMemo(() => {
        return processedEvents.filter(event => {
            const filterValue = statusFilter.toLowerCase();
            const eventStatus = event.computedStatus;
            
            const matchesFilter = filterValue === 'semua' || (filterValue === 'akan datang' && eventStatus === 'akan datang') || eventStatus === filterValue;
            
            const matchesSearch = event.namaEvent.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  event.ormawa.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesFilter && matchesSearch;
        });
    }, [processedEvents, statusFilter, searchTerm]);

    const getStatusComponent = (status) => {
        const style = {...styles.statusBadge};
        let text = 'Akan Datang';
        style.backgroundColor = '#f59e0b';

        if (status === 'berlangsung') {
            text = 'Berlangsung';
            style.backgroundColor = '#22c55e';
        } else if (status === 'selesai') {
            text = 'Selesai';
            style.backgroundColor = '#ef4444';
        }
        return <span style={style}>{text}</span>;
    };
    
    const formatDate = (date) => {
        if (!date) return 'N/A';
        return new Intl.DateTimeFormat('id-ID', {
            day: '2-digit', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        }).format(date);
    };

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                {/* Hero Section */}
                <div style={styles.heroSection}>
                    <img src={poltekLogo} alt="Logo Poltek Nuklir" style={{ height: '60px', marginBottom: '16px' }} />
                    <h1 style={styles.mainHeading}>Portal E-Voting</h1>
                    <p style={styles.subHeading}>Keluarga Mahasiswa Politeknik Teknologi Nuklir Indonesia</p>
                    <div style={styles.heroActions}>
                        <Link to="/login-pemilih" className="hero-button" style={{...styles.heroButton, ...styles.primaryButton}}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
                            <span>Masuk Portal Pemilih</span>
                        </Link>
                        <Link to="/register-pemilih" className="hero-button" style={styles.heroButton}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                            <span>Daftar sebagai Pemilih</span>
                        </Link>
                        <Link to="/request-pemilihan" className="hero-button" style={styles.heroButton}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                            <span>Ajukan Permintaan Pemilihan</span>
                        </Link>
                    </div>
                </div>
                
                {/* Filter and Search Section */}
                <div style={styles.filterContainer}>
                    <div style={{flexGrow: 1, position: 'relative'}}>
                        <svg style={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        <input style={styles.input} placeholder="Cari nama event atau ormawa..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <div style={{position: 'relative'}}>
                        <select style={styles.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option>Semua</option>
                            <option>Akan Datang</option>
                            <option>Berlangsung</option>
                            <option>Selesai</option>
                        </select>
                        <svg style={styles.selectArrow} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>
                </div>

                {/* Event Cards Section */}
                {loading ? (
                    <div style={styles.grid}>
                        {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                ) : filteredEvents.length > 0 ? (
                    <div style={styles.grid}>
                        {filteredEvents.map(event => (
                            <div key={event.id} style={styles.card} className="event-card">
                                <div style={styles.cardHeader}>
                                    <h3 style={styles.cardTitle}>{event.namaEvent}</h3>
                                    {getStatusComponent(event.computedStatus)}
                                </div>
                                <p style={styles.cardOrganizer}><strong>Penyelenggara:</strong> {event.ormawa}</p>
                                
                                <div style={styles.dateInfo}>
                                    <div>
                                        <small>Mulai:</small>
                                        <p>{formatDate(event.tanggalMulai)}</p>
                                    </div>
                                    <div>
                                        <small>Selesai:</small>
                                        <p>{formatDate(event.tanggalSelesai)}</p>
                                    </div>
                                </div>
                                
                                <CountdownTimer 
                                    targetDate={event.computedStatus === 'berlangsung' ? event.tanggalSelesai : event.tanggalMulai} 
                                    status={event.computedStatus} 
                                />

                                <div style={{flexGrow: 1}}></div>

                                {event.computedStatus === 'selesai' && event.publishResults && (
                                    <Link to={`/hasil/${event.id}`} style={{...styles.actionButton, backgroundColor: '#475569'}} className="action-button">
                                        Lihat Hasil
                                    </Link>
                                )}
                                {event.computedStatus === 'berlangsung' && (
                                    <Link to={`/voting/${event.id}`} style={{...styles.actionButton, ...styles.primaryButton}} className="action-button">
                                        Masuk Bilik Suara
                                    </Link>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={styles.noResults}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: '#cbd5e0', marginBottom: '16px'}}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                        <p style={{fontSize: '1.2rem', color: '#64748b', margin: 0}}>Tidak ada event pemilihan ditemukan</p>
                        <p style={{color: '#94a3b8', marginTop: '8px'}}>Coba ubah filter pencarian Anda atau cek kembali nanti.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const styles = {
    page: { fontFamily: "'Inter', sans-serif", backgroundColor: '#f8fafc', minHeight: '100vh', padding: '40px 20px' },
    container: { maxWidth: '1200px', margin: '0 auto' },
    heroSection: { textAlign: 'center', padding: '40px 20px', backgroundColor: '#ffffff', borderRadius: '16px', marginBottom: '40px', border: '1px solid #e2e8f0' },
    mainHeading: { color: '#1e293b', fontSize: '2.5rem', fontWeight: '700', marginBottom: '8px' },
    subHeading: { color: '#64748b', fontSize: '1.2rem', marginBottom: '32px' },
    heroActions: { display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '16px' },
    heroButton: { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', color: '#334155', backgroundColor: '#f1f5f9', textDecoration: 'none', borderRadius: '8px', fontWeight: '600', border: '1px solid #e2e8f0' },
    primaryButton: { backgroundColor: '#1d4ed8', color: '#ffffff', border: 'none' },
    filterContainer: { display: 'flex', gap: '20px', marginBottom: '40px', flexWrap: 'wrap' },
    input: { padding: '12px 12px 12px 40px', borderRadius: '8px', border: '1px solid #cbd5e0', flexGrow: 1, fontSize: '1rem', width: '100%', boxSizing: 'border-box' },
    inputIcon: { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' },
    select: { padding: '12px 40px 12px 12px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '1rem', appearance: 'none', cursor: 'pointer', backgroundColor: '#fff', minWidth: '200px' },
    selectArrow: { position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '30px' },
    card: { padding: '24px', borderRadius: '12px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s, box-shadow 0.2s' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '16px' },
    cardTitle: { margin: 0, color: '#1e293b', fontSize: '1.25rem', fontWeight: '600' },
    cardOrganizer: { color: '#64748b', margin: '0 0 16px 0', fontSize: '0.9rem' },
    statusBadge: { padding: '4px 12px', borderRadius: '20px', color: 'white', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase' },
    dateInfo: { display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '0.9rem', color: '#475569' },
    actionButton: { display: 'block', textAlign: 'center', padding: '12px', borderRadius: '8px', textDecoration: 'none', color: '#fff', fontWeight: '600', marginTop: '16px' },
    noResults: { textAlign: 'center', color: '#64748b', padding: '60px 40px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' },
    countdownContainer: { backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '12px', textAlign: 'center', margin: '16px 0' },
    countdownLabel: { fontSize: '0.8rem', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '8px' },
    timerWrapper: { display: 'flex', justifyContent: 'center', gap: '10px' },
    timerSegment: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
    timerNumber: { fontSize: '1.5rem', fontWeight: '700', color: '#1e293b' },
    timerLabel: { fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' },
    skeleton: { backgroundColor: '#e2e8f0', borderRadius: '4px', animation: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite' },
};

const styleSheet = document.createElement("style");
styleSheet.innerHTML = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  
  .event-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 16px rgba(0,0,0,0.08);
  }
  .action-button {
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .action-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  }
  .hero-button {
    transition: all 0.2s ease-in-out;
  }
  .hero-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.05);
  }
  input:focus, select:focus {
    outline: none;
    border-color: #1d4ed8;
    box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.2);
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;
document.head.appendChild(styleSheet);


export default DaftarPemilihan;

