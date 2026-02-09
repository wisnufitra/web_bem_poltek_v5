// src/pages/admin/Struktur.js
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase/firebaseConfig";
import { collection, onSnapshot, addDoc, deleteDoc, updateDoc, doc, query } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { logActivity } from "../utils/logActivity";

import { Network, Users, UserPlus, Pencil, Trash2, X, Save, Upload, GripVertical, Search, ArrowLeft, Loader2, Award, Mail, Phone, Instagram, Linkedin, GraduationCap } from 'lucide-react';

const jabatanMap = { "Pengurus Harian": ["Presiden Mahasiswa", "Wakil Presiden Mahasiswa"], "Inspektorat Jenderal": ["Anggota"], "Sekretariat Jenderal": ["Sekretaris Jendral", "Wakil Sekretaris Jendral", "Staf Sekretaris Jendral"], "Kementerian Keuangan": ["Kepala Menteri", "Wakil Menteri", "Staf Menteri"], "Kementerian Dalam Negeri": ["Kepala Menteri", "Wakil Menteri", "Staf Menteri"], "Kementerian Luar Negeri": ["Kepala Menteri", "Wakil Menteri", "Staf Menteri"], "Kementerian Pemuda dan Olahraga (PORA)": ["Kepala Menteri", "Wakil Menteri", "Staf Menteri"], "Kementerian PSDM": ["Kepala Menteri", "Wakil Menteri", "Staf Menteri"], "Kementerian Komunikasi dan Informasi (KOMINFO)": ["Kepala Menteri", "Wakil Menteri", "Staf Menteri"], "Kementerian Ekonomi Kreatif": ["Kepala Menteri", "Wakil Menteri", "Staf Menteri"], };
const prodiOptions = ["Teknokimia Nuklir", "Elektronika Instrumentasi", "Elektro Mekanika"];

