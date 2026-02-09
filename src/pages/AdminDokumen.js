import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase/firebaseConfig";
import { collection, addDoc, deleteDoc, onSnapshot, doc, query, orderBy, updateDoc, writeBatch } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { logActivity } from "../utils/logActivity";

// ICON IMPORTS
import { 
    FolderKanban, Plus, X, Save, Pencil, Trash2, GripVertical, Settings, ArrowLeft, 
    Link as LinkIcon, Folder as FolderIcon, FileText, File, Book, FileArchive, 
    FileSpreadsheet, FileImage, Download, Upload, ClipboardList, ChevronDown, FolderPlus
} from 'lucide-react';

// ICON MAPPING
const iconComponents = {
    FolderKanban, Plus, X, Save, Pencil, Trash2, GripVertical, Settings, ArrowLeft, 
    LinkIcon, FolderIcon, FileText, File, Book, FileArchive, FileSpreadsheet, 
    FileImage, Download, Upload, ClipboardList, ChevronDown, FolderPlus
};

const iconCategories = {
    'File Umum': ["FileText", "File", "Book", "FolderIcon"],
    'File Arsip & Data': ["FileArchive", "FileSpreadsheet", "ClipboardList"],
    'Lainnya': ["FileImage", "Download", "Upload"],
};

// HELPER COMPONENT
const IconComponent = ({ name, ...props }) => {
    const LucideIcon = iconComponents[name] || FileText;
    return <LucideIcon {...props} />;
};

// --- UI COMPONENTS ---

const Toast = ({ message, clear }) => {
    useEffect(() => {
        const timer = setTimeout(clear, 3000);
        return () => clearTimeout(timer);
    }, [clear]);
    return <div className="toast">{message}</div>;
};

const ConfirmationModal = ({ modalState, setModalState }) => {
    if (!modalState.show) return null;
    return (
        <div className="modal-overlay">
            <div className="modal-content small-modal">
                <h3 className="modal-title">{modalState.message}</h3>
                <div className="modal-actions">
                    <button onClick={modalState.onConfirm} className="button button-danger">Ya, Hapus</button>
                    <button onClick={() => setModalState({ show: false })} className="button button-secondary">Batal</button>
                </div>
            </div>
        </div>
    );
};

const EmptyState = ({ text, subtext }) => (
    <div className="empty-state">
        <FolderIcon size={48} />
        <p className="empty-state-text">{text || "Belum ada data"}</p>
        <p className="empty-state-subtext">{subtext || "Mulai tambahkan data baru."}</p>
    </div>
);

