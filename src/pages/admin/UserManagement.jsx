import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../../firebase/firebaseConfig';
import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc, query, where, orderBy, limit, writeBatch } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { 
    Users, Search, Shield, CheckCircle, XCircle, KeyRound, Trash2,
    ChevronDown, Building2, UserCog, Save, Loader2, ChevronLeft, 
    ChevronRight, ChevronUp, MessageSquare, X, History, Calendar,
    CheckSquare, Square, Pencil, Mail, AlertTriangle, MoreHorizontal, ChevronsUpDown
} from 'lucide-react';

const ITEMS_PER_PAGE = 10;

// --- HELPER: DATE PARSER (FIX KONSISTENSI TANGGAL) ---
const parseDate = (dateVal) => {
    if (!dateVal) return '-';
    // Jika format Firestore Timestamp (seconds)
    if (dateVal.seconds) return new Date(dateVal.seconds * 1000).toLocaleDateString('id-ID');
    // Jika format String ISO
    return new Date(dateVal).toLocaleDateString('id-ID');
};

const parseDateTime = (dateVal) => {
    if (!dateVal) return '-';
    if (dateVal.seconds) return new Date(dateVal.seconds * 1000).toLocaleString('id-ID');
    return new Date(dateVal).toLocaleString('id-ID');
};

// --- 1. COMPONENT: TOAST NOTIFICATION ---
const Toast = ({ message, type, onClose }) => {
    useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
    const bg = type === 'error' ? '#ef4444' : '#10b981';
    return (
        <div style={{ position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)', backgroundColor: bg, color: 'white', padding: '12px 24px', borderRadius: 50, zIndex: 9999, boxShadow: '0 10px 30px rgba(0,0,0,0.2)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10, animation: 'slideUp 0.3s ease' }}>
            {type === 'error' ? <XCircle size={20}/> : <CheckCircle size={20}/>} {message}
        </div>
    );
};

