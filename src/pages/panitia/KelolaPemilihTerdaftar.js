import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../../firebase/firebaseConfig';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, writeBatch } from 'firebase/firestore';
import { onAuthStateChanged, sendPasswordResetEmail } from 'firebase/auth';
import { logActivity } from '../../utils/logActivity';

// 1. Impor semua ikon yang dibutuhkan
import { Search, ListFilter, UserCheck, Trash2, RotateCcw, ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp, ChevronDown, Inbox, KeyRound } from 'lucide-react';

const prodiOptions = ["Semua", "Teknokimia Nuklir", "Elektronika Instrumentasi", "Elektro Mekanika"];
const ITEMS_PER_PAGE = 10;

// --- Komponen UI ---
const Toast = ({ message, clear }) => {
    useEffect(() => {
        const timer = setTimeout(clear, 3000);
        return () => clearTimeout(timer);
    }, [clear]);
    return <div className="toast">{message}</div>;
};

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
                        <input className="input" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
                    </div>
                )}
                <div className="modal-actions">
                    <button className="button button-secondary" onClick={() => setModalState({ isOpen: false })}>Batal</button>
                    <button 
                        className={`button ${!isConfirmationMatched ? 'button-disabled' : 'button-danger'}`} 
                        onClick={() => { if (isConfirmationMatched) { modalState.onConfirm(); setModalState({ isOpen: false }); } }} 
                        disabled={!isConfirmationMatched}
                    >
                        {modalState.confirmText || 'Konfirmasi'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const SkeletonLoader = () => <div className="skeleton-item" style={{height: '60px', marginBottom: '10px'}}></div>;
const EmptyState = ({ message }) => (<div className="empty-state"><Inbox size={48} /><p>{message}</p></div>);
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


const KelolaPemilihTerdaftar = () => {
    const navigate = useNavigate();
    const [voters, setVoters] = useState([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [loading, setLoading] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('Semua');
    const [prodiFilter, setProdiFilter] = useState('Semua');
    const [angkatanFilter, setAngkatanFilter] = useState('Semua');
    const [toastMessage, setToastMessage] = useState('');
    const [modalState, setModalState] = useState({ isOpen: false });
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState({ key: 'namaLengkap', direction: 'ascending' });

    // ✅ PERBAIKAN: Pindahkan CSS-in-JS ke dalam useEffect
    // Ini memastikan style dimuat saat komponen mount dan dibersihkan saat unmount
    useEffect(() => {
        const styleId = "kelola-pemilih-styles";
        
        // Cek apakah style sudah ada
        if (document.getElementById(styleId)) {
            return;
        }

        const styleSheet = document.createElement("style");
        styleSheet.id = styleId; // Beri ID agar bisa ditemukan
        styleSheet.innerHTML = `
            .verify-voters-page { font-family: 'Inter', sans-serif; background-color: #f8fafc; min-height: 100vh; padding: 20px; }
            .page-header { margin-bottom: 24px; }
            .page-title { color: #1e293b; font-size: 1.75rem; font-weight: 700; margin: 0; }
            .page-subtitle { color: #64748b; font-size: 1rem; margin: 8px 0 0 0; }
            .card { background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); overflow: hidden; }

            /* -- Filter -- */
            .filter-container { display: grid; grid-template-columns: 1fr; gap: 12px; padding: 16px; border-bottom: 1px solid #f1f5f9; }
            .input-with-icon { position: relative; }
            .input-with-icon svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #9ca3af; }
            .input { width: 100%; box-sizing: border-box; padding: 10px 12px 10px 40px; border-radius: 8px; border: 1px solid #cbd5e0; font-size: 0.9rem; background-color: white; }
            .button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.9rem; text-decoration: none; border: 1px solid transparent; transition: all 0.2s; width: 100%; }
            .button-primary { background-color: #1d4ed8; color: white; }
            .button-secondary { background-color: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
            .button-danger { background-color: #dc2626; color: white; }
            .button-disabled, .button:disabled { background-color: #94a3b8; color: #e2e8f0; cursor: not-allowed; border-color: transparent; }

            /* -- Daftar (Tabel & Kartu) -- */
            .table-wrapper { display: none; }
            .mobile-list { padding: 16px; }
            .mobile-card { border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 12px; background-color: white; }
            .card-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; padding: 12px; border-bottom: 1px solid #f1f5f9; }
            .card-body { padding: 12px; font-size: 0.85rem; color: #64748b; }
            .card-footer { padding: 12px; border-top: 1px solid #f1f5f9; }
            .voter-name { margin: 0; font-weight: 600; color: #1e293b; font-size: 1rem; }
            .voter-detail { margin: 4px 0 0; font-size: 0.8rem; color: #64748b; word-break: break-all; }
            
            .status-badge { padding: 4px 10px; border-radius: 9999px; font-weight: 600; font-size: 0.75rem; text-transform: capitalize; white-space: nowrap; }
            .status-approved { background-color: #dcfce7; color: #166534; }
            .status-pending { background-color: #fef9c3; color: #a16207; }
            
            .action-buttons { display: flex; flex-wrap: wrap; gap: 8px; }
            .action-button { display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.8rem; border: 1px solid; }
            .action-button.green { background-color: #dcfce7; color: #166534; border-color: #86efac; }
            .action-button.yellow { background-color: #fef9c3; color: #a16207; border-color: #fde047; }
            .action-button.red { background-color: #fee2e2; color: #991b1b; border-color: #fca5a5; }
            .action-button.blue { background-color: #dbeafe; color: #1e40af; border-color: #93c5fd; }
            
            .empty-state { text-align: center; color: #9ca3b8; padding: 40px 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
            .empty-state svg { color: #cbd5e0; margin-bottom: 16px; } .empty-state p { font-size: 1rem; font-weight: 500; margin: 0; }
            .skeleton-item { background-color: #f1f5f9; border-radius: 8px; animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
            @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
            
            .pagination { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 0.9rem; }
            .pagination button { display: inline-flex; align-items: center; gap: 4px; padding: 8px 12px; background-color: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; font-weight: 600; }
            .pagination button:disabled { background-color: #f8fafc; color: #cbd5e0; cursor: not-allowed; }

            .toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background-color: #1e293b; color: white; padding: 12px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 1000; }
            .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
            .modal-content { background-color: white; padding: 24px; border-radius: 12px; width: 100%; max-width: 450px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
            .modal-title { margin: 0 0 8px 0; color: #1e293b; font-size: 1.25rem; }
            .modal-message { margin: 0 0 20px 0; color: #475569; line-height: 1.6; }
            .modal-actions { display: flex; justify-content: flex-end; gap: 12px; }
            .label { display: block; margin-bottom: 8px; font-size: 0.9rem; color: #334155; font-weight: 600; }

            /* -- Tampilan Desktop -- */
            @media (min-width: 900px) {
                .verify-voters-page { padding: 40px; }
                .page-title { font-size: 2rem; }
                .filter-container { grid-template-columns: 1fr 1fr 1fr 1fr auto; padding: 24px; }
                .table-wrapper { display: block; overflow-x: auto; }
                .mobile-list { display: none; }
                table { width: 100%; border-collapse: collapse; }
                th { padding: 12px 16px; text-align: left; background-color: #f8fafc; color: #64748b; font-weight: 600; font-size: 0.8rem; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
                th div { display: flex; align-items: center; gap: 4px; cursor: pointer; }
                td { padding: 16px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
            }
        `;
        document.head.appendChild(styleSheet);

        // Fungsi cleanup: Hapus style saat komponen unmount
        return () => {
            const style = document.getElementById(styleId);
            if (style) {
                style.remove();
            }
        };
    }, []); // Array dependensi kosong, hanya berjalan sekali saat mount

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, user => { if (!user) navigate('/login'); });
        const q = query(collection(db, 'voters'));
        const unsubscribeVoters = onSnapshot(q, (snapshot) => {
            setVoters(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setInitialLoading(false);
        });
        return () => { unsubscribeAuth(); unsubscribeVoters(); };
    }, [navigate]);

    const availableAngkatan = useMemo(() => {
        // 1. Ambil semua NIM dan ekstrak tahun angkatan (digit ke 3 & 4)
        const angkatanSet = new Set(
            voters
                .map(v => v.nim?.substring(2, 4)) // Ambil '23', '22', dll. (optional chaining aman)
                .filter(Boolean) // Hapus jika ada nim kosong/null
        );

        // 2. Ubah format ('23' -> '2023') dan urutkan
        const sortedAngkatan = Array.from(angkatanSet)
            .map(ang => `20${ang}`)
            .sort((a, b) => b.localeCompare(a)); // Urutkan dari terbaru ke terlama
 
        // 3. Kembalikan dengan opsi "Semua"
        return ['Semua', ...sortedAngkatan];
    }, [voters]);

    const sortedAndFilteredVoters = useMemo(() => {
        let sortableVoters = [...voters];
        sortableVoters = sortableVoters.filter(voter => {
            const matchesSearch = voter.namaLengkap.toLowerCase().includes(searchTerm.toLowerCase()) || voter.nim.includes(searchTerm) || voter.email.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'Semua' || voter.status === statusFilter;
            const matchesProdi = prodiFilter === 'Semua' || voter.prodi === prodiFilter;
            const angkatanTahun = voter.nim ? `20${voter.nim.substring(2, 4)}` : null;
            const matchesAngkatan = angkatanFilter === 'Semua' || angkatanTahun === angkatanFilter;

            return matchesSearch && matchesStatus && matchesProdi && matchesAngkatan;
        });
        sortableVoters.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
        return sortableVoters;
    }, [voters, searchTerm, statusFilter, prodiFilter, angkatanFilter, sortConfig]);

    const paginatedVoters = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return sortedAndFilteredVoters.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [currentPage, sortedAndFilteredVoters]);
    
    const totalPages = Math.ceil(sortedAndFilteredVoters.length / ITEMS_PER_PAGE);
    const requestSort = (key) => { let direction = 'ascending'; if (sortConfig.key === key && sortConfig.direction === 'ascending') { direction = 'descending'; } setSortConfig({ key, direction }); };
    const showToast = (message) => setToastMessage(message);
    const handleVerify = async (voterId, voterName, newStatus) => {
        setLoading(prev => ({...prev, [voterId]: true}));
        try {
            await updateDoc(doc(db, 'voters', voterId), { status: newStatus });
            await logActivity(`Mengubah status verifikasi untuk ${voterName} menjadi ${newStatus}`);
            showToast(`Status ${voterName} diubah.`);
        } catch(e) { showToast('Gagal mengubah status.'); } 
        finally { setLoading(prev => ({...prev, [voterId]: false})); }
    };
    const confirmDelete = (voter) => { setModalState({ isOpen: true, title: `Hapus Akun Pemilih?`, message: `Anda akan menghapus akun untuk ${voter.namaLengkap}. Tindakan ini tidak dapat diurungkan.`, requireConfirmationText: voter.nim, onConfirm: () => handleDelete(voter.id, voter.namaLengkap), confirmText: 'Ya, Hapus Akun' }); };
    const handleDelete = async (voterId, voterName) => { setLoading(prev => ({...prev, [voterId]: true})); try { await deleteDoc(doc(db, 'voters', voterId)); await logActivity(`Menghapus akun pemilih: ${voterName}`); showToast(`Akun ${voterName} berhasil dihapus.`); } catch(e) { showToast('Gagal menghapus akun.'); } finally { setLoading(prev => ({...prev, [voterId]: false})); } };
    const confirmVerifyAllFiltered = () => {
        const votersToVerify = sortedAndFilteredVoters.filter(v => v.status === 'pending');
        if (votersToVerify.length === 0) return showToast("Tidak ada pemilih berstatus 'Menunggu' pada hasil filter.");
        setModalState({ isOpen: true, title: 'Verifikasi Massal', message: `Anda yakin ingin memverifikasi ${votersToVerify.length} akun pemilih yang ditampilkan?`, onConfirm: () => handleVerifyAllFiltered(votersToVerify), confirmText: `Ya, Verifikasi (${votersToVerify.length})` });
    };
    const handleVerifyAllFiltered = async (votersToVerify) => {
        setLoading(prev => ({...prev, bulk: true}));
        try {
            const batch = writeBatch(db);
            votersToVerify.forEach(voter => batch.update(doc(db, 'voters', voter.id), { status: 'approved' }));
            await batch.commit();
            await logActivity(`Memverifikasi ${votersToVerify.length} akun pemilih secara massal`);
            showToast(`${votersToVerify.length} akun berhasil diverifikasi.`);
        } catch (e) { showToast('Gagal melakukan verifikasi massal.'); } 
        finally { setLoading(prev => ({...prev, bulk: false})); }
    };

    const handleResetPassword = async (voterId, email, voterName) => {
        setLoading(prev => ({...prev, [voterId]: true}));
        try {
            await sendPasswordResetEmail(auth, email);
            await logActivity(`Mengirim email reset password untuk: ${voterName} (${email})`);
            showToast(`Email reset password terkirim ke ${voterName}.`);
        } catch (e) {
            console.error("Gagal mengirim email reset:", e);
            showToast('Gagal mengirim email reset.');
        } finally {
            setLoading(prev => ({...prev, [voterId]: false}));
        }
    };

    const renderSortIcon = (key) => {
        if (sortConfig.key !== key) return <ChevronsUpDown size={14} style={{ color: '#9ca3af' }}/>;
        if (sortConfig.direction === 'ascending') return <ChevronUp size={14} />;
        return <ChevronDown size={14} />;
    };

    return (
        <div className="verify-voters-page">
            {toastMessage && <Toast message={toastMessage} clear={() => setToastMessage('')} />}
            <ConfirmationModal modalState={modalState} setModalState={setModalState} />

            <header className="page-header">
                <div>
                    <h1 className="page-title">Verifikasi Akun Pemilih</h1>
                    <p className="page-subtitle">Setujui atau tolak akun pemilih yang baru mendaftar untuk memberikan hak suara.</p>
                </div>
            </header>

            <div className="card">
                <div className="filter-container">
                    <div className="input-with-icon search-bar">
                        <Search size={18} />
                        <input className="input" placeholder="Cari nama, NIM, atau email..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
                    </div>
                    <div className="input-with-icon">
                        <ListFilter size={18} />
                        <select className="input" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}>
                            <option value="Semua">Semua Status</option>
                            <option value="approved">Terverifikasi</option>
                            <option value="pending">Menunggu</option>
                        </select>
                    </div>
                    <div className="input-with-icon">
                        <ListFilter size={18} />
                        <select className="input" value={prodiFilter} onChange={(e) => { setProdiFilter(e.target.value); setCurrentPage(1); }}>
                            {prodiOptions.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>

                    <div className="input-with-icon">
                        <ListFilter size={18} />
                        <select className="input" value={angkatanFilter} onChange={(e) => { setAngkatanFilter(e.target.value); setCurrentPage(1); }}>
                            {availableAngkatan.map(y => <option key={y} value={y}>{y === 'Semua' ? 'Semua Angkatan' : y}</option>)}
                        </select>
                    </div>

                    <button onClick={confirmVerifyAllFiltered} className="button button-primary" disabled={loading.bulk}>
                        <UserCheck size={16} /> {loading.bulk ? 'Memproses...' : 'Verifikasi Semua'}
                    </button>
                </div>

                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th onClick={() => requestSort('namaLengkap')}><div>Nama / NIM {renderSortIcon('namaLengkap')}</div></th>
                                <th onClick={() => requestSort('prodi')}><div>Program Studi {renderSortIcon('prodi')}</div></th>
                                <th onClick={() => requestSort('email')}><div>Email {renderSortIcon('email')}</div></th>
                                <th onClick={() => requestSort('status')}><div>Status {renderSortIcon('status')}</div></th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {initialLoading ? [...Array(5)].map((_, i) => (<tr key={i}><td colSpan="5"><SkeletonLoader /></td></tr>))
                            : paginatedVoters.length > 0 ? paginatedVoters.map(voter => (
                                <tr key={voter.id}>
                                    <td><p className="voter-name">{voter.namaLengkap}</p><p className="voter-detail">{voter.nim}</p></td>
                                    <td>{voter.prodi}</td>
                                    <td>{voter.email}</td>
                                    <td><span className={`status-badge status-${voter.status}`}>{voter.status === 'approved' ? 'Terverifikasi' : 'Menunggu'}</span></td>
                                    <td><div className="action-buttons">
                                        {voter.status !== 'approved' && <button onClick={() => handleVerify(voter.id, voter.namaLengkap, 'approved')} className="action-button green" disabled={loading[voter.id]}><UserCheck size={14}/>Verifikasi</button>}
                                        {voter.status === 'approved' && <button onClick={() => handleVerify(voter.id, voter.namaLengkap, 'pending')} className="action-button yellow" disabled={loading[voter.id]}><RotateCcw size={14}/>Batalkan</button>}
                                        <button onClick={() => handleResetPassword(voter.id, voter.email, voter.namaLengkap)} className="action-button blue" disabled={loading[voter.id]}><KeyRound size={14}/>Reset Pass</button>
                                        <button onClick={() => confirmDelete(voter)} className="action-button red" disabled={loading[voter.id]}><Trash2 size={14}/>Hapus</button>
                                    </div></td>
                                </tr>
                            ))
                            : (<tr><td colSpan="5"><EmptyState message="Tidak ada pemilih yang cocok." /></td></tr>)}
                        </tbody>
                    </table>
                </div>

                <div className="mobile-list">
                    {initialLoading ? [...Array(5)].map((_, i) => <SkeletonLoader key={i} />)
                    : paginatedVoters.length > 0 ? paginatedVoters.map(voter => (
                        <div key={voter.id} className="mobile-card">
                            <div className="card-header">
                                <div>
                                    <p className="voter-name">{voter.namaLengkap}</p>
                                    <p className="voter-detail">{voter.nim}</p>
                                </div>
                                <span className={`status-badge status-${voter.status}`}>{voter.status === 'approved' ? 'Terverifikasi' : 'Menunggu'}</span>
                            </div>
                            <div className="card-body">
                                <p className="voter-detail">{voter.prodi}</p>
                                <p className="voter-detail">{voter.email}</p>
                            </div>
                            <div className="card-footer">
                                <div className="action-buttons">
                                    {voter.status !== 'approved' && <button onClick={() => handleVerify(voter.id, voter.namaLengkap, 'approved')} className="action-button green" disabled={loading[voter.id]}><UserCheck size={14}/>Verifikasi</button>}
                                    {voter.status === 'approved' && <button onClick={() => handleVerify(voter.id, voter.namaLengkap, 'pending')} className="action-button yellow" disabled={loading[voter.id]}><RotateCcw size={14}/>Batalkan</button>}
                                    <button onClick={() => confirmDelete(voter)} className="action-button red" disabled={loading[voter.id]}><Trash2 size={14}/>Hapus</button>
                                </div>
                            </div>
                        </div>
                    ))
                    : <EmptyState message="Tidak ada pemilih yang cocok." />}
                </div>

                {totalPages > 1 && (
                    <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                )}
            </div>
        </div>
    );
};

// ✅ PERBAIKAN: Hapus logika styleSheet dari sini
// document.head.appendChild(styleSheet); 

export default KelolaPemilihTerdaftar;
