import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase/firebaseConfig";
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy, serverTimestamp, updateDoc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { logActivity } from "../utils/logActivity";

//  ICON IMPORTS
import { Newspaper, Plus, X, Save, Search, SortAsc, SortDesc, Pencil, Trash2, ImagePlus, GripVertical, Calendar, Link as LinkIcon, ArrowLeft } from 'lucide-react';

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

const EmptyState = () => (
    <div className="empty-state">
        <Newspaper size={48} />
        <p className="empty-state-text">Belum ada berita</p>
        <p className="empty-state-subtext">Mulai tambahkan berita baru di formulir di atas.</p>
    </div>
);

const ImageUploader = ({ imageList, onImageUpload, onImageDelete, onImageReorder }) => {
    const draggedItem = useRef(null);
    const draggedOverItem = useRef(null);
    
    const handleSort = () => {
        const listClone = [...imageList];
        const temp = listClone.splice(draggedItem.current, 1)[0];
        listClone.splice(draggedOverItem.current, 0, temp);
        onImageReorder(listClone);
        draggedItem.current = null;
        draggedOverItem.current = null;
    };

    return (
        <div>
            <label className="label">Gambar Berita:</label>
            <div className="image-uploader-grid">
                {imageList.map((img, index) => (
                    <div
                        key={index}
                        className="image-preview"
                        draggable
                        onDragStart={() => (draggedItem.current = index)}
                        onDragEnter={() => (draggedOverItem.current = index)}
                        onDragEnd={handleSort}
                        onDragOver={(e) => e.preventDefault()}
                    >
                        <GripVertical size={16} className="drag-handle-img" />
                        <img src={img} alt={`Preview ${index}`} />
                        <button type="button" onClick={() => onImageDelete(index)} className="delete-img-button">
                            <X size={12} />
                        </button>
                    </div>
                ))}
                <label className="upload-box">
                    <ImagePlus size={24} />
                    <span>Tambah Gambar</span>
                    <input type="file" accept="image/*" multiple onChange={onImageUpload} />
                </label>
            </div>
            {imageList.length > 0 && <small className="field-hint">Tips: Geser gambar untuk mengubah urutan.</small>}
        </div>
    );
};


// --- MAIN COMPONENT ---

