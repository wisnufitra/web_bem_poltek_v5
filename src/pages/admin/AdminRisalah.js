import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../../firebase/firebaseConfig';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { logActivity } from '../../utils/logActivity';

// --- ICON & CHART IMPORTS ---
import { ClipboardList, Plus, X, Save, Trash2, Pencil, Calendar, ArrowLeft, Link as LinkIcon, Users, CheckSquare, Paperclip } from 'lucide-react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

// --- UI COMPONENTS ---
const Toast = ({ message, clear }) => {
    useEffect(() => { const timer = setTimeout(clear, 3000); return () => clearTimeout(timer); }, [clear]);
    return <div className="toast">{message}</div>;
};
const ConfirmationModal = ({ modalState, setModalState }) => {
    if (!modalState.show) return null;
    return ( <div className="modal-overlay"><div className="modal-content small-modal"><h3 className="modal-title">{modalState.message}</h3><div className="modal-actions"><button onClick={modalState.onConfirm} className="button button-danger">Ya, Hapus</button><button onClick={() => setModalState({ show: false })} className="button button-secondary">Batal</button></div></div></div> );
};
const EmptyState = ({ text, subtext }) => ( <div className="empty-state"><ClipboardList size={48} /><p className="empty-state-text">{text}</p><p className="empty-state-subtext">{subtext}</p></div> );

