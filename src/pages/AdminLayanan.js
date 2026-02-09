// src/pages/admin/Layanan.js
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase/firebaseConfig";
import { collection, addDoc, deleteDoc, onSnapshot, doc, query, orderBy, updateDoc, writeBatch } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { logActivity } from "../utils/logActivity";

import { 
    Handshake, Plus, ChevronDown, Trash2, Pencil, GripVertical, Eye, EyeOff, Save, Loader2, Filter, X, 
    FileText, Mail, ClipboardList, FileSignature, PenSquare, Archive, BookMarked,
    CalendarDays, CalendarCheck, Clock, Hourglass, Timer, CalendarPlus, AlarmClock,
    Building, MapPin, School, Home, Key, Library,
    Sparkles, PartyPopper, Megaphone, Link, Star, Info, HelpCircle, Award, LifeBuoy,
    Landmark, Wallet, Coins, Receipt, Banknote,
    Ticket, Users, Flag, Swords
} from 'lucide-react';

const iconComponents = {
    Handshake, Plus, ChevronDown, Trash2, Pencil, GripVertical, Eye, EyeOff, Save, Loader2, Filter, X,
    FileText, Mail, ClipboardList, FileSignature, PenSquare, Archive, BookMarked,
    CalendarDays, CalendarCheck, Clock, Hourglass, Timer, CalendarPlus, AlarmClock,
    Building, MapPin, School, Home, Key, Library,
    Sparkles, PartyPopper, Megaphone, Link, Star, Info, HelpCircle, Award, LifeBuoy,
    Landmark, Wallet, Coins, Receipt, Banknote,
    Ticket, Users, Flag, Swords
};

const kategoriOptions = ["Akademik", "Kemahasiswaan", "Fasilitas", "Keuangan", "Lainnya"];

const iconCategories = {
    'Dokumen & Surat': ["FileText", "Mail", "ClipboardList", "FileSignature", "PenSquare", "Archive", "BookMarked"],
    'Jadwal & Waktu': ["CalendarDays", "CalendarCheck", "Clock", "Hourglass", "Timer", "CalendarPlus", "AlarmClock"],
    'Tempat & Fasilitas': ["Building", "MapPin", "School", "Home", "Key", "Library"],
    'Keuangan & Pendanaan': ["Landmark", "Wallet", "Coins", "Receipt", "Banknote"],
    'Kegiatan & Acara': ["Ticket", "PartyPopper", "Users", "Flag", "Swords"],
    'Umum & Lainnya': ["Sparkles", "Megaphone", "Link", "Star", "Info", "HelpCircle", "Award", "LifeBuoy"],
};


const Toast = ({ message, clear }) => { useEffect(() => { const timer = setTimeout(clear, 3000); return () => clearTimeout(timer); }, [clear]); return <div className="toast">{message}</div>; };
const ConfirmationModal = ({ modalState, setModalState }) => {
    if (!modalState.show) return null;
    return ( <div className="modal-overlay"><div className="modal-content small-modal"><h3 className="modal-title">{modalState.message}</h3><div className="modal-actions"><button onClick={modalState.onConfirm} className="button button-danger">Ya, Hapus</button><button onClick={() => setModalState({ show: false })} className="button button-secondary">Batal</button></div></div></div> );
};
const EmptyState = () => (
    <div className="empty-state"><Handshake size={48} /><p className="empty-state-text">Belum ada layanan</p><p className="empty-state-subtext">Mulai tambahkan layanan baru di formulir di atas.</p></div>
);

