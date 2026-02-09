// src/pages/AdminMasterVoting.js
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase/firebaseConfig';
import { collection, onSnapshot, query, orderBy, doc, addDoc, serverTimestamp, deleteDoc, where, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { logActivity } from '../utils/logActivity';

import { Mail, CalendarCheck, BarChart2, Users, FileText, Check, X, Trash2, ExternalLink, Plus, Inbox, Clock, AlertCircle } from 'lucide-react';

// --- Komponen-komponen UI ---
const Toast = ({ message, clear }) => { useEffect(() => { const timer = setTimeout(clear, 3000); return () => clearTimeout(timer); }, [clear]); return <div className="toast">{message}</div>; };

const ConfirmationModal = ({ modalState, setModalState }) => {
    const [confirmText, setConfirmText] = useState('');
    useEffect(() => { if (modalState.isOpen) setConfirmText(''); }, [modalState.isOpen]);
    if (!modalState.isOpen) return null;
    const isConfirmationMatched = !modalState.requireConfirmationText || confirmText === modalState.requireConfirmationText;
    return ( 
        <div className="modal-overlay">
            <div className="modal-content">
                <h3 className="modal-title">{modalState.title}</h3>
                <p className="modal-message">{modalState.message}</p>
                {modalState.requireConfirmationText && (
                    <div style={{marginBottom: '20px'}}>
                        <label className="label">Untuk konfirmasi, ketik: <strong style={{color: '#b91c1c'}}>{modalState.requireConfirmationText}</strong></label>
                        <input className="input" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="Ketik disini..." />
                    </div>
                )}
                <div className="modal-actions">
                    <button className="button button-secondary" onClick={() => setModalState({ isOpen: false })}>Batal</button>
                    <button className="button button-danger" onClick={() => { if (isConfirmationMatched) { modalState.onConfirm(); setModalState({ isOpen: false }); } }} disabled={!isConfirmationMatched}>{modalState.confirmText || 'Konfirmasi'}</button>
                </div>
            </div>
        </div> 
    );
};

const StatCard = ({ icon, title, value, color }) => ( 
    <div className="stat-card" style={{ borderLeft: `4px solid ${color}` }}>
        <div className="stat-icon-wrapper" style={{ backgroundColor: `${color}15`, color: color }}>{icon}</div>
        <div>
            <p className="stat-title">{title}</p>
            <p className="stat-value" style={{ color: color }}>{value}</p>
        </div>
    </div> 
);

const EmptyState = ({ message }) => (
    <div className="empty-state">
        <div className="empty-icon-bg"><Inbox size={40} /></div>
        <p>{message}</p>
    </div>
);

const AdminMasterVoting = () => {
    const navigate = useNavigate();
    const [requests, setRequests] = useState([]);
    const [events, setEvents] = useState([]);
    const [availablePanitia, setAvailablePanitia] = useState([]);
    const [loading, setLoading] = useState({ requests: true, events: true, panitia: true });
    const [modalState, setModalState] = useState({ isOpen: false });
    const [toastMessage, setToastMessage] = useState('');
    const [activeTab, setActiveTab] = useState('requests');
    
    // --- Logika (Tidak Berubah) ---
    useEffect(() => {
        const unsubAuth = onAuthStateChanged(auth, user => { if (!user) navigate('/login'); });
        const unsubRequests = onSnapshot(query(collection(db, 'pemilihan_requests'), orderBy('diajukanPada', 'desc')), snap => { setRequests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))); setLoading(prev => ({...prev, requests: false})); });
        const unsubEvents = onSnapshot(query(collection(db, 'pemilihan_events'), orderBy('dibuatPada', 'desc')), snap => { setEvents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))); setLoading(prev => ({...prev, events: false})); });
        const unsubPanitia = onSnapshot(query(collection(db, 'users'), where('role', '==', 'panitia_requestor')), snap => { setAvailablePanitia(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))); setLoading(prev => ({...prev, panitia: false})); });
        return () => { unsubAuth(); unsubRequests(); unsubEvents(); unsubPanitia(); };
    }, [navigate]);

    const globalStats = useMemo(() => {
        const totalEvents = events.length;
        const totalSuara = events.reduce((acc, event) => acc + (Array.isArray(event.kandidat) ? event.kandidat.reduce((subAcc, kand) => subAcc + (kand.suara || 0), 0) : 0), 0);
        const totalPemilih = events.reduce((acc, event) => acc + (event.pemilih?.length || 0), 0);
        return { totalEvents, totalPemilih, totalSuara };
    }, [events]);

    const showToast = (message) => setToastMessage(message);

    const handleConfirmApprove = async (request, panitiaId) => {
        if (!request || !panitiaId) return showToast("Harap pilih panitia yang akan ditugaskan.");
        try {
            const newEventRef = await addDoc(collection(db, 'pemilihan_events'), { namaEvent: request.namaEvent, deskripsi: request.deskripsi || "", ormawa: request.ormawa, status: 'akan datang', dibuatPada: serverTimestamp(), kandidat: [], pemilih: [], pemilihInfo: {}, publishResults: false, allowAbstain: true, });
            await updateDoc(doc(db, 'users', panitiaId), { role: 'panitia', eventId: newEventRef.id });
            await deleteDoc(doc(db, 'pemilihan_requests', request.id));
            await logActivity(`Menyetujui & menugaskan panitia ke event "${request.namaEvent}"`);
            showToast(`Event "${request.namaEvent}" berhasil dibuat.`);
        } catch (error) { console.error("Gagal menyetujui:", error); showToast("Terjadi kesalahan saat menyetujui permintaan."); }
    };

    const confirmRejectRequest = (id, ormawaName) => { setModalState({ isOpen: true, title: 'Tolak Permintaan?', message: `Anda yakin ingin menolak permintaan pemilihan dari "${ormawaName}"?`, onConfirm: () => handleRejectRequest(id, ormawaName), confirmText: 'Ya, Tolak' }); };
    const handleRejectRequest = async (id, ormawaName) => { try { await deleteDoc(doc(db, 'pemilihan_requests', id)); await logActivity(`Menolak permintaan pemilihan dari "${ormawaName}"`); showToast('Permintaan berhasil ditolak.'); } catch(e) { showToast('Gagal menolak permintaan.'); } };
    const confirmHapusEvent = (eventId, eventName) => { setModalState({ isOpen: true, title: 'Hapus Event?', message: `Tindakan ini akan menghapus event "${eventName}" secara permanen.`, requireConfirmationText: eventName, onConfirm: () => handleHapusEvent(eventId, eventName), confirmText: 'Ya, Hapus Permanen' }); };
    const handleHapusEvent = async (eventId, eventName) => { try { await deleteDoc(doc(db, "pemilihan_events", eventId)); await logActivity(`Menghapus event pemilihan: "${eventName}"`); showToast('Event berhasil dihapus.'); } catch (e) { showToast('Gagal menghapus event.'); } };
    
    // Helper untuk Status Badge
    const getRealtimeStatus = (event) => {
        // 1. Jika status di database diset manual jadi 'selesai', ya selesai.
        if (event.status === 'selesai') return 'selesai';
        
        // 2. Cek berdasarkan WAKTU
        const now = new Date();
        const start = event.tanggalMulai?.toDate ? event.tanggalMulai.toDate() : null;
        const end = event.tanggalSelesai?.toDate ? event.tanggalSelesai.toDate() : null;

        if (start && end) {
            if (now > end) return 'selesai'; // Waktu habis -> Selesai
            if (now >= start) return 'berlangsung'; // Waktu masuk -> Berlangsung
        }
        
        // 3. Jika status manual 'berlangsung', paksa jadi berlangsung (meski jadwal belum mulai)
        if (event.status === 'berlangsung') return 'berlangsung';

        return 'akan datang';
    };

    const renderStatusBadge = (event) => {
        // Kita hitung status dulu, bukan langsung ambil raw string
        const status = getRealtimeStatus(event);
        
        let colorClass = '';
        let label = status;

        if (status === 'akan datang') { 
            colorClass = 'badge-blue'; 
            label = 'Akan Datang'; 
        } else if (status === 'berlangsung') { 
            colorClass = 'badge-green'; 
            label = 'Sedang Berlangsung'; 
        } else if (status === 'selesai') { 
            colorClass = 'badge-gray'; 
            label = 'Selesai'; 
        }
        
        return <span className={`status-badge ${colorClass}`}>{label}</span>;
    };

    return (
        <div className="manage-voting-page">
            {toastMessage && <Toast message={toastMessage} clear={() => setToastMessage('')} />}
            <ConfirmationModal modalState={modalState} setModalState={setModalState} />

            <header className="page-header">
                <div>
                    <h1 className="page-title">Manajemen E-Voting</h1>
                    <p className="page-subtitle">Pusat kendali untuk menyetujui permintaan dan mengelola seluruh event pemilihan.</p>
                </div>
            </header>

            <div className="stats-grid">
                <StatCard icon={<Mail size={24} />} title="Permintaan Masuk" value={requests.length} color="#3b82f6" />
                <StatCard icon={<CalendarCheck size={24} />} title="Event Aktif" value={globalStats.totalEvents} color="#10b981" />
                <StatCard icon={<BarChart2 size={24} />} title="Total Suara" value={globalStats.totalSuara} color="#8b5cf6" />
                <StatCard icon={<Users size={24} />} title="Pemilih Terdaftar" value={globalStats.totalPemilih} color="#f59e0b" />
            </div>

            <div className="main-card">
                <div className="tab-header">
                    <button onClick={() => setActiveTab('requests')} className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}>
                        Permintaan Masuk {requests.length > 0 && <span className="counter-badge">{requests.length}</span>}
                    </button>
                    <button onClick={() => setActiveTab('events')} className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}>
                        Daftar Event
                    </button>
                </div>

                <div className="tab-body">
                    {activeTab === 'requests' && (
                        <div className="list-container">
                            {loading.requests ? <p className="loading-text"><Clock size={20} className="spin"/> Memuat data...</p> : requests.length > 0 ? requests.map(req => (
                                <div key={req.id} className="list-card">
                                    <div className="list-info">
                                        <div className="list-header-row">
                                            <h3 className="item-name">{req.namaEvent}</h3>
                                            <span className="ormawa-badge">{req.ormawa}</span>
                                        </div>
                                        <p className="item-desc">Diajukan pada: {req.diajukanPada?.toDate().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                        {req.deskripsi && <p className="item-desc-text">"{req.deskripsi}"</p>}
                                    </div>
                                    <div className="list-actions">
                                        <a href={req.fileSuratUrl} target="_blank" rel="noopener noreferrer" className="button button-outline"><FileText size={16}/> Dokumen</a>
                                        <button onClick={() => setModalState({ isOpen: true, title: 'Setujui & Tugaskan Panitia', onConfirm: (panitiaId) => handleConfirmApprove(req, panitiaId), data: req })} className="button button-primary"><Check size={16}/> Setujui</button>
                                        <button onClick={() => confirmRejectRequest(req.id, req.ormawa)} className="button button-danger-ghost"><X size={16}/> Tolak</button>
                                    </div>
                                </div>
                            )) : <EmptyState message="Tidak ada permintaan pemilihan baru." />}
                        </div>
                    )}
                    
                    {activeTab === 'events' && (
                        <div className="list-container">
                            {loading.events ? <p className="loading-text"><Clock size={20} className="spin"/> Memuat data...</p> : events.length > 0 ? events.map(event => (
                                <div key={event.id} className="list-card">
                                    <div className="list-info">
                                        <div className="list-header-row">
                                            <h3 className="item-name">{event.namaEvent}</h3>
                                            {renderStatusBadge(event)}
                                        </div>
                                        <p className="item-desc">Penyelenggara: <strong>{event.ormawa}</strong></p>
                                        <div className="mini-stats">
                                            <span><Users size={14}/> {event.pemilih?.length || 0} Pemilih</span>
                                            <span>•</span>
                                            <span><BarChart2 size={14}/> {Array.isArray(event.kandidat) ? event.kandidat.reduce((a, b) => a + (b.suara || 0), 0) : 0} Suara</span>
                                        </div>
                                    </div>
                                    <div className="list-actions">
                                        <button onClick={() => navigate(`/panitia/${event.id}`)} className="button button-secondary"><ExternalLink size={16}/> Kelola</button>
                                        <button onClick={() => confirmHapusEvent(event.id, event.namaEvent)} className="button button-danger-ghost" title="Hapus Event"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                            )) : <EmptyState message="Belum ada event yang dibuat." />}
                        </div>
                    )}
                </div>
            </div>

            {modalState.isOpen && modalState.title === 'Setujui & Tugaskan Panitia' && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3 className="modal-title">{modalState.title}</h3>
                        <p className="modal-message">Pilih akun panitia yang akan bertanggung jawab mengelola event <strong>{modalState.data?.namaEvent}</strong>.</p>
                        
                        <div style={{marginTop: '16px', marginBottom: '24px'}}>
                            <label className="label">Pilih Panitia</label>
                            <div className="select-wrapper">
                                <select id="panitia-select" className="input select-input" defaultValue="">
                                    <option value="" disabled>-- Pilih Akun Panitia --</option>
                                    {availablePanitia.map(p => <option key={p.id} value={p.id}>{p.namaTampilan} ({p.email})</option>)}
                                </select>
                            </div>
                            {availablePanitia.length === 0 ? (
                                <div className="warning-box">
                                    <AlertCircle size={16}/>
                                    <span>Tidak ada akun panitia (Role: Panitia Requestor) yang tersedia. Silakan buat atau setujui akun panitia terlebih dahulu di menu "Kelola Pengguna".</span>
                                </div>
                            ) : (
                                <p className="hint-text">Hanya menampilkan pengguna dengan role 'Panitia Requestor'.</p>
                            )}
                        </div>

                        <div className="modal-actions">
                            <button onClick={() => setModalState({ isOpen: false })} className="button button-secondary">Batal</button>
                            <button onClick={() => {const panitiaId = document.getElementById('panitia-select').value; modalState.onConfirm(panitiaId); setModalState({ isOpen: false });}} className="button button-primary" disabled={availablePanitia.length === 0}><Plus size={16}/> Simpan & Tugaskan</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- CSS ---
const styleSheet = document.createElement("style");
styleSheet.innerHTML = `
    .manage-voting-page { font-family: 'Inter', sans-serif; background-color: #f8fafc; min-height: 100vh; padding: 24px; }
    .page-header { margin-bottom: 32px; }
    .page-title { color: #0f172a; font-size: 1.75rem; font-weight: 800; margin: 0; letter-spacing: -0.5px; }
    .page-subtitle { color: #64748b; font-size: 1rem; margin: 6px 0 0 0; }
    
    /* Stats */
    .stats-grid { display: grid; grid-template-columns: 1fr; gap: 16px; margin-bottom: 32px; }
    .stat-card { display: flex; align-items: center; gap: 16px; background-color: #ffffff; padding: 20px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 2px 4px -1px rgba(0,0,0,0.05); transition: transform 0.2s; }
    .stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .stat-icon-wrapper { border-radius: 12px; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .stat-title { margin: 0; color: #64748b; font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .stat-value { margin: 2px 0 0; font-size: 1.6rem; font-weight: 800; line-height: 1.2; }

    /* Main Card & Tabs */
    .main-card { background: white; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); overflow: hidden; }
    .tab-header { display: flex; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
    .tab-btn { flex: 1; padding: 16px; border: none; background: none; cursor: pointer; font-size: 0.95rem; font-weight: 600; color: #64748b; border-bottom: 3px solid transparent; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .tab-btn:hover { background: #f1f5f9; color: #334155; }
    .tab-btn.active { background: white; color: #0f172a; border-bottom-color: #2563eb; }
    .counter-badge { background: #ef4444; color: white; font-size: 0.75rem; padding: 2px 8px; border-radius: 10px; font-weight: 700; }

    /* List Items (Cards) */
    .tab-body { padding: 0; background: #f8fafc; }
    .list-container { display: flex; flex-direction: column; gap: 16px; padding: 24px; }
    .list-card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 16px; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
    .list-card:hover { border-color: #cbd5e1; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    
    .list-info { flex: 1; }
    .list-header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; gap: 12px; flex-wrap: wrap; }
    .item-name { margin: 0; font-size: 1.15rem; font-weight: 700; color: #0f172a; }
    .ormawa-badge { background: #f1f5f9; color: #475569; padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; border: 1px solid #e2e8f0; }
    .item-desc { margin: 0; color: #64748b; font-size: 0.9rem; }
    .item-desc-text { margin: 8px 0 0; font-style: italic; color: #475569; background: #f8fafc; padding: 10px; border-radius: 8px; font-size: 0.9rem; border: 1px solid #f1f5f9; }
    
    .mini-stats { display: flex; gap: 8px; align-items: center; margin-top: 12px; color: #64748b; font-size: 0.85rem; font-weight: 500; }
    .mini-stats span { display: flex; align-items: center; gap: 4px; }

    .list-actions { display: flex; gap: 10px; flex-wrap: wrap; padding-top: 16px; border-top: 1px solid #f1f5f9; justify-content: flex-end; }

    /* Buttons */
    .button { display: inline-flex; align-items: center; gap: 6px; padding: 10px 16px; border-radius: 8px; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: 0.2s; text-decoration: none; border: 1px solid transparent; }
    .button-primary { background: #0f172a; color: white; } .button-primary:hover { background: #1e293b; }
    .button-secondary { background: #f1f5f9; color: #334155; border-color: #e2e8f0; } .button-secondary:hover { background: #e2e8f0; }
    .button-outline { background: white; color: #334155; border-color: #cbd5e1; } .button-outline:hover { border-color: #94a3b8; background: #f8fafc; }
    .button-danger { background: #dc2626; color: white; }
    .button-danger-ghost { background: transparent; color: #dc2626; } .button-danger-ghost:hover { background: #fef2f2; }

    /* Status Badges */
    .status-badge { font-size: 0.75rem; font-weight: 700; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; }
    .badge-blue { background: #e0f2fe; color: #0369a1; }
    .badge-green { background: #dcfce7; color: #15803d; }
    .badge-gray { background: #f1f5f9; color: #64748b; }

    /* Empty State */
    .empty-state { text-align: center; padding: 60px 20px; color: #94a3b8; }
    .empty-icon-bg { background: #f1f5f9; width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: #cbd5e1; }

    /* Modal Styles */
    .label { display: block; font-weight: 600; color: #334155; margin-bottom: 8px; font-size: 0.9rem; }
    .input { width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid #cbd5e0; font-size: 1rem; box-sizing: border-box; }
    .select-input { background-color: #fff; cursor: pointer; }
    .warning-box { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; padding: 12px; border-radius: 8px; font-size: 0.85rem; display: flex; gap: 8px; align-items: flex-start; margin-top: 8px; }
    .hint-text { font-size: 0.8rem; color: #64748b; margin-top: 6px; }
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
    .modal-content { background: white; padding: 24px; border-radius: 16px; width: 100%; max-width: 500px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
    .modal-title { margin: 0 0 12px; color: #0f172a; font-size: 1.25rem; }
    .modal-message { color: #64748b; line-height: 1.5; margin-bottom: 24px; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 12px; }
    .toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: #0f172a; color: white; padding: 12px 24px; border-radius: 8px; font-weight: 500; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); z-index: 3000; animation: slideUp 0.3s ease; }
    .loading-text { text-align: center; padding: 40px; color: #64748b; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes slideUp { from { transform: translate(-50%, 100%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }

    /* Responsive */
    @media (min-width: 768px) {
        .manage-voting-page { padding: 40px; }
        .stats-grid { grid-template-columns: repeat(4, 1fr); gap: 24px; }
        .list-card { flex-direction: row; align-items: center; padding: 24px; }
        .list-actions { flex-direction: row; padding-top: 0; border-top: none; border-left: 1px solid #f1f5f9; padding-left: 24px; margin-left: 8px; }
        .tab-btn { font-size: 1rem; }
    }
`;
document.head.appendChild(styleSheet);

export default AdminMasterVoting;