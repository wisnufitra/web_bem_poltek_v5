// src/pages/admin/manajemen-rkt/RktProgramList.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../../firebase/firebaseConfig';
import { 
    collection, query, where, doc, addDoc, updateDoc, deleteDoc, onSnapshot, getDoc 
} from 'firebase/firestore';
import { useAdmin } from '../../../layouts/AdminLayout';
import { 
    ArrowLeft, Plus, Trash2, Calendar, 
    Pencil, Loader2, MapPin, Info,
    Search, LayoutGrid, List, Users, CheckCircle, X, Save, ArrowRight,
    FileText, AlertTriangle, Lock, Banknote, Download, FileCheck, 
    PieChart, Copy
} from 'lucide-react';

// --- COMPONENT TOAST ---
const Toast = ({ message, type, onClose }) => {
    useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
    const bg = type === 'error' ? '#ef4444' : '#10b981';
    return (
        <div style={{ position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)', backgroundColor: bg, color: 'white', padding: '12px 24px', borderRadius: 50, zIndex: 10000, boxShadow: '0 10px 30px rgba(0,0,0,0.2)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10, animation: 'slideUp 0.3s ease' }}>
            {type === 'error' ? <AlertTriangle size={20}/> : <CheckCircle size={20}/>} {message}
        </div>
    );
};

