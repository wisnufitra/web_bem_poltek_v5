// src/pages/KelolaAdmin.js
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase/firebaseConfig';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query } from 'firebase/firestore';
import { onAuthStateChanged, sendPasswordResetEmail } from 'firebase/auth';
import { logActivity } from '../utils/logActivity';

import { Users, Shield, UserCog, UserCheck, UserX, Pencil, Mail, Save, X, Search, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

const ITEMS_PER_PAGE = 10;

// --- Komponen UI ---
const Toast = ({ message, clear }) => { useEffect(() => { const timer = setTimeout(clear, 3000); return () => clearTimeout(timer); }, [clear]); return <div style={styles.toast}>{message}</div>; };

const ConfirmationModal = ({ modalState, setModalState }) => {
    const [confirmText, setConfirmText] = useState('');
    useEffect(() => { if (modalState.isOpen) setConfirmText(''); }, [modalState.isOpen]);
    if (!modalState.isOpen) return null;
    const isConfirmationMatched = !modalState.requireConfirmationText || confirmText === modalState.requireConfirmationText;
    return ( <div style={styles.modalOverlay}><div style={{...styles.modalContent, maxWidth: '450px'}}><h3 style={styles.modalTitle}>{modalState.title}</h3><p style={styles.modalMessage}>{modalState.message}</p>{modalState.requireConfirmationText && (<div style={{marginBottom: '20px'}}><label style={styles.label}>Untuk konfirmasi, ketik: <strong style={{color: '#b91c1c'}}>{modalState.requireConfirmationText}</strong></label><input className="input" style={styles.input} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} /></div>)}<div style={styles.modalActions}><button style={styles.modalCancelButton} onClick={() => setModalState({ isOpen: false })}>Batal</button><button style={!isConfirmationMatched ? styles.disabledButton : styles.modalConfirmButton} onClick={() => { if (isConfirmationMatched) { modalState.onConfirm(); setModalState({ isOpen: false }); } }} disabled={!isConfirmationMatched}>{modalState.confirmText || 'Konfirmasi'}</button></div></div></div> );
};

const StatCard = ({ title, value, color, icon }) => ( <div style={{...styles.statCard, borderLeft: `4px solid ${color}`}}><div style={{...styles.statIconWrapper, backgroundColor: `${color}20`, color }}>{icon}</div><div><p style={styles.statTitle}>{title}</p><p style={styles.statValue}>{value}</p></div></div> );

const EditUserModal = ({ user, events, onClose, onSave, onSendResetPassword }) => {
    const [editData, setEditData] = useState(user);
    useEffect(() => { setEditData(user); }, [user]);
    return ( <div style={styles.modalOverlay}><div style={{...styles.modalContent, maxWidth: '600px'}}><div style={styles.modalHeader}><h3 style={styles.modalTitle}>Edit Profil Pengguna</h3><button onClick={onClose} style={styles.closeModalButton}><X size={24}/></button></div><div style={styles.editModalBody}><div style={styles.editSection}><h4 style={styles.sectionTitle}>Informasi Dasar</h4><label style={styles.label}>Nama Tampilan:</label><input className="input" style={styles.input} value={editData.namaTampilan} onChange={(e) => setEditData(prev => ({ ...prev, namaTampilan: e.target.value }))} />{(editData.role === 'admin' || editData.role === 'pending') && (<div><label style={styles.label}>Kementerian:</label><input className="input" style={styles.input} value={editData.kementerian || ''} onChange={(e) => setEditData(prev => ({ ...prev, kementerian: e.target.value }))} /></div>)}{(editData.role.includes('panitia')) && (<div><label style={styles.label}>Ormawa:</label><input className="input" style={styles.input} value={editData.ormawa || ''} onChange={(e) => setEditData(prev => ({ ...prev, ormawa: e.target.value }))} /></div>)}</div><div style={styles.editSection}><h4 style={styles.sectionTitle}>Pengaturan Peran & Akses</h4><label style={styles.label}>Peran (Role):</label><select className="input" style={styles.input} value={editData.role} onChange={(e) => setEditData(prev => ({ ...prev, role: e.target.value }))}><option value="pending">Menunggu (Admin)</option><option value="pending_panitia">Menunggu (Panitia)</option><option value="admin">Admin BEM</option><option value="panitia_requestor">Panitia (Requestor)</option><option value="panitia">Panitia (Event)</option></select>{editData.role === 'panitia' && (<div style={{marginTop: '16px'}}><label style={styles.label}>Event yang Dikelola:</label><select className="input" style={styles.input} value={editData.eventId || ''} onChange={(e) => setEditData(prev => ({ ...prev, eventId: e.target.value }))}><option value="">-- Tidak Ditugaskan --</option>{events.map(event => <option key={event.id} value={event.id}>{event.namaEvent}</option>)}</select></div>)}</div><div style={{...styles.editSection, backgroundColor: '#fffbe6', borderColor: '#f59e0b'}}><h4 style={{...styles.sectionTitle, color: '#b45309'}}>Tindakan Lanjutan</h4><button onClick={() => onSendResetPassword(editData.email)} className="button" style={{ backgroundColor: '#f59e0b', width: '100%', marginTop: '8px' }}><Mail size={16}/> Kirim Link Reset Password</button></div></div><div style={{...styles.modalActions, marginTop: "24px" }}><button onClick={onClose} style={styles.modalCancelButton}>Batal</button><button onClick={() => onSave(editData)} className="button" style={{ backgroundColor: '#1d4ed8'}}><Save size={16} /> Simpan Perubahan</button></div></div></div> );
};

