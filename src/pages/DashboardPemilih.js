// src/pages/DashboardPemilih.js
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { db, auth } from '../firebase/firebaseConfig';
import { collection, onSnapshot, query, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';

// ✅ 1. Impor semua ikon yang dibutuhkan dari Lucide
import { LogOut, Users, CheckSquare, Bell, Clock, Vote, BarChart2, CalendarX, Mail, Hash } from 'lucide-react';

// --- Komponen-komponen UI ---

const CountdownTimer = React.memo(({ targetDate, status }) => {
    const calculateTimeLeft = () => {
        const difference = +new Date(targetDate) - +new Date();
        let timeLeft = {};
        if (difference > 0) {
            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            if (days > 0) timeLeft.hari = days;
            timeLeft.jam = Math.floor((difference / (1000 * 60 * 60)) % 24);
            timeLeft.menit = Math.floor((difference / 1000 / 60) % 60);
            timeLeft.detik = Math.floor((difference / 1000) % 60);
        }
        return timeLeft;
    };

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        if (!targetDate) return;
        const timer = setTimeout(() => { setTimeLeft(calculateTimeLeft()); }, 1000);
        return () => clearTimeout(timer);
    });

    if (!Object.keys(timeLeft).length) {
        return <div className="countdown-timer text-danger">Waktu Habis</div>;
    }

    const label = status === 'berlangsung' ? 'Sisa Waktu:' : 'Dimulai Dalam:';
    return (
        <div className="countdown-container">
            <span className="countdown-label">{label}</span>
            <div className="countdown-timer">
                {Object.entries(timeLeft).map(([unit, value]) => (
                    <div key={unit} className="timer-segment">
                        <span className="timer-number">{String(value).padStart(2, '0')}</span>
                        <span className="timer-label">{unit}</span>
                    </div>
                ))}
            </div>
        </div>
    );
});

const SkeletonLoader = () => (
    <div className="card skeleton-card">
        <div className="skeleton-line" style={{ width: '60%', height: '24px' }}></div>
        <div className="skeleton-line" style={{ width: '40%', height: '16px' }}></div>
        <div className="skeleton-line" style={{ width: '100%', height: '40px', marginTop: '16px' }}></div>
    </div>
);

const EmptyState = () => (
    <div className="empty-state">
        <CalendarX size={48} />
        <h3>Tidak Ada Pemilihan</h3>
        <p>Tidak ada data pemilihan untuk ditampilkan di tab ini.</p>
    </div>
);