// --- MAIN COMPONENT ---
const AdminRisalah = () => {
    const navigate = useNavigate();
    const [risalahList, setRisalahList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toastMessage, setToastMessage] = useState('');
    const [confirmProps, setConfirmProps] = useState({ show: false });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const initialFormState = {
        namaRapat: '', tanggalRapat: new Date().toISOString().slice(0, 10), pemimpinRapat: '',
        notulensi: '', hasilKeputusan: '',
        daftarHadir: '', actionItems: [], lampiran: []
    };
    const [formState, setFormState] = useState(initialFormState);
    
    const [currentActionItem, setCurrentActionItem] = useState({ tugas: '', penanggungJawab: '', status: 'Belum Dikerjakan' });
    const [currentLampiran, setCurrentLampiran] = useState({ namaFile: '', link: '' });

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, user => { if (!user) navigate('/login'); });
        const qRisalah = query(collection(db, "risalah_rapat"), orderBy("tanggalRapat", "desc"));
        const unsubRisalah = onSnapshot(qRisalah, snapshot => {
            setRisalahList(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        const styleTag = document.createElement('style'); styleTag.innerHTML = styleSheet; styleTag.id = 'admin-risalah-style'; document.head.appendChild(styleTag);
        return () => { 
            unsubscribeAuth(); 
            unsubRisalah();
            const styleElement = document.getElementById('admin-risalah-style');
            if(styleElement) styleElement.parentNode.removeChild(styleElement);
        };
    }, [navigate]);
    
    const dashboardData = useMemo(() => {
        const totalRapat = risalahList.length;
        let totalTugas = 0;
        let tugasSelesai = 0;
        const rapatPerBulan = Array(12).fill(0);

        risalahList.forEach(risalah => {
            if (risalah.actionItems) {
                totalTugas += risalah.actionItems.length;
                tugasSelesai += risalah.actionItems.filter(item => item.status === 'Selesai').length;
            }
            const bulan = new Date(risalah.tanggalRapat + 'T00:00:00').getMonth();
            rapatPerBulan[bulan]++;
        });
        
        const persentaseTugas = totalTugas > 0 ? (tugasSelesai / totalTugas) * 100 : 0;

        return {
            stats: { totalRapat, totalTugas, tugasSelesai, persentaseTugas },
            rapatPerBulanChart: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
                datasets: [{ label: 'Jumlah Rapat', data: rapatPerBulan, backgroundColor: '#60a5fa', borderRadius: 4 }],
            },
        };
    }, [risalahList]);

    const handleFormChange = (e) => setFormState(prev => ({ ...prev, [e.target.name]: e.target.value }));
    
    const handleAddActionItem = () => {
        if (!currentActionItem.tugas.trim() || !currentActionItem.penanggungJawab.trim()) return setToastMessage('Deskripsi tugas dan PIC wajib diisi.');
        setFormState(prev => ({...prev, actionItems: [...prev.actionItems, {...currentActionItem, id: Date.now()}]}));
        setCurrentActionItem({ tugas: '', penanggungJawab: '', status: 'Belum Dikerjakan' });
    };
    const handleRemoveActionItem = (id) => setFormState(prev => ({...prev, actionItems: prev.actionItems.filter(item => item.id !== id)}));
    
    const handleToggleActionItemStatus = (id) => {
        setFormState(prev => ({
            ...prev,
            actionItems: prev.actionItems.map(item =>
                item.id === id
                    ? { ...item, status: item.status === 'Selesai' ? 'Belum Dikerjakan' : 'Selesai' }
                    : item
            )
        }));
    };
    
    const handleAddLampiran = () => {
        if (!currentLampiran.namaFile.trim() || !currentLampiran.link.trim()) return setToastMessage('Nama file dan link wajib diisi.');
        setFormState(prev => ({...prev, lampiran: [...prev.lampiran, {...currentLampiran, id: Date.now()}]}));
        setCurrentLampiran({ namaFile: '', link: '' });
    };
    const handleRemoveLampiran = (id) => setFormState(prev => ({...prev, lampiran: prev.lampiran.filter(item => item.id !== id)}));

    const handleSimpan = async (e) => {
        e.preventDefault();
        if (!formState.namaRapat || !formState.tanggalRapat) return setToastMessage("Nama dan Tanggal Rapat wajib diisi.");
        try {
            if (editingId) {
                await updateDoc(doc(db, "risalah_rapat", editingId), { ...formState, updatedAt: serverTimestamp() });
                await logActivity(`Memperbarui risalah: "${formState.namaRapat}"`);
                setToastMessage('Risalah rapat berhasil diperbarui!');
            } else {
                await addDoc(collection(db, "risalah_rapat"), { ...formState, createdAt: serverTimestamp() });
                await logActivity(`Menambahkan risalah: "${formState.namaRapat}"`);
                setToastMessage('Risalah rapat berhasil ditambahkan!');
            }
            closeModal();
        } catch (error) { setToastMessage('Gagal menyimpan: ' + error.message); }
    };
    const handleEdit = (item) => { setFormState({ ...initialFormState, ...item }); setEditingId(item.id); setIsModalOpen(true); };
    const handleHapus = (id, namaRapat) => {
        setConfirmProps({ 
            show: true, 
            message: `Yakin ingin menghapus risalah "${namaRapat}"?`,
            onConfirm: async () => {
                try {
                    await deleteDoc(doc(db, "risalah_rapat", id));
                    await logActivity(`Menghapus risalah: "${namaRapat}"`);
                    setToastMessage('Risalah rapat berhasil dihapus!');
                } catch (error) { 
                    setToastMessage('Gagal menghapus: ' + error.message); 
                }
                setConfirmProps({ show: false });
            }
        });
    };
    const openModalTambah = () => { setEditingId(null); setFormState(initialFormState); setIsModalOpen(true); };
    const closeModal = () => { setIsModalOpen(false); setEditingId(null); };
    
    return (
        <div className="admin-page">
            <ConfirmationModal modalState={confirmProps} setModalState={setConfirmProps} />
            {toastMessage && <Toast message={toastMessage} clear={() => setToastMessage('')} />}

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content large">
                        <div className="modal-header"><h3>{editingId ? 'Edit Risalah Rapat' : 'Tambah Risalah Baru'}</h3><button onClick={closeModal} className="close-button"><X size={20}/></button></div>
                        <form onSubmit={handleSimpan} className="modal-form">
                            <div className="modal-body">
                                <div className="form-section"><h4 className="form-section-title">Informasi Rapat</h4>
                                    <div className="form-group"><label className="label">Nama/Agenda Rapat</label><input name="namaRapat" value={formState.namaRapat} onChange={handleFormChange} className="input" required /></div>
                                    <div className="form-grid-2-col">
                                        <div className="form-group"><label className="label">Tanggal Rapat</label><input name="tanggalRapat" type="date" value={formState.tanggalRapat} onChange={handleFormChange} className="input" required /></div>
                                        <div className="form-group"><label className="label">Pemimpin Rapat</label><input name="pemimpinRapat" value={formState.pemimpinRapat} onChange={handleFormChange} className="input" /></div>
                                    </div>
                                </div>
                                <div className="form-section"><h4 className="form-section-title">Isi Rapat</h4>
                                    <div className="form-group"><label className="label">Notulensi / Ringkasan Pembahasan</label><textarea name="notulensi" value={formState.notulensi} onChange={handleFormChange} className="input" rows="7"></textarea></div>
                                    <div className="form-group"><label className="label">Keputusan yang Dihasilkan</label><textarea name="hasilKeputusan" value={formState.hasilKeputusan} onChange={handleFormChange} className="input" rows="4"></textarea></div>
                                </div>
                                <div className="form-section"><h4 className="form-section-title">Daftar Hadir</h4>
                                    <div className="form-group"><label className="label">Tulis satu nama per baris (akan dinomori otomatis)</label><textarea name="daftarHadir" value={formState.daftarHadir} onChange={handleFormChange} className="input" rows="5" placeholder="1. John Doe&#10;2. Jane Smith"></textarea></div>
                                </div>
                                <div className="form-section"><h4 className="form-section-title">Tugas & Tindak Lanjut</h4>
                                    <div className="repeater-list">
                                        {formState.actionItems.map(item => (
                                            <div key={item.id} className={`repeater-item ${item.status === 'Selesai' ? 'done' : ''}`}>
                                                <button type="button" className="status-toggle-button" onClick={() => handleToggleActionItemStatus(item.id)}><CheckSquare size={16} /></button>
                                                <span><strong>{item.penanggungJawab}:</strong> {item.tugas}</span>
                                                <button type="button" onClick={() => handleRemoveActionItem(item.id)} className="button-icon-small danger"><X size={12}/></button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="form-group-flex repeater-form">
                                        <input value={currentActionItem.tugas} onChange={e => setCurrentActionItem(p => ({...p, tugas: e.target.value}))} className="input" placeholder="Deskripsi Tugas" style={{flex:2}}/>
                                        <input value={currentActionItem.penanggungJawab} onChange={e => setCurrentActionItem(p => ({...p, penanggungJawab: e.target.value}))} className="input" placeholder="Penanggung Jawab (PIC)"/>
                                        <button type="button" onClick={handleAddActionItem} className="button button-secondary">Tambah Tugas</button>
                                    </div>
                                </div>
                                <div className="form-section"><h4 className="form-section-title">Lampiran Dokumen</h4>
                                    <div className="repeater-list">{formState.lampiran.map(item => (<div key={item.id} className="repeater-item"><span>{item.namaFile}</span><button type="button" onClick={() => handleRemoveLampiran(item.id)} className="button-icon-small danger"><X size={12}/></button></div>))}</div>
                                    <div className="form-group-flex repeater-form">
                                        <input value={currentLampiran.namaFile} onChange={e => setCurrentLampiran(p => ({...p, namaFile: e.target.value}))} className="input" placeholder="Nama File" style={{flex:2}}/>
                                        <div className="input-with-icon" style={{flex: 3}}><LinkIcon size={16}/><input value={currentLampiran.link} onChange={e => setCurrentLampiran(p => ({...p, link: e.target.value}))} className="input" placeholder="https://..."/></div>
                                        <button type="button" onClick={handleAddLampiran} className="button button-secondary">Tambah Link</button>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-actions"><button type="button" onClick={closeModal} className="button button-secondary">Batal</button><button type="submit" className="button button-success"><Save size={16}/> {editingId ? 'Simpan Perubahan' : 'Simpan'}</button></div>
                        </form>
                    </div>
                </div>
            )}

            <header className="page-header"><div><h1 className="page-title">Dashboard Risalah Rapat</h1><p className="page-subtitle">Analisis dan kelola produktivitas serta hasil rapat organisasi.</p></div></header>
            
            <div className="stat-card-grid">
                <div className="stat-card"><h4>Total Rapat</h4><p>{dashboardData.stats.totalRapat}</p></div>
                <div className="stat-card"><h4>Total Tugas</h4><p>{dashboardData.stats.totalTugas}</p></div>
                <div className="stat-card"><h4>Tugas Selesai</h4><p>{dashboardData.stats.tugasSelesai}</p></div>
                <div className="stat-card"><h4>Penyelesaian Tugas</h4><p>{dashboardData.stats.persentaseTugas.toFixed(1)}%</p></div>
            </div>

            <div className="chart-grid">
                <div className="card">
                    <h3 className="card-title">Frekuensi Rapat per Bulan</h3>
                    <div className="chart-container-wrapper">
                        <Bar data={dashboardData.rapatPerBulanChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="list-header"><h3 className="card-title">Arsip Risalah Rapat</h3><button onClick={openModalTambah} className="button button-primary"><Plus size={16}/> Tambah Risalah</button></div>
                <div className="item-list">
                    {loading ? <p>Memuat...</p> : (
                        risalahList.length > 0 ? risalahList.map(item => (
                            <div key={item.id} className="list-item-condensed risalah-item">
                                <div className="item-main-info">
                                    <strong title={item.namaRapat}>{item.namaRapat}</strong>
                                    <small><Calendar size={12}/> {new Date(item.tanggalRapat + 'T00:00:00').toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</small>
                                </div>
                                <div className="item-meta-indicators">
                                    {item.daftarHadir && <span><Users size={14} title="Jumlah Peserta" /> {item.daftarHadir.split('\n').filter(Boolean).length}</span>}
                                    {item.actionItems?.length > 0 && <span><CheckSquare size={14} title="Jumlah Tugas" /> {item.actionItems.length}</span>}
                                    {item.lampiran?.length > 0 && <span><Paperclip size={14} title="Jumlah Lampiran" /> {item.lampiran.length}</span>}
                                </div>
                                <div className="item-actions">
                                    <button onClick={() => handleEdit(item)} className="button-icon"><Pencil size={14}/></button>
                                    <button onClick={() => handleHapus(item.id, item.namaRapat)} className="button-icon danger"><Trash2 size={14}/></button>
                                </div>
                            </div>
                        )) : <EmptyState text="Belum Ada Risalah" subtext="Klik tombol 'Tambah Risalah' untuk memulai."/>
                    )}
                </div>
            </div>
            
            <button onClick={() => navigate("/admin")} className="button button-secondary" style={{width: '100%', marginTop: '8px'}}><ArrowLeft size={16}/> Kembali ke Dashboard</button>
        </div>
    );
};

const styleSheet = `
    .admin-page{font-family:'Inter',sans-serif;background-color:#f8fafc;min-height:100vh;padding:24px}.page-header{margin-bottom:24px}.page-title{color:#1e293b;font-size:1.75rem;font-weight:700;margin:0}.page-subtitle{color:#64748b;font-size:1rem;margin:4px 0 0}.card{background-color:#fff;padding:24px;border-radius:12px;border:1px solid #e2e8f0;box-shadow:0 4px 6px -1px rgba(0,0,0,.05);margin-bottom:24px;overflow:hidden}.card-title{margin:0 0 16px 0;color:#1e293b;font-size:1.25rem;font-weight:600}.input{display:block;width:100%;padding:10px 12px;border-radius:8px;border:1px solid #cbd5e0;font-size:1rem;background-color:#fff;transition:border-color .2s}.input:focus{border-color:#3b82f6;outline:0;box-shadow:0 0 0 2px rgba(59,130,246,.2)}textarea.input{line-height:1.6;font-family:inherit}.label{display:block;margin-bottom:8px;font-size:.9rem;color:#334155;font-weight:600}.button{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 16px;border-radius:8px;cursor:pointer;font-weight:600;font-size:.9rem;text-decoration:none;border:1px solid transparent;transition:all .2s}.button-primary{background-color:#2563eb;color:#fff}.button-primary:hover{background-color:#1d4ed8}.button-secondary{background-color:#f1f5f9;color:#475569;border-color:#e2e8f0}.button-secondary:hover{background-color:#e2e8f0}.button-success{background-color:#16a34a;color:#fff}.button-success:hover{background-color:#15803d}.button-danger{background-color:#dc2626;color:#fff}.button-danger:hover{background-color:#b91c1c}.button-icon{padding:8px;border-radius:50%;border:none;background-color:transparent;color:#64748b;cursor:pointer}.button-icon:hover{background-color:#f1f5f9}.button-icon.danger:hover{background-color:#fee2e2;color:#dc2626}.button-icon-small{padding:4px;border-radius:50%;border:none;background-color:transparent;color:#64748b;cursor:pointer;line-height:1}.button-icon-small.danger:hover{background-color:#fee2e2;color:#dc2626}.input-with-icon{position:relative;display:flex;align-items:center}.input-with-icon svg{position:absolute;left:12px;color:#9ca3af;pointer-events:none}.input-with-icon .input{padding-left:40px}.list-header{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:16px;margin-bottom:24px}.item-list{display:flex;flex-direction:column;gap:12px;margin-top:24px}.toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background-color:#1e293b;color:#fff;padding:12px 24px;border-radius:8px;z-index:1001}.modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background-color:rgba(15,23,42,.6);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px}.modal-content{background-color:#fff;border-radius:12px;width:100%;max-width:500px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,.1)}.modal-content.large{max-width:800px}.modal-header{padding:20px 24px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e8f0;flex-shrink:0}.modal-header h3{font-size:1.25rem;color:#1e293b;margin:0}.close-button{background:0 0;border:none;cursor:pointer;color:#9ca3af}.modal-form{display:flex;flex-direction:column;flex-grow:1;overflow:hidden}.modal-body{padding:24px;overflow-y:auto;display:flex;flex-direction:column;gap:24px}.modal-actions{display:flex;justify-content:flex-end;gap:12px;flex-shrink:0;border-top:1px solid #e2e8f0;padding:16px 24px;background-color:#f8fafc}.modal-content.small-modal{max-width:400px;text-align:center;padding:24px}.form-section{display:flex;flex-direction:column;gap:16px}.form-section-title{font-size:1rem;font-weight:600;color:#1e293b;margin:0;padding-bottom:12px;border-bottom:1px solid #e2e8f0}.form-grid-2-col{display:grid;gap:20px}.empty-state{text-align:center;padding:40px;background-color:#f9fafb;border-radius:12px;margin-top:20px}.empty-state svg{color:#cbd5e1;margin-bottom:16px}.empty-state-text{font-size:1.2rem;color:#475569;margin:0}.empty-state-subtext{font-size:1rem;color:#9ca3af;margin:8px 0 0}
    .list-item-condensed.risalah-item{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,2fr) minmax(0,auto);align-items:center;gap:16px}.item-main-info strong{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.item-main-info small{margin-top:4px}.item-meta-indicators{display:flex;gap:20px;align-items:center;justify-content:flex-start;color:#64748b;font-size:.9rem}.item-meta-indicators span{display:flex;align-items:center;gap:6px}
    .item-actions{display:flex;gap:4px;justify-content:flex-end}
    .repeater-list{display:flex;flex-direction:column;gap:8px;max-height:150px;overflow-y:auto;padding:8px;background-color:#f0f4f9;border-radius:8px}.repeater-item{display:flex;align-items:center;gap:12px;padding:8px 12px;background-color:#fff;border-radius:6px;border:1px solid #e2e8f0}.repeater-item.done{background-color:#f0fdf4;border-color:#bbf7d0}.repeater-item.done span{text-decoration:line-through;color:#6b7280}.repeater-item span{flex-grow:1}.repeater-form{align-items:flex-end;gap:12px}
    .stat-card-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px;margin-bottom:24px}.stat-card{background-color:#fff;padding:20px;border-radius:12px;border:1px solid #e2e8f0}.stat-card h4{margin:0 0 8px;color:#64748b;font-size:.9rem;font-weight:600}.stat-card p{margin:0;color:#1e293b;font-size:2rem;font-weight:700}
    .chart-grid{display:grid;grid-template-columns:1fr;gap:24px;margin-bottom:24px}.chart-container-wrapper{position:relative;height:300px;width:100%}
    .status-toggle-button{background-color:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;border-radius:6px;padding:6px;cursor:pointer;line-height:1;transition:all .2s ease}.status-toggle-button:hover{background-color:#e2e8f0}.repeater-item.done .status-toggle-button{background-color:#22c55e;color:#fff;border-color:#16a34a}
    @media (min-width:768px){.form-grid-2-col{grid-template-columns:1fr 1fr}}
    @media (max-width:767px){.list-item-condensed.risalah-item{grid-template-columns:1fr;gap:12px}.item-meta-indicators{justify-content:flex-start}.item-actions{justify-content:flex-start}.repeater-form{flex-direction:column;align-items:stretch}.chart-grid{grid-template-columns:1fr}}
`;

export default AdminRisalah;