const KategoriModal = ({ kategoriList, onClose, showToast }) => {
    const [kategoriBaru, setKategoriBaru] = useState("");
    const [editingKategori, setEditingKategori] = useState(null);
    const [confirmProps, setConfirmProps] = useState({ show: false });

    const handleTambahKategori = async (e) => {
        e.preventDefault();
        if (!kategoriBaru.trim()) return;
        await addDoc(collection(db, "dokumen_kategori"), { nama: kategoriBaru });
        await logActivity(`Menambahkan kategori dokumen: "${kategoriBaru}"`);
        showToast(`Kategori "${kategoriBaru}" berhasil ditambahkan!`);
        setKategoriBaru("");
    };

    const handleUpdateKategori = async (id, newName) => {
        if (!newName.trim()) return;
        const docRef = doc(db, "dokumen_kategori", id);
        await updateDoc(docRef, { nama: newName });
        await logActivity(`Mengedit kategori dokumen menjadi: "${newName}"`);
        showToast(`Kategori berhasil diperbarui!`);
        setEditingKategori(null);
    };

    const handleHapusKategori = (id, nama) => {
        setConfirmProps({
            show: true,
            message: `Yakin ingin menghapus kategori "${nama}"? Dokumen di dalamnya tidak akan terhapus.`,
            onConfirm: async () => {
                await deleteDoc(doc(db, "dokumen_kategori", id));
                await logActivity(`Menghapus kategori dokumen: "${nama}"`);
                showToast(`Kategori "${nama}" berhasil dihapus.`);
                setConfirmProps({ show: false });
            },
        });
    };

    return (
        <>
            <ConfirmationModal modalState={confirmProps} setModalState={setConfirmProps} />
            <div className="modal-overlay">
                <div className="modal-content">
                    <div className="modal-header">
                        <h3>Kelola Kategori Dokumen</h3>
                        <button onClick={onClose} className="close-button"><X size={20}/></button>
                    </div>
                    <form onSubmit={handleTambahKategori} className="form-grid" style={{marginTop: 0, flexDirection: 'row', gap: '12px'}}>
                        <div className="input-with-icon" style={{flexGrow: 1}}>
                            <FolderPlus size={16}/>
                            <input className="input" value={kategoriBaru} onChange={(e) => setKategoriBaru(e.target.value)} placeholder="Nama Kategori Baru" />
                        </div>
                        <button type="submit" className="button button-primary"><Plus size={16}/> Tambah</button>
                    </form>
                    <div className="list-container">
                        {kategoriList.length > 0 ? kategoriList.map(kat => (
                            <div key={kat.id} className="list-item">
                                {editingKategori?.id === kat.id ? (
                                    <input 
                                        className="input" 
                                        value={editingKategori.nama} 
                                        onChange={(e) => setEditingKategori({...editingKategori, nama: e.target.value})} 
                                        onBlur={() => handleUpdateKategori(kat.id, editingKategori.nama)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleUpdateKategori(kat.id, editingKategori.nama)}
                                        autoFocus 
                                    />
                                ) : (
                                    <p>{kat.nama}</p>
                                )}
                                <div className="list-item-actions">
                                    <button onClick={() => setEditingKategori(kat)} className="button-icon"><Pencil size={14} /></button>
                                    <button onClick={() => handleHapusKategori(kat.id, kat.nama)} className="button-icon danger"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        )) : (
                            <p style={{textAlign: 'center', color: '#9ca3af', padding: '20px 0'}}>Belum ada kategori.</p>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};


// --- MAIN COMPONENT ---
const AdminDokumen = () => {
    const [dokumen, setDokumen] = useState([]);
    const [kategoriList, setKategoriList] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [formState, setFormState] = useState({ judul: "", link: "", kategori: "", iconName: "FileText" });

    const [showEditModal, setShowEditModal] = useState(false);
    const [editData, setEditData] = useState(null);
    const [confirmProps, setConfirmProps] = useState({ show: false });
    const [showKategoriModal, setShowKategoriModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [showIconPicker, setShowIconPicker] = useState(false);
    const [showIconPickerInModal, setShowIconPickerInModal] = useState(false);

    const draggedItem = useRef(null);
    const draggedOverItem = useRef(null);

    useEffect(() => {
        const unsubAuth = onAuthStateChanged(auth, (user) => { if (!user) navigate("/login"); });

        const qDokumen = query(collection(db, "dokumen"), orderBy("urutan", "asc"));
        const unsubDokumen = onSnapshot(qDokumen, (snapshot) => {
            setDokumen(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });

        const qKategori = query(collection(db, "dokumen_kategori"), orderBy("nama", "asc"));
        const unsubKategori = onSnapshot(qKategori, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setKategoriList(data);
            if (data.length > 0 && !formState.kategori) {
                setFormState(prev => ({...prev, kategori: data[0].nama}));
            }
        });

        return () => { unsubAuth(); unsubDokumen(); unsubKategori(); };
    }, [navigate, formState.kategori]);
    
    const resetForm = () => setFormState({ 
        judul: "", link: "", 
        kategori: kategoriList.length > 0 ? kategoriList[0].nama : "", 
        iconName: "FileText"
    });

    const handleTambah = async (e) => {
        e.preventDefault();
        if (!formState.judul || !formState.link || !formState.kategori) return;
        const urutanBaru = dokumen.length > 0 ? Math.max(...dokumen.map(d => d.urutan || 0)) + 1 : 1;
        await addDoc(collection(db, "dokumen"), { ...formState, urutan: urutanBaru });
        await logActivity(`Menambahkan dokumen: "${formState.judul}"`);
        setSuccessMessage('Dokumen berhasil ditambahkan!');
        resetForm();
        setIsFormVisible(false);
    };

    const handleHapus = (id, judul) => {
        setConfirmProps({
            show: true,
            message: `Yakin ingin menghapus dokumen "${judul}"?`,
            onConfirm: async () => {
                await deleteDoc(doc(db, "dokumen", id));
                await logActivity(`Menghapus dokumen: "${judul}"`);
                setSuccessMessage('Dokumen berhasil dihapus!');
                setConfirmProps({ show: false });
            }
        });
    };

    const openEditModal = (item) => {
        setEditData(item);
        setShowEditModal(true);
    };

    const handleUpdate = async () => {
        if (!editData || !editData.id) return;
        const { id, ...dataToUpdate } = editData;
        await updateDoc(doc(db, "dokumen", id), dataToUpdate);
        await logActivity(`Mengedit dokumen: "${editData.judul}"`);
        setSuccessMessage('Dokumen berhasil diperbarui!');
        setShowEditModal(false);
    };

    const handleSort = async () => {
        if (draggedItem.current === null || draggedOverItem.current === null || draggedItem.current === draggedOverItem.current) return;
        const itemsClone = [...dokumen];
        const temp = itemsClone.splice(draggedItem.current, 1)[0];
        itemsClone.splice(draggedOverItem.current, 0, temp);
        
        const batch = writeBatch(db);
        itemsClone.forEach((item, index) => {
            batch.update(doc(db, "dokumen", item.id), { urutan: index });
        });
        await batch.commit();
        draggedItem.current = null;
        draggedOverItem.current = null;
    };
    
    const selectIcon = (selectedIcon, isEditing = false) => {
        if (isEditing) {
            setEditData(prev => ({ ...prev, iconName: selectedIcon }));
            setShowIconPickerInModal(false);
        } else {
            setFormState(prev => ({...prev, iconName: selectedIcon}));
            setShowIconPicker(false);
        }
    };
    
    useEffect(() => {
        document.head.appendChild(styleSheet);
        return () => { document.head.removeChild(styleSheet); };
    }, []);

    return (
        <div className="admin-page">
            <ConfirmationModal modalState={confirmProps} setModalState={setConfirmProps} />
            {successMessage && <Toast message={successMessage} clear={() => setSuccessMessage('')} />}
            {showKategoriModal && <KategoriModal kategoriList={kategoriList} onClose={() => setShowKategoriModal(false)} showToast={setSuccessMessage} />}
            
            <header className="page-header">
                <div>
                    <h1 className="page-title">Kelola Dokumen</h1>
                    <p className="page-subtitle">Atur semua dokumen penting yang dapat diakses oleh publik.</p>
                </div>
            </header>
            
            <div className="card">
                <button onClick={() => setIsFormVisible(!isFormVisible)} className="button button-primary button-full">
                    {isFormVisible ? <><X size={16}/> Tutup Form</> : <><Plus size={16}/> Tambah Dokumen Baru</>}
                </button>
                {isFormVisible && (
                    <form onSubmit={handleTambah} className="form-grid">
                        <div className="form-group-flex">
                            <div className="icon-picker-wrapper">
                                <label className="label">Ikon:</label>
                                <button type="button" onClick={() => setShowIconPicker(!showIconPicker)} className="icon-button">
                                    <IconComponent name={formState.iconName} size={20} />
                                    <span>{formState.iconName}</span>
                                    <ChevronDown size={16} />
                                </button>
                                {showIconPicker && (
                                    <div className="icon-picker">
                                        {Object.keys(iconCategories).map(category => (
                                            <div key={category}><h5>{category}</h5>
                                                <div className="icon-grid">
                                                    {iconCategories[category].map(icon => (
                                                        <button key={icon} type="button" onClick={() => selectIcon(icon)}>
                                                            <IconComponent name={icon} size={20} />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="form-group" style={{flexGrow: 1}}>
                                <label className="label">Judul Dokumen:</label>
                                <input type="text" placeholder="e.g., Pedoman Akademik 2025" value={formState.judul} onChange={(e) => setFormState(p=>({...p, judul: e.target.value}))} className="input" />
                            </div>
                        </div>
                         <div className="form-group">
                            <label className="label">Kategori:</label>
                            <select className="input" value={formState.kategori} onChange={(e) => setFormState(p=>({...p, kategori: e.target.value}))}>
                                {kategoriList.map(kat => <option key={kat.id} value={kat.nama}>{kat.nama}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="label">Link Google Drive:</label>
                             <div className="input-with-icon">
                                <LinkIcon size={16}/>
                                <input type="url" placeholder="https://docs.google.com/..." value={formState.link} onChange={(e) => setFormState(p=>({...p, link: e.target.value}))} className="input" />
                            </div>
                        </div>
                        <button type="submit" className="button button-success"><Save size={16}/> Simpan Dokumen</button>
                    </form>
                )}
            </div>

            <div className="card">
                <div className="list-header">
                    <h3 className="card-title">Daftar Dokumen</h3>
                    <button onClick={() => setShowKategoriModal(true)} className="button button-secondary">
                        <Settings size={16}/> Kelola Kategori
                    </button>
                </div>
                {loading ? <p>Memuat...</p> : dokumen.length === 0 ? <EmptyState text="Belum ada dokumen" subtext="Mulai tambahkan dokumen baru pada form di atas."/> : (
                    dokumen.map((item, index) => (
                        <div key={item.id} className="draggable-item" draggable 
                            onDragStart={() => (draggedItem.current = index)}
                            onDragEnter={() => (draggedOverItem.current = index)}
                            onDragEnd={handleSort} onDragOver={(e) => e.preventDefault()}>
                            <GripVertical size={20} className="drag-handle"/>
                            <div className="item-icon">
                                <IconComponent name={item.iconName} size={22} />
                            </div>
                            <div className="item-content">
                                <strong>{item.judul}</strong>
                                <small>Kategori: {item.kategori}</small>
                            </div>
                            <div className="item-actions">
                                <button onClick={() => openEditModal(item)} className="button-icon"><Pencil size={14} /></button>
                                <button onClick={() => handleHapus(item.id, item.judul)} className="button-icon danger"><Trash2 size={14} /></button>
                            </div>
                        </div>
                    ))
                )}
            </div>
            
            {showEditModal && editData && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Edit Dokumen</h3>
                            <button onClick={() => setShowEditModal(false)} className="close-button"><X size={20}/></button>
                        </div>
                        <div className="form-grid">
                            <div className="icon-picker-wrapper">
                                <label className="label">Ikon:</label>
                                <button type="button" onClick={() => setShowIconPickerInModal(!showIconPickerInModal)} className="icon-button">
                                    <IconComponent name={editData.iconName} size={20} />
                                    <span>{editData.iconName}</span>
                                    <ChevronDown size={16} />
                                </button>
                                {showIconPickerInModal && (
                                    <div className="icon-picker">
                                        {Object.keys(iconCategories).map(category => (
                                            <div key={category}><h5>{category}</h5>
                                                <div className="icon-grid">
                                                    {iconCategories[category].map(icon => (
                                                        <button key={icon} type="button" onClick={() => selectIcon(icon, true)}>
                                                            <IconComponent name={icon} size={20} />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="form-group"><label className="label">Judul:</label><input className="input" value={editData.judul} onChange={(e) => setEditData(p => ({ ...p, judul: e.target.value }))} /></div>
                            <div className="form-group"><label className="label">Kategori:</label>
                                <select className="input" value={editData.kategori} onChange={(e) => setEditData(p => ({ ...p, kategori: e.target.value }))}>
                                    {kategoriList.map(kat => <option key={kat.id} value={kat.nama}>{kat.nama}</option>)}
                                </select>
                            </div>
                            <div className="form-group"><label className="label">Link:</label>
                                <div className="input-with-icon"><LinkIcon size={16}/><input className="input" value={editData.link} onChange={(e) => setEditData(p => ({ ...p, link: e.target.value }))} /></div>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button onClick={handleUpdate} className="button button-success"><Save size={16}/> Simpan Perubahan</button>
                            <button onClick={() => setShowEditModal(false)} className="button button-secondary">Batal</button>
                        </div>
                    </div>
                </div>
            )}
            <button onClick={() => navigate("/admin")} className="button button-secondary" style={{width: '100%', marginTop: '8px'}}>
                <ArrowLeft size={16}/> Kembali ke Dashboard
            </button>
        </div>
    );
};


const styleSheet = document.createElement("style");
styleSheet.innerHTML = `
    .admin-page { font-family: 'Inter', sans-serif; background-color: #f8fafc; min-height: 100vh; padding: 20px; }
    .page-header { margin-bottom: 24px; } .page-title { color: #1e293b; font-size: 1.75rem; font-weight: 700; margin: 0; }
    .page-subtitle { color: #64748b; font-size: 1rem; margin: 4px 0 0 0; }
    .card { background-color: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); margin-bottom: 24px; }
    .card-title { margin: 0; color: #1e293b; font-size: 1.25rem; font-weight: 600; }
    .input { display: block; width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid #cbd5e0; font-size: 1rem; background-color: #fff; }
    .input:focus { border-color: #3b82f6; outline: none; }
    .label { display: block; margin-bottom: 8px; font-size: 0.9rem; color: #334155; font-weight: 600; }
    .input-with-icon { position: relative; display: flex; align-items: center; } 
    .input-with-icon svg { position: absolute; left: 12px; color: #9ca3af; pointer-events: none; }
    .input-with-icon .input { padding-left: 40px; }
    .form-grid { display: flex; flex-direction: column; gap: 20px; margin-top: 24px; }
    .form-group { width: 100%; }
    .form-group-flex { display: flex; flex-direction: column; gap: 20px; }
    .button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.9rem; border: 1px solid transparent; transition: all 0.2s; }
    .button-primary { background-color: #1d4ed8; color: white; } .button-primary:hover { background-color: #1e40af; }
    .button-secondary { background-color: #f1f5f9; color: #475569; border-color: #e2e8f0; } .button-secondary:hover { background-color: #e2e8f0; }
    .button-success { background-color: #16a34a; color: white; } .button-success:hover { background-color: #15803d; }
    .button-danger { background-color: #dc2626; color: white; } .button-danger:hover { background-color: #b91c1c; }
    .button-full { width: 100%; }
    .button-icon { padding: 8px; border-radius: 50%; border: none; background-color: transparent; color: #64748b; cursor: pointer; }
    .button-icon:hover { background-color: #f1f5f9; }
    .button-icon.danger:hover { background-color: #fee2e2; color: #dc2626; }
    .list-header { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 24px; }
    .draggable-item { display: flex; align-items: center; gap: 12px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 12px; background-color: #fff; }
    .drag-handle { cursor: grab; color: #9ca3af; }
    .item-icon { color: #3b82f6; }
    .item-content { flex-grow: 1; }
    .item-content strong { color: #1e293b; display: block; }
    .item-content small { color: #9ca3af; }
    .item-actions { display: flex; gap: 4px; }
    .list-container { margin-top: 24px; display: flex; flex-direction: column; gap: 12px; max-height: 40vh; overflow-y: auto; padding-right: 8px; }
    .list-item { display: flex; align-items: center; gap: 16px; padding: 12px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
    .list-item p { flex-grow: 1; margin: 0; color: #1e293b; }
    .list-item-actions { display: flex; }
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(15,23,42,0.6); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .modal-content { background-color: white; padding: 24px; border-radius: 12px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; display: flex; flex-direction: column; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-shrink: 0; }
    .modal-header h3 { font-size: 1.25rem; color: #1e293b; margin: 0; }
    .close-button { background: none; border: none; cursor: pointer; color: #9ca3af; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; flex-shrink: 0; }
    .modal-content.small-modal { max-width: 400px; text-align: center; }
    .toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background-color: #1e293b; color: white; padding: 12px 24px; border-radius: 8px; z-index: 1001; }
    .empty-state { text-align: center; padding: 40px; background-color: #f9fafb; border-radius: 12px; }
    .empty-state svg { color: #cbd5e1; margin-bottom: 16px; }
    .empty-state-text { font-size: 1.2rem; color: #475569; margin: 0; }
    .empty-state-subtext { margin: 8px 0 0; color: #9ca3af; }
    .icon-picker-wrapper { position: relative; }
    .icon-button { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; padding: 10px; border: 1px solid #cbd5e0; border-radius: 8px; background-color: white; cursor: pointer; text-align: left; }
    .icon-button span { flex-grow: 1; color: #1e293b; }
    .icon-picker { position: absolute; background-color: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); z-index: 100; max-height: 250px; overflow-y: auto; margin-top: 8px; width: 100%; min-width: 280px; }
    .icon-picker h5 { margin: 10px 0 8px 0; font-size: 0.8rem; color: #64748b; text-transform: uppercase; font-weight: 600; }
    .icon-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(40px, 1fr)); gap: 6px; }
    .icon-grid button { border: none; background: #f1f5f9; cursor: pointer; padding: 8px; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #1e293b; }
    .icon-grid button:hover { background: #e2e8f0; }

    @media (min-width: 768px) {
        .page-title { font-size: 2rem; }
        .form-group-flex { flex-direction: row; align-items: flex-end; }
    }
`;

export default AdminDokumen;