// --- Komponen-komponen UI ---
const Toast = ({ message, clear }) => { useEffect(() => { const timer = setTimeout(clear, 3000); return () => clearTimeout(timer); }, [clear]); return <div className="toast">{message}</div>; };
const ConfirmationModal = ({ modalState, setModalState }) => {
    if (!modalState.show) return null;
    return ( <div className="modal-overlay"><div className="modal-content"><h3 className="modal-title">{modalState.message}</h3><div className="modal-actions"><button onClick={modalState.onConfirm} className="button button-danger">Ya, Hapus</button><button onClick={() => setModalState({ show: false })} className="button button-secondary">Batal</button></div></div></div> );
};
const StatCard = ({ icon, title, value }) => ( <div className="stat-card"><div><p className="stat-title">{title}</p><p className="stat-value">{value}</p></div><div className="stat-icon-wrapper">{icon}</div></div> );
const TambahAnggotaForm = ({ divisi, onTambah }) => {
    const [nama, setNama] = useState("");
    const [jabatan, setJabatan] = useState("");
    useEffect(() => { setJabatan(""); }, [divisi]);
    const handleSubmit = (e) => { e.preventDefault(); onTambah({ nama, jabatan, foto: `https://ui-avatars.com/api/?name=${nama.replace(/\s/g, '+')}&background=e0e7ff&color=1d4ed8` }); setNama(""); setJabatan(""); };
    return ( <form onSubmit={handleSubmit} className="tambah-anggota-form"><input placeholder="Nama Lengkap" value={nama} onChange={(e) => setNama(e.target.value)} className="input" required/><select value={jabatan} onChange={(e) => setJabatan(e.target.value)} className="input" required><option value="" disabled>-- Pilih Jabatan --</option>{(jabatanMap[divisi] || []).map(j => <option key={j} value={j}>{j}</option>)}</select><button type="submit" className="button button-primary"><UserPlus size={16} /> Tambah</button></form> );
};
const AnggotaCard = React.forwardRef(({ anggota, onEdit, onHapus, ...dragProps }, ref) => (
    <div ref={ref} className="anggota-card" {...dragProps}>
        <img src={anggota.foto || `https://ui-avatars.com/api/?name=${anggota.nama.replace(/\s/g, '+')}`} alt={anggota.nama} />
        <h4>{anggota.nama}</h4>
        <p>{anggota.jabatan}</p>
        <div className="card-actions"><button onClick={onEdit} className="button-icon"><Pencil size={14} /></button><button onClick={onHapus} className="button-icon danger"><Trash2 size={14} /></button></div>
        <div className="drag-handle"><GripVertical size={16} /></div>
    </div>
));
const EditModal = ({ data, setData, onClose, onSave, onFotoChange, divisiNama }) => {
    if (!data) return null;
    return (
        <div className="modal-overlay"><div className="modal-content"><button onClick={onClose} className="close-button"><X size={24} /></button><h2>Edit Anggota</h2>
            <div className="edit-form-grid">
                <div className="form-group"><label className="label">Nama:</label><input className="input" placeholder="Nama" value={data.nama} onChange={(e) => setData(p => ({ ...p, nama: e.target.value }))} /></div>
                <div className="form-group"><label className="label">Jabatan:</label><select className="input" value={data.jabatan} onChange={(e) => setData(p => ({ ...p, jabatan: e.target.value }))}>{(jabatanMap[divisiNama] || []).map(j => ( <option key={j} value={j}>{j}</option> ))}</select></div>
                <div className="form-group"><label className="label">NIM:</label><input className="input" placeholder="NIM" value={data.nim || ''} onChange={(e) => setData(p => ({ ...p, nim: e.target.value }))} /></div>
                <div className="form-group"><label className="label">Prodi:</label><select className="input" value={data.prodi || ''} onChange={(e) => setData(p => ({ ...p, prodi: e.target.value }))}><option value="">-- Pilih Prodi --</option>{prodiOptions.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                <div className="form-group"><label className="label">Email:</label><input className="input" placeholder="Email" value={data.email || ''} onChange={(e) => setData(p => ({ ...p, email: e.target.value }))} /></div>
                <div className="form-group"><label className="label">Instagram (username):</label><input className="input" placeholder="Instagram" value={data.instagram || ''} onChange={(e) => setData(p => ({ ...p, instagram: e.target.value }))} /></div>
                <div className="form-group"><label className="label">No. HP:</label><input className="input" placeholder="No. HP" value={data.nohp || ''} onChange={(e) => setData(p => ({ ...p, nohp: e.target.value }))} /></div>
                <div className="form-group"><label className="label">Ganti Foto:</label><div className="input-file-wrapper"><Upload size={16} /><span>Pilih File</span><input type="file" accept="image/*" onChange={onFotoChange} /></div></div>
                {data.foto && <img src={data.foto} alt="Preview" className="avatar-preview" />}
            </div>
            <div className="modal-actions"><button onClick={onSave} className="button button-success"><Save size={16}/> Simpan Perubahan</button><button onClick={onClose} className="button button-secondary">Batal</button></div>
        </div></div>
    );
};

// ✅ --- Komponen untuk Pembina Dikembalikan ke Bentuk Awal ---
const TambahPembinaForm = ({ onTambah }) => {
    const [nama, setNama] = useState("");
    const [jabatan, setJabatan] = useState("");
    const handleSubmit = (e) => { e.preventDefault(); onTambah({ nama, jabatan, foto: `https://ui-avatars.com/api/?name=${nama.replace(/\s/g, '+')}&background=c7d2fe&color=312e81` }); setNama(""); setJabatan(""); };
    return ( <form onSubmit={handleSubmit} className="tambah-anggota-form"><input placeholder="Nama Lengkap & Gelar" value={nama} onChange={(e) => setNama(e.target.value)} className="input" required/><input placeholder="Jabatan (e.g., Pembina BEM)" value={jabatan} onChange={(e) => setJabatan(e.target.value)} className="input" required/><button type="submit" className="button button-primary"><UserPlus size={16} /> Tambah</button></form> );
};
const EditPembinaModal = ({ data, setData, onClose, onSave }) => {
    if (!data) return null;
    const handleModalFotoChange = (e) => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader(); reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image(); img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas'); const MAX_WIDTH = 300;
                const scaleSize = MAX_WIDTH / img.width; canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
                setData(prev => ({ ...prev, foto: compressedBase64 }));
            };
        };
    };

    return (
        <div className="modal-overlay"><div className="modal-content"><button onClick={onClose} className="close-button"><X size={24} /></button><h2>{data.id ? 'Edit Data Pembina' : 'Tambah Data Pembina'}</h2>
            <div className="edit-form-grid">
                <div className="form-group"><label className="label">Nama & Gelar:</label><input className="input" value={data.nama || ''} onChange={(e) => setData(p => ({ ...p, nama: e.target.value }))} /></div>
                <div className="form-group"><label className="label">Jabatan:</label><input className="input" value={data.jabatan || ''} onChange={(e) => setData(p => ({ ...p, jabatan: e.target.value }))} /></div>
                <div className="form-group"><label className="label">NIP:</label><input className="input" placeholder="Opsional" value={data.nip || ''} onChange={(e) => setData(p => ({ ...p, nip: e.target.value }))} /></div>
                <div className="form-group"><label className="label">Golongan:</label><input className="input" placeholder="Opsional" value={data.golongan || ''} onChange={(e) => setData(p => ({ ...p, golongan: e.target.value }))} /></div>
                <div className="form-group"><label className="label">Email:</label><input type="email" className="input" placeholder="Opsional" value={data.email || ''} onChange={(e) => setData(p => ({ ...p, email: e.target.value }))} /></div>
                <div className="form-group"><label className="label">No. HP:</label><input className="input" placeholder="Opsional" value={data.nohp || ''} onChange={(e) => setData(p => ({ ...p, nohp: e.target.value }))} /></div>
                <div className="form-group"><label className="label">Instagram (Username):</label><input className="input" placeholder="Opsional" value={data.instagram || ''} onChange={(e) => setData(p => ({ ...p, instagram: e.target.value }))} /></div>
                <div className="form-group"><label className="label">LinkedIn (URL):</label><input type="url" className="input" placeholder="Opsional" value={data.linkedin || ''} onChange={(e) => setData(p => ({ ...p, linkedin: e.target.value }))} /></div>
                <div className="form-group form-group-span-2"><label className="label">Link Google Scholar (URL):</label><input type="url" className="input" placeholder="Opsional" value={data.scholar || ''} onChange={(e) => setData(p => ({ ...p, scholar: e.target.value }))} /></div>
                <div className="form-group form-group-span-2"><label className="label">Deskripsi Singkat:</label><textarea className="input" rows="3" placeholder="Opsional" value={data.deskripsi || ''} onChange={(e) => setData(p => ({ ...p, deskripsi: e.target.value }))}></textarea></div>
                <div className="form-group form-group-span-2"><label className="label">Ganti Foto:</label><div className="input-file-wrapper"><Upload size={16} /><span>Pilih File</span><input type="file" accept="image/*" onChange={handleModalFotoChange} /></div></div>
                {data.foto && <img src={data.foto} alt="Preview" className="avatar-preview" />}
            </div>
            <div className="modal-actions"><button onClick={onSave} className="button button-success"><Save size={16}/> Simpan</button><button onClick={onClose} className="button button-secondary">Batal</button></div>
        </div></div>
    );
};
const PembinaCard = ({ pembina, onEdit, onHapus }) => (
    <div className="anggota-card pembina-card">
        <img src={pembina.foto || `https://ui-avatars.com/api/?name=${pembina.nama.replace(/\s/g, '+')}`} alt={pembina.nama} />
        <h4>{pembina.nama}</h4>
        <p>{pembina.jabatan}</p>
        <div className="card-actions"><button onClick={onEdit} className="button-icon"><Pencil size={14} /></button><button onClick={onHapus} className="button-icon danger"><Trash2 size={14} /></button></div>
    </div>
);


