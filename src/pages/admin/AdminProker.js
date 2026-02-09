import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../../firebase/firebaseConfig';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { ClipboardList, Plus, X, Save, Trash2, Pencil, Filter, ArrowLeft, Link as LinkIcon, Users, Target, FileText, CalendarRange, Briefcase, Search } from 'lucide-react';
import { logActivity } from '../../utils/logActivity';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

// --- COMPONENTS KECIL ---
const Toast = ({ message, clear }) => {
    useEffect(() => { const timer = setTimeout(clear, 3000); return () => clearTimeout(timer); }, [clear]);
    return <div className="toast">{message}</div>;
};

// --- KONSTANTA ---
const kementerianOptions = [ "Pengurus Harian", "Inspektorat Jenderal", "Sekretariat Jenderal", "Kementerian Keuangan", "Kementerian Dalam Negeri", "Kementerian Luar Negeri", "Kementerian Pemuda dan Olahraga (PORA)", "Kementerian PSDM", "Kementerian Komunikasi dan Informasi (KOMINFO)", "Kementerian Ekonomi Kreatif" ];
const statusOptions = ["Perencanaan", "Sedang Berjalan", "Selesai", "Dibatalkan"];
const periodeOptions = ["2023", "2024", "2025", "2026"];

const AdminProker = () => {
    const navigate = useNavigate();
    const [prokerList, setProkerList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toastMessage, setToastMessage] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [filters, setFilters] = useState({ kementerian: 'Semua', status: 'Semua', periode: 'Semua' });

    const [searchQuery, setSearchQuery] = useState('');

    const initialFormState = {
        namaProgram: '', kementerianPelaksana: kementerianOptions[0], deskripsiSingkat: '', 
        tanggalPelaksanaan: '', statusProker: statusOptions[0], targetPeserta: '', 
        jumlahPesertaRealisasi: '', linkLPJ: '',
        periode: '2025', // Default periode
        detailPelaksanaan: '', capaianKualitatif: '', kendala: '', saranUmum: '', saranKhusus: ''
    };
    const [formState, setFormState] = useState(initialFormState);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, user => { if (!user) navigate('/login'); });
        const qProker = query(collection(db, "program_kerja"), orderBy("createdAt", "desc"));
        const unsubProker = onSnapshot(qProker, snapshot => {
            setProkerList(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        const styleTag = document.createElement('style'); styleTag.innerHTML = styleSheet; styleTag.id = 'admin-proker-style'; document.head.appendChild(styleTag);
        return () => { unsubscribeAuth(); unsubProker(); document.getElementById('admin-proker-style')?.remove(); };
    }, [navigate]);

    const dashboardData = useMemo(() => {
        const filteredByPeriode = filters.periode === 'Semua' ? prokerList : prokerList.filter(p => p.periode === filters.periode);
        const totalProker = filteredByPeriode.length;
        const totalRealisasi = filteredByPeriode.reduce((sum, p) => sum + Number(p.jumlahPesertaRealisasi || 0), 0);
        const statusDistribution = statusOptions.reduce((acc, status) => ({...acc, [status]: 0}), {});
        filteredByPeriode.forEach(p => { if (statusDistribution.hasOwnProperty(p.statusProker)) { statusDistribution[p.statusProker]++; } });
        return {
            totalProker, totalRealisasi,
            statusChartData: { labels: Object.keys(statusDistribution), datasets: [{ data: Object.values(statusDistribution), backgroundColor: ['#cbd5e1', '#3b82f6', '#10b981', '#ef4444'], borderWidth: 0 }] }
        };
    }, [prokerList, filters.periode]);

    const filteredProkerList = useMemo(() => prokerList.filter(item => 
        (filters.kementerian === 'Semua' || item.kementerianPelaksana === filters.kementerian) && 
        (filters.status === 'Semua' || item.statusProker === filters.status) &&
        (filters.periode === 'Semua' || item.periode === filters.periode) &&
        // LOGIKA PENCARIAN BARU (Cari Nama Program ATAU Kementerian)
        (
            item.namaProgram.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.kementerianPelaksana.toLowerCase().includes(searchQuery.toLowerCase())
        )
    ), [prokerList, filters, searchQuery]);
    
    const handleFormChange = (e) => setFormState(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSimpan = async (e) => {
        e.preventDefault();
        const dataToSave = { ...formState, targetPeserta: Number(formState.targetPeserta) || 0, jumlahPesertaRealisasi: Number(formState.jumlahPesertaRealisasi) || 0 };
        try {
            if (editingId) {
                await updateDoc(doc(db, "program_kerja", editingId), dataToSave);
                await logActivity(`Update proker: "${dataToSave.namaProgram}"`);
                setToastMessage('Data berhasil diperbarui!');
            } else {
                await addDoc(collection(db, "program_kerja"), { ...dataToSave, createdAt: serverTimestamp() });
                await logActivity(`Input proker: "${dataToSave.namaProgram}"`);
                setToastMessage('Data berhasil ditambahkan!');
            }
            closeModal();
        } catch (error) { setToastMessage('Gagal: ' + error.message); }
    };

    const handleEdit = (item) => { setFormState({ ...initialFormState, ...item }); setEditingId(item.id); setIsModalOpen(true); };
    const handleHapus = async (id, nama) => {
        if(window.confirm(`Hapus proker "${nama}"?`)) {
            try { await deleteDoc(doc(db, "program_kerja", id)); await logActivity(`Hapus proker: "${nama}"`); setToastMessage('Terhapus.'); } catch(e){ console.error(e); }
        }
    };
    
    const openModalTambah = () => { setEditingId(null); setFormState(initialFormState); setIsModalOpen(true); };
    const closeModal = () => { setIsModalOpen(false); setEditingId(null); };
    
    return (
        <div className="admin-page">
            {toastMessage && <Toast message={toastMessage} clear={() => setToastMessage('')} />}

            {isModalOpen && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h3 className="modal-title">{editingId ? 'Edit Program Kerja' : 'Input Program Kerja Baru'}</h3>
                                <p className="modal-subtitle">Pastikan data yang diinput valid dan sesuai.</p>
                            </div>
                            <button onClick={closeModal} className="close-button"><X size={20}/></button>
                        </div>
                        
                        <form onSubmit={handleSimpan} className="modal-form">
                            <div className="modal-body">
                                {/* SECTION 1: INFO DASAR */}
                                <div className="form-section">
                                    <h4 className="form-section-title"><ClipboardList size={18}/> Informasi Dasar</h4>
                                    <div className="form-group">
                                        <label className="label">Nama Program Kerja <span className="req">*</span></label>
                                        <input name="namaProgram" value={formState.namaProgram} onChange={handleFormChange} className="input" placeholder="Contoh: BEM Studi Bisnis" required />
                                    </div>
                                    <div className="form-grid-2-col">
                                        <div className="form-group">
                                            <label className="label">Kementerian</label>
                                            <div className="select-wrapper">
                                                <select name="kementerianPelaksana" value={formState.kementerianPelaksana} onChange={handleFormChange} className="input">
                                                    {kementerianOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="label">Periode Kabinet</label>
                                            <div className="select-wrapper">
                                                <select name="periode" value={formState.periode} onChange={handleFormChange} className="input">
                                                    {periodeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="form-grid-2-col">
                                        <div className="form-group">
                                            <label className="label">Tanggal Pelaksanaan</label>
                                            <input name="tanggalPelaksanaan" type="date" value={formState.tanggalPelaksanaan} onChange={handleFormChange} className="input" />
                                        </div>
                                        <div className="form-group hidden-on-mobile"></div>
                                    </div>
                                    <div className="form-group">
                                        <label className="label">Deskripsi Singkat</label>
                                        <textarea name="deskripsiSingkat" value={formState.deskripsiSingkat} onChange={handleFormChange} className="input" rows="3" placeholder="Jelaskan tujuan program secara singkat..."></textarea>
                                    </div>
                                </div>

                                {/* SECTION 2: STATUS & DATA */}
                                <div className="form-section">
                                    <h4 className="form-section-title"><Target size={18}/> Status & Data Kuantitatif</h4>
                                    <div className="form-grid-3-col">
                                        <div className="form-group">
                                            <label className="label">Status</label>
                                            <select name="statusProker" value={formState.statusProker} onChange={handleFormChange} className="input status-input">
                                                {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="label">Target (Org)</label>
                                            <input name="targetPeserta" type="number" value={formState.targetPeserta} onChange={handleFormChange} className="input" placeholder="0" />
                                        </div>
                                        <div className="form-group">
                                            <label className="label">Realisasi (Org)</label>
                                            <input name="jumlahPesertaRealisasi" type="number" value={formState.jumlahPesertaRealisasi} onChange={handleFormChange} className="input" placeholder="0" />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="label">Link Dokumen LPJ</label>
                                        <div className="input-with-icon">
                                            <LinkIcon size={16}/>
                                            <input name="linkLPJ" type="url" value={formState.linkLPJ || ''} onChange={handleFormChange} className="input pl-10" placeholder="https://docs.google.com/..."/>
                                        </div>
                                    </div>
                                </div>

                                {/* SECTION 3: DETAIL LAPORAN */}
                                <div className="form-section bg-slate-50">
                                    <h4 className="form-section-title text-slate-700"><FileText size={18}/> Detail Laporan (Opsional)</h4>
                                    <div className="form-group">
                                        <label className="label">Detail Pelaksanaan</label>
                                        <textarea name="detailPelaksanaan" value={formState.detailPelaksanaan} onChange={handleFormChange} className="input textarea-large" placeholder="Ceritakan alur kegiatan..."></textarea>
                                    </div>
                                    <div className="form-group">
                                        <label className="label">Kendala & Hambatan</label>
                                        <textarea name="kendala" value={formState.kendala} onChange={handleFormChange} className="input" rows="2" placeholder="Masalah yang dihadapi..."></textarea>
                                    </div>
                                    <div className="form-grid-2-col">
                                        <div className="form-group"><label className="label">Saran Umum</label><textarea name="saranUmum" value={formState.saranUmum} onChange={handleFormChange} className="input" rows="2"></textarea></div>
                                        <div className="form-group"><label className="label">Saran Khusus</label><textarea name="saranKhusus" value={formState.saranKhusus} onChange={handleFormChange} className="input" rows="2"></textarea></div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={closeModal} className="button button-text">Batal</button>
                                <button type="submit" className="button button-primary"><Save size={16}/> Simpan Data</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DASHBOARD HEADER */}
            <header className="page-header">
                <div>
                    <h1 className="page-title">Admin Program Kerja</h1>
                    <p className="page-subtitle">Dashboard manajemen data dan evaluasi kegiatan BEM.</p>
                </div>
            </header>
            
            {/* STATS CARDS */}
            <div className="dashboard-grid">
                <div className="stat-card">
                    <div className="stat-content">
                        <p className="stat-label">Total Proker</p>
                        <h3 className="stat-value">{dashboardData.totalProker} <small>Program</small></h3>
                    </div>
                    <div className="stat-icon-bg blue"><Briefcase size={24}/></div>
                </div>
                <div className="stat-card">
                    <div className="stat-content">
                        <p className="stat-label">Total Partisipan</p>
                        <h3 className="stat-value">{dashboardData.totalRealisasi.toLocaleString('id-ID')} <small>Orang</small></h3>
                    </div>
                    <div className="stat-icon-bg green"><Users size={24}/></div>
                </div>
                <div className="stat-card chart-card">
                    <div className="chart-wrapper">
                        <Doughnut data={dashboardData.statusChartData} options={{cutout: '70%', maintainAspectRatio:false, plugins:{legend:{display:false}}}} />
                    </div>
                    <div className="chart-info">
                        <span className="chart-label">Status Proker</span>
                        <small className="text-muted">Distribusi Realtime</small>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT CARD */}
            <div className="content-card">
                <div className="list-header">
                    <div className="search-wrapper">
                        <Search size={18} className="search-icon"/>
                        <input 
                            type="text" 
                            placeholder="Cari program..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="search-input"
                        />
                    </div>

                    <div className="filter-group">
                        <div className="select-container">
                            <select className="filter-select" value={filters.periode} onChange={e => setFilters(p => ({...p, periode: e.target.value}))}>
                                <option value="Semua">Semua Periode</option>
                                {periodeOptions.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>
                        <div className="select-container">
                            <select className="filter-select" value={filters.kementerian} onChange={e => setFilters(p => ({...p, kementerian: e.target.value}))}>
                                <option value="Semua">Semua Kementerian</option>
                                {kementerianOptions.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>
                        <div className="select-container">
                            <select className="filter-select" value={filters.status} onChange={e => setFilters(p => ({...p, status: e.target.value}))}>
                                <option value="Semua">Semua Status</option>
                                {statusOptions.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>
                        
                    </div>
                    
                    {/* BUTTON PINDAH KE KANAN */}
                    <button onClick={openModalTambah} className="button button-primary btn-header">
                        <Plus size={16}/> Input Baru
                    </button>
                </div>
                
                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{width: '30%'}}>Nama Program</th>
                                <th style={{width: '15%'}}>Periode</th>
                                <th style={{width: '25%'}}>Kementerian</th>
                                <th style={{width: '15%'}}>Status</th>
                                <th style={{width: '15%', textAlign: 'right'}}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? <tr><td colSpan="5" className="text-center p-8 text-slate-400">Memuat data...</td></tr> : 
                                filteredProkerList.length > 0 ? filteredProkerList.map(item => (
                                    <tr key={item.id}>
                                        <td>
                                            <div className="td-title">{item.namaProgram}</div>
                                            <div className="td-subtitle">{item.tanggalPelaksanaan ? new Date(item.tanggalPelaksanaan).toLocaleDateString('id-ID', {day:'numeric', month:'short'}) : '-'}</div>
                                        </td>
                                        <td>
                                            {item.periode ? 
                                                <span className="periode-badge">{item.periode}</span> : 
                                                <span className="periode-badge empty">-</span>
                                            }
                                        </td>
                                        <td>
                                            <span className="dept-text" title={item.kementerianPelaksana}>{item.kementerianPelaksana}</span>
                                        </td>
                                        <td>
                                            <span className={`status-pill ${item.statusProker.toLowerCase().replace(/\s/g, '-')}`}>
                                                {item.statusProker}
                                            </span>
                                        </td>
                                        <td className="actions-cell">
                                            <button onClick={() => handleEdit(item)} className="icon-btn edit" title="Edit"><Pencil size={16}/></button>
                                            <button onClick={() => handleHapus(item.id, item.namaProgram)} className="icon-btn trash" title="Hapus"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                )) : <tr><td colSpan="5" className="text-center p-8">
                                    <div className="empty-state-table">
                                        <ClipboardList size={32} className="text-slate-300 mx-auto mb-2"/>
                                        <p className="text-slate-500">Tidak ada data ditemukan.</p>
                                    </div>
                                </td></tr>
                            }
                        </tbody>
                    </table>
                </div>
            </div>
            
            <button onClick={() => navigate("/admin")} className="button button-text w-full mt-6 text-slate-400 hover:text-slate-600">
                <ArrowLeft size={16}/> Kembali ke Halaman Utama
            </button>
        </div>
    );
};

// CSS FINAL + SEARCH BAR
const styleSheet = `
    /* --- 1. SETTING UTAMA --- */
    .admin-page { 
        font-family: 'Inter', sans-serif; 
        background-color: #f8fafc; 
        min-height: 100vh; 
        padding: 32px;
        padding-top: 20px; 
        color: #334155; 
        box-sizing: border-box;
    }

    .page-header { margin-bottom: 32px; }
    .page-title { font-size: 1.75rem; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.025em; }
    .page-subtitle { color: #64748b; margin-top: 6px; font-size: 0.95rem; }

    /* --- 2. HEADER LIST, SEARCH & FILTER --- */
    .content-card { background: #fff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02); overflow: hidden; }
    
    .list-header { 
        padding: 20px 24px; 
        display: flex; 
        flex-direction: row; 
        justify-content: space-between; 
        align-items: center; 
        flex-wrap: wrap; 
        gap: 16px; 
        border-bottom: 1px solid #f1f5f9; 
        background-color: #fff; 
    }

    /* SEARCH BAR STYLE (BARU) */
    .search-wrapper {
        position: relative;
        flex: 1; /* Agar search bar mengisi ruang kosong */
        min-width: 200px;
    }
    .search-icon {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        color: #94a3b8;
        pointer-events: none;
    }
    .search-input {
        width: 100%;
        padding: 9px 12px 9px 40px; /* Padding kiri besar untuk icon */
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        font-size: 0.9rem;
        color: #334155;
        transition: all 0.2s;
        box-sizing: border-box;
    }
    .search-input:focus {
        border-color: #3b82f6;
        outline: none;
        box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
    }

    .filter-group { 
        display: flex; 
        gap: 12px; 
        flex-wrap: wrap; 
        align-items: center;
    }

    /* Select Inputs */
    .select-container { position: relative; min-width: 140px; }
    .filter-select { 
        width: 100%; 
        appearance: none; 
        background-color: #fff; 
        border: 1px solid #cbd5e1; 
        padding: 8px 32px 8px 12px; 
        border-radius: 8px; 
        font-size: 0.85rem; 
        color: #334155; 
        cursor: pointer; 
        background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); 
        background-position: right 0.5rem center; 
        background-repeat: no-repeat; 
        background-size: 1.2em 1.2em; 
        transition: all 0.2s; 
    }
    .filter-select:hover { border-color: #94a3b8; }
    .filter-select:focus { border-color: #3b82f6; outline: none; }

    /* TOMBOL INPUT BARU */
    .btn-header {
        width: auto !important; 
        display: inline-flex !important; 
        align-items: center;
        justify-content: center;
        padding: 8px 16px !important;
        font-size: 0.85rem !important;
        height: fit-content;
        gap: 6px !important;
        white-space: nowrap; 
        flex-shrink: 0; 
    }

    /* --- 3. DASHBOARD STATS --- */
    .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin-bottom: 32px; }
    .stat-card { background: #fff; padding: 24px; border-radius: 16px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; }
    .stat-content { display: flex; flex-direction: column; }
    .stat-label { font-size: 0.85rem; font-weight: 600; color: #64748b; margin-bottom: 8px; text-transform: uppercase; }
    .stat-value { font-size: 2rem; font-weight: 800; color: #0f172a; margin: 0; }
    .stat-value small { font-size: 0.875rem; color: #94a3b8; margin-left: 8px; font-weight: 500; }
    .stat-icon-bg { width: 56px; height: 56px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #fff; }
    .stat-icon-bg.blue { background: linear-gradient(135deg, #3b82f6, #2563eb); }
    .stat-icon-bg.green { background: linear-gradient(135deg, #10b981, #059669); }
    
    .chart-card { display: flex; align-items: center; justify-content: flex-start; gap: 20px; }
    .chart-wrapper { width: 70px; height: 70px; flex-shrink: 0; }
    .chart-info { display: flex; flex-direction: column; }
    .chart-label { font-weight: 700; color: #0f172a; font-size: 1.1rem; }
    .text-muted { font-size: 0.8rem; color: #94a3b8; }

    /* --- 4. TABLE --- */
    .table-responsive { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: separate; border-spacing: 0; }
    .data-table th { text-align: left; padding: 16px 24px; background: #f8fafc; color: #64748b; font-weight: 600; font-size: 0.8rem; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
    .data-table td { padding: 16px 24px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    .data-table tr:hover td { background-color: #f8fafc; }

    .td-title { font-weight: 600; color: #0f172a; font-size: 0.95rem; margin-bottom: 2px; }
    .td-subtitle { font-size: 0.8rem; color: #94a3b8; }
    .dept-text { display: block; max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #475569; font-size: 0.9rem; }
    
    .periode-badge { padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; background: #eff6ff; color: #2563eb; border: 1px solid #dbeafe; display: inline-block; }
    .periode-badge.empty { background: #f1f5f9; color: #94a3b8; border-color: #e2e8f0; }

    .status-pill { display: inline-flex; padding: 4px 12px; border-radius: 99px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
    .status-selesai { background: #dcfce7; color: #166534; }
    .status-sedang-berjalan { background: #dbeafe; color: #1e40af; }
    .status-perencanaan { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
    .status-dibatalkan { background: #fee2e2; color: #991b1b; }

    .actions-cell { text-align: right; }
    .icon-btn { padding: 8px; border-radius: 8px; border: none; background: transparent; cursor: pointer; color: #94a3b8; transition: all 0.2s; display: inline-flex; }
    .icon-btn:hover { background: #fff; color: #3b82f6; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    .icon-btn.trash:hover { color: #ef4444; }

    /* --- 5. GLOBAL BUTTONS --- */
    .button { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 8px; font-weight: 600; border: none; cursor: pointer; font-size: 0.9rem; transition: all 0.2s; justify-content: center; }
    .button-primary { background: #2563eb; color: #fff; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2); }
    .button-primary:hover { background: #1d4ed8; transform: translateY(-1px); }
    .button-text { background: transparent; color: #64748b; }
    .button-text:hover { background: #f1f5f9; color: #334155; }

    /* --- 6. MODAL --- */
    .modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 1050; padding: 20px; }
    .modal-content { background: #fff; border-radius: 16px; width: 100%; max-width: 680px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); animation: modalIn 0.3s ease-out; border: 1px solid #e2e8f0; }
    @keyframes modalIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }

    .modal-header { padding: 20px 24px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: flex-start; background: #fff; border-radius: 16px 16px 0 0; }
    .modal-title { font-size: 1.25rem; font-weight: 700; color: #0f172a; margin: 0; }
    .modal-subtitle { font-size: 0.85rem; color: #64748b; margin: 4px 0 0; }
    .close-button { background: transparent; border: none; cursor: pointer; color: #94a3b8; padding: 4px; border-radius: 6px; transition: all 0.2s; }
    .close-button:hover { background: #f1f5f9; color: #ef4444; }

    .modal-form { display: flex; flex-direction: column; flex: 1; min-height: 0; }
    .modal-body { overflow-y: auto; padding: 0; flex: 1; }
    
    .form-section { padding: 24px; border-bottom: 1px solid #f1f5f9; }
    .form-section.bg-slate-50 { background-color: #f8fafc; }
    .form-section-title { font-size: 0.9rem; font-weight: 700; color: #334155; margin: 0 0 20px; display: flex; align-items: center; gap: 8px; text-transform: uppercase; letter-spacing: 0.05em; }
    
    .form-group { margin-bottom: 16px; }
    .form-grid-2-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .form-grid-3-col { display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 16px; }

    .label { display: block; font-size: 0.85rem; font-weight: 600; color: #475569; margin-bottom: 6px; }
    .label .req { color: #ef4444; }
    .input { width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; color: #0f172a; transition: all 0.2s; background: #fff; }
    .input:focus { border-color: #3b82f6; outline: none; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
    .input::placeholder { color: #cbd5e1; }
    .textarea-large { min-height: 100px; resize: vertical; }
    
    .input-with-icon { position: relative; }
    .input-with-icon svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
    .input.pl-10 { padding-left: 40px; }

    .modal-actions { padding: 16px 24px; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; gap: 12px; background: #fff; flex-shrink: 0; }
    .modal-actions .button { padding: 8px 16px !important; font-size: 0.85rem !important; height: auto; border-radius: 6px; }

    .toast { position: fixed; bottom: 32px; right: 32px; background: #0f172a; color: #fff; padding: 12px 24px; border-radius: 12px; font-weight: 500; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); z-index: 100; animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

    @media (max-width: 768px) {
        .admin-page { padding: 20px; padding-top: 80px; } 
        .list-header { flex-direction: column; align-items: stretch; }
        .filter-group { flex-direction: column; }
        .form-grid-2-col, .form-grid-3-col { grid-template-columns: 1fr; gap: 16px; }
        .hidden-on-mobile { display: none; }
        .modal-content { max-height: 100vh; border-radius: 0; }
        .modal-overlay { padding: 0; }
        
        .btn-header { width: 100% !important; justify-content: center; } 
        .search-wrapper { min-width: 100%; order: -1; margin-bottom: 12px; } /* Search bar paling atas di HP */
    }
`;

export default AdminProker;