const KelolaBerita = () => {
    const [beritaList, setBeritaList] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const [formState, setFormState] = useState({ judul: "", deskripsi: "", gambarList: [], kategori: "Umum", tanggalKegiatan: "", linkInstagram: "" });
    const [editState, setEditState] = useState(null);
    
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [confirmProps, setConfirmProps] = useState({ show: false });
    const [successMessage, setSuccessMessage] = useState('');
    
    const [searchTerm, setSearchTerm] = useState("");
    const [sortBy, setSortBy] = useState("terbaru");
    
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => { if (!user) navigate("/login"); });
        const q = query(collection(db, "berita"), orderBy("dibuatPada", "desc"));
        const unsubFirestore = onSnapshot(q, (snapshot) => {
            setBeritaList(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return () => { unsubscribeAuth(); unsubFirestore(); };
    }, [navigate]);

    const filteredAndSortedBerita = useMemo(() => {
        return beritaList
            .filter(item => item.judul.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => {
                if (sortBy === 'judul') return a.judul.localeCompare(b.judul);
                return (b.dibuatPada?.seconds || 0) - (a.dibuatPada?.seconds || 0); // Default 'terbaru'
            });
    }, [beritaList, searchTerm, sortBy]);
    
    const handleImageChange = (e, isEditing = false) => {
        const files = e.target.files;
        if (!files) return;

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1024;
                    const scaleSize = MAX_WIDTH / img.width;
                    canvas.width = MAX_WIDTH;
                    canvas.height = img.height * scaleSize;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);

                    if (isEditing) {
                        setEditState(prev => ({ ...prev, gambarList: [...(prev.gambarList || []), compressedBase64] }));
                    } else {
                        setFormState(prev => ({ ...prev, gambarList: [...prev.gambarList, compressedBase64] }));
                    }
                };
            };
        });
    };
    
    const resetForm = () => {
        setFormState({ judul: "", deskripsi: "", gambarList: [], kategori: "Umum", tanggalKegiatan: "", linkInstagram: "" });
    };

    const handleTambah = async (e) => {
        e.preventDefault();
        if (!formState.judul || !formState.deskripsi) return;
        
        const user = auth.currentUser;
        let kementerianPublikasi = "BEM";
        if (user) {
            const userDocSnap = await getDoc(doc(db, "users", user.uid));
            if (userDocSnap.exists()) kementerianPublikasi = userDocSnap.data().kementerian || "BEM";
        }

        try {
            await addDoc(collection(db, "berita"), {
                ...formState,
                dibuatPada: serverTimestamp(),
                dibuatOleh: kementerianPublikasi,
            });
            await logActivity(`Menambahkan berita: "${formState.judul}"`);
            resetForm();
            setIsFormVisible(false);
            setSuccessMessage('Berita berhasil ditambahkan!');
        } catch (error) { console.error("Error adding document: ", error); }
    };

    const handleUpdate = async () => {
        if (!editState) return;
        const { id, ...dataToUpdate } = editState;
        
        const user = auth.currentUser;
        let kementerianEditor = "BEM";
        if (user) {
            const userDocSnap = await getDoc(doc(db, "users", user.uid));
            if (userDocSnap.exists()) kementerianEditor = userDocSnap.data().kementerian || "BEM";
        }
        
        await updateDoc(doc(db, "berita", id), {
            ...dataToUpdate,
            dieditPada: serverTimestamp(),
            dieditOleh: kementerianEditor,
        });
        await logActivity(`Mengedit berita: "${editState.judul}"`);
        setShowEditModal(false);
        setSuccessMessage('Berita berhasil diperbarui!');
    };

    const handleHapus = (id, judul) => {
        setConfirmProps({
            show: true,
            message: `Yakin ingin menghapus berita "${judul}"?`,
            onConfirm: async () => {
                await deleteDoc(doc(db, "berita", id));
                await logActivity(`Menghapus berita: "${judul}"`);
                setConfirmProps({ show: false });
                setSuccessMessage('Berita berhasil dihapus!');
            }
        });
    };

    const openEditModal = (item) => {
        setEditState(item);
        setShowEditModal(true);
    };

    useEffect(() => {
      document.head.appendChild(styleSheet);
      
      // Ini adalah "cleanup function" yang akan berjalan saat halaman ditutup
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
                    <h1 className="page-title">Kelola Berita & Kegiatan</h1>
                    <p className="page-subtitle">Publikasikan informasi, kegiatan, dan pengumuman terbaru.</p>
                </div>
            </header>

            <div className="card">
                <button onClick={() => setIsFormVisible(!isFormVisible)} className="button button-primary button-full">
                    {isFormVisible ? <><X size={16}/> Tutup Form</> : <><Plus size={16}/> Tambah Berita Baru</>}
                </button>
                {isFormVisible && (
                    <form onSubmit={handleTambah} className="form-grid">
                        <div className="form-group">
                            <label className="label">Judul Berita:</label>
                            <input type="text" placeholder="e.g., Kunjungan Industri ke PT. INUKI" value={formState.judul} onChange={(e) => setFormState(p => ({...p, judul: e.target.value}))} className="input" required />
                        </div>
                        <div className="form-group">
                            <label className="label">Isi Berita:</label>
                            <textarea className="input" rows="5" value={formState.deskripsi} onChange={(e) => setFormState(p => ({...p, deskripsi: e.target.value}))} placeholder="Jelaskan detail berita di sini..." required />
                        </div>
                        <ImageUploader 
                            imageList={formState.gambarList}
                            onImageUpload={(e) => handleImageChange(e, false)}
                            onImageDelete={(index) => setFormState(p => ({...p, gambarList: p.gambarList.filter((_, i) => i !== index)}))}
                            onImageReorder={(newList) => setFormState(p => ({...p, gambarList: newList}))}
                        />
                        <div className="form-group-flex">
                            <div className="form-group" style={{flex: 1}}>
                                <label className="label">Kategori:</label>
                                <select className="input" value={formState.kategori} onChange={(e) => setFormState(p => ({...p, kategori: e.target.value}))}>
                                    <option value="Umum">Umum</option>
                                    <option value="Kegiatan">Kegiatan</option>
                                    <option value="Informasi">Informasi</option>
                                    <option value="Pengumuman">Pengumuman</option>
                                </select>
                            </div>
                            <div className="form-group" style={{flex: 1}}>
                                <label className="label">Tanggal Kegiatan (Opsional):</label>
                                <div className="input-with-icon">
                                    <Calendar size={16} />
                                    <input type="date" className="input" value={formState.tanggalKegiatan} onChange={(e) => setFormState(p => ({...p, tanggalKegiatan: e.target.value}))}/>
                                </div>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="label">Link Instagram (Opsional):</label>
                            <div className="input-with-icon">
                                <LinkIcon size={16} />
                                <input type="url" placeholder="https://instagram.com/p/..." value={formState.linkInstagram} onChange={(e) => setFormState(p => ({...p, linkInstagram: e.target.value}))} className="input" />
                            </div>
                        </div>
                        <button type="submit" className="button button-success"><Save size={16}/> Publikasikan Berita</button>
                    </form>
                )}
            </div>

            <div className="card">
                <div className="list-header">
                    <h3 className="card-title">Daftar Berita</h3>
                    <div className="filter-controls">
                        <div className="input-with-icon">
                            <Search size={16} />
                            <input type="text" placeholder="Cari judul..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input" />
                        </div>
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="input">
                            <option value="terbaru">Urutkan: Terbaru</option>
                            <option value="judul">Urutkan: Judul (A-Z)</option>
                        </select>
                    </div>
                </div>
                {loading ? <p>Memuat...</p> : filteredAndSortedBerita.length === 0 ? <EmptyState /> : (
                    <div className="news-list">
                        {filteredAndSortedBerita.map(item => (
                            <div key={item.id} className="news-card">
                              {/* ✅ TAMBAHKAN PEMBUNGKUS INI */}
                              <div className="news-card-info"> 
                                  {item.gambarList && item.gambarList[0] && (
                                      <img src={item.gambarList[0]} alt={item.judul} className="news-card-image"/>
                                  )}
                                  <div className="news-card-content">
                                      <strong>{item.judul}</strong>
                                      <small>
                                          <span>{item.kategori}</span> • 
                                          <span>{item.dibuatPada?.toDate().toLocaleDateString('id-ID', {day:'numeric', month:'long'})}</span>
                                      </small>
                                  </div>
                              </div>
                              {/* 🛑 AKHIR DARI PEMBUNGKUS */}

                              <div className="news-card-actions">
                                  <button onClick={() => openEditModal(item)} className="button-icon"><Pencil size={16} /></button>
                                  <button onClick={() => handleHapus(item.id, item.judul)} className="button-icon danger"><Trash2 size={16} /></button>
                              </div>
                          </div>
                        ))}
                    </div>
                )}
            </div>
            
             <button onClick={() => navigate("/admin")} className="button button-secondary" style={{marginTop: '24px'}}>
                <ArrowLeft size={16}/> Kembali ke Dashboard
            </button>
            
            {showEditModal && editState && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Edit Berita</h3>
                            <button onClick={() => setShowEditModal(false)} className="close-button"><X size={20}/></button>
                        </div>
                        <div className="form-grid">
                            <div className="form-group"><label className="label">Judul:</label><input className="input" value={editState.judul} onChange={(e) => setEditState(p => ({...p, judul: e.target.value}))} /></div>
                            <div className="form-group"><label className="label">Deskripsi:</label><textarea className="input" rows="5" value={editState.deskripsi} onChange={(e) => setEditState(p => ({...p, deskripsi: e.target.value}))} /></div>
                            <ImageUploader 
                                imageList={editState.gambarList || []}
                                onImageUpload={(e) => handleImageChange(e, true)}
                                onImageDelete={(index) => setEditState(p => ({...p, gambarList: p.gambarList.filter((_, i) => i !== index)}))}
                                onImageReorder={(newList) => setEditState(p => ({...p, gambarList: newList}))}
                            />
                            <div className="form-group-flex">
                                <div className="form-group" style={{flex: 1}}><label className="label">Kategori:</label>
                                    <select className="input" value={editState.kategori} onChange={(e) => setEditState(p => ({...p, kategori: e.target.value}))}>
                                        <option value="Umum">Umum</option><option value="Kegiatan">Kegiatan</option><option value="Informasi">Informasi</option><option value="Pengumuman">Pengumuman</option>
                                    </select>
                                </div>
                                <div className="form-group" style={{flex: 1}}><label className="label">Tgl. Kegiatan:</label>
                                    <div className="input-with-icon"><Calendar size={16} /><input type="date" className="input" value={editState.tanggalKegiatan} onChange={(e) => setEditState(p => ({...p, tanggalKegiatan: e.target.value}))}/></div>
                                </div>
                            </div>
                             <div className="form-group"><label className="label">Link Instagram:</label>
                                <div className="input-with-icon"><LinkIcon size={16} /><input type="url" placeholder="https://..." value={editState.linkInstagram} onChange={(e) => setEditState(p => ({...p, linkInstagram: e.target.value}))} className="input" /></div>
                            </div>
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
};

// --- STYLESHEET ---
const styleSheet = document.createElement("style");
styleSheet.innerHTML = `
    /* General Styles from AdminLayanan for consistency */
    .admin-page { font-family: 'Inter', sans-serif; background-color: #f8fafc; min-height: 100vh; padding: 20px; }
    .page-header, .card, .input, .button { box-sizing: border-box; }
    .page-header { margin-bottom: 24px; } .page-title { color: #1e293b; font-size: 1.75rem; font-weight: 700; margin: 0; }
    .page-subtitle { color: #64748b; font-size: 1rem; margin: 4px 0 0 0; }
    .card { background-color: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); margin-bottom: 24px; }
    .card-title { margin: 0; color: #1e293b; font-size: 1.25rem; font-weight: 600; }
    .input { display: block; width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid #cbd5e0; font-size: 1rem; background-color: #fff; }
    .input:focus { border-color: #3b82f6; outline: none; }
    .label { display: block; margin-bottom: 8px; font-size: 0.9rem; color: #334155; font-weight: 600; }
    .button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.9rem; text-decoration: none; border: 1px solid transparent; transition: all 0.2s; }
    .button-primary { background-color: #1d4ed8; color: white; } .button-primary:hover { background-color: #1e40af; }
    .button-secondary { background-color: #f1f5f9; color: #475569; border-color: #e2e8f0; } .button-secondary:hover { background-color: #e2e8f0; }
    .button-success { background-color: #16a34a; color: white; } .button-success:hover { background-color: #15803d; }
    .button-danger { background-color: #dc2626; color: white; } .button-danger:hover { background-color: #b91c1c; }
    .button-full { width: 100%; }
    .button-icon { 
        padding: 10px; /* Area sentuh lebih besar */
        border-radius: 50%; 
        border: none; 
        background-color: transparent; 
        color: #64748b; 
        cursor: pointer; 
    }
    .button-icon:hover { background-color: #f1f5f9; }
    .button-icon.danger:hover { background-color: #fee2e2; color: #dc2626; }
    .form-grid { display: flex; flex-direction: column; gap: 20px; margin-top: 24px; }
    .form-group { width: 100%; } .form-group-flex { display: flex; flex-direction: column; gap: 20px; }
    .input-with-icon { position: relative; display: flex; align-items: center; } 
    .input-with-icon svg { position: absolute; left: 12px; color: #9ca3af; pointer-events: none; }
    .input-with-icon .input { padding-left: 40px; }
    .list-header { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; }
    .filter-controls { display: flex; flex-direction: column; gap: 12px; }
    .toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background-color: #1e293b; color: white; padding: 12px 24px; border-radius: 8px; z-index: 1001; }
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(15,23,42,0.6); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .modal-content { background-color: white; padding: 24px; border-radius: 12px; width: 100%; max-width: 700px; max-height: 90vh; overflow-y: auto; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .modal-header h3 { font-size: 1.25rem; color: #1e293b; margin: 0; }
    .close-button { background: none; border: none; cursor: pointer; color: #9ca3af; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }
    .modal-content.small-modal { max-width: 400px; text-align: center; }
    .empty-state { text-align: center; padding: 40px; background-color: #f9fafb; border-radius: 12px; }
    .empty-state svg { color: #cbd5e1; margin-bottom: 16px; }
    .empty-state-text { font-size: 1.2rem; color: #475569; margin: 0; }
    .empty-state-subtext { margin: 8px 0 0; color: #9ca3af; }

    /* Page-Specific Styles for KelolaBerita */
    .news-list { display: flex; flex-direction: column; gap: 12px; }
    .news-card { 
        display: flex; 
        align-items: center; 
        justify-content: space-between; /* Mendorong info ke kiri & aksi ke kanan */
        gap: 12px; 
        padding: 12px; 
        background-color: #fff; 
        border: 1px solid #e2e8f0; 
        border-radius: 12px; /* Sedikit lebih bulat */
        transition: all 0.2s; 
    }
    .news-card-info {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0; /* Trik agar teks bisa wrap dengan benar */
    }
    .news-card:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.06); border-color: #a5b4fc; }
    .news-card-image { 
        width: 64px; /* Sedikit lebih kecil agar lebih proporsional */
        height: 64px; 
        object-fit: cover; 
        border-radius: 8px; 
        flex-shrink: 0; 
        background-color: #f1f5f9; 
    }
    .news-card-content { flex-grow: 1; min-width: 0; } 
    .news-card-content strong { color: #1e293b; display: block; font-size: 1rem; margin-bottom: 2px; } 
    .news-card-content small { 
        display: flex; 
        gap: 8px; 
        color: #9ca3af; 
        font-size: 0.8rem;
        flex-wrap: wrap; /* Agar tidak aneh di layar sempit */
    }
    .news-card-actions { 
        display: flex; 
        align-items: center; 
        gap: 8px; /* Beri jarak antar tombol */
        flex-shrink: 0; /* Mencegah tombol mengecil */
    }

    /* Image Uploader Component Styles */
    .image-uploader-grid { display: flex; flex-wrap: wrap; gap: 12px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #f8fafc; }
    .image-preview { position: relative; width: 100px; height: 75px; cursor: grab; }
    .image-preview img { width: 100%; height: 100%; object-fit: cover; border-radius: 6px; }
    .drag-handle-img { position: absolute; top: 4px; left: 4px; color: white; background-color: rgba(0,0,0,0.4); border-radius: 4px; padding: 2px; pointer-events: none; }
    .delete-img-button { position: absolute; top: -8px; right: -8px; background: #dc2626; color: white; border: 2px solid white; border-radius: 50%; cursor: pointer; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; }
    .upload-box { width: 100px; height: 75px; border: 2px dashed #cbd5e0; border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; color: #9ca3af; transition: all 0.2s; }
    .upload-box:hover { border-color: #3b82f6; color: #3b82f6; }
    .upload-box span { font-size: 0.8rem; margin-top: 4px; }
    .upload-box input[type="file"] { display: none; }
    .field-hint { font-size: 0.8rem; color: #9ca3af; margin-top: 8px; display: block; }

    /* Media Queries for Responsiveness */
    @media (min-width: 768px) {
        .page-title { font-size: 2rem; }
        .form-group-flex { flex-direction: row; align-items: flex-end; }
        .list-header { flex-direction: row; justify-content: space-between; align-items: center; }
        .filter-controls { flex-direction: row; }
        .modal-content { padding: 32px; }
    }
    @media (max-width: 767px) {
        .news-card {
            flex-direction: column; 
            align-items: stretch;   
            padding: 16px;
        }

        .news-card-actions {
            justify-content: flex-end; 
            margin-top: 12px;          
            padding-top: 12px;         
            border-top: 1px solid #f1f5f9; 
        }
    }
`;

export default KelolaBerita;