const KelolaAdmin = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Semua');
    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState(null);
    const [toastMessage, setToastMessage] = useState('');
    const [modalState, setModalState] = useState({ isOpen: false });
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState({ key: 'namaTampilan', direction: 'ascending' });

    useEffect(() => {
        const unsubAuth = onAuthStateChanged(auth, user => { if (!user) navigate('/login'); });
        const qUsers = query(collection(db, 'users'));
        const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => { setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); setLoading(false); });
        const qEvents = query(collection(db, 'pemilihan_events'));
        const unsubscribeEvents = onSnapshot(qEvents, (snapshot) => { setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); });
        return () => { unsubAuth(); unsubscribeUsers(); unsubscribeEvents(); };
    }, [navigate]);

    const sortedAndFilteredUsers = useMemo(() => {
        let filtered = users.filter(user => {
            if (user.role === 'master') return false;
            
            // --- LOGIKA FILTER AMAN ---
            const nama = (user.namaTampilan || "").toLowerCase();
            const email = (user.email || "").toLowerCase();
            const search = searchTerm.toLowerCase();

            const matchesSearch = nama.includes(search) || email.includes(search);

            if (!matchesSearch) return false;
            switch(activeTab) {
                case 'Admin BEM': return user.role === 'admin';
                case 'Panitia': return user.role.includes('panitia');
                case 'Menunggu': return user.role.includes('pending');
                default: return true;
            }
        });
        
        // --- LOGIKA SORT AMAN ---
        filtered.sort((a, b) => {
            const aValue = (a[sortConfig.key] || '').toString().toLowerCase();
            const bValue = (b[sortConfig.key] || '').toString().toLowerCase();

            if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
        return filtered;
    }, [users, activeTab, searchTerm, sortConfig]);
    
    const paginatedUsers = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return sortedAndFilteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [currentPage, sortedAndFilteredUsers]);

    const totalPages = Math.ceil(sortedAndFilteredUsers.length / ITEMS_PER_PAGE);
    const stats = useMemo(() => ({ total: users.filter(u => u.role !== 'master').length, admin: users.filter(u => u.role === 'admin').length, panitia: users.filter(u => u.role.includes('panitia')).length, pending: users.filter(u => u.role.includes('pending')).length, }), [users]);
    const showToast = (message) => setToastMessage(message);
    const requestSort = (key) => { let direction = 'ascending'; if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending'; setSortConfig({ key, direction }); };
    const handleApprove = async (userId, userName, approveAs) => { try { await updateDoc(doc(db, 'users', userId), { role: approveAs }); await logActivity(`Menyetujui "${userName}" sebagai ${approveAs}`); showToast(`"${userName}" berhasil disetujui.`); } catch (error) { showToast("Gagal menyetujui pengguna."); } };
    const confirmDelete = (userId, userName) => { setModalState({ isOpen: true, title: 'Hapus Pengguna?', message: `Anda yakin ingin menghapus data pengguna "${userName}"?`, onConfirm: () => handleDelete(userId, userName), confirmText: 'Ya, Hapus' }); };
    const handleDelete = async (userId, userName) => { try { await deleteDoc(doc(db, 'users', userId)); await logActivity(`Menghapus akun: "${userName}"`); showToast(`Pengguna "${userName}" berhasil dihapus.`); } catch (error) { showToast("Gagal menghapus pengguna."); } };
    const handleUpdate = async (updatedData) => { const { id, ...dataToUpdate } = updatedData; if (dataToUpdate.role !== 'panitia') delete dataToUpdate.eventId; try { await updateDoc(doc(db, 'users', id), dataToUpdate); await logActivity(`Mengedit profil untuk: "${updatedData.namaTampilan}"`); showToast("Profil berhasil diperbarui."); setEditingUser(null); } catch (error) { showToast("Gagal memperbarui profil."); } };
    const confirmSendResetPassword = (email) => { setModalState({ isOpen: true, title: 'Kirim Reset Password?', message: `Kirim email untuk mengatur ulang password ke ${email}?`, onConfirm: () => handleSendResetPassword(email), confirmText: 'Ya, Kirim' }); };
    const handleSendResetPassword = async (email) => { try { await sendPasswordResetEmail(auth, email); await logActivity(`Mengirim reset password ke: "${email}"`); showToast(`Email reset password berhasil dikirim.`); } catch (error) { showToast("Gagal mengirim email reset."); } };
    const renderSortIcon = (key) => { if (sortConfig.key !== key) return <ChevronsUpDown size={14} style={{ color: '#9ca3af' }}/>; if (sortConfig.direction === 'ascending') return <ChevronUp size={14} />; return <ChevronDown size={14} />; };

    return (
        <div className="manage-users-page">
            {toastMessage && <Toast message={toastMessage} clear={() => setToastMessage('')} />}
            <ConfirmationModal modalState={modalState} setModalState={setModalState} />
            {editingUser && <EditUserModal user={editingUser} events={events} onClose={() => setEditingUser(null)} onSave={handleUpdate} onSendResetPassword={confirmSendResetPassword} />}

            <header className="page-header">
                <div><h1 className="page-title">Kelola Pengguna</h1><p className="page-subtitle">Setujui pendaftar baru dan kelola peran pengguna sistem.</p></div>
            </header>
            
            <div className="stats-grid">
                <StatCard title="Total Akun" value={stats.total} color="#3b82f6" icon={<Users size={24} />} />
                <StatCard title="Admin BEM" value={stats.admin} color="#1d4ed8" icon={<Shield size={24} />} />
                <StatCard title="Panitia (Total)" value={stats.panitia} color="#16a34a" icon={<UserCog size={24} />} />
                <StatCard title="Menunggu Persetujuan" value={stats.pending} color="#f59e0b" icon={<UserCheck size={24} />} />
            </div>

            <div className="card">
                <div className="filter-container">
                    <div className="input-with-icon">
                        <Search size={18} />
                        <input className="input" placeholder="Cari nama atau email..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
                    </div>
                </div>
                <div className="tab-container">
                    {['Semua', 'Menunggu', 'Admin BEM', 'Panitia'].map(tab => (
                        <button key={tab} onClick={() => {setActiveTab(tab); setCurrentPage(1);}} className={activeTab === tab ? 'tab active' : 'tab'}>
                            {tab} {tab === 'Menunggu' ? `(${stats.pending})` : ''}
                        </button>
                    ))}
                </div>
                
                {/* --- TAMPILAN DESKTOP (TABEL) --- */}
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th onClick={() => requestSort('namaTampilan')}><div>Pengguna {renderSortIcon('namaTampilan')}</div></th>
                                <th onClick={() => requestSort('role')}><div>Peran {renderSortIcon('role')}</div></th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? [...Array(5)].map((_, i) => (<tr key={i}><td colSpan="3" style={{ padding: '16px' }}><div className="skeleton" style={{ height: '40px' }}></div></td></tr>))
                            : paginatedUsers.length > 0 ? paginatedUsers.map(user => (
                                <tr key={user.id}>
                                    <td>
                                        <div className="user-info-cell">
                                            {/* FOTO AMAN */}
                                            <img src={user.foto || `https://ui-avatars.com/api/?name=${(user.namaTampilan || 'User').replace(/\s/g, '+')}&background=e0e7ff&color=1d4ed8&font-size=0.5`} alt={user.namaTampilan} />
                                            <div><p className="item-name">{user.namaTampilan}</p><p className="item-detail">{user.email} • {user.kementerian || user.ormawa}</p></div>
                                        </div>
                                    </td>
                                    <td><span className={`status-badge role-${user.role}`}>{user.role.replace(/_/g, ' ')}</span></td>
                                    <td>
                                        <div className="action-buttons">
                                            {user.role.includes('pending') && <button onClick={() => handleApprove(user.id, user.namaTampilan, user.role === 'pending' ? 'admin' : 'panitia_requestor')} className="action-button green"><UserCheck size={14}/> Setujui</button>}
                                            <button onClick={() => setEditingUser(user)} className="action-button yellow"><Pencil size={14}/> Edit</button>
                                            <button onClick={() => confirmDelete(user.id, user.namaTampilan)} className="action-button red"><UserX size={14}/> Hapus</button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                            : <tr><td colSpan="3" style={styles.emptyText}>Tidak ada pengguna yang cocok.</td></tr>}
                        </tbody>
                    </table>
                </div>

                {/* --- TAMPILAN MOBILE (KARTU) --- */}
                <div className="mobile-user-list">
                    {loading ? <div className="skeleton" style={{ height: '200px', borderRadius: '8px' }}></div>
                    : paginatedUsers.length > 0 ? paginatedUsers.map(user => (
                        <div key={user.id} className="mobile-user-card">
                            <div className="card-header">
                                {/* FOTO AMAN - SUDAH DIPERBAIKI DI SINI */}
                                <img src={user.foto || `https://ui-avatars.com/api/?name=${(user.namaTampilan || 'User').replace(/\s/g, '+')}&background=e0e7ff&color=1d4ed8&font-size=0.5`} alt={user.namaTampilan} />
                                <div>
                                    <p className="item-name">{user.namaTampilan}</p>
                                    <p className="item-detail">{user.email}</p>
                                </div>
                            </div>
                            <div className="card-body">
                                <div>
                                    <span className="item-label">Peran</span>
                                    <span className={`status-badge role-${user.role}`}>{user.role.replace(/_/g, ' ')}</span>
                                </div>
                                {(user.kementerian || user.ormawa) && <div>
                                    <span className="item-label">{user.kementerian ? 'Kementerian' : 'Ormawa'}</span>
                                    <p className="item-detail" style={{ margin: 0 }}>{user.kementerian || user.ormawa}</p>
                                </div>}
                            </div>
                            <div className="card-footer">
                                <div className="action-buttons">
                                    {user.role.includes('pending') && <button onClick={() => handleApprove(user.id, user.namaTampilan, user.role === 'pending' ? 'admin' : 'panitia_requestor')} className="action-button green"><UserCheck size={14}/> Setujui</button>}
                                    <button onClick={() => setEditingUser(user)} className="action-button yellow"><Pencil size={14}/> Edit</button>
                                    <button onClick={() => confirmDelete(user.id, user.namaTampilan)} className="action-button red"><UserX size={14}/> Hapus</button>
                                </div>
                            </div>
                        </div>
                    ))
                    : <p style={styles.emptyText}>Tidak ada pengguna yang cocok.</p>}
                </div>

                {totalPages > 1 && (
                    <div className="pagination">
                        <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}><ChevronLeft size={16}/> Sebelumnya</button>
                        <span>Halaman {currentPage} dari {totalPages}</span>
                        <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>Berikutnya <ChevronRight size={16}/></button>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- STYLES (Tetap sama, tidak perlu diubah) ---
const styles = { toast: { position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#1e293b', color: 'white', padding: '12px 24px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 2000 }, modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'}, modalContent: { backgroundColor: 'white', padding: '24px', borderRadius: '12px', width: '100%', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', maxHeight: '90vh', overflowY: 'auto' }, modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '24px' }, modalTitle: { margin: 0, color: '#1e293b', fontSize: '1.25rem' }, closeModalButton: { background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }, editModalBody: { display: 'flex', flexDirection: 'column', gap: '24px' }, editSection: { backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }, sectionTitle: { marginTop: 0, marginBottom: '16px', color: '#334155', fontSize: '1rem', fontWeight: '600' }, modalMessage: { margin: '0 0 20px 0', color: '#475569', lineHeight: '1.6' }, modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '12px' }, modalCancelButton: { padding: '10px 20px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }, modalConfirmButton: { padding: '10px 20px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }, disabledButton: { padding: '10px 20px', backgroundColor: '#94a3b8', color: '#e2e8f0', border: 'none', borderRadius: '8px', cursor: 'not-allowed', fontWeight: '600' }, label: { display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#334155', fontWeight: '600' }, emptyText: { textAlign: 'center', color: '#94a3b8', padding: '40px 0' }, statCard: { display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }, statIconWrapper: { borderRadius: '8px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }, statValue: { margin: 0, color: '#1e293b', fontSize: '1.75rem', fontWeight: '700' }, statTitle: { margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem' }, };

const styleSheet = document.createElement("style");
styleSheet.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    .manage-users-page { font-family: 'Inter', sans-serif; background-color: #f8fafc; min-height: 100vh; padding: 20px; }
    .page-header { margin-bottom: 24px; }
    .page-title { color: #1e293b; font-size: 1.75rem; font-weight: 700; margin: 0; }
    .page-subtitle { color: #64748b; font-size: 1rem; margin: 8px 0 0 0; }
    .card { background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); overflow: hidden; }
    .skeleton { background-color: #e2e8f0; border-radius: 4px; animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    
    .filter-container { padding: 16px; border-bottom: 1px solid #f1f5f9; }
    .input-with-icon { position: relative; }
    .input-with-icon svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #9ca3af; }
    .input { width: 100%; box-sizing: border-box; padding: 10px 12px 10px 40px; border-radius: 8px; border: 1px solid #cbd5e0; font-size: 1rem; }
    .input:focus { outline: none; border-color: #1d4ed8; box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.2); }
    
    .tab-container { display: flex; flex-wrap: wrap; gap: 8px; padding: 16px; border-bottom: 1px solid #f1f5f9;}
    .tab { padding: 8px 16px; border-radius: 8px; border: 1px solid transparent; background: none; cursor: pointer; font-size: 0.9rem; font-weight: 600; color: #64748b; white-space: nowrap; transition: all 0.2s; }
    .tab:hover { background-color: #f1f5f9; }
    .tab.active { color: #1d4ed8; background-color: #e0e7ff; border-color: #a5b4fc; }
    
    .button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; }

    /* --- Mobile View --- */
    .stats-grid { display: grid; grid-template-columns: 1fr; gap: 12px; margin-bottom: 24px; }
    .table-wrapper { display: none; }
    .mobile-user-list { display: flex; flex-direction: column; gap: 12px; padding: 16px; }
    .mobile-user-card { border: 1px solid #e2e8f0; border-radius: 8px; background-color: white; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .card-header { display: flex; align-items: center; gap: 15px; padding: 12px; border-bottom: 1px solid #f1f5f9; }
    .card-body { padding: 12px; display: flex; flex-direction: column; gap: 12px; }
    .card-footer { padding: 12px; border-top: 1px solid #f1f5f9; }
    
    .user-info-cell img { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; }
    .item-name { margin: 0; font-weight: 600; color: #1e293b; font-size: 1rem; }
    .item-detail { margin: 0; font-size: 0.8rem; color: #64748b; word-break: break-all; }
    .item-label { font-size: 0.75rem; color: #9ca3af; font-weight: 500; margin-bottom: 2px; }
    
    .status-badge { padding: 4px 10px; border-radius: 9999px; font-weight: 600; font-size: 0.75rem; text-transform: capitalize; display: inline-block; width: fit-content; }
    .role-admin { background-color: #dbeafe; color: #1e40af; }
    .role-panitia, .role-panitia_requestor { background-color: #dcfce7; color: #166534; }
    .role-pending, .role-pending_panitia { background-color: #fef9c3; color: #a16207; }
    
    .action-buttons { display: flex; flex-wrap: wrap; gap: 8px; }
    .action-button { display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.8rem; border: 1px solid; }
    .action-button.green { background-color: #dcfce7; color: #166534; border-color: #86efac; }
    .action-button.yellow { background-color: #fef9c3; color: #a16207; border-color: #fde047; }
    .action-button.red { background-color: #fee2e2; color: #991b1b; border-color: #fca5a5; }
    
    .pagination { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 0.9rem; }
    .pagination button { display: inline-flex; align-items: center; gap: 4px; padding: 8px 12px; background-color: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; font-weight: 600; }
    .pagination button:disabled { background-color: #f8fafc; color: #cbd5e0; cursor: not-allowed; }

    /* --- Tampilan Desktop --- */
    @media (min-width: 768px) {
        .manage-users-page { padding: 40px; }
        .page-title { font-size: 2rem; }
        .stats-grid { grid-template-columns: repeat(4, 1fr); gap: 24px; }
        
        .table-wrapper { display: block; }
        .mobile-user-list { display: none; }
        
        table { width: 100%; border-collapse: collapse; }
        th { padding: 12px 24px; text-align: left; background-color: #f8fafc; color: #64748b; font-weight: 600; font-size: 0.8rem; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
        th div { display: flex; align-items: center; gap: 4px; cursor: pointer; }
        td { padding: 16px 24px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        .user-info-cell img { width: 50px; height: 50px; }
        
        .filter-container { padding: 24px; }
        .tab-container { padding: 0 24px; flex-wrap: nowrap; overflow-x: visible; }
        .tab { font-size: 1rem; padding: 16px; margin-right: 24px; border-bottom: 2px solid transparent; border-radius: 0; }
        .tab.active { border-bottom: 2px solid #1d4ed8; background-color: transparent; }
        
        .pagination { padding: 16px 24px; }
    }
`;
document.head.appendChild(styleSheet);

export default KelolaAdmin;