const AdminLayanan = () => {
    const [layanan, setLayanan] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [judul, setJudul] = useState("");
    const [link, setLink] = useState("");
    const [iconName, setIconName] = useState("Sparkles");
    const [deskripsi, setDeskripsi] = useState("");
    const [kategori, setKategori] = useState("Akademik");
    const [showEditModal, setShowEditModal] = useState(false);
    const [editData, setEditData] = useState(null);
    const [confirmProps, setConfirmProps] = useState({ show: false });
    const [kategoriFilter, setKategoriFilter] = useState("Semua");
    const [showIconPicker, setShowIconPicker] = useState(false);
    const [showIconPickerInModal, setShowIconPickerInModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const draggedItem = useRef(null);
    const draggedOverItem = useRef(null);
    
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => { if (!user) navigate("/login"); });
        const q = query(collection(db, "layanan"), orderBy("urutan", "asc"));
        const unsubFirestore = onSnapshot(q, (snapshot) => {
            setLayanan(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return () => { unsubscribeAuth(); unsubFirestore(); };
    }, [navigate]);
    
    const filteredLayanan = useMemo(() => {
        if (kategoriFilter === 'Semua') return layanan;
        return layanan.filter(item => item.kategori === kategoriFilter);
    }, [layanan, kategoriFilter]);
    
    const handleTambah = async (e) => {
        e.preventDefault();
        if (!judul || !link) return alert("Judul dan Link tidak boleh kosong.");
        try {
            const urutanBaru = layanan.length > 0 ? Math.max(...layanan.map(l => l.urutan || 0)) + 1 : 1;
            await addDoc(collection(db, "layanan"), { judul, link, iconName, deskripsi, urutan: urutanBaru, isPublished: true, kategori });
            await logActivity(`Menambahkan layanan: "${judul}"`);
            setJudul(""); setLink(""); setIconName("Sparkles"); setDeskripsi(""); setKategori("Akademik");
            setIsFormVisible(false);
            setSuccessMessage('Layanan berhasil ditambahkan!');
        } catch (error) { console.error("Error adding document: ", error); }
    };
    
    const handleHapus = (id, judulLayanan) => {
        setConfirmProps({
            show: true, message: `Yakin ingin menghapus layanan "${judulLayanan}"?`,
            onConfirm: async () => {
                await deleteDoc(doc(db, "layanan", id));
                await logActivity(`Menghapus layanan: "${judulLayanan}"`);
                setConfirmProps({ show: false });
                setSuccessMessage('Layanan berhasil dihapus!');
            }
        });
    };
    
    const handleUpdate = async () => {
        if (!editData || !editData.id) return;
        try {
            const { id, ...dataToUpdate } = editData;
            await updateDoc(doc(db, "layanan", id), dataToUpdate);
            await logActivity(`Mengedit layanan: "${editData.judul}"`);
            setShowEditModal(false);
            setSuccessMessage('Layanan berhasil diperbarui!');
        } catch (error) { console.error("Error updating document: ", error); }
    };
    
    const handleTogglePublished = async (item) => {
        await updateDoc(doc(db, "layanan", item.id), { isPublished: !item.isPublished });
        await logActivity(`Mengubah status publikasi layanan "${item.judul}"`);
    };
    
    const handleSort = async () => {
        if (draggedItem.current === null || draggedOverItem.current === null || draggedItem.current === draggedOverItem.current) return;
        const itemsClone = [...layanan];
        const temp = itemsClone.splice(draggedItem.current, 1)[0];
        itemsClone.splice(draggedOverItem.current, 0, temp);
        const batch = writeBatch(db);
        itemsClone.forEach((item, index) => {
            batch.update(doc(db, "layanan", item.id), { urutan: index });
        });
        await batch.commit();
        draggedItem.current = null;
        draggedOverItem.current = null;
    };
    
    const openEditModal = (item) => { setEditData(item); setShowEditModal(true); };
    
    const selectIcon = (selectedIcon, isEditing = false) => {
        if (isEditing) {
            setEditData(prev => ({ ...prev, iconName: selectedIcon }));
            setShowIconPickerInModal(false);
        } else {
            setIconName(selectedIcon);
            setShowIconPicker(false);
        }
    };
    
    const IconComponent = ({ name, ...props }) => {
        const LucideIcon = iconComponents[name] || Handshake;
        return <LucideIcon {...props} />;
    };

    // ✅ PINDAHKAN KE SINI: Lokasi yang benar untuk hook stylesheet
    useEffect(() => {
        document.head.appendChild(styleSheet);
        return () => {
            document.head.removeChild(styleSheet);
        };
    }, []); 

    return (
        <div className="admin-page">
            <ConfirmationModal modalState={confirmProps} setModalState={setConfirmProps} />
            {successMessage && <Toast message={successMessage} clear={() => setSuccessMessage('')} />}

            <header className="page-header">
                <div>
                    <h1 className="page-title">Kelola Layanan</h1>
                    <p className="page-subtitle">Tambah, edit, urutkan, dan publikasikan layanan untuk ditampilkan di halaman publik.</p>
                </div>
            </header>

            <div className="card">
                <button onClick={() => setIsFormVisible(!isFormVisible)} className="button button-primary button-full">
                    {isFormVisible ? <><X size={16}/> Tutup Form</> : <><Plus size={16}/> Tambah Layanan Baru</>}
                </button>
                {isFormVisible && (
                    <form onSubmit={handleTambah} className="form-grid">
                        <div className="form-group-flex">
                            <div className="icon-picker-wrapper">
                                <label className="label">Ikon:</label>
                                <button type="button" onClick={() => setShowIconPicker(!showIconPicker)} className="icon-button">
                                    <IconComponent name={iconName} size={24} /> <ChevronDown size={16} />
                                </button>
                                {showIconPicker && (
                                    <div className="icon-picker">
                                        {Object.keys(iconCategories).map(category => (
                                            <div key={category}><h5>{category}</h5>
                                                <div className="icon-grid">
                                                    {iconCategories[category].map(icon => (
                                                        <button key={icon} type="button" onClick={() => selectIcon(icon)}><IconComponent name={icon} size={20} /></button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="form-group" style={{flexGrow: 1}}>
                                <label className="label">Judul Layanan:</label>
                                <input type="text" placeholder="e.g., Surat Keterangan Aktif" value={judul} onChange={(e) => setJudul(e.target.value)} className="input" />
                            </div>
                        </div>
                        <div className="form-group"><label className="label">Deskripsi Singkat:</label><textarea className="input" rows="3" value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} placeholder="e.g., Digunakan untuk keperluan administrasi..." /></div>
                        <div className="form-group"><label className="label">Kategori:</label>
                            <select className="input" value={kategori} onChange={(e) => setKategori(e.target.value)}>
                                {kategoriOptions.map(kat => <option key={kat} value={kat}>{kat}</option>)}
                            </select>
                        </div>
                        <div className="form-group"><label className="label">Link Google Form (Embed):</label><input type="url" placeholder="https://..." value={link} onChange={(e) => setLink(e.target.value)} className="input" /></div>
                        <button type="submit" className="button button-success"><Save size={16}/> Simpan Layanan</button>
                    </form>
                )}
            </div>

            <div className="card">
                <div className="list-header">
                    <h3 className="card-title">Daftar Layanan</h3>
                    <div className="input-with-icon">
                        <Filter size={16} />
                        <select value={kategoriFilter} onChange={(e) => setKategoriFilter(e.target.value)} className="input">
                            <option value="Semua">Semua Kategori</option>
                            {kategoriOptions.map(kat => <option key={kat} value={kat}>{kat}</option>)}
                        </select>
                    </div>
                </div>
                {loading ? <p>Memuat...</p> : filteredLayanan.length === 0 ? <EmptyState /> : (
                    <div className="service-list">
                        {filteredLayanan.map((item, index) => (
                            <div key={item.id} className={`service-card ${!item.isPublished ? 'unpublished' : ''}`} draggable onDragStart={() => (draggedItem.current = index)} onDragEnter={() => (draggedOverItem.current = index)} onDragEnd={handleSort} onDragOver={(e) => e.preventDefault()}>
                                <GripVertical size={20} className="drag-handle"/>
                                <div className="service-icon"><IconComponent name={item.iconName} size={24} /></div>
                                <div className="service-content">
                                    <strong>{item.judul}</strong>
                                    <small>Kategori: {item.kategori}</small>
                                </div>
                                <div className="service-actions">
                                    <button onClick={() => handleTogglePublished(item)} className={`button-status ${item.isPublished ? 'active' : ''}`}>{item.isPublished ? <><Eye size={14}/> Aktif</> : <><EyeOff size={14}/> Nonaktif</>}</button>
                                    <button onClick={() => openEditModal(item)} className="button-icon"><Pencil size={14} /></button>
                                    <button onClick={() => handleHapus(item.id, item.judul)} className="button-icon danger"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            {showEditModal && editData && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Edit Layanan</h3>
                            <button onClick={() => setShowEditModal(false)} className="close-button"><X size={20}/></button>
                        </div>
                        <div className="form-grid">
                            <div className="form-group-flex">
                                <div className="icon-picker-wrapper">
                                    <label className="label">Ikon:</label>
                                    <button type="button" onClick={() => setShowIconPickerInModal(!showIconPickerInModal)} className="icon-button"><IconComponent name={editData.iconName} size={24} /> <ChevronDown size={16} /></button>
                                    {showIconPickerInModal && (
                                        <div className="icon-picker">
                                            {Object.keys(iconCategories).map(category => (<div key={category}><h5>{category}</h5><div className="icon-grid">{iconCategories[category].map(icon => (<button key={icon} type="button" onClick={() => selectIcon(icon, true)}><IconComponent name={icon} size={20} /></button>))}</div></div>))}
                                        </div>
                                    )}
                                </div>
                                <div className="form-group" style={{flexGrow: 1}}><label className="label">Judul:</label><input className="input" value={editData.judul} onChange={(e) => setEditData(p => ({ ...p, judul: e.target.value }))} /></div>
                            </div>
                            <div className="form-group"><label className="label">Deskripsi:</label><textarea className="input" rows="3" value={editData.deskripsi} onChange={(e) => setEditData(p => ({ ...p, deskripsi: e.target.value }))} /></div>
                            <div className="form-group"><label className="label">Kategori:</label><select className="input" value={editData.kategori} onChange={(e) => setEditData(p => ({ ...p, kategori: e.target.value }))}>{kategoriOptions.map(kat => <option key={kat} value={kat}>{kat}</option>)}</select></div>
                            <div className="form-group"><label className="label">Link:</label><input className="input" value={editData.link} onChange={(e) => setEditData(p => ({ ...p, link: e.target.value }))} /></div>
                        </div>
                        <div className="modal-actions">
                            <button onClick={handleUpdate} className="button button-success"><Save size={16}/> Simpan Perubahan</button>
                            <button onClick={() => setShowEditModal(false)} className="button button-secondary">Batal</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
    // ❌ JANGAN TARUH DI SINI: Kode setelah return tidak akan berjalan
};

const styleSheet = document.createElement("style");
styleSheet.innerHTML = `
    .admin-page { font-family: 'Inter', sans-serif; background-color: #f8fafc; min-height: 100vh; padding: 20px; }
    .page-header, .card, .input, .button { box-sizing: border-box; }
    .page-header { margin-bottom: 24px; } .page-title { color: #1e293b; font-size: 1.75rem; font-weight: 700; margin: 0; }
    .page-subtitle { color: #64748b; font-size: 1rem; margin: 4px 0 0 0; }
    .card { background-color: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); margin-bottom: 24px; }
    .card-title { margin: 0; color: #1e293b; font-size: 1.25rem; font-weight: 600; }
    
    .input { width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid #cbd5e0; font-size: 1rem; }
    .input:focus { border-color: #3b82f6; outline: none; }
    .label { display: block; margin-bottom: 8px; font-size: 0.9rem; color: #334155; font-weight: 600; }
    .button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.9rem; text-decoration: none; border: 1px solid transparent; transition: all 0.2s; }
    .button-primary { background-color: #1d4ed8; color: white; } .button-primary:hover { background-color: #1e40af; }
    .button-secondary { background-color: #f1f5f9; color: #475569; border-color: #e2e8f0; }
    .button-success { background-color: #16a34a; color: white; }
    .button-danger { background-color: #dc2626; color: white; }
    .button-full { width: 100%; }
    .form-grid { display: flex; flex-direction: column; gap: 16px; margin-top: 24px; }
    .form-group { width: 100%; }
    .form-group-flex { display: flex; flex-direction: column; gap: 16px; }
    .icon-picker-wrapper { position: relative; }
    .icon-button { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; padding: 10px; border: 1px solid #cbd5e0; border-radius: 8px; background-color: white; cursor: pointer; }
    .icon-picker { position: absolute; background-color: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); z-index: 100; max-height: 250px; overflow-y: auto; margin-top: 8px; width: 300px; }
    .icon-picker h5 { margin: 10px 0 8px 0; font-size: 0.8rem; color: #64748b; text-transform: uppercase; }
    .icon-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(40px, 1fr)); gap: 6px; }
    .icon-grid button { border: none; background: #f1f5f9; cursor: pointer; padding: 8px; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
    .icon-grid button:hover { background: #e2e8f0; }
    .list-header { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; }
    .input-with-icon { position: relative; } .input-with-icon svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #9ca3af; }
    .input-with-icon .input { padding-left: 40px; }
    .service-list { display: flex; flex-direction: column; gap: 12px; }
    .service-card { display: flex; align-items: center; gap: 16px; padding: 16px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
    .service-card.unpublished { background-color: #f8fafc; } .service-card.unpublished strong { color: #9ca3af; }
    .drag-handle { cursor: grab; color: #9ca3af; }
    .service-icon { color: #1d4ed8; }
    .service-content { flex-grow: 1; min-width: 0; } 
    .service-content strong { color: #1e293b; display: block; } 
    .service-content small { display: block; color: #9ca3af; }
    .service-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .button-status { font-size: 0.8rem; padding: 6px 10px; border-radius: 6px; border: none; cursor: pointer; display: flex; align-items: center; gap: 6px; white-space: nowrap; }
    .button-status.active { background-color: #dcfce7; color: #166534; }
    .button-status:not(.active) { background-color: #f1f5f9; color: #475569; }
    .button-icon { padding: 6px; border-radius: 50%; border: none; background-color: transparent; color: #64748b; cursor: pointer; }
    .button-icon:hover { background-color: #f1f5f9; }
    .button-icon.danger:hover { background-color: #fee2e2; color: #dc2626; }
    .toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background-color: #1e293b; color: white; padding: 12px 24px; border-radius: 8px; z-index: 1001; }
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(15,23,42,0.6); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .modal-content { background-color: white; padding: 24px; border-radius: 12px; width: 100%; max-width: 500px; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .modal-header h3 { font-size: 1.25rem; color: #1e293b; margin: 0; }
    .close-button { background: none; border: none; cursor: pointer; color: #9ca3af; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }
    .modal-content.small-modal { max-width: 400px; text-align: center; }
    .empty-state { text-align: center; padding: 40px; background-color: #f9fafb; border-radius: 12px; }
    .empty-state svg { color: #cbd5e1; margin-bottom: 16px; }
    .empty-state-text { font-size: 1.2rem; color: #475569; margin: 0; }
    .empty-state-subtext { margin: 8px 0 0; color: #9ca3af; }
    .animate-spin { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    @media (min-width: 768px) {
        .page-title { font-size: 2rem; }
        .form-group-flex { flex-direction: row; align-items: flex-end; }
        .list-header { flex-direction: row; justify-content: space-between; align-items: center; }
        .input-with-icon { max-width: 250px; }
    }
    @media (max-width: 767px) {
        .service-card { flex-wrap: wrap; gap: 12px 16px; }
        .service-content { flex-basis: 100%; order: 3; }
        .service-actions { flex-basis: 100%; order: 4; justify-content: flex-end; margin-top: 8px; }
        .drag-handle { order: 1; }
        .service-icon { order: 2; }
    }
`;

export default AdminLayanan;