const RktProgramList = () => {
    const { profil, sysConfig, activeRole } = useAdmin(); 
    const navigate = useNavigate();
    
    // --- STATE DATA ---
    const [loading, setLoading] = useState(true);
    const [rktData, setRktData] = useState(null); 
    const [programs, setPrograms] = useState([]);
    const [divisions, setDivisions] = useState([]); 
    const [toast, setToast] = useState(null);

    const activePeriod = sysConfig?.activePeriod || "2025/2026";
    const myOrgId = activeRole?.entity_id;
    const myOrgName = activeRole?.entity_name;

    // --- STATE UI ---
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [viewMode, setViewMode] = useState('list'); 
    const [showAnalytics, setShowAnalytics] = useState(false);

    // --- STATE FORM & MODAL ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState(1); 
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [deleteModal, setDeleteModal] = useState(null);

    const [form, setForm] = useState({
        namaKegiatan: '', kategori: 'Rapat', penanggungJawab: '', 
        dateMode: 'TENTATIVE', 
        bulanTentatif: '', 
        tglMulai: '', jamMulai: '', 
        tglSelesai: '', jamSelesai: '',
        jadwalSeries: [], 
        estimasiBiayaStr: '', lokasi: '', targetPeserta: '', deskripsi: ''
    });

    const showToast = (msg, type = 'success') => setToast({ msg, type });
    const formatRp = (num) => "Rp " + new Intl.NumberFormat('id-ID').format(num);
    const parseRp = (str) => parseInt(str.replace(/\D/g, '')) || 0;

    // --- CALCULATIONS ---
    const budgetLimit = rktData?.finalBudgetLimit || 0;
    const usedBudget = programs.reduce((acc, curr) => acc + (curr.estimasiBiaya || 0), 0);
    const remainingBudget = budgetLimit - usedBudget;
    const percentage = budgetLimit > 0 ? Math.min((usedBudget / budgetLimit) * 100, 100) : 0;

    const approvalDate = useMemo(() => {
        if (!rktData?.history) return null;
        const log = rktData.history.find(h => h.action === 'SYSTEM_FULL_APPROVAL' || h.action === 'FULL_APPROVAL');
        return log ? new Date(log.timestamp).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'}) : '-';
    }, [rktData]);

    const categoryStats = useMemo(() => {
        const stats = { 'Rapat': 0, 'Event': 0, 'Lomba': 0, 'Sosialisasi': 0, 'Lainnya': 0 };
        programs.forEach(p => {
            const cat = stats[p.kategori] !== undefined ? p.kategori : 'Lainnya';
            stats[cat] += (p.estimasiBiaya || 0);
        });
        return stats;
    }, [programs]);

    // --- 1. FETCH DATA ---
    useEffect(() => {
        if (!myOrgId || !activePeriod) return;
        setLoading(true);

        const qRkt = query(collection(db, 'rkt_submissions'), where('orgId', '==', myOrgId), where('periode', '==', activePeriod));
        const unsubRkt = onSnapshot(qRkt, (snap) => {
            if (!snap.empty) {
                const data = { id: snap.docs[0].id, ...snap.docs[0].data() };
                setRktData(data);
                
                const qProg = query(collection(db, 'programs'), where('rktId', '==', data.id));
                const unsubProg = onSnapshot(qProg, (snapProg) => {
                    const list = snapProg.docs.map(d => ({ id: d.id, ...d.data() }));
                    // Sort by Timestamp Sort (Agar urutan tanggal benar)
                    list.sort((a,b) => (a.timestampSort || '').localeCompare(b.timestampSort || ''));
                    setPrograms(list);
                    setLoading(false);
                });
                return () => unsubProg();
            } else {
                setRktData(null);
                setLoading(false);
            }
        });

        const fetchDivs = async () => {
            const metaRef = doc(db, 'master_metadata', 'organization_structure');
            const metaSnap = await getDoc(metaRef);
            if (metaSnap.exists()) setDivisions(metaSnap.data().entities[myOrgId]?.divisions || []);
        };
        fetchDivs();

        return () => unsubRkt();
    }, [myOrgId, activePeriod]);

    // --- 3. FILTER LOGIC ---
    const filteredPrograms = useMemo(() => {
        return programs.filter(p => {
            const matchSearch = p.namaKegiatan.toLowerCase().includes(searchTerm.toLowerCase());
            const matchCat = filterCategory === 'ALL' || p.kategori === filterCategory;
            return matchSearch && matchCat;
        });
    }, [programs, searchTerm, filterCategory]);

    // --- 4. ACTIONS ---

    const handleExportCSV = () => {
        if (programs.length === 0) return showToast("Tidak ada data untuk diexport", "error");
        const headers = ["Nama Kegiatan,Kategori,Divisi,Jadwal,Lokasi,Estimasi Biaya,Target Peserta"];
        const rows = programs.map(p => 
            `"${p.namaKegiatan}","${p.kategori}","${p.penanggungJawab}","${p.dateDisplay}","${p.lokasi || '-'}","${p.estimasiBiaya}","${p.targetPeserta || '-'}"`
        );
        const csvContent = "data:text/csv;charset=utf-8," + headers.concat(rows).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Proker_${myOrgName}_${activePeriod.replace('/','-')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDuplicate = async (program) => {
        if (sysConfig?.allowProgramInput === false) return showToast("Sesi input ditutup.", "error");
        if (budgetLimit > 0 && (usedBudget + program.estimasiBiaya) > budgetLimit) {
            return showToast("Gagal duplikasi: Sisa anggaran tidak cukup.", "error");
        }

        try {
            // Bersihkan data duplikasi
            const { id, ...rest } = program; 
            const newProgram = {
                ...rest,
                namaKegiatan: `${program.namaKegiatan} (Copy)`,
                createdAt: new Date().toISOString(),
                statusPelaksanaan: 'PLANNED'
            };
            
            await addDoc(collection(db, 'programs'), newProgram);
            showToast("Kegiatan berhasil diduplikasi!");
        } catch (error) {
            console.error(error);
            showToast("Gagal duplikasi.", "error");
        }
    };

    const handleEdit = (program) => {
        setEditingId(program.id);
        
        setForm({
            namaKegiatan: program.namaKegiatan || '', 
            kategori: program.kategori || 'Rapat',
            penanggungJawab: program.penanggungJawab || '',
            
            // Mapping Balik Data Waktu
            dateMode: program.dateMode || (program.tanggalPasti ? 'SINGLE' : 'TENTATIVE'),
            bulanTentatif: program.bulanTentatif || '',
            tglMulai: program.tglMulai || program.tanggalPasti || '', 
            jamMulai: program.jamMulai || '',
            tglSelesai: program.tglSelesai || '',
            jamSelesai: program.jamSelesai || '',
            
            // --- FIX PENTING DI SINI ---
            jadwalSeries: (program.jadwalSeries || []).map(item => ({
                tgl: item.tgl || '',          // Default ke string kosong
                jamMulai: item.jamMulai || '',
                jamSelesai: item.jamSelesai || '',
                lokasi: item.lokasi || ''
            })),
            // ---------------------------
            
            estimasiBiayaStr: formatRp(program.estimasiBiaya || 0),
            lokasi: program.lokasi || '',
            targetPeserta: program.targetPeserta || '',
            deskripsi: program.deskripsi || ''
        });
        
        setActiveTab(1);
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (sysConfig?.allowProgramInput === false) return showToast("Sesi input ditutup oleh Admin Pusat.", "error");
        if (!form.namaKegiatan || !form.estimasiBiayaStr || !form.penanggungJawab) return showToast("Lengkapi Nama, Divisi, dan Biaya!", "error");

        const cost = parseRp(form.estimasiBiayaStr);
        let projectedTotal = usedBudget;
        if (editingId) {
            const oldItem = programs.find(p => p.id === editingId);
            projectedTotal -= (oldItem?.estimasiBiaya || 0);
        }
        projectedTotal += cost;

        if (budgetLimit > 0 && projectedTotal > budgetLimit) {
            return alert(`GAGAL SIMPAN!\n\nTotal anggaran akan menjadi ${formatRp(projectedTotal)}, melebihi Pagu Disetujui (${formatRp(budgetLimit)}).`);
        }

        setIsSaving(true);
        try {
            let finalDateDisplay = "";
            let timestampSort = ""; 

            if (form.dateMode === 'TENTATIVE') {
                if(!form.bulanTentatif) { setIsSaving(false); return showToast("Pilih bulan!", "error"); }
                const [year, month] = form.bulanTentatif.split('-');
                const monthName = new Date(year, month - 1).toLocaleString('id-ID', { month: 'long' });
                finalDateDisplay = `${monthName} ${year}`;
                timestampSort = `${form.bulanTentatif}-01`; 

            } else if (form.dateMode === 'SINGLE') {
                if(!form.tglMulai) { setIsSaving(false); return showToast("Pilih tanggal!", "error"); }
                const d = new Date(form.tglMulai).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'});
                const time = form.jamMulai ? ` (${form.jamMulai} ${form.jamSelesai ? '- '+form.jamSelesai : ''})` : '';
                finalDateDisplay = `${d}${time}`;
                timestampSort = form.tglMulai;

            } else if (form.dateMode === 'RANGE') {
                if(!form.tglMulai || !form.tglSelesai) { setIsSaving(false); return showToast("Pilih tanggal mulai & selesai!", "error"); }
                const d1 = new Date(form.tglMulai).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'});
                const d2 = new Date(form.tglSelesai).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'});
                finalDateDisplay = `${d1} s.d. ${d2}`;
                timestampSort = form.tglMulai;

            } else if (form.dateMode === 'SERIES') {
                if(form.jadwalSeries.length === 0) { setIsSaving(false); return showToast("Minimal isi 1 tanggal!", "error"); }
                const sortedSeries = [...form.jadwalSeries].sort((a,b) => a.tgl.localeCompare(b.tgl));
                const firstDate = new Date(sortedSeries[0].tgl).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'});
                finalDateDisplay = `${sortedSeries.length} Pertemuan (Mulai: ${firstDate})`;
                timestampSort = sortedSeries[0].tgl;
            }

            const dataToSave = {
                rktId: rktData.id, orgId: myOrgId, periode: activePeriod,
                namaKegiatan: form.namaKegiatan, kategori: form.kategori, penanggungJawab: form.penanggungJawab,
                dateMode: form.dateMode,
                tglMulai: form.tglMulai || '',
                tglSelesai: form.tglSelesai || '',
                jamMulai: form.jamMulai || '',
                jamSelesai: form.jamSelesai || '',
                bulanTentatif: form.bulanTentatif || '',
                jadwalSeries: form.jadwalSeries || [],
                estimasiBiaya: cost, lokasi: form.lokasi, targetPeserta: form.targetPeserta, deskripsi: form.deskripsi,
                dateDisplay: finalDateDisplay, timestampSort, 
                ...(editingId ? {} : { statusPelaksanaan: 'PLANNED', createdAt: new Date().toISOString() })
            };

            if (editingId) await updateDoc(doc(db, 'programs', editingId), dataToSave);
            else await addDoc(collection(db, 'programs'), dataToSave);

            setIsModalOpen(false); resetForm(); showToast("Data berhasil disimpan!");
        } catch (error) { console.error(error); showToast("Gagal menyimpan data.", "error"); 
        } finally { setIsSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleteModal) return;
        try {
            await deleteDoc(doc(db, 'programs', deleteModal.id));
            showToast("Proker dihapus.");
            setDeleteModal(null);
        } catch (error) {
            showToast("Gagal menghapus.", "error");
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setForm({
            namaKegiatan: '', kategori: 'Rapat', penanggungJawab: '', 
            dateMode: 'TENTATIVE', bulanTentatif: '', 
            tglMulai: '', jamMulai: '', tglSelesai: '', jamSelesai: '',
            jadwalSeries: [],
            estimasiBiayaStr: '', lokasi: '', targetPeserta: '', deskripsi: ''
        });
        setActiveTab(1);
    };

    const handleMoneyChange = (e) => {
        const raw = e.target.value.replace(/\D/g, '');
        setForm({...form, estimasiBiayaStr: raw ? formatRp(raw) : ''});
    };

    const addSeriesDate = () => {
        setForm(prev => ({
            ...prev,
            // Tambahkan property 'lokasi' di sini
            jadwalSeries: [...prev.jadwalSeries, { tgl: '', jamMulai: '', jamSelesai: '', lokasi: '' }]
        }));
    };

    const removeSeriesDate = (index) => {
        const newSeries = [...form.jadwalSeries];
        newSeries.splice(index, 1);
        setForm({ ...form, jadwalSeries: newSeries });
    };

    const updateSeriesDate = (index, field, value) => {
        const newSeries = [...form.jadwalSeries];
        newSeries[index][field] = value;
        setForm({ ...form, jadwalSeries: newSeries });
    };

    // --- VIEW LOGIC ---
    if (loading) return <div style={styles.loadingContainer}><Loader2 className="spin" size={40} color="#3b82f6"/><p>Memuat Data Program Kerja...</p></div>;

    if (!rktData || rktData.status !== 'APPROVED') {
        return (
            <div style={styles.pageBackground}>
                <div style={styles.container}>
                    <div style={styles.lockedState}>
                        <Lock size={64} color="#94a3b8"/>
                        <h2>Akses Program Kerja Terkunci</h2>
                        <p>Anda belum dapat menginput program kerja digital karena <strong>Proposal RKT Tahunan</strong> belum disetujui sepenuhnya oleh verifikator.</p>
                        <div style={styles.statusBadge}>Status RKT: {rktData?.status || 'Belum Upload'}</div>
                        <button onClick={() => navigate('/admin/perencanaan-rkt')} style={styles.btnPrimary}>Cek Status RKT</button>
                    </div>
                </div>
            </div>
        );
    }

    const getBadgeStyle = (cat) => {
        switch(cat) {
            case 'Rapat': return { background: '#fef3c7', color: '#d97706', border: '1px solid #fcd34d' };
            case 'Event': return { background: '#dbeafe', color: '#2563eb', border: '1px solid #bfdbfe' };
            case 'Lomba': return { background: '#fce7f3', color: '#db2777', border: '1px solid #fbcfe8' };
            default: return { background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' };
        }
    };

    return (
        <div style={styles.pageBackground}>
            {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
            <style>{globalCss}</style>
            
            <div style={styles.container}>
                <header style={styles.header}>
                    <div style={styles.headerLeft}>
                        <button onClick={() => navigate('/admin/perencanaan-rkt')} style={styles.backBtn} aria-label="Kembali"><ArrowLeft size={20}/></button>
                        <div>
                            <div style={styles.breadcrumb}>Manajemen RKT • {activePeriod}</div>
                            <h1 style={styles.pageTitle}>Program Kerja Digital</h1>
                            <div style={styles.orgBadge}>{myOrgName}</div>
                        </div>
                    </div>

                    <div style={styles.headerRight}>
                        {/* WIDGET REFERENSI RKT */}
                        <div style={styles.refCard}>
                            <div style={styles.refIcon}><FileCheck size={18}/></div>
                            <div>
                                <div style={styles.refTitle}>Basis: RKT V{rktData.currentVersion}</div>
                                <div style={styles.refSub}>Disetujui: {approvalDate}</div>
                                <a href={rktData.currentFileUrl} target="_blank" rel="noreferrer" style={styles.refLink}>Lihat Dokumen</a>
                            </div>
                        </div>

                        {/* WIDGET BUDGET */}
                        <div style={styles.budgetCard}>
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom: 12}}>
                                <div>
                                    <small style={{display: 'block', opacity: 0.8, fontSize: '0.8rem', marginBottom: 2}}>Pagu Disetujui</small>
                                    <div style={{fontSize: '1.25rem', fontWeight: 700}}>{formatRp(budgetLimit)}</div>
                                </div>
                                <div style={{textAlign: 'right'}}>
                                    <small style={{display: 'block', opacity: 0.8, fontSize: '0.8rem', marginBottom: 2}}>Terpakai</small>
                                    <div style={{fontSize: '1.25rem', fontWeight: 700, color: remainingBudget < 0 ? '#fca5a5' : '#ffffff'}}>{formatRp(usedBudget)}</div>
                                </div>
                            </div>
                            <div style={styles.progressBg}>
                                <div style={{...styles.progressFill, width: `${percentage}%`, background: remainingBudget < 0 ? '#ef4444' : '#4ade80'}}></div>
                            </div>
                            <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.75rem', fontWeight: 600}}>
                                <span>{percentage.toFixed(1)}%</span>
                                <span style={{color: remainingBudget < 0 ? '#fca5a5' : '#86efac'}}>{remainingBudget < 0 ? `Over ${formatRp(Math.abs(remainingBudget))}` : `Sisa ${formatRp(remainingBudget)}`}</span>
                            </div>
                        </div>
                    </div>
                </header>

                <div style={styles.controlsArea}>
                    {/* TOGGLE ANALYTICS */}
                    <div style={{width: '100%', marginBottom: showAnalytics ? 24 : 0}}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: showAnalytics ? 16 : 0}}>
                            {showAnalytics && <h3 style={{margin:0, fontSize:'1rem', color:'#64748b'}}>Sebaran Anggaran</h3>}
                        </div>
                        
                        {showAnalytics && (
                            <div style={styles.analyticsRow}>
                                {Object.entries(categoryStats).map(([cat, val]) => (
                                    val > 0 && (
                                        <div key={cat} style={styles.analyticsItem}>
                                            <div style={{fontSize:'0.75rem', color:'#64748b', fontWeight:600}}>{cat}</div>
                                            <div style={{fontSize:'1rem', fontWeight:700, color:'#0f172a'}}>{formatRp(val)}</div>
                                            <div style={{fontSize:'0.7rem', color:'#3b82f6'}}>{((val/usedBudget)*100).toFixed(1)}%</div>
                                        </div>
                                    )
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={styles.controlRow}>
                        <div style={styles.searchBar}>
                            <Search size={18} color="#94a3b8" style={{marginLeft: 12}}/>
                            <input placeholder="Cari nama kegiatan..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={styles.searchInput} />
                        </div>
                        
                        <div style={styles.filterGroup}>
                            <button onClick={() => setShowAnalytics(!showAnalytics)} style={{...styles.btnSecondary, background: showAnalytics ? '#eff6ff' : 'white', borderColor: showAnalytics ? '#3b82f6' : '#e2e8f0'}} title="Analitik">
                                <PieChart size={18} color={showAnalytics ? '#2563eb' : '#64748b'}/>
                            </button>

                            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={styles.selectFilter}>
                                <option value="ALL">Semua Kategori</option>
                                <option value="Rapat">Rapat</option>
                                <option value="Event">Event</option>
                                <option value="Lomba">Lomba</option>
                                <option value="Sosialisasi">Sosialisasi</option>
                            </select>
                            <div style={styles.toggleGroup}>
                                <button onClick={() => setViewMode('list')} style={viewMode === 'list' ? styles.toggleBtnActive : styles.toggleBtn}><List size={18}/></button>
                                <button onClick={() => setViewMode('grid')} style={viewMode === 'grid' ? styles.toggleBtnActive : styles.toggleBtn}><LayoutGrid size={18}/></button>
                            </div>

                            <button onClick={handleExportCSV} style={styles.btnSecondary} title="Download Excel/CSV"><Download size={18}/></button>

                            {sysConfig?.allowProgramInput === false ? (
                                <div style={styles.lockedBtn}><Lock size={16}/> Input Ditutup</div>
                            ) : (
                                <button onClick={() => {resetForm(); setIsModalOpen(true)}} style={styles.primaryBtn}>
                                    <Plus size={18} strokeWidth={2.5}/> <span>Tambah Proker</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div style={styles.contentArea}>
                    {filteredPrograms.length === 0 ? (
                        <div style={styles.emptyState}>
                            <div style={styles.emptyIcon}>📂</div>
                            <h3>Belum ada program kerja</h3>
                            <p>Silakan tambah kegiatan baru untuk periode ini.</p>
                        </div>
                    ) : (
                        <>
                            {viewMode === 'list' ? (
                                <div style={styles.tableWrapper}>
                                    <table style={styles.table}>
                                        <thead>
                                            <tr>
                                                <th width="35%">DETAIL KEGIATAN</th>
                                                <th width="20%">JADWAL & LOKASI</th>
                                                <th width="15%">DIVISI</th>
                                                <th width="20%">ANGGARAN & TARGET</th>
                                                <th width="10%" style={{textAlign:'center'}}>AKSI</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredPrograms.map((p) => (
                                                <tr key={p.id} className="table-row">
                                                    <td>
                                                        <div style={{display: 'flex', gap: 16, alignItems: 'flex-start'}}>
                                                            <div style={styles.rowIcon}><FileText size={20} strokeWidth={1.5} /></div>
                                                            <div>
                                                                <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap'}}>
                                                                    <span style={styles.rowTitle}>{p.namaKegiatan}</span>
                                                                    <span style={{...styles.categoryBadge, ...getBadgeStyle(p.kategori)}}>{p.kategori}</span>
                                                                </div>
                                                                <div style={styles.rowDesc}>{p.deskripsi || <em style={{opacity: 0.5}}>Tidak ada deskripsi</em>}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div style={styles.metaItem}>
                                                            <Calendar size={14} className="icon"/> {p.dateDisplay}
                                                        </div>
                                                        
                                                        {/* LOGIC TAMPILAN LOKASI */}
                                                        {p.dateMode === 'SERIES' ? (
                                                            <div style={styles.metaItem}>
                                                                <MapPin size={14} className="icon"/> 
                                                                <span style={{fontStyle:'italic', color:'#3b82f6'}}>Lihat detail (Bervariasi)</span>
                                                            </div>
                                                        ) : (
                                                            p.lokasi && <div style={styles.metaItem}><MapPin size={14} className="icon"/> {p.lokasi}</div>
                                                        )}
                                                    </td>
                                                    <td><div style={styles.divisiBadge}>{p.penanggungJawab}</div></td>
                                                    <td>
                                                        <div style={styles.moneyText}>{formatRp(p.estimasiBiaya)}</div>
                                                        <div style={styles.metaItem}><Users size={14} className="icon"/> {p.targetPeserta || 'Internal'}</div>
                                                    </td>
                                                    <td>
                                                        <div style={styles.actionGroup}>
                                                            <button onClick={() => handleDuplicate(p)} style={styles.actionBtnCopy} title="Duplicate"><Copy size={16}/></button>
                                                            <button onClick={() => handleEdit(p)} style={styles.actionBtnEdit}><Pencil size={16}/></button>
                                                            <button onClick={() => setDeleteModal({id: p.id, name: p.namaKegiatan})} style={styles.actionBtnDelete}><Trash2 size={16}/></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div style={styles.gridContainer}>
                                    {filteredPrograms.map((p) => (
                                        <div key={p.id} style={styles.card}>
                                            <div style={styles.cardHeader}>
                                                <span style={{...styles.categoryBadge, ...getBadgeStyle(p.kategori)}}>{p.kategori}</span>
                                                <div style={styles.cardActions}>
                                                    <button onClick={() => handleDuplicate(p)} style={styles.iconBtn}><Copy size={14}/></button>
                                                    <button onClick={() => handleEdit(p)} style={styles.iconBtn}><Pencil size={14}/></button>
                                                    <button onClick={() => setDeleteModal({id: p.id, name: p.namaKegiatan})} style={{...styles.iconBtn, color: '#ef4444'}}><Trash2 size={14}/></button>
                                                </div>
                                            </div>
                                            <h3 style={styles.cardTitle}>{p.namaKegiatan}</h3>
                                            <div style={styles.cardMeta}><Calendar size={14}/> {p.dateDisplay}</div>
                                            <div style={styles.cardMeta}><Users size={14}/> {p.penanggungJawab}</div>
                                            <div style={styles.cardFooter}>
                                                <span style={styles.moneyText}>{formatRp(p.estimasiBiaya)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* --- MODAL FORM --- */}
            {isModalOpen && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>{editingId ? 'Edit Program Kerja' : 'Tambah Program Kerja'}</h2>
                            <button onClick={() => setIsModalOpen(false)} style={styles.closeBtn}><X size={20}/></button>
                        </div>
                        <div style={styles.tabContainer}>
                            {[1, 2, 3].map(step => (
                                <button key={step} onClick={() => setActiveTab(step)} style={activeTab === step ? styles.tabActive : styles.tabItem}>
                                    {step === 1 ? 'Info Dasar' : step === 2 ? 'Waktu & Tempat' : 'Detail & Biaya'}
                                </button>
                            ))}
                        </div>
                        <div style={styles.modalBody}>
                            {activeTab === 1 && (
                                <div style={styles.formStack}>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Nama Kegiatan <span style={styles.req}>*</span></label>
                                        <input style={styles.input} value={form.namaKegiatan} onChange={e => setForm({...form, namaKegiatan: e.target.value})} placeholder="Contoh: Rapat Kerja Awal Tahun"/>
                                    </div>
                                    <div style={styles.rowTwo}>
                                        <div style={styles.formGroup}>
                                            <label style={styles.label}>Kategori</label>
                                            <select style={styles.input} value={form.kategori} onChange={e => setForm({...form, kategori: e.target.value})}>
                                                <option value="Rapat">Rapat</option><option value="Event">Event</option><option value="Lomba">Lomba</option><option value="Sosialisasi">Sosialisasi</option><option value="Lainnya">Lainnya</option>
                                            </select>
                                        </div>
                                        <div style={styles.formGroup}>
                                            <label style={styles.label}>Divisi Penanggung Jawab <span style={styles.req}>*</span></label>
                                            <select style={styles.input} value={form.penanggungJawab} onChange={e => setForm({...form, penanggungJawab: e.target.value})}>
                                                <option value="">-- Pilih Divisi --</option>
                                                {divisions.map((div, i) => <option key={i} value={div}>{div}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 2 && (
                                <div style={styles.formStack}>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Jenis Waktu Pelaksanaan</label>
                                        <select 
                                            style={styles.input} 
                                            value={form.dateMode} 
                                            onChange={(e) => setForm({...form, dateMode: e.target.value})}
                                        >
                                            <option value="TENTATIVE">Tentatif (Hanya Bulan)</option>
                                            <option value="SINGLE">Satu Hari (Fix)</option>
                                            <option value="RANGE">Rentang Hari (Multi-days)</option>
                                            <option value="SERIES">Runtutan / Rutin (Series)</option>
                                        </select>
                                    </div>

                                    {form.dateMode === 'TENTATIVE' && (
                                        <div style={styles.formGroup}>
                                            <label style={styles.label}>Bulan Pelaksanaan</label>
                                            <input type="month" style={styles.input} 
                                                value={form.bulanTentatif} 
                                                onChange={e => setForm({...form, bulanTentatif: e.target.value})}
                                            />
                                        </div>
                                    )}

                                    {form.dateMode === 'SINGLE' && (
                                        <div style={styles.rowTwo}>
                                            <div style={styles.formGroup}>
                                                <label style={styles.label}>Tanggal</label>
                                                <input type="date" style={styles.input} 
                                                    value={form.tglMulai} 
                                                    onChange={e => setForm({...form, tglMulai: e.target.value, tglSelesai: e.target.value})}
                                                />
                                            </div>
                                            <div style={styles.formGroup}>
                                                <label style={styles.label}>Jam (Mulai - Selesai)</label>
                                                <div style={{display:'flex', alignItems:'center', gap:4}}>
                                                    <input type="time" style={styles.input} value={form.jamMulai} onChange={e=>setForm({...form, jamMulai: e.target.value})}/>
                                                    <span>-</span>
                                                    <input type="time" style={styles.input} value={form.jamSelesai} onChange={e=>setForm({...form, jamSelesai: e.target.value})}/>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {form.dateMode === 'RANGE' && (
                                        <div style={{display:'flex', flexDirection:'column', gap:12, background:'#f8fafc', padding:12, borderRadius:8, border:'1px solid #e2e8f0'}}>
                                            <div style={styles.rowTwo}>
                                                <div style={styles.formGroup}>
                                                    <label style={{fontSize:'0.8rem', fontWeight:600}}>Mulai</label>
                                                    <input type="date" style={styles.input} value={form.tglMulai} onChange={e=>setForm({...form, tglMulai: e.target.value})}/>
                                                    <input type="time" style={{...styles.input, marginTop:4}} value={form.jamMulai} onChange={e=>setForm({...form, jamMulai: e.target.value})}/>
                                                </div>
                                                <div style={{display:'flex', alignItems:'center', paddingTop:16}}><ArrowRight size={16} color="#94a3b8"/></div>
                                                <div style={styles.formGroup}>
                                                    <label style={{fontSize:'0.8rem', fontWeight:600}}>Selesai</label>
                                                    <input type="date" style={styles.input} value={form.tglSelesai} onChange={e=>setForm({...form, tglSelesai: e.target.value})}/>
                                                    <input type="time" style={{...styles.input, marginTop:4}} value={form.jamSelesai} onChange={e=>setForm({...form, jamSelesai: e.target.value})}/>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {form.dateMode === 'SERIES' && (
                                        <div style={{background:'#f8fafc', padding:12, borderRadius:8, border:'1px solid #e2e8f0'}}>
                                            <label style={{...styles.label, marginBottom:8}}>Jadwal & Lokasi Runtutan</label>
                                            
                                            {/* Header Kecil untuk info user */}
                                            <div style={{fontSize:'0.75rem', color:'#64748b', marginBottom:12, fontStyle:'italic'}}>
                                                <Info size={12} style={{display:'inline', verticalAlign:'middle'}}/> Masukkan lokasi spesifik untuk setiap tanggal jika berbeda-beda.
                                            </div>

                                            {form.jadwalSeries.map((item, idx) => (
                                                <div key={idx} style={{
                                                    background: 'white', 
                                                    padding: 12, 
                                                    borderRadius: 8, 
                                                    border: '1px solid #e2e8f0', 
                                                    marginBottom: 12,
                                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                                }}>
                                                    {/* Baris 1: Tanggal & Waktu */}
                                                    <div style={{display:'flex', gap:8, marginBottom:8, alignItems:'center'}}>
                                                        <div style={{flex: 1.5}}>
                                                            <span style={{fontSize:'0.7rem', fontWeight:600, color:'#64748b', display:'block', marginBottom:2}}>Tanggal</span>
                                                            <input type="date" style={{...styles.input, padding:'6px'}} 
                                                                value={item.tgl} onChange={e=>updateSeriesDate(idx, 'tgl', e.target.value)}
                                                            />
                                                        </div>
                                                        <div style={{flex: 1}}>
                                                            <span style={{fontSize:'0.7rem', fontWeight:600, color:'#64748b', display:'block', marginBottom:2}}>Mulai</span>
                                                            <input type="time" style={{...styles.input, padding:'6px'}} 
                                                                value={item.jamMulai} onChange={e=>updateSeriesDate(idx, 'jamMulai', e.target.value)}
                                                            />
                                                        </div>
                                                        <div style={{flex: 1}}>
                                                            <span style={{fontSize:'0.7rem', fontWeight:600, color:'#64748b', display:'block', marginBottom:2}}>Selesai</span>
                                                            <input type="time" style={{...styles.input, padding:'6px'}} 
                                                                value={item.jamSelesai} onChange={e=>updateSeriesDate(idx, 'jamSelesai', e.target.value)}
                                                            />
                                                        </div>
                                                        <button onClick={()=>removeSeriesDate(idx)} style={{color:'#ef4444', background:'none', border:'none', cursor:'pointer', marginTop: 14, padding:4}}>
                                                            <X size={18}/>
                                                        </button>
                                                    </div>

                                                    {/* Baris 2: Lokasi Spesifik */}
                                                    <div style={{display:'flex', alignItems:'center', gap:8, background:'#f8fafc', borderRadius:6, padding:'0 8px', border:'1px dashed #cbd5e0'}}>
                                                        <MapPin size={14} color="#64748b"/>
                                                        <input 
                                                            type="text"
                                                            style={{...styles.inputNoBorder, fontSize:'0.85rem', padding:'8px 0'}} 
                                                            placeholder={`Lokasi hari ke-${idx+1} (cth: Ruang 10${idx+1})`}
                                                            value={item.lokasi} 
                                                            onChange={e=>updateSeriesDate(idx, 'lokasi', e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            ))}

                                            <button onClick={addSeriesDate} style={{...styles.btnSecondary, width:'100%', fontSize:'0.85rem', padding:'8px', borderStyle:'dashed', marginTop:4}}>
                                                <Plus size={16}/> Tambah Jadwal Lagi
                                            </button>
                                        </div>
                                    )}

                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Lokasi Kegiatan</label>
                                        <div style={styles.inputIconWrapper}><MapPin size={16} color="#64748b"/><input style={styles.inputNoBorder} value={form.lokasi} onChange={e => setForm({...form, lokasi: e.target.value})} placeholder="Nama Gedung / Ruangan"/></div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 3 && (
                                <div style={styles.formStack}>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Estimasi Biaya <span style={styles.req}>*</span></label>
                                        <div style={styles.inputIconWrapper}>
                                            <Banknote size={16} color="#64748b"/>
                                            <input style={styles.inputNoBorder} value={form.estimasiBiayaStr} onChange={handleMoneyChange} placeholder="0"/>
                                        </div>
                                        {budgetLimit > 0 && <small style={{color: '#64748b', marginTop: 4}}>Sisa Pagu: {formatRp(remainingBudget + (editingId ? (programs.find(p=>p.id===editingId)?.estimasiBiaya||0) : 0))}</small>}
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Target Peserta</label>
                                        <input style={styles.input} value={form.targetPeserta} onChange={e => setForm({...form, targetPeserta: e.target.value})} placeholder="Contoh: Seluruh Mahasiswa"/>
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Deskripsi Singkat</label>
                                        <textarea rows={3} style={styles.textarea} value={form.deskripsi} onChange={e => setForm({...form, deskripsi: e.target.value})} placeholder="Jelaskan tujuan kegiatan..."/>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div style={styles.modalFooter}>
                            <button onClick={() => setIsModalOpen(false)} style={styles.btnSecondary}>Batal</button>
                            <div style={{display:'flex', gap: 10}}>
                                {activeTab > 1 && <button onClick={() => setActiveTab(p => p-1)} style={styles.btnSecondary}>Kembali</button>}
                                {activeTab < 3 ? <button onClick={() => setActiveTab(p => p+1)} style={styles.btnPrimary}>Lanjut</button> : <button onClick={handleSave} disabled={isSaving} style={styles.btnPrimary}>{isSaving ? <Loader2 className="spin" size={18}/> : <Save size={18}/>} {isSaving ? ' Menyimpan...' : ' Simpan Data'}</button>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE MODAL */}
            {deleteModal && (
                <div style={styles.modalOverlay}>
                    <div style={{...styles.modalContent, maxWidth: 400}}>
                        <div style={{padding: 24, textAlign: 'center'}}>
                            <div style={{...styles.iconCircle, background:'#fee2e2', color:'#dc2626', margin:'0 auto 16px'}}><Trash2 size={32}/></div>
                            <h3 style={{margin:'0 0 8px', color:'#1e293b'}}>Hapus Program Kerja?</h3>
                            <p style={{margin:0, color:'#64748b', fontSize:'0.9rem'}}>Anda akan menghapus <strong>"{deleteModal.name}"</strong>. Tindakan ini tidak dapat dibatalkan.</p>
                            <div style={{display:'flex', gap:12, marginTop:24}}>
                                <button onClick={()=>setDeleteModal(null)} style={{...styles.btnSecondary, flex:1}}>Batal</button>
                                <button onClick={handleDelete} style={{...styles.btnPrimary, background:'#dc2626', flex:1}}>Hapus</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- STYLES ---
const colors = { primary: '#2563eb', bg: '#f8fafc', surface: '#ffffff', textMain: '#0f172a', textSec: '#64748b', border: '#e2e8f0', danger: '#ef4444' };

const styles = {
    pageBackground: { minHeight: '100vh', background: colors.bg, padding: '24px' },
    container: { maxWidth: 1280, margin: '0 auto' },
    loadingContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh', color: colors.textSec, gap: 16 },
    
    // Header & Widgets
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 20 },
    headerLeft: { display: 'flex', alignItems: 'center', gap: 16 },
    headerRight: { display: 'flex', gap: 16, flexWrap: 'wrap' },
    
    refCard: { background: 'white', padding: '12px 16px', borderRadius: 12, border: `1px solid ${colors.border}`, display: 'flex', gap: 12, alignItems: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' },
    refIcon: { width: 40, height: 40, borderRadius: 8, background: '#eff6ff', color: colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    refTitle: { fontSize: '0.8rem', fontWeight: 700, color: colors.textMain },
    refSub: { fontSize: '0.75rem', color: colors.textSec, marginBottom: 2 },
    refLink: { fontSize: '0.75rem', color: colors.primary, fontWeight: 600, textDecoration: 'none' },

    budgetCard: { background: 'linear-gradient(135deg, #1e293b, #334155)', color: 'white', padding: '16px 24px', borderRadius: 16, minWidth: '280px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)' },
    backBtn: { width: 44, height: 44, borderRadius: 12, border: `1px solid ${colors.border}`, background: colors.surface, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMain },
    breadcrumb: { fontSize: '0.85rem', color: colors.textSec, fontWeight: 500, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' },
    pageTitle: { fontSize: '1.75rem', fontWeight: 800, color: colors.textMain, margin: 0, lineHeight: 1.2 },
    orgBadge: { display: 'inline-block', marginTop: 6, fontSize: '0.8rem', background: '#dbeafe', color: '#1e40af', padding: '2px 10px', borderRadius: 20, fontWeight: 600 },
    
    progressBg: { width: '100%', height: 8, background: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 4, transition: 'width 0.5s ease' },

    // Controls & Analytics
    controlsArea: { display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 24 },
    controlRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
    analyticsRow: { display: 'flex', gap: 16, flexWrap: 'wrap', padding: '16px', background: 'white', borderRadius: 12, border: `1px solid ${colors.border}`, marginBottom: 16 },
    analyticsItem: { flex: 1, minWidth: 100, borderRight: `1px solid ${colors.border}`, paddingRight: 16 },

    searchBar: { flex: 1, display: 'flex', alignItems: 'center', background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, minWidth: 250, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
    searchInput: { border: 'none', padding: '12px', outline: 'none', width: '100%', fontSize: '0.95rem', borderRadius: 10 },
    filterGroup: { display: 'flex', gap: 12, flexWrap: 'wrap' },
    selectFilter: { padding: '0 16px', height: 44, borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.surface, fontSize: '0.9rem', cursor: 'pointer', outline: 'none' },
    toggleGroup: { display: 'flex', background: '#f1f5f9', padding: 4, borderRadius: 10, border: `1px solid ${colors.border}` },
    toggleBtn: { padding: '6px 10px', borderRadius: 6, border: 'none', background: 'transparent', color: colors.textSec, cursor: 'pointer' },
    toggleBtnActive: { padding: '6px 10px', borderRadius: 6, border: 'none', background: colors.surface, color: colors.textMain, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' },
    primaryBtn: { background: colors.primary, color: 'white', border: 'none', padding: '0 20px', height: 44, borderRadius: 10, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.3)', transition: '0.2s' },
    lockedBtn: { background: '#fee2e2', color: '#dc2626', border: 'none', padding: '0 20px', height: 44, borderRadius: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 },
    
    lockedState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center', color: '#64748b', gap: 16 },
    statusBadge: { background: '#f1f5f9', padding: '6px 12px', borderRadius: 8, fontWeight: 700, fontSize: '0.9rem', color: '#475569' },

    contentArea: { minHeight: 400 },
    emptyState: { textAlign: 'center', padding: '60px 20px', color: colors.textSec },
    emptyIcon: { fontSize: '3rem', marginBottom: 16 },

    tableWrapper: { background: colors.surface, borderRadius: 16, border: `1px solid ${colors.border}`, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
    table: { width: '100%', borderCollapse: 'collapse' },
    rowIcon: { width: 40, height: 40, borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', flexShrink: 0 },
    rowTitle: { fontWeight: 700, color: '#0f172a', fontSize: '0.95rem', lineHeight: 1.2 },
    rowDesc: { fontSize: '0.85rem', color: '#64748b', lineHeight: 1.4, marginTop: 2, maxWidth: 350, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
    categoryBadge: { fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 6, letterSpacing: '0.5px' },
    divisiBadge: { background: '#e0e7ff', color: '#4338ca', padding: '4px 10px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600, display: 'inline-block' },
    metaItem: { display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: colors.textSec, marginTop: 4 },
    moneyText: { fontFamily: 'monospace', fontWeight: 700, color: colors.textMain, fontSize: '1rem' },
    actionGroup: { display: 'flex', justifyContent: 'center', gap: 8 },
    actionBtnEdit: { width: 32, height: 32, borderRadius: 8, border: 'none', background: '#eff6ff', color: colors.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    actionBtnDelete: { width: 32, height: 32, borderRadius: 8, border: 'none', background: '#fef2f2', color: colors.danger, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    actionBtnCopy: { width: 32, height: 32, borderRadius: 8, border: 'none', background: '#f0fdf4', color: '#16a34a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },

    gridContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 },
    card: { background: colors.surface, borderRadius: 16, border: `1px solid ${colors.border}`, padding: 20, display: 'flex', flexDirection: 'column', transition: 'transform 0.2s, box-shadow 0.2s' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    cardActions: { display: 'flex', gap: 8 },
    iconBtn: { background: 'transparent', border: 'none', cursor: 'pointer', color: colors.textSec, padding: 4 },
    cardTitle: { fontSize: '1.1rem', fontWeight: 700, color: colors.textMain, margin: '0 0 12px 0' },
    cardMeta: { display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: colors.textSec, marginBottom: 8 },
    cardFooter: { marginTop: 'auto', paddingTop: 16, borderTop: `1px solid ${colors.bg}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    iconCircle: { width: 64, height: 64, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, border: '1px solid #e2e8f0', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' },

    modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
    modalContent: { background: colors.surface, width: '90%', maxWidth: 550, borderRadius: 20, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' },
    modalHeader: { padding: '20px 24px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    modalTitle: { margin: 0, fontSize: '1.25rem', fontWeight: 700, color: colors.textMain },
    closeBtn: { background: 'transparent', border: 'none', cursor: 'pointer', color: colors.textSec },
    
    tabContainer: { display: 'flex', borderBottom: `1px solid ${colors.border}`, background: '#f8fafc' },
    tabItem: { flex: 1, padding: '14px', border: 'none', background: 'transparent', color: colors.textSec, fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', borderBottom: '2px solid transparent' },
    tabActive: { flex: 1, padding: '14px', border: 'none', background: 'white', color: colors.primary, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', borderBottom: `2px solid ${colors.primary}` },
    
    modalBody: { padding: 24, overflowY: 'auto' },
    modalFooter: { padding: '16px 24px', borderTop: `1px solid ${colors.border}`, background: '#f8fafc', display: 'flex', justifyContent: 'space-between' },
    
    formStack: { display: 'flex', flexDirection: 'column', gap: 16 },
    rowTwo: { display: 'flex', gap: 16 },
    formGroup: { flex: 1, display: 'flex', flexDirection: 'column', gap: 6 },
    label: { fontSize: '0.85rem', fontWeight: 600, color: colors.textMain },
    input: { padding: '10px 12px', borderRadius: 8, border: `1px solid ${colors.border}`, fontSize: '0.95rem', width: '100%', boxSizing: 'border-box', outlineColor: colors.primary },
    textarea: { padding: '10px 12px', borderRadius: 8, border: `1px solid ${colors.border}`, fontSize: '0.95rem', width: '100%', boxSizing: 'border-box', outlineColor: colors.primary, fontFamily: 'inherit', resize: 'vertical' },
    req: { color: colors.danger },
    
    inputIconWrapper: { display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', border: `1px solid ${colors.border}`, borderRadius: 8, background: 'white' },
    inputNoBorder: { border: 'none', padding: '10px 0', fontSize: '0.95rem', width: '100%', outline: 'none' },
    
    radioGroup: { display: 'flex', gap: 20, background: '#f1f5f9', padding: 10, borderRadius: 8 },
    radioLabel: { display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 500 },

    btnSecondary: { padding: '10px 20px', borderRadius: 8, border: `1px solid ${colors.border}`, background: 'white', color: colors.textMain, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 },
    btnPrimary: { padding: '10px 24px', borderRadius: 8, border: 'none', background: colors.primary, color: 'white', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 },
};

// CSS Injection
const globalCss = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    body { font-family: 'Inter', sans-serif; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes slideUp { from { transform: translate(-50%, 20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
    .table th { text-align: left; padding: 12px 16px; background: #f8fafc; color: #64748b; font-size: 0.75rem; font-weight: 700; border-bottom: 1px solid #e2e8f0; letter-spacing: 0.05em; }
    .table td { padding: 16px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    .table-row:hover { background-color: #f8fafc; transition: background-color 0.15s; }
    .table-row:last-child td { border-bottom: none; }
    .icon { opacity: 0.6; }
`;

export default RktProgramList;