// src/pages/AdminHistori.js
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase/firebaseConfig';
import { collection, onSnapshot, query, orderBy, doc, getDocs, writeBatch, limit } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { logActivity } from '../utils/logActivity';
import { 
    ArchiveX, Download, Trash2, Search, Users, ListFilter, 
    CalendarDays, ChevronLeft, ChevronRight, ArrowLeft, 
    User, Clock, Filter, Activity, AlertCircle
} from 'lucide-react';

// --- Komponen UI Pendukung ---
const LoadingSpinner = () => (
    <div style={styles.loadingContainer}>
        <div className="spinner"></div>
        <p style={{ marginTop: '16px', color: '#64748b' }}>Memverifikasi Hak Akses...</p>
    </div>
);

const EmptyState = ({ message }) => (
    <div style={styles.emptyState}>
        <ArchiveX size={64} style={{ color: '#cbd5e1', marginBottom: '16px' }} />
        <h3 style={{ color: '#1e293b', margin: '0 0 8px 0' }}>Data Tidak Ditemukan</h3>
        <p style={{ color: '#64748b', fontSize: '0.95rem' }}>{message}</p>
    </div>
);

const ConfirmationModal = ({ message, onConfirm, onCancel, confirmText, confirmColor }) => (
    <div style={styles.modalOverlay}>
        <div style={styles.modalContent}>
            <div style={{ color: '#ef4444', marginBottom: '16px' }}><AlertCircle size={48} style={{margin:'0 auto'}}/></div>
            <p style={{ marginBottom: '30px', color: '#1e293b', fontSize: '1.1rem', fontWeight: '500' }}>{message}</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button onClick={onCancel} style={styles.modalCancelButton}>Batal</button>
                <button onClick={onConfirm} style={{ ...styles.modalConfirmButton, backgroundColor: confirmColor || '#dc2626' }}>
                    {confirmText || 'Ya, Lanjutkan'}
                </button>
            </div>
        </div>
    </div>
);