const DashboardPemilih = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [voterProfile, setVoterProfile] = useState(null);
    const [elections, setElections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('aktif');
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const voterDocRef = doc(db, "voters", currentUser.uid);
                const docSnap = await getDoc(voterDocRef);
                if (docSnap.exists()) setVoterProfile(docSnap.data());
                
                const q = query(collection(db, 'pemilihan_events'));
                const unsubscribeFirestore = onSnapshot(q, (snapshot) => {
                    const eventList = snapshot.docs.map(doc => ({ 
                        id: doc.id, ...doc.data(),
                        tanggalMulai: doc.data().tanggalMulai?.toDate(),
                        tanggalSelesai: doc.data().tanggalSelesai?.toDate(),
                    }));
                    const eligibleElections = eventList.filter(event => 
                        event.pemilih && event.pemilih.some(p => p.uid === currentUser.uid)
                    );
                    setElections(eligibleElections);
                    setLoading(false);
                });
                return () => unsubscribeFirestore();
            } else {
                navigate('/login-pemilih');
            }
        });

        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => { unsubscribeAuth(); clearInterval(timer); };
    }, [navigate]);

    const processedElections = useMemo(() => {
        return elections.map(event => {
            let computedStatus = 'akan-datang';
            if(event.status === 'berlangsung' || event.status === 'selesai') {
                computedStatus = event.status;
            } else {
                if (event.tanggalSelesai && now > event.tanggalSelesai) computedStatus = 'selesai';
                else if (event.tanggalMulai && now >= event.tanggalMulai) computedStatus = 'berlangsung';
            }
            return { ...event, computedStatus };
        });
    }, [elections, now]);

    const { activeElections, pastElections } = useMemo(() => {
        const active = processedElections.filter(e => e.computedStatus === 'berlangsung' || e.computedStatus === 'akan-datang').sort((a,b) => (a.tanggalMulai || 0) - (b.tanggalMulai || 0));
        const past = processedElections.filter(e => e.computedStatus === 'selesai').sort((a,b) => (b.tanggalSelesai || 0) - (a.tanggalSelesai || 0));
        return { activeElections: active, pastElections: past };
    }, [processedElections]);
    
    const announcement = useMemo(() => {
        const activeEventWithAnnounce = activeElections.find(e => e.pengumuman && e.pengumuman.teks);
        return activeEventWithAnnounce ? activeEventWithAnnounce.pengumuman : null;
    }, [activeElections]);


    const handleLogout = () => {
        signOut(auth).then(() => navigate('/login-pemilih'));
    };

    const electionsToDisplay = activeTab === 'aktif' ? activeElections : pastElections;

    return (
        <div className="dashboard-page">
            <div className="dashboard-container">
                <header className="page-header">
                    <div>
                        <h1 className="page-title">Dasbor Pemilih</h1>
                        <p className="page-subtitle">Selamat datang, {voterProfile?.namaLengkap || 'Pemilih'}.</p>
                    </div>
                    <button onClick={handleLogout} className="button-logout">
                        <LogOut size={16} />
                        <span>Logout</span>
                    </button>
                </header>

                {/* ✅ 2. Ubah urutan layout: sidebar (profil) di atas main-content */}
                <div className="dashboard-grid">
                    <aside className="sidebar-content">
                        <div className="card profile-card">
                            <div className="profile-header">
                                <div className="avatar">
                                    {voterProfile?.namaLengkap ? voterProfile.namaLengkap.charAt(0).toUpperCase() : '?'}
                                </div>
                                <div>
                                    <h3 className="profile-name">{voterProfile?.namaLengkap}</h3>
                                    <p className="profile-detail">{voterProfile?.prodi}</p>
                                </div>
                            </div>
                            <div className="profile-info">
                                <p><Mail size={14} /><span>{user?.email}</span></p>
                                <p><Hash size={14} /><span>{voterProfile?.nim}</span></p>
                            </div>
                        </div>
                    </aside>
                    
                    <div className="main-content">
                        {announcement && (
                            <div className="announcement-card">
                                <Bell size={20} />
                                <div>
                                    <h3 className="announcement-title">Pengumuman Penting</h3>
                                    <p className="announcement-text">{announcement.teks}</p>
                                </div>
                            </div>
                        )}
                        <div className="tab-container">
                            <button onClick={() => setActiveTab('aktif')} className={activeTab === 'aktif' ? 'tab active' : 'tab'}>
                                Pemilihan Aktif ({activeElections.length})
                            </button>
                            <button onClick={() => setActiveTab('riwayat')} className={activeTab === 'riwayat' ? 'tab active' : 'tab'}>
                                Riwayat ({pastElections.length})
                            </button>
                        </div>

                        <div className="election-list">
                            {loading ? <><SkeletonLoader /><SkeletonLoader /></>
                             : electionsToDisplay.length > 0 ? (
                                electionsToDisplay.map(event => {
                                    const hasVoted = event.pemilihInfo && event.pemilihInfo[user?.uid]?.telahMemilih;
                                    return (
                                        <div key={event.id} className="card election-card">
                                            <div className="card-header">
                                                <h2 className="card-title">{event.namaEvent}</h2>
                                                <span className={`status-badge status-${event.computedStatus}`}>{event.computedStatus.replace('-', ' ')}</span>
                                            </div>
                                            <p className="card-subtitle">Penyelenggara: {event.ormawa}</p>
                                            
                                            <div className="stats-row">
                                                <span><Users size={14} />{event.kandidat?.length || 0} Kandidat</span>
                                                <span><CheckSquare size={14} />{event.pemilih?.length || 0} Pemilih</span>
                                            </div>
                                            
                                            <div className="card-footer">
                                                {event.computedStatus !== 'selesai' && <CountdownTimer targetDate={event.computedStatus === 'berlangsung' ? event.tanggalSelesai : event.tanggalMulai} status={event.computedStatus} />}
                                                
                                                {hasVoted ? (
                                                    <div className="voted-pill"><CheckSquare size={16} /> Anda Sudah Memilih</div>
                                                ) : event.computedStatus === 'berlangsung' ? (
                                                    <Link to={`/voting/${event.id}`} className="button button-primary"><Vote size={16} /> Masuk Bilik Suara</Link>
                                                ) : event.computedStatus === 'selesai' && event.publishResults ? (
                                                    <Link to={`/hasil/${event.id}`} className="button button-secondary"><BarChart2 size={16} /> Lihat Hasil</Link>
                                                ) : (
                                                    <p className="info-text"><Clock size={14}/> {event.computedStatus === 'akan-datang' ? 'Pemilihan akan segera dimulai.' : 'Pemilihan telah selesai.'}</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : <EmptyState />}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ✅ 3. Stylesheet baru yang lebih profesional dan responsif
const styleSheet = document.createElement("style");
styleSheet.innerHTML = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  
  .dashboard-page { font-family: 'Inter', sans-serif; background-color: #f8fafc; min-height: 100vh; padding: 20px; }
  .dashboard-container { max-width: 1280px; margin: 0 auto; }
  
  /* --- Header --- */
  .page-header { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; }
  .page-title { color: #1e293b; font-size: 1.75rem; font-weight: 700; margin: 0; }
  .page-subtitle { color: #64748b; font-size: 1rem; margin: 4px 0 0 0; }
  .button-logout { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.9rem; background-color: transparent; color: #64748b; border: 1px solid #e2e8f0; transition: all 0.2s; }
  .button-logout:hover { background-color: #fee2e2; color: #b91c1c; border-color: #fca5a5; }
  
  /* --- Layout Grid --- */
  .dashboard-grid { display: grid; grid-template-columns: 1fr; gap: 24px; }
  .main-content { min-width: 0; }
  .sidebar-content { }

  /* --- Kartu & Komponen Umum --- */
  .card { background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03), 0 2px 4px -2px rgba(0,0,0,0.03); transition: box-shadow 0.3s; }
  .card:hover { box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -4px rgba(0,0,0,0.05); }
  .card-header { display: flex; flex-direction: column; gap: 8px; padding: 20px 24px; }
  .card-title { margin: 0; color: #1e293b; font-size: 1.25rem; font-weight: 600; }
  .card-subtitle { padding: 0 24px; margin: -16px 0 16px 0; color: #64748b; font-size: 0.9rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px; }
  .stats-row { display: flex; flex-wrap: wrap; gap: 16px 24px; padding: 0 24px 16px; color: #64748b; font-size: 0.9rem; }
  .stats-row span { display: flex; align-items: center; gap: 8px; }
  .card-footer { display: flex; flex-direction: column; gap: 16px; padding: 16px 24px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px;}
  
  /* --- Tombol Aksi --- */
  .button { text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 16px; border-radius: 8px; font-weight: 600; font-size: 0.9rem; border: 1px solid transparent; width: 100%; transition: all 0.2s; }
  .button:hover { transform: translateY(-2px); filter: brightness(0.95); }
  .button-primary { background-color: #1d4ed8; color: #ffffff; box-shadow: 0 4px 14px rgba(29, 78, 216, 0.25); }
  .button-secondary { background-color: #334155; color: #ffffff; }
  .voted-pill { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 16px; background-color: #dcfce7; color: #166534; border-radius: 8px; font-weight: 600; font-size: 0.9rem; }
  .info-text { display: flex; align-items: center; justify-content: center; gap: 8px; color: #64748b; margin: 0; font-size: 0.9rem; font-weight: 500; padding: 10px 0; }

  /* --- Pengumuman & Tabs --- */
  .announcement-card { display: flex; gap: 16px; background-color: #eff6ff; border-left: 4px solid #3b82f6; color: #1e3a8a; padding: 20px; border-radius: 8px; margin-bottom: 24px; }
  .announcement-card svg { flex-shrink: 0; margin-top: 2px; }
  .announcement-title { margin: 0 0 4px 0; font-weight: 700; }
  .announcement-text { margin: 0; line-height: 1.6; }
  .tab-container { display: flex; border-bottom: 1px solid #e2e8f0; margin-bottom: 24px; }
  .tab { padding: 12px 0; margin-right: 24px; border: none; background: none; cursor: pointer; font-size: 1rem; font-weight: 600; color: #64748b; border-bottom: 3px solid transparent; transition: all 0.2s; }
  .tab.active { color: #1d4ed8; border-bottom-color: #1d4ed8; }

  /* --- Daftar Pemilihan --- */
  .election-list { display: flex; flex-direction: column; gap: 20px; }
  .status-badge { padding: 4px 12px; border-radius: 9999px; font-weight: 600; font-size: 0.75rem; text-transform: capitalize; }
  .status-berlangsung { background-color: #dcfce7; color: #166534; } 
  .status-selesai { background-color: #fee2e2; color: #991b1b; } 
  .status-akan-datang { background-color: #fef9c3; color: #a16207; }

  /* --- Countdown Timer --- */
  .countdown-container { text-align: center; background-color: #f1f5f9; padding: 12px; border-radius: 8px; }
  .countdown-label { font-size: 0.8rem; font-weight: 500; color: #64748b; display: block; margin-bottom: 8px; }
  .countdown-timer { display: flex; justify-content: center; gap: 16px; color: #475569; }
  .timer-segment { display: flex; flex-direction: column; align-items: center; line-height: 1.2; }
  .timer-number { font-size: 1.5rem; font-weight: 700; color: #1e293b; }
  .timer-label { font-size: 0.7rem; color: #64748b; text-transform: uppercase; }
  .text-danger { color: #dc2626; font-weight: 600; }
  
  /* --- Kartu Profil --- */
  .profile-card { }
  .profile-header { display: flex; align-items: center; gap: 16px; padding: 24px; }
  .avatar { width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.75rem; font-weight: 600; flex-shrink: 0; }
  .profile-name { margin: 0; color: #1e293b; font-size: 1.2rem; font-weight: 600; }
  .profile-detail { margin: 4px 0 0; color: #64748b; font-size: 0.9rem; }
  .profile-info { padding: 24px; display: flex; flex-direction: column; gap: 16px; font-size: 0.9rem; border-top: 1px solid #f1f5f9; }
  .profile-info p { margin: 0; display: flex; align-items: center; gap: 12px; color: #475569; }
  .profile-info p svg { color: #94a3b8; flex-shrink: 0; }
  .profile-info p span { color: #1e293b; font-weight: 500; word-break: break-all; }

  /* --- Skeleton & Empty State --- */
  .skeleton-card { padding: 24px; margin-bottom: 20px; }
  .skeleton-line { background-color: #e2e8f0; border-radius: 4px; animation: pulse 1.5s infinite; margin-bottom: 12px; }
  .empty-state { text-align: center; padding: 40px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; }
  .empty-state svg { color: #cbd5e1; margin-bottom: 16px; }
  .empty-state h3 { font-size: 1.25rem; color: #475569; margin: 0 0 8px 0; }
  .empty-state p { margin: 0; color: #94a3b8; }
  
  /* --- Tampilan Desktop & Responsif --- */
  @media (min-width: 768px) {
    .page-header { flex-direction: row; justify-content: space-between; align-items: center; margin-bottom: 32px; }
    .page-title { font-size: 2rem; }
    .card-header { flex-direction: row; justify-content: space-between; align-items: center; }
    .card-footer { flex-direction: row; justify-content: space-between; align-items: center; }
    .button, .voted-pill { width: auto; }
  }
  @media (min-width: 1024px) {
    .dashboard-grid { grid-template-columns: 2fr 1fr; }
    /* ✅ Memastikan urutan benar di desktop: main content dulu, baru sidebar */
    .main-content { order: 1; }
    .sidebar-content { order: 2; position: sticky; top: 20px; align-self: start; }
  }
  
  @keyframes pulse { 50% { opacity: 0.5; } }
`;
document.head.appendChild(styleSheet);


export default DashboardPemilih;