const AdminStruktur = () => {
    const navigate = useNavigate();
    const [struktur, setStruktur] = useState([]);
    const [pembina, setPembina] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDivisi, setSelectedDivisi] = useState(null);
    const [editingAnggota, setEditingAnggota] = useState(null);
    const [editingPembina, setEditingPembina] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [confirmProps, setConfirmProps] = useState({ show: false });
    const draggedItem = useRef(null);
    const draggedOverItem = useRef(null);
    const [toastMessage, setToastMessage] = useState('');
    const [activeTab, setActiveTab] = useState('pengurus');

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => { if (!user) navigate("/login"); });

        const qStruktur = query(collection(db, "struktur"));
        const unsubscribeStruktur = onSnapshot(qStruktur, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            const predefinedOrder = Object.keys(jabatanMap);
            const sortedData = data.sort((a, b) => predefinedOrder.indexOf(a.divisi) - predefinedOrder.indexOf(b.divisi));
            setStruktur(sortedData);

            if (activeTab === 'pengurus' && !selectedDivisi && sortedData.length > 0) {
                setSelectedDivisi(sortedData[0]);
            } else if (selectedDivisi) {
                const updatedSelected = sortedData.find(d => d.id === selectedDivisi.id);
                setSelectedDivisi(updatedSelected || (sortedData.length > 0 ? sortedData[0] : null));
            }
            setLoading(false);
        });

        const qPembina = query(collection(db, "pembina"));
        const unsubscribePembina = onSnapshot(qPembina, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPembina(data);
        });

        return () => { unsubscribeAuth(); unsubscribeStruktur(); unsubscribePembina(); };
    }, [navigate, selectedDivisi, activeTab]);

    const { filteredAnggota, filteredPembina, stats } = useMemo(() => {
        const totalAnggota = struktur.reduce((acc, div) => acc + (div.anggota?.length || 0), 0);
        const stats = { totalDivisi: struktur.length, totalAnggota, totalPembina: pembina.length };
        
        let filteredAnggota = [];
        if (selectedDivisi && activeTab === 'pengurus') {
            filteredAnggota = (selectedDivisi.anggota || []).filter(a => a.nama.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        const filteredPembina = activeTab === 'pembina' 
            ? pembina.filter(p => p.nama.toLowerCase().includes(searchTerm.toLowerCase()))
            : [];

        return { filteredAnggota, filteredPembina, stats };
    }, [struktur, selectedDivisi, pembina, searchTerm, activeTab]);

    const showToast = (message) => { setToastMessage(message); };
    const handleTambahAnggota = async (anggotaBaru) => { if (!selectedDivisi) return; const updatedAnggota = [...(selectedDivisi.anggota || []), anggotaBaru]; await updateDoc(doc(db, "struktur", selectedDivisi.id), { anggota: updatedAnggota }); await logActivity(`Menambahkan anggota "${anggotaBaru.nama}" ke divisi "${selectedDivisi.divisi}"`); showToast("Anggota berhasil ditambahkan."); };
    const hapusAnggota = (anggotaIndex, anggota) => { setConfirmProps({ show: true, message: `Yakin ingin menghapus anggota "${anggota.nama}"?`, onConfirm: async () => { const anggotaBaru = selectedDivisi.anggota.filter((_, idx) => idx !== anggotaIndex); await updateDoc(doc(db, "struktur", selectedDivisi.id), { anggota: anggotaBaru }); await logActivity(`Menghapus anggota "${anggota.nama}" dari divisi "${selectedDivisi.divisi}"`); showToast("Anggota berhasil dihapus."); setConfirmProps({ show: false }); }}); };
    const openEditModal = (anggotaIndex, anggota) => { setEditingAnggota({ ...anggota, anggotaIndex }); };
    const handleUpdate = async () => { if (!editingAnggota) return; const { anggotaIndex, ...anggotaData } = editingAnggota; const updatedAnggota = [...selectedDivisi.anggota]; updatedAnggota[anggotaIndex] = anggotaData; await updateDoc(doc(db, "struktur", selectedDivisi.id), { anggota: updatedAnggota }); await logActivity(`Mengedit data anggota "${anggotaData.nama}"`); setEditingAnggota(null); showToast("Data anggota berhasil diperbarui."); };
    const handleSort = async () => { const anggotaClone = [...selectedDivisi.anggota]; const temp = anggotaClone.splice(draggedItem.current, 1)[0]; anggotaClone.splice(draggedOverItem.current, 0, temp); await updateDoc(doc(db, "struktur", selectedDivisi.id), { anggota: anggotaClone }); draggedItem.current = null; draggedOverItem.current = null; };
    
    const handleTambahPembina = async (pembinaBaru) => {
        await addDoc(collection(db, "pembina"), pembinaBaru);
        await logActivity(`Menambahkan pembina "${pembinaBaru.nama}"`);
        showToast("Pembina berhasil ditambahkan.");
    };
    const handleUpdatePembina = async () => {
        if (!editingPembina) return;
        const { id, ...data } = editingPembina;
        await updateDoc(doc(db, "pembina", id), data);
        await logActivity(`Mengedit data pembina "${data.nama}"`);
        showToast("Data pembina berhasil diperbarui.");
        setEditingPembina(null);
    };
    const hapusPembina = (pembinaData) => { setConfirmProps({ show: true, message: `Yakin ingin menghapus pembina "${pembinaData.nama}"?`, onConfirm: async () => { await deleteDoc(doc(db, "pembina", pembinaData.id)); await logActivity(`Menghapus pembina "${pembinaData.nama}"`); showToast("Pembina berhasil dihapus."); setConfirmProps({ show: false }); }}); };

    if (loading) return <div className="page-center"><Loader2 className="animate-spin" size={48} /></div>;

    return (
        <div className="struktur-page">
            {toastMessage && <Toast message={toastMessage} clear={() => setToastMessage('')} />}
            <ConfirmationModal modalState={confirmProps} setModalState={setConfirmProps} />
            {editingAnggota && <EditModal data={editingAnggota} setData={setEditingAnggota} onClose={() => setEditingAnggota(null)} onSave={handleUpdate} divisiNama={selectedDivisi.divisi} />}
            {editingPembina && <EditPembinaModal data={editingPembina} setData={setEditingPembina} onClose={() => setEditingPembina(null)} onSave={handleUpdatePembina} />}

            <header className="page-header">
                <div><h1 className="page-title">Kelola Struktur Organisasi</h1><p className="page-subtitle">Kelola pengurus BEM dan jajaran pembina organisasi.</p></div>
            </header>

            <div className="stats-grid">
                <StatCard icon={<Network size={24} />} title="Total Divisi" value={stats.totalDivisi} />
                <StatCard icon={<Users size={24} />} title="Total Pengurus" value={stats.totalAnggota} />
                <StatCard icon={<Award size={24} />} title="Total Pembina" value={stats.totalPembina} />
            </div>

            <div className="tab-container">
                <button onClick={() => { setActiveTab('pengurus'); setSearchTerm(''); }} className={`tab-button ${activeTab === 'pengurus' ? 'active' : ''}`}>Struktur Pengurus</button>
                <button onClick={() => { setActiveTab('pembina'); setSearchTerm(''); }} className={`tab-button ${activeTab === 'pembina' ? 'active' : ''}`}>Jajaran Pembina</button>
            </div>

            {activeTab === 'pengurus' ? (
                <div className="main-grid">
                    <aside className="divisi-sidebar"><div className="card"><h3 className="card-title">Daftar Divisi</h3><div className="divisi-list">{struktur.map(divisi => ( <button key={divisi.id} onClick={() => setSelectedDivisi(divisi)} className={`divisi-button ${selectedDivisi?.id === divisi.id ? 'active' : ''}`}>{divisi.divisi}</button> ))}</div></div></aside>
                    <main className="anggota-content">
                        <div className="mobile-divisi-selector card"><label className="label">Pilih Divisi</label><select className="input" value={selectedDivisi?.id || ''} onChange={(e) => setSelectedDivisi(struktur.find(d => d.id === e.target.value))}>{struktur.map(divisi => ( <option key={divisi.id} value={divisi.id}>{divisi.divisi}</option>))}</select></div>
                        {selectedDivisi ? ( <>
                            <div className="card"><h3 className="card-title">Tambah Anggota Baru</h3><TambahAnggotaForm divisi={selectedDivisi.divisi} onTambah={handleTambahAnggota} /></div>
                            <div className="card">
                                <div className="list-header"><h3 className="card-title">Daftar Anggota: {selectedDivisi.divisi}</h3><div className="input-with-icon"><Search size={16} /><input className="input" type="text" placeholder="Cari anggota..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div></div>
                                <p className="drag-info">Drag & drop kartu anggota untuk mengubah urutan.</p>
                                <div className="anggota-grid">{filteredAnggota.length > 0 ? ( filteredAnggota.map((anggota, index) => ( <AnggotaCard key={index} anggota={anggota} onEdit={() => openEditModal(index, anggota)} onHapus={() => hapusAnggota(index, anggota)} draggable onDragStart={() => (draggedItem.current = index)} onDragEnter={() => (draggedOverItem.current = index)} onDragEnd={handleSort} onDragOver={e => e.preventDefault()} /> ))) : <p className="empty-text">Tidak ada anggota di divisi ini.</p>}</div>
                            </div>
                        </> ) : <p className="empty-text">Pilih divisi untuk memulai.</p>}
                    </main>
                </div>
            ) : (
                <div className="pembina-grid">
                     <div className="card"><h3 className="card-title">Tambah Pembina Baru</h3><TambahPembinaForm onTambah={handleTambahPembina} /></div>
                     <div className="card">
                        <div className="list-header"><h3 className="card-title">Jajaran Pembina</h3><div className="input-with-icon"><Search size={16} /><input className="input" type="text" placeholder="Cari pembina..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div></div>
                        <div className="anggota-grid">{filteredPembina.length > 0 ? ( filteredPembina.map((p) => ( <PembinaCard key={p.id} pembina={p} onEdit={() => setEditingPembina(p)} onHapus={() => hapusPembina(p)} /> ))) : <p className="empty-text">Belum ada data pembina.</p>}</div>
                    </div>
                </div>
            )}
            
            <button onClick={() => navigate("/admin")} className="button button-secondary back-button"><ArrowLeft size={16}/> Kembali ke Dasbor</button>
        </div>
    );
};


const styleSheet = document.createElement("style");
styleSheet.innerHTML = `
    .struktur-page { font-family: 'Inter', sans-serif; background-color: #f8fafc; min-height: 100vh; padding: 20px; }
    .page-center { display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .page-header { margin-bottom: 24px; } .page-title { color: #1e293b; font-size: 1.75rem; font-weight: 700; margin: 0; }
    .page-subtitle { color: #64748b; font-size: 1rem; margin: 4px 0 0 0; }
    .card { background-color: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .card-title { margin: 0 0 16px 0; color: #1e293b; font-size: 1.25rem; font-weight: 600; }
    .input { width: 100%; box-sizing: border-box; padding: 10px 12px; border-radius: 8px; border: 1px solid #cbd5e0; font-size: 1rem; }
    .input:focus { border-color: #3b82f6; outline: none; }
    .label { font-size: 0.9rem; font-weight: 600; color: #334155; margin-bottom: 8px; display: block; }
    .button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.9rem; border: 1px solid transparent; }
    .button-primary { background-color: #1d4ed8; color: white; }
    .button-secondary { background-color: #f1f5f9; color: #475569; border-color: #e2e8f0; }
    .button-success { background-color: #16a34a; color: white; }
    .button-danger { background-color: #dc2626; color: white; }
    .stats-grid { display: grid; grid-template-columns: 1fr; gap: 16px; margin-bottom: 24px; }
    .stat-card { display: flex; justify-content: space-between; align-items: center; padding: 20px; background-color: white; border-radius: 12px; border: 1px solid #e2e8f0; }
    .stat-title { margin: 0; color: #64748b; font-size: 0.9rem; } .stat-value { margin: 4px 0 0; font-size: 2rem; font-weight: 700; color: #1e293b; }
    .stat-icon-wrapper { color: #3b82f6; background-color: #eff6ff; border-radius: 50%; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; }
    .main-grid { display: grid; grid-template-columns: 1fr; gap: 24px; }
    .divisi-sidebar { display: none; }
    .mobile-divisi-selector { display: block; margin-bottom: 24px; }
    .anggota-content { display: flex; flex-direction: column; gap: 24px; }
    .tambah-anggota-form { display: grid; gap: 12px; }
    .list-header { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; }
    .input-with-icon { position: relative; } .input-with-icon svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #9ca3af; }
    .input-with-icon .input { padding-left: 40px; }
    .drag-info { font-size: 0.8rem; color: #9ca3b8; text-align: center; margin-bottom: 16px; }
    .anggota-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; }
    .anggota-card { text-align: center; padding: 16px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; position: relative; cursor: grab; transition: transform 0.2s, box-shadow 0.2s; }
    .pembina-card { cursor: default; }
    .anggota-card:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.05); }
    .anggota-card img { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin: 0 auto 12px; }
    .anggota-card h4 { margin: 0 0 4px 0; font-size: 1rem; color: #1e293b; }
    .anggota-card p { font-size: 0.85rem; color: #64748b; margin: 0; }
    .card-actions { position: absolute; top: 8px; left: 8px; display: flex; flex-direction: column; gap: 4px; opacity: 0; transition: opacity 0.2s; }
    .anggota-card:hover .card-actions { opacity: 1; }
    .button-icon { padding: 6px; border-radius: 50%; border: 1px solid #e2e8f0; background-color: white; color: #475569; cursor: pointer; }
    .button-icon.danger { color: #ef4444; }
    .drag-handle { position: absolute; top: 8px; right: 8px; color: #cbd5e0; cursor: grab; }
    .pembina-card .drag-handle { display: none; }
    .back-button { width: 100%; margin-top: 24px; }
    .empty-text { padding: 20px; text-align: center; color: #9ca3b8; }
    .divisi-button { width: 100%; padding: 12px 16px; margin-bottom: 8px; border-radius: 8px; border: 1px solid #e2e8f0; background-color: #f8fafc; color: #334155; font-weight: 600; cursor: pointer; text-align: left; }
    .divisi-button.active { background-color: #1d4ed8; color: white; border-color: #1d4ed8; }
    .tab-container { display: flex; border-bottom: 1px solid #e2e8f0; margin-bottom: 24px; }
    .tab-button { padding: 12px 20px; border: none; background-color: transparent; font-size: 1rem; font-weight: 600; color: #64748b; cursor: pointer; border-bottom: 3px solid transparent; margin-bottom: -1px; }
    .tab-button.active { color: #1d4ed8; border-bottom-color: #1d4ed8; }
    .pembina-grid { display: grid; grid-template-columns: 1fr; gap: 24px; }
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(15,23,42,0.6); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .modal-content { background-color: white; padding: 24px; border-radius: 12px; width: 100%; max-width: 600px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); position: relative; max-height: 90vh; overflow-y: auto; }
    .close-button { position: absolute; top: 16px; right: 16px; background: none; border: none; cursor: pointer; color: #9ca3af; }
    .edit-form-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
    .form-group-span-2 { grid-column: span 1; }
    .avatar-preview { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; margin-top: 10px; border: 1px solid #e2e8f0; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }
    .toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background-color: #1e293b; color: white; padding: 12px 24px; border-radius: 8px; z-index: 1001; }
    .animate-spin { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .input-file-wrapper { position: relative; display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; background-color: #f1f5f9; border-radius: 8px; cursor: pointer; }
    .input-file-wrapper input[type="file"] { position: absolute; left: 0; top: 0; opacity: 0; width: 100%; height: 100%; cursor: pointer; }
    @media (min-width: 768px) {
        .stats-grid { grid-template-columns: repeat(3, 1fr); }
        .edit-form-grid { grid-template-columns: 1fr 1fr; }
        .form-group-span-2 { grid-column: span 2; }
        .pembina-grid { grid-template-columns: 300px 1fr; }
    }
    @media (min-width: 900px) {
        .struktur-page { padding: 40px; }
        .page-title { font-size: 2rem; }
        .main-grid { grid-template-columns: 300px 1fr; }
        .divisi-sidebar { display: block; }
        .mobile-divisi-selector { display: none; }
        .list-header { flex-direction: row; justify-content: space-between; align-items: center; }
        .back-button { width: auto; }
    }
`;
document.head.appendChild(styleSheet);


export default AdminStruktur;