const AdminHistori = () => {
    const navigate = useNavigate();
    const [histori, setHistori] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [isMaster, setIsMaster] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);
    const itemsPerPage = 12;

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [userFilter, setUserFilter] = useState('Semua');
    const [actionFilter, setActionFilter] = useState('Semua');
    const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
    const [uniqueUsers, setUniqueUsers] = useState([]);
    const [confirmProps, setConfirmProps] = useState({ show: false });

    // 1. Hak Akses & Data Fetching
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, user => {
            if (user) {
                const userDocRef = doc(db, 'users', user.uid);
                onSnapshot(userDocRef, (docSnap) => {
                    if (docSnap.exists()) {
                        const userData = docSnap.data();
                        // PROTEKSI: Jika bukan master, tendang ke /admin
                        if (userData.role_global === 'master') {
                            setIsMaster(true);
                        } else {
                            alert("Akses Ditolak: Halaman ini hanya untuk Master Admin.");
                            navigate('/admin');
                        }
                    }
                });
            } else { navigate('/login'); }
        });

        // Ambil log aktivitas
        const q = query(collection(db, 'histori'), orderBy('timestamp', 'desc'), limit(1000));
        const unsubscribeFirestore = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setHistori(list);
            const users = [...new Set(list.map(item => item.oleh))].filter(Boolean);
            setUniqueUsers(users);
            setLoading(false);
        });

        return () => { unsubscribeAuth(); unsubscribeFirestore(); };
    }, [navigate]);

    // 2. Logic Badge Aksi
    const getActionBadge = (action) => {
        const text = (action || '').toLowerCase();
        let colorStyle = { bg: '#f1f5f9', text: '#475569' };

        if (text.includes('menambah') || text.includes('buat')) colorStyle = { bg: '#dcfce7', text: '#166534' };
        else if (text.includes('mengedit') || text.includes('update') || text.includes('ubah')) colorStyle = { bg: '#eff6ff', text: '#1e40af' };
        else if (text.includes('menghapus') || text.includes('delete')) colorStyle = { bg: '#fee2e2', text: '#991b1b' };
        else if (text.includes('setuju') || text.includes('approve') || text.includes('acc')) colorStyle = { bg: '#f0fdf4', text: '#15803d' };
        else if (text.includes('login')) colorStyle = { bg: '#faf5ff', text: '#6b21a8' };

        return (
            <span style={{ ...styles.badge, backgroundColor: colorStyle.bg, color: colorStyle.text }}>
                {action}
            </span>
        );
    };

    // 3. Filter & Memoization
    const filteredHistori = useMemo(() => {
        return histori.filter(item => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = item.action?.toLowerCase().includes(searchLower) || item.oleh?.toLowerCase().includes(searchLower);
            const matchesUser = userFilter === 'Semua' || item.oleh === userFilter;
            const matchesAction = actionFilter === 'Semua' || item.action?.toLowerCase().includes(actionFilter.toLowerCase());
            
            let matchesDate = true;
            if (dateFilter.start && item.timestamp) matchesDate = item.timestamp.toDate() >= new Date(dateFilter.start);
            if (dateFilter.end && item.timestamp) {
                const endDate = new Date(dateFilter.end);
                endDate.setDate(endDate.getDate() + 1);
                matchesDate = matchesDate && item.timestamp.toDate() < endDate;
            }
            return matchesSearch && matchesUser && matchesAction && matchesDate;
        });
    }, [histori, searchTerm, userFilter, actionFilter, dateFilter]);

    const currentItems = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredHistori.slice(start, start + itemsPerPage);
    }, [filteredHistori, currentPage]);

    const totalPages = Math.ceil(filteredHistori.length / itemsPerPage);

    const formatTimestamp = (ts) => {
        if (!ts) return '-';
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        return date.toLocaleString('id-ID', { 
            day: 'numeric', month: 'short', year: 'numeric', 
            hour: '2-digit', minute: '2-digit' 
        });
    };

    // 4. Admin Actions
    const handleSelectItem = (id) => setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    
    const handleSelectAll = () => {
        const pageIds = currentItems.map(i => i.id);
        const isAllSelected = pageIds.every(id => selectedItems.includes(id));
        setSelectedItems(prev => isAllSelected ? prev.filter(id => !pageIds.includes(id)) : [...new Set([...prev, ...pageIds])]);
    };

    const handleDeleteSelected = () => {
        setConfirmProps({
            show: true,
            message: `Hapus ${selectedItems.length} log aktivitas yang dipilih secara permanen?`,
            onConfirm: async () => {
                const batch = writeBatch(db);
                selectedItems.forEach(id => batch.delete(doc(db, 'histori', id)));
                await batch.commit();
                setSelectedItems([]);
                setConfirmProps({ show: false });
                logActivity(`[MASTER] Menghapus ${selectedItems.length} baris log histori.`);
            }
        });
    };

    const handleExportCSV = () => {
        const headers = ["Waktu", "Aksi", "Oleh"];
        const rows = filteredHistori.map(item => [
            `"${formatTimestamp(item.timestamp)}"`,
            `"${item.action?.replace(/"/g, '""')}"`,
            `"${item.oleh}"`
        ]);
        const content = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.join("\n");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(content));
        link.setAttribute("download", `KM_Audit_Log_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading || !isMaster) return <LoadingSpinner />;

    return (
        <div className="histori-page">
            <div className="histori-container">
                {confirmProps.show && <ConfirmationModal {...confirmProps} onCancel={() => setConfirmProps({ show: false })} />}

                <header style={styles.pageHeader}>
                    <div>
                        <h1 style={styles.pageTitle}>Manajemen Log Audit</h1>
                        <p style={{ color: '#64748b', margin: '4px 0 0' }}>Panel Khusus Master Admin untuk memantau integritas sistem.</p>
                    </div>
                    <div style={styles.headerActions}>
                        <button onClick={handleExportCSV} className="btn-export"><Download size={18} /> Ekspor CSV</button>
                    </div>
                </header>

                {/* Filter Section */}
                <div className="card filter-section">
                    <div className="filter-grid">
                        <div className="input-group">
                            <Search size={18} className="input-icon" />
                            <input placeholder="Cari aksi atau pengguna..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                        <div className="input-group">
                            <Users size={18} className="input-icon" />
                            <select value={userFilter} onChange={e => setUserFilter(e.target.value)}>
                                <option value="Semua">Semua Pengguna</option>
                                {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                        <div className="input-group">
                            <ListFilter size={18} className="input-icon" />
                            <select value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
                                <option value="Semua">Semua Jenis Aksi</option>
                                <option value="Menambah">Tambah Data</option>
                                <option value="Mengedit">Edit Data</option>
                                <option value="Menghapus">Hapus Data</option>
                                <option value="Setuju">Persetujuan</option>
                                <option value="Login">Akses Masuk</option>
                            </select>
                        </div>
                        <div className="date-group">
                            <div className="date-input">
                                <CalendarDays size={16} />
                                <input type="date" value={dateFilter.start} onChange={e => setDateFilter({...dateFilter, start: e.target.value})} />
                            </div>
                            <span style={{ color: '#94a3b8' }}>-</span>
                            <div className="date-input">
                                <CalendarDays size={16} />
                                <input type="date" value={dateFilter.end} onChange={e => setDateFilter({...dateFilter, end: e.target.value})} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* List Section */}
                <div className="card table-container">
                    <div style={styles.listHeader}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Activity size={20} color="#3b82f6" />
                            <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Arsip Aktivitas ({filteredHistori.length})</h2>
                        </div>
                        {selectedItems.length > 0 && (
                            <button onClick={handleDeleteSelected} className="btn-danger-sm">
                                <Trash2 size={14} /> Hapus Log Terpilih ({selectedItems.length})
                            </button>
                        )}
                    </div>

                    <div className="history-table">
                        <div className="table-header">
                            <input type="checkbox" onChange={handleSelectAll} checked={currentItems.length > 0 && currentItems.every(i => selectedItems.includes(i.id))} />
                            <span>Aksi / Deskripsi</span>
                            <span className="hide-mobile">Pelaku Aksi</span>
                            <span className="hide-mobile">Waktu (WIB)</span>
                        </div>
                        {currentItems.length === 0 ? <EmptyState message="Tidak ada log yang sesuai filter." /> : (
                            currentItems.map((item) => (
                                <div key={item.id} className={`table-row ${selectedItems.includes(item.id) ? 'selected' : ''}`}>
                                    <input type="checkbox" checked={selectedItems.includes(item.id)} onChange={() => handleSelectItem(item.id)} />
                                    <div className="col-action">
                                        {getActionBadge(item.action || 'Aktivitas Umum')}
                                        <div className="mobile-meta">
                                            <span><User size={12}/> {item.oleh}</span>
                                            <span><Clock size={12}/> {formatTimestamp(item.timestamp)}</span>
                                        </div>
                                    </div>
                                    <div className="col-user hide-mobile">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={styles.avatarMini}>{item.oleh?.charAt(0)}</div>
                                            {item.oleh}
                                        </div>
                                    </div>
                                    <div className="col-time hide-mobile">
                                        {formatTimestamp(item.timestamp)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div style={styles.pagination}>
                            <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="page-nav"><ChevronLeft size={18}/></button>
                            <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Halaman <strong>{currentPage}</strong> dari {totalPages}</span>
                            <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} className="page-nav"><ChevronRight size={18}/></button>
                        </div>
                    )}
                </div>

                <button onClick={() => navigate("/admin")} style={styles.btnBack}><ArrowLeft size={18} /> Kembali ke Dashboard</button>
            </div>
        </div>
    );
};

// --- STYLES ---
const styles = {
    loadingContainer: { textAlign: 'center', padding: '150px 0', background: '#f8fafc', height: '100vh' },
    badge: { padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.3px', display: 'inline-block' },
    avatarMini: { width: 24, height: 24, background: '#e2e8f0', color: '#475569', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: '700' },
    pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' },
    pageTitle: { fontSize: '2rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.5px' },
    headerActions: { display: 'flex', gap: '12px' },
    listHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9', marginBottom: '16px' },
    pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' },
    btnBack: { width: '100%', padding: '12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', color: '#475569', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '10px' },
    modalOverlay: { position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.5)", backdropFilter: 'blur(4px)', display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 },
    modalContent: { backgroundColor: 'white', padding: "32px", borderRadius: "16px", width: "90%", maxWidth: "400px", textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' },
    modalCancelButton: { padding: "10px 20px", border: "1px solid #e2e8f0", borderRadius: "8px", cursor: "pointer", fontWeight: '600', background: 'white', color: '#475569' },
    modalConfirmButton: { padding: "10px 20px", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: '600', color: 'white' },
    emptyState: { textAlign: 'center', padding: '60px 20px' },
};

const styleSheet = document.createElement("style");
styleSheet.innerHTML = `
    .histori-page { background-color: #f8fafc; min-height: 100vh; padding: 32px 16px; }
    .histori-container { max-width: 1200px; margin: 0 auto; }
    .card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    
    .btn-export { background: #10b981; color: white; border: none; padding: 8px 20px; borderRadius: 8px; font-weight: 700; display: flex; gap: 8px; align-items: center; cursor: pointer; transition: 0.2s; }
    .btn-export:hover { background: #059669; transform: translateY(-1px); }
    .btn-danger-sm { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; padding: 6px 12px; borderRadius: 6px; font-size: 0.8rem; font-weight: 700; cursor: pointer; display: flex; gap: 6px; align-items: center; }

    .filter-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
    .input-group { position: relative; display: flex; align-items: center; }
    .input-icon { position: absolute; left: 12px; color: #94a3b8; }
    .input-group input, .input-group select { width: 100%; padding: 12px 12px 12px 40px; border: 1px solid #e2e8f0; borderRadius: 10px; outline-color: #3b82f6; font-size: 0.9rem; background: #fff; }
    .date-group { display: flex; align-items: center; gap: 8px; background: #fff; border: 1px solid #e2e8f0; borderRadius: 10px; padding: 0 10px; }
    .date-input { position: relative; flex: 1; display: flex; align-items: center; }
    .date-input input { border: none; padding: 12px 5px; width: 100%; font-size: 0.85rem; outline: none; background: transparent; }
    .date-input svg { color: #94a3b8; }

    .history-table { border: 1px solid #f1f5f9; border-radius: 12px; overflow: hidden; margin-top: 10px; }
    .table-header { display: grid; grid-template-columns: 40px 1fr 200px 200px; gap: 16px; padding: 14px 16px; background: #f8fafc; border-bottom: 2px solid #f1f5f9; font-weight: 800; font-size: 0.75rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .table-row { display: grid; grid-template-columns: 40px 1fr 200px 200px; gap: 16px; padding: 16px; border-bottom: 1px solid #f8fbfc; align-items: center; transition: 0.2s; }
    .table-row:hover { background: #f8fafc; }
    .table-row.selected { background: #eff6ff; border-left: 4px solid #3b82f6; padding-left: 12px; }
    .col-user { color: #1e293b; font-weight: 600; font-size: 0.9rem; }
    .col-time { color: #64748b; font-size: 0.85rem; font-family: 'Inter', sans-serif; }
    .mobile-meta { display: none; }

    .page-nav { width: 40px; height: 40px; borderRadius: 10px; border: 1px solid #e2e8f0; background: white; cursor: pointer; display: flex; align-items: center; justifyContent: center; color: #64748b; transition: 0.2s; }
    .page-nav:hover:not(:disabled) { border-color: #3b82f6; color: #3b82f6; background: #eff6ff; }
    .page-nav:disabled { opacity: 0.3; cursor: not-allowed; }
    
    .spinner { width: 40px; height: 40px; border: 4px solid #f1f5f9; border-top: 4px solid #3b82f6; borderRadius: 50%; animation: spin 1s linear infinite; margin: 0 auto; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

    @media (max-width: 899px) {
        .table-header { grid-template-columns: 40px 1fr; }
        .table-row { grid-template-columns: 40px 1fr; }
        .hide-mobile { display: none; }
        .mobile-meta { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; font-size: 0.75rem; color: #94a3b8; }
        .mobile-meta span { display: flex; align-items: center; gap: 6px; }
    }
`;
document.head.appendChild(styleSheet);

export default AdminHistori;