// --- 2. COMPONENT: SIDE DRAWER (DETAIL & LOGS) ---
const UserDetailDrawer = ({ user, onClose, auditLogs }) => {
    if (!user) return null;
    return (
        <>
            <div className="drawer-overlay" onClick={onClose} />
            <div className="drawer-panel">
                <div className="drawer-header">
                    <h3>Detail Pengguna</h3>
                    <button onClick={onClose} className="close-btn"><X size={24}/></button>
                </div>
                <div className="drawer-body">
                    {/* Profil Header */}
                    <div className="drawer-profile">
                        <div className="drawer-avatar-lg">
                            {user.namaTampilan?.charAt(0).toUpperCase()}
                        </div>
                        <div className="drawer-profile-info">
                            <h4>{user.namaTampilan}</h4>
                            <p>{user.email}</p>
                            <span className={`status-pill ${user.role_global}`}>{user.role_global === 'master' ? 'Master Admin' : (user.role_global === 'admin' ? 'Administrator' : 'Mahasiswa')}</span>
                        </div>
                    </div>

                    {/* Metadata */}
                    <div className="drawer-section">
                        <h5><Calendar size={14}/> Informasi Akademik</h5>
                        <div className="meta-card">
                            <div className="meta-row">
                                <span>NIM</span>
                                <strong>{user.nim || '-'}</strong>
                            </div>
                            <div className="meta-row">
                                <span>Terdaftar</span>
                                <strong>{parseDate(user.createdAt)}</strong>
                            </div>
                        </div>
                    </div>

                    {/* History Jabatan */}
                    <div className="drawer-section">
                        <h5><Shield size={14}/> Jabatan Saat Ini</h5>
                        {user.assignments && user.assignments.length > 0 ? (
                            <div className="role-list">
                                {user.assignments.map((role, idx) => (
                                    <div key={idx} className="role-card">
                                        <div className="role-head">
                                            <strong>{role.position}</strong>
                                            <span className="period-badge">{role.period || '2025/2026'}</span>
                                        </div>
                                        <p className="role-org">{role.entity_name}</p>
                                        <p className="role-div">{role.division}</p>
                                    </div>
                                ))}
                            </div>
                        ) : <div className="empty-box">Tidak ada jabatan aktif.</div>}
                    </div>

                    {/* Audit Logs */}
                    <div className="drawer-section">
                        <h5><History size={14}/> Log Aktivitas Terakhir</h5>
                        <div className="audit-timeline">
                            {auditLogs.length > 0 ? auditLogs.map((log, idx) => (
                                <div key={idx} className="log-item">
                                    <div className="log-line"></div>
                                    <div className="log-dot"></div>
                                    <div className="log-content">
                                        <p>{log.action}</p>
                                        <span>{parseDateTime(log.timestamp)}</span>
                                    </div>
                                </div>
                            )) : <div className="empty-box">Belum ada aktivitas.</div>}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

// --- MAIN COMPONENT ---
const UserManagement = () => {
    // Data States
    const [users, setUsers] = useState([]);
    const [masterOrg, setMasterOrg] = useState({});
    const [loading, setLoading] = useState(true);
    
    // UI States
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('Semua');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState({ key: 'namaTampilan', direction: 'asc' });
    const [toast, setToast] = useState(null);
    const [confirmModal, setConfirmModal] = useState(null);

    // Feature States
    const [selectedIds, setSelectedIds] = useState(new Set()); // Bulk
    const [detailUser, setDetailUser] = useState(null); // Drawer
    const [userAuditLogs, setUserAuditLogs] = useState([]);

    // Modal States
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    
    const [assignMode, setAssignMode] = useState('single'); 
    const [assignForm, setAssignForm] = useState({ orgId: '', division: '', position: '', period: '2025/2026' });
    const [editForm, setEditForm] = useState({ id: '', namaTampilan: '', nim: '', email: '' });
    
    const [isSaving, setIsSaving] = useState(false);

    // --- FIX: CSS Injection moved to useEffect to prevent memory leak ---
    useEffect(() => {
        const styleSheet = document.createElement("style");
        styleSheet.innerText = cssStyles;
        document.head.appendChild(styleSheet);
        return () => {
            document.head.removeChild(styleSheet);
        };
    }, []);

    // --- 1. FETCH DATA ---
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [usersSnap, masterSnap] = await Promise.all([
                    getDocs(collection(db, 'users')),
                    getDoc(doc(db, 'master_metadata', 'organization_structure'))
                ]);
                
                const userList = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setUsers(userList.filter(u => u.role_global !== 'master')); 
                
                if (masterSnap.exists()) setMasterOrg(masterSnap.data().entities);
            } catch (error) {
                console.error("Error:", error);
                showToast("Gagal memuat data", "error");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // --- 2. FETCH LOGS (LAZY) ---
    useEffect(() => {
        if (detailUser) {
            const fetchLogs = async () => {
                try {
                    const q = query(collection(db, 'histori'), where('email', '==', detailUser.email), orderBy('timestamp', 'desc'), limit(5));
                    const snap = await getDocs(q);
                    setUserAuditLogs(snap.docs.map(d => d.data()));
                } catch (e) { console.error(e); }
            };
            fetchLogs();
        }
    }, [detailUser]);

    const showToast = (msg, type = 'success') => setToast({ msg, type });

    // --- 3. FILTER & SORT ENGINE ---
    const processedUsers = useMemo(() => {
        let result = users;
        
        // Filter Tab
        if (activeTab === 'Pending') result = result.filter(u => u.role_global === 'mahasiswa' && u.registration_note);
        else if (activeTab === 'Admin') result = result.filter(u => u.role_global === 'admin');
        else if (activeTab !== 'Semua') result = result.filter(u => u.assignments?.some(a => a.type === activeTab.toLowerCase()));

        // Search
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(u => 
                u.namaTampilan?.toLowerCase().includes(lower) || 
                u.email?.toLowerCase().includes(lower) || 
                u.nim?.includes(lower)
            );
        }

        // Sort
        result.sort((a, b) => {
            const valA = (a[sortConfig.key] || '').toString().toLowerCase();
            const valB = (b[sortConfig.key] || '').toString().toLowerCase();
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return result;
    }, [users, activeTab, searchTerm, sortConfig]);

    const paginatedUsers = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return processedUsers.slice(start, start + ITEMS_PER_PAGE);
    }, [currentPage, processedUsers]);

    const totalPages = Math.ceil(processedUsers.length / ITEMS_PER_PAGE);

    // --- 4. ACTION HANDLERS ---

    // A. Edit Profile
    const handleOpenEdit = (user) => {
        setEditForm({ id: user.id, namaTampilan: user.namaTampilan, nim: user.nim || '', email: user.email });
        setIsEditModalOpen(true);
    };

    const handleSaveProfile = async () => {
        if (!editForm.namaTampilan) return showToast("Nama tidak boleh kosong", "error");
        setIsSaving(true);
        try {
            const userRef = doc(db, 'users', editForm.id);
            await updateDoc(userRef, {
                namaTampilan: editForm.namaTampilan,
                nim: editForm.nim
            });
            
            setUsers(prev => prev.map(u => u.id === editForm.id ? { ...u, namaTampilan: editForm.namaTampilan, nim: editForm.nim } : u));
            showToast("Profil berhasil diperbarui");
            setIsEditModalOpen(false);
        } catch (error) {
            showToast("Gagal update profil", "error");
        } finally { setIsSaving(false); }
    };

    // B. Assign Role
    const handleOpenAssign = (mode, user = null) => {
        setAssignMode(mode);
        if (mode === 'single') setDetailUser(user);
        setAssignForm({ orgId: '', division: '', position: '', period: '2025/2026' });
        setIsAssignModalOpen(true);
    };

    const handleSaveRole = async () => {
        if (!assignForm.orgId || !assignForm.division || !assignForm.position) return showToast("Data tidak lengkap", "error");
        
        setIsSaving(true);
        try {
            const orgData = masterOrg[assignForm.orgId];
            const newRole = {
                entity_id: assignForm.orgId,
                entity_name: orgData.name,
                type: orgData.type,
                division: assignForm.division,
                position: assignForm.position,
                period: assignForm.period,
                assignedAt: new Date().toISOString()
            };

            const batch = writeBatch(db);
            const targetIds = assignMode === 'single' ? [detailUser.id] : Array.from(selectedIds);
            
            // Variabel sementara untuk Optimistic Update
            const updatedUserMaps = [];

            targetIds.forEach(uid => {
                const u = users.find(x => x.id === uid);
                
                // --- FIX: Cek Duplikasi Jabatan ---
                const currentAssignments = u.assignments || [];
                const isDuplicate = currentAssignments.some(a => 
                    a.entity_id === newRole.entity_id && 
                    a.division === newRole.division && 
                    a.position === newRole.position
                );

                if (!isDuplicate) {
                    const updatedAssignments = [...currentAssignments, newRole];
                    batch.update(doc(db, 'users', uid), {
                        role_global: 'admin',
                        assignments: updatedAssignments
                    });
                    
                    // Simpan state baru untuk UI update
                    updatedUserMaps.push({ id: uid, assignments: updatedAssignments });
                }
            });

            await batch.commit();
            
            // Optimistic Update
            setUsers(prev => prev.map(u => {
                const update = updatedUserMaps.find(up => up.id === u.id);
                return update ? { ...u, role_global: 'admin', assignments: update.assignments } : u;
            }));
            
            showToast("Jabatan berhasil diberikan!");
            setIsAssignModalOpen(false);
            setSelectedIds(new Set());
        } catch (error) { 
            console.error(error);
            showToast("Gagal menyimpan", "error"); 
        } 
        finally { setIsSaving(false); }
    };

    // C. Remove Role
    const handleRemoveRole = async (userId, idx) => {
        if(!window.confirm("Cabut jabatan ini?")) return;
        try {
            const target = users.find(u => u.id === userId);
            const newAssigns = [...target.assignments];
            newAssigns.splice(idx, 1);
            const newRoleGlobal = newAssigns.length === 0 ? 'mahasiswa' : 'admin';

            await updateDoc(doc(db, 'users', userId), { assignments: newAssigns, role_global: newRoleGlobal });
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, assignments: newAssigns, role_global: newRoleGlobal } : u));
            showToast("Jabatan dicabut");
        } catch (e) { showToast("Gagal hapus", "error"); }
    };

    // D. Delete User
    const handleDeleteUser = async () => {
        try {
            await deleteDoc(doc(db, 'users', confirmModal.userId));
            setUsers(prev => prev.filter(u => u.id !== confirmModal.userId));
            showToast("User dihapus");
            setConfirmModal(null);
        } catch (e) { showToast("Gagal hapus user", "error"); }
    };

    // E. Reset Password
    const handleResetPass = async (email) => {
        try { await sendPasswordResetEmail(auth, email); showToast(`Link reset terkirim ke ${email}`); } 
        catch (e) { showToast("Gagal kirim link", "error"); }
    };

    // --- 5. BULK SELECTION ---
    const toggleSelectAll = (e) => {
        if (e.target.checked) setSelectedIds(new Set(paginatedUsers.map(u => u.id)));
        else setSelectedIds(new Set());
    };
    const toggleSelectUser = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
        setSelectedIds(newSet);
    };

    // --- RENDER ---
    return (
        <div className="user-mgmt-container">
            {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
            
            {/* DRAWER */}
            {detailUser && !isAssignModalOpen && (
                <UserDetailDrawer user={detailUser} auditLogs={userAuditLogs} onClose={() => setDetailUser(null)} />
            )}

            <div className="page-header">
                <div>
                    <h1 className="page-title">Manajemen Pengguna</h1>
                    <p className="page-subtitle">Kelola akun, verifikasi pendaftaran, dan struktur organisasi.</p>
                </div>
            </div>

            {/* CONTROL BAR */}
            <div className="controls-card">
                <div className="control-row">
                    <div className="search-wrapper">
                        <Search size={18} className="search-icon"/>
                        <input placeholder="Cari Nama / NIM..." value={searchTerm} onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}} />
                    </div>
                    <div className="tabs-wrapper">
                        {['Semua', 'Pending', 'Admin', 'Eksekutif', 'Legislatif', 'Yudikatif', 'UKM'].map(tab => (
                            <button key={tab} className={`tab-pill ${activeTab === tab ? 'active' : ''}`} onClick={() => {setActiveTab(tab); setCurrentPage(1);}}>{tab}</button>
                        ))}
                    </div>
                </div>
            </div>

            {/* BULK FLOATING BAR */}
            {selectedIds.size > 0 && (
                <div className="bulk-bar">
                    <div className="bulk-count"><CheckCircle size={18}/> {selectedIds.size} Dipilih</div>
                    <div className="bulk-btns">
                        <button className="btn-bulk primary" onClick={() => handleOpenAssign('bulk')}><UserCog size={16}/> Assign Jabatan</button>
                    </div>
                </div>
            )}

            {/* DATA TABLE */}
            <div className="table-container">
                {loading ? <div className="loading-box"><Loader2 className="spin" size={32}/> Memuat Data...</div> : (
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th style={{width: 40}}><input type="checkbox" onChange={toggleSelectAll} checked={paginatedUsers.length > 0 && paginatedUsers.every(u => selectedIds.has(u.id))}/></th>
                                <th onClick={() => setSortConfig({key: 'namaTampilan', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'})} style={{cursor: 'pointer'}}>
                                    <div className="th-content">Mahasiswa <ChevronsUpDown size={14}/></div>
                                </th>
                                <th>Status</th>
                                <th>Jabatan Aktif</th>
                                <th style={{textAlign: 'right'}}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedUsers.length > 0 ? paginatedUsers.map(user => (
                                <tr key={user.id} className={selectedIds.has(user.id) ? 'selected' : ''}>
                                    <td><input type="checkbox" checked={selectedIds.has(user.id)} onChange={() => toggleSelectUser(user.id)}/></td>
                                    <td>
                                        <div className="user-cell" onClick={() => setDetailUser(user)}>
                                            <div className="avatar">{user.namaTampilan?.charAt(0)}</div>
                                            <div>
                                                <div className="name">{user.namaTampilan}</div>
                                                <div className="meta">{user.nim || 'Tanpa NIM'} • {user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="status-cell">
                                            <span className={`badge ${user.role_global}`}>{user.role_global}</span>
                                            {user.registration_note && (
                                                <div className="note-badge" title={user.registration_note}>
                                                    <MessageSquare size={12}/> Request
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="roles-cell">
                                            {user.assignments?.map((role, idx) => (
                                                <span key={idx} className="role-tag">
                                                    {role.entity_name} ({role.position})
                                                    <button onClick={() => handleRemoveRole(user.id, idx)}><X size={10}/></button>
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="action-cell">
                                            <button className="btn-icon" title="Edit Profil" onClick={() => handleOpenEdit(user)}><Pencil size={16}/></button>
                                            <button className="btn-icon" title="Atur Jabatan" onClick={() => handleOpenAssign('single', user)}><UserCog size={16}/></button>
                                            <button className="btn-icon" title="Reset Password" onClick={() => handleResetPass(user.email)}><KeyRound size={16}/></button>
                                            <button className="btn-icon danger" title="Hapus" onClick={() => setConfirmModal({userId: user.id, name: user.namaTampilan})}><Trash2 size={16}/></button>
                                        </div>
                                    </td>
                                </tr>
                            )) : <tr><td colSpan="5" className="empty-row">Tidak ada data ditemukan.</td></tr>}
                        </tbody>
                    </table>
                )}
            </div>

            {/* PAGINATION */}
            {!loading && totalPages > 1 && (
                <div className="pagination-bar">
                    <span>Halaman {currentPage} dari {totalPages}</span>
                    <div className="page-btns">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}><ChevronLeft size={16}/></button>
                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}><ChevronRight size={16}/></button>
                    </div>
                </div>
            )}

            {/* --- MODAL EDIT PROFILE (NEW) --- */}
            {isEditModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-head">
                            <h3>Edit Profil Pengguna</h3>
                            <button onClick={() => setIsEditModalOpen(false)}><X size={24}/></button>
                        </div>
                        <div className="modal-body">
                            <div className="input-group">
                                <label>Nama Lengkap</label>
                                <input value={editForm.namaTampilan} onChange={(e) => setEditForm({...editForm, namaTampilan: e.target.value})} />
                            </div>
                            <div className="input-group">
                                <label>NIM</label>
                                <input value={editForm.nim} onChange={(e) => setEditForm({...editForm, nim: e.target.value})} />
                            </div>
                            <div className="input-group disabled">
                                <label>Email (Read-only)</label>
                                <input value={editForm.email} disabled />
                            </div>
                        </div>
                        <div className="modal-foot">
                            <button className="btn-sec" onClick={() => setIsEditModalOpen(false)}>Batal</button>
                            <button className="btn-pri" onClick={handleSaveProfile} disabled={isSaving}>
                                {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL ASSIGN ROLE --- */}
            {isAssignModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-head">
                            <h3>{assignMode === 'bulk' ? `Assign Massal (${selectedIds.size} User)` : 'Kelola Jabatan'}</h3>
                            <button onClick={() => setIsAssignModalOpen(false)}><X size={24}/></button>
                        </div>
                        <div className="modal-body">
                            {assignMode === 'single' && detailUser && (
                                <div className="user-summ-box">
                                    <strong>{detailUser.namaTampilan}</strong>
                                    {detailUser.registration_note && <div className="user-note"><MessageSquare size={12}/> {detailUser.registration_note}</div>}
                                </div>
                            )}
                            <div className="input-group">
                                <label>Periode</label>
                                <input value={assignForm.period} onChange={(e) => setAssignForm({...assignForm, period: e.target.value})} placeholder="Contoh: 2025/2026"/>
                            </div>
                            <div className="input-group">
                                <label>Organisasi</label>
                                <select value={assignForm.orgId} onChange={(e) => setAssignForm({...assignForm, orgId: e.target.value, division: '', position: ''})}>
                                    <option value="">-- Pilih --</option>
                                    {Object.values(masterOrg).map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Divisi</label>
                                <select value={assignForm.division} onChange={(e) => setAssignForm({...assignForm, division: e.target.value})} disabled={!assignForm.orgId}>
                                    <option value="">-- Pilih --</option>
                                    {assignForm.orgId && masterOrg[assignForm.orgId]?.divisions.map((d, i) => <option key={i} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Jabatan</label>
                                <select value={assignForm.position} onChange={(e) => setAssignForm({...assignForm, position: e.target.value})} disabled={!assignForm.orgId}>
                                    <option value="">-- Pilih --</option>
                                    {assignForm.orgId && masterOrg[assignForm.orgId]?.positions.map((p, i) => <option key={i} value={p}>{p}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="modal-foot">
                            <button className="btn-sec" onClick={() => setIsAssignModalOpen(false)}>Batal</button>
                            <button className="btn-pri" onClick={handleSaveRole} disabled={isSaving}>{isSaving ? 'Menyimpan...' : 'Simpan'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL CONFIRM DELETE --- */}
            {confirmModal && (
                <div className="modal-overlay">
                    <div className="modal-content small">
                        <div className="modal-head danger"><h3>Hapus Pengguna?</h3></div>
                        <div className="modal-body">
                            <p>Yakin hapus akun <strong>{confirmModal.name}</strong>? Tindakan ini permanen.</p>
                        </div>
                        <div className="modal-foot">
                            <button className="btn-sec" onClick={() => setConfirmModal(null)}>Batal</button>
                            <button className="btn-danger" onClick={handleDeleteUser}>Ya, Hapus</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- CSS STYLES (CLEAN & PROFESSIONAL) ---
const cssStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    .user-mgmt-container { font-family: 'Inter', sans-serif; color: #1e293b; padding: 32px; max-width: 1400px; margin: 0 auto; }
    
    /* --- HEADER & STATS --- */
    .page-header { margin-bottom: 32px; display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; flex-wrap: wrap; }
    .page-title { font-size: 2rem; font-weight: 800; color: #0f172a; margin: 0 0 8px 0; letter-spacing: -0.5px; }
    .page-subtitle { color: #64748b; font-size: 1rem; margin: 0; }
    
    /* --- CONTROLS BAR --- */
    .controls-card { display: flex; flex-direction: column; gap: 20px; background: white; padding: 24px; border-radius: 16px; border: 1px solid #e2e8f0; margin-bottom: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .control-row { display: flex; justify-content: space-between; align-items: center; gap: 20px; flex-wrap: wrap; }
    
    .search-wrapper { position: relative; flex: 1; min-width: 300px; }
    .search-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; }
    .search-wrapper input { width: 100%; padding: 14px 14px 14px 48px; border-radius: 12px; border: 1px solid #cbd5e0; font-size: 0.95rem; transition: all 0.2s; background: #f8fafc; }
    .search-wrapper input:focus { border-color: #3b82f6; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); outline: none; background: white; }
    
    .tabs-wrapper { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none; }
    .tab-pill { padding: 10px 20px; border-radius: 50px; border: 1px solid transparent; background: #f1f5f9; color: #64748b; font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
    .tab-pill:hover { background: #e2e8f0; color: #334155; }
    .tab-pill.active { background: #0f172a; color: white; border-color: #0f172a; box-shadow: 0 4px 10px rgba(15, 23, 42, 0.2); }

    /* --- TABLE STYLING --- */
    .table-container { background: white; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); margin-bottom: 24px; position: relative; }
    .modern-table { width: 100%; border-collapse: collapse; min-width: 900px; }
    .modern-table thead th { position: sticky; top: 0; background: #f8fafc; padding: 18px 24px; text-align: left; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: #475569; border-bottom: 1px solid #e2e8f0; letter-spacing: 0.5px; z-index: 10; }
    .th-content { display: flex; align-items: center; gap: 8px; }
    .modern-table tbody td { padding: 18px 24px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; transition: background 0.1s; }
    .modern-table tbody tr:last-child td { border-bottom: none; }
    .modern-table tbody tr:hover td { background: #f8fafc; }
    .modern-table tbody tr.selected td { background: #eff6ff; }

    /* Cells */
    .user-cell { display: flex; align-items: center; gap: 16px; cursor: pointer; }
    .avatar { width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; font-weight: 700; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.25); text-shadow: 0 1px 2px rgba(0,0,0,0.1); }
    .name { font-weight: 600; color: #0f172a; font-size: 0.95rem; margin-bottom: 2px; }
    .meta { font-size: 0.8rem; color: #64748b; }
    
    .status-cell { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
    .badge { padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .badge.mahasiswa { background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; }
    .badge.admin { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
    .badge.master { background: #fae8ff; color: #86198f; border: 1px solid #e9d5ff; }
    .note-badge { background: #fff7ed; color: #c2410c; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; display: flex; gap: 6px; align-items: center; border: 1px solid #ffedd5; }

    .roles-cell { display: flex; flex-wrap: wrap; gap: 6px; max-width: 280px; }
    .role-tag { background: white; color: #0f172a; border: 1px solid #e2e8f0; padding: 4px 8px 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 500; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
    .role-tag button { background: #f1f5f9; border: none; padding: 2px; cursor: pointer; color: #64748b; display: flex; border-radius: 4px; transition: all 0.2s; }
    .role-tag button:hover { background: #fee2e2; color: #ef4444; }

    .action-cell { display: flex; gap: 8px; justify-content: flex-end; }
    .btn-icon { width: 34px; height: 34px; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748b; transition: all 0.2s; background: white; }
    .btn-icon:hover { background: #f8fafc; border-color: #cbd5e0; color: #0f172a; transform: translateY(-1px); box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    .btn-icon.danger:hover { background: #fef2f2; color: #ef4444; border-color: #fca5a5; }

    /* --- PAGINATION (IMPROVED) --- */
    .pagination-bar { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; border-top: 1px solid #e2e8f0; background: #fafafa; }
    .pagination-bar span { font-size: 0.9rem; color: #64748b; font-weight: 500; }
    .page-btns { display: flex; gap: 8px; }
    .page-btns button { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: white; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; color: #475569; transition: all 0.2s; }
    .page-btns button:hover:not(:disabled) { background: #3b82f6; color: white; border-color: #3b82f6; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.2); }
    .page-btns button:disabled { background: #f1f5f9; color: #cbd5e0; cursor: not-allowed; }

    /* --- DRAWER (SIDE PANEL) --- */
    .drawer-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); z-index: 1000; backdrop-filter: blur(4px); transition: opacity 0.3s; }
    .drawer-panel { 
        position: fixed; 
        top: 50%; 
        left: 50%; 
        transform: translate(-50%, -50%); /* Posisi tepat di tengah */
        width: 90%; 
        max-width: 500px; 
        height: auto; 
        max-height: 85vh; /* Agar tidak kepotong jika layar pendek */
        background: white; 
        z-index: 1001; 
        box-shadow: 0 20px 60px rgba(0,0,0,0.3); 
        display: flex; 
        flex-direction: column; 
        border-radius: 16px; /* Sudut membulat */
        animation: zoomIn 0.2s ease; /* Animasi muncul dari tengah */
    }
    
    .drawer-header { padding: 20px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.9); backdrop-filter: blur(10px); position: sticky; top: 0; z-index: 20; }
    .drawer-header h3 { margin: 0; font-size: 1.25rem; font-weight: 700; color: #0f172a; }
    
    .drawer-body { flex: 1; overflow-y: auto; padding: 0; }
    
    /* Drawer Sections */
    .drawer-profile { padding: 32px 24px; background: linear-gradient(to bottom, #f8fafc, #ffffff); border-bottom: 1px solid #e2e8f0; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 16px; }
    .drawer-avatar-lg { width: 80px; height: 80px; border-radius: 24px; background: linear-gradient(135deg, #1e293b, #334155); color: white; font-size: 2rem; font-weight: 800; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 20px -5px rgba(30, 41, 59, 0.3); }
    .drawer-profile-info h4 { margin: 0 0 4px 0; font-size: 1.4rem; font-weight: 700; color: #0f172a; }
    .drawer-profile-info p { margin: 0 0 12px 0; color: #64748b; font-size: 0.95rem; }
    
    .drawer-section { padding: 24px; border-bottom: 1px solid #f1f5f9; }
    .drawer-section h5 { margin: 0 0 16px 0; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 700; display: flex; align-items: center; gap: 8px; }
    
    .meta-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
    .meta-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2e8f0; font-size: 0.9rem; }
    .meta-row:last-child { border-bottom: none; }
    .meta-row span { color: #64748b; }
    .meta-row strong { color: #0f172a; }

    .role-list { display: flex; flex-direction: column; gap: 12px; }
    .role-card { background: white; border: 1px solid #e2e8f0; padding: 16px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); transition: transform 0.2s; position: relative; overflow: hidden; }
    .role-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: #3b82f6; }
    .role-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .role-head strong { color: #0f172a; font-size: 1rem; }
    .period-badge { font-size: 0.7rem; background: #eff6ff; color: #2563eb; padding: 2px 8px; border-radius: 10px; font-weight: 700; }
    .role-org { font-weight: 600; color: #475569; margin: 0; font-size: 0.9rem; }
    .role-div { color: #94a3b8; margin: 2px 0 0 0; font-size: 0.85rem; }

    .audit-timeline { padding-left: 8px; }
    .log-item { display: flex; gap: 16px; padding-bottom: 24px; position: relative; }
    .log-line { position: absolute; left: 6px; top: 12px; bottom: 0; width: 2px; background: #e2e8f0; }
    .log-item:last-child .log-line { display: none; }
    .log-dot { width: 14px; height: 14px; border-radius: 50%; background: #fff; border: 3px solid #cbd5e0; position: relative; z-index: 2; box-shadow: 0 0 0 2px white; transition: border-color 0.2s; }
    .log-item:hover .log-dot { border-color: #3b82f6; }
    .log-content p { margin: 0 0 4px 0; font-weight: 500; font-size: 0.9rem; color: #334155; line-height: 1.4; }
    .log-content span { font-size: 0.75rem; color: #94a3b8; }

    /* Empty States */
    .empty-box { text-align: center; padding: 24px; background: #f8fafc; border-radius: 12px; color: #94a3b8; font-style: italic; font-size: 0.9rem; border: 1px dashed #e2e8f0; }
    .empty-row { text-align: center; color: #94a3b8; font-style: italic; padding: 40px !important; }

    /* Modals & Inputs */
    .modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.7); z-index: 2000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); animation: fadeIn 0.2s ease; }
    .modal-content { background: white; width: 90%; max-width: 480px; border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); overflow: hidden; animation: zoomIn 0.2s ease; }
    .modal-content.small { max-width: 400px; }
    
    .modal-head { padding: 20px 24px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; background: #fff; }
    .modal-head h3 { margin: 0; font-size: 1.15rem; font-weight: 700; color: #0f172a; }
    .modal-head.danger { background: #fef2f2; color: #991b1b; }
    .modal-head.danger h3 { color: #991b1b; }
    
    .modal-body { padding: 24px; }
    .user-summ-box { background: #f0f9ff; border: 1px solid #b9e6fe; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; }
    .user-note { margin-top: 6px; font-size: 0.85rem; color: #0369a1; display: flex; gap: 6px; align-items: center; }
    
    .input-group { margin-bottom: 16px; }
    .input-group label { display: block; margin-bottom: 8px; font-size: 0.85rem; font-weight: 600; color: #334155; }
    .input-group input, .input-group select { width: 100%; padding: 12px 14px; border-radius: 10px; border: 1px solid #cbd5e0; font-size: 0.95rem; box-sizing: border-box; transition: all 0.2s; }
    .input-group input:focus, .input-group select:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
    .input-group.disabled input { background: #f1f5f9; color: #94a3b8; cursor: not-allowed; }
    
    .modal-foot { padding: 20px 24px; border-top: 1px solid #f1f5f9; background: #f8fafc; display: flex; justify-content: flex-end; gap: 12px; }
    
    .btn-pri { padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    .btn-pri:hover { background: #1d4ed8; }
    .btn-sec { padding: 10px 20px; background: white; border: 1px solid #cbd5e0; color: #475569; border-radius: 10px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    .btn-sec:hover { background: #f1f5f9; color: #1e293b; }
    .btn-danger { padding: 10px 20px; background: #ef4444; color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    .btn-danger:hover { background: #dc2626; }

    /* Bulk Bar */
    .bulk-bar { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); background: #0f172a; padding: 10px 10px 10px 20px; border-radius: 50px; display: flex; gap: 24px; align-items: center; box-shadow: 0 20px 40px -10px rgba(0,0,0,0.4); z-index: 800; animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); border: 1px solid rgba(255,255,255,0.1); }
    .bulk-count { color: white; font-weight: 700; font-size: 0.95rem; display: flex; align-items: center; gap: 8px; }
    .btn-bulk { padding: 10px 24px; border-radius: 40px; border: none; font-weight: 600; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: transform 0.1s; }
    .btn-bulk.primary { background: #3b82f6; color: white; }
    .btn-bulk:active { transform: scale(0.95); }

    /* Animations */
    @keyframes slideLeft { from { transform: translateX(100%); } to { transform: translateX(0); } }
    @keyframes slideUp { from { transform: translate(-50%, 20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
    @keyframes zoomIn { 
        from { transform: translate(-50%, -50%) scale(0.95); opacity: 0; } 
        to { transform: translate(-50%, -50%) scale(1); opacity: 1; } 
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    /* Loading */
    .loading-box { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 60px 0; color: #64748b; }

    /* Responsive */
    @media (max-width: 768px) {
        .user-mgmt-container { padding: 16px; }
        .page-header { flex-direction: column; align-items: flex-start; gap: 16px; }
        .controls-card { padding: 16px; }
        .control-row { flex-direction: column; align-items: stretch; gap: 16px; }
        .drawer-panel { width: 100%; max-width: none; }
        td, th { padding: 16px; }
        .meta { display: none; }
        .action-cell { flex-wrap: wrap; }
    }
`;

export default UserManagement;