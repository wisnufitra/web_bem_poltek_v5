// src/pages/panitia/PanitiaKelolaKandidat.js
import React, { useState, useEffect } from 'react';
import { useEvent } from '../../layouts/PanitiaLayout';
import { db } from '../../firebase/firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import { logActivity } from '../../utils/logActivity';

// ✅ 1. Impor Ikon Lucide (Pastikan sudah install: npm install lucide-react)
import { Plus, UserPlus, FileText, Trash2, Edit, X, Upload, Eye, Loader2, Users } from 'lucide-react';

// --- Komponen UI Modern (Menggunakan Kelas CSS) ---
const Toast = ({ message, clear }) => {
    useEffect(() => {
        const timer = setTimeout(clear, 3000);
        return () => clearTimeout(timer);
    }, [clear]);
    return <div className="toast-notification">{message}</div>;
};

const ConfirmationModal = ({ modalState, setModalState }) => {
    if (!modalState.isOpen) return null;
    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3 className="modal-title">{modalState.title}</h3>
                <p className="modal-message">{modalState.message}</p>
                <div className="modal-actions">
                    <button className="button button-secondary" onClick={() => setModalState({ isOpen: false })}>Batal</button>
                    <button 
                        className="button button-danger" 
                        onClick={() => {
                            modalState.onConfirm();
                            setModalState({ isOpen: false });
                        }}
                    >
                        {modalState.confirmText || 'Konfirmasi'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Komponen Utama ---
const PanitiaKelolaKandidat = () => {
    const { event, eventId } = useEvent();
    const [kandidatList, setKandidatList] = useState([]);
    const [editData, setEditData] = useState(null);
    const [detailKandidat, setDetailKandidat] = useState(null);
    const [loading, setLoading] = useState({});
    const [toastMessage, setToastMessage] = useState('');
    const [modalState, setModalState] = useState({ isOpen: false });

    useEffect(() => {
        if (event?.kandidat) {
            const sortedKandidat = [...event.kandidat].sort((a, b) => (a.nomorUrut || 0) - (b.nomorUrut || 0));
            setKandidatList(sortedKandidat);
        }
    }, [event]);

    // Menggunakan placeholder SVG inlined (base64) untuk menghindari error link
    const placeholderFoto = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="400" height="400" fill="%23f8fafc"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Inter, sans-serif" font-size="28" fill="%2364748b">KANDIDAT</text><rect x="150" y="140" width="100" height="100" fill="%23cbd5e0" rx="5"/><circle cx="200" cy="180" r="30" fill="%2394a3b8"/><path d="M150 240 L150 260 Q200 300 250 260 L250 240 Z" fill="%2394a3b8"/></svg>';

    const showToast = (message) => setToastMessage(message);

    const openKandidatModal = (kandidat = null) => {
        if (kandidat) {
            setEditData(kandidat); 
        } else {
            setEditData({ id: Date.now(), nama: '', visiMisi: '', fotoUrl: '', suara: 0, nomorUrut: kandidatList.length + 1 });
        }
    };

    const handleSaveKandidat = async () => {
        if (!editData.nama || !editData.visiMisi) {
            return showToast("Nama dan Visi & Misi tidak boleh kosong.");
        }
        setLoading(prev => ({...prev, save: true}));
        
        const dataToSave = { ...editData, fotoUrl: editData.fotoUrl || placeholderFoto };
        const isEditing = kandidatList.some(k => k.id === dataToSave.id);

        let otherKandidat = kandidatList.filter(k => k.id !== dataToSave.id);
        let updatedList = [...otherKandidat, dataToSave];
        
        updatedList.sort((a, b) => (a.nomorUrut || 0) - (b.nomorUrut || 0));
        const finalList = updatedList.map((k, index) => ({ ...k, nomorUrut: index + 1 }));

        try {
            const eventDocRef = doc(db, 'pemilihan_events', eventId);
            await updateDoc(eventDocRef, { kandidat: finalList });
            await logActivity(isEditing ? `Mengedit kandidat "${dataToSave.nama}"` : `Menambah kandidat "${dataToSave.nama}"`);
            showToast(isEditing ? 'Kandidat berhasil diperbarui.' : 'Kandidat berhasil ditambahkan.');
            setEditData(null);
        } catch (error) {
            console.error("Save candidate error:", error);
            showToast("Gagal menyimpan kandidat.");
        } finally {
            setLoading(prev => ({...prev, save: false}));
        }
    };
    
    const confirmHapusKandidat = (kandidatId, kandidatNama) => {
        setModalState({
            isOpen: true,
            title: 'Hapus Kandidat',
            message: `Anda yakin ingin menghapus kandidat "${kandidatNama}" (Nomor Urut: ${kandidatList.find(k => k.id === kandidatId)?.nomorUrut}). Suara yang telah masuk untuk kandidat ini juga akan hilang.`,
            onConfirm: () => handleHapusKandidat(kandidatId, kandidatNama),
            confirmText: 'Ya, Hapus'
        });
    };

    const handleHapusKandidat = async (kandidatId, kandidatNama) => {
        const kandidatBaru = kandidatList
            .filter(k => k.id !== kandidatId)
            .map((k, index) => ({ ...k, nomorUrut: index + 1 })); // Atur ulang nomor urut
        try {
            const eventDocRef = doc(db, 'pemilihan_events', eventId);
            await updateDoc(eventDocRef, { kandidat: kandidatBaru });
            await logActivity(`Menghapus kandidat "${kandidatNama}"`);
            showToast('Kandidat berhasil dihapus.');
        } catch (error) {
            console.error("Delete candidate error:", error);
            showToast("Gagal menghapus kandidat.");
        }
    };

    const handleFotoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setLoading(prev => ({...prev, photo: true}));
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 400;
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
                setEditData(prev => ({ ...prev, fotoUrl: compressedBase64 }));
                setLoading(prev => ({...prev, photo: false}));
            };
        };
    };

    return (
        <div className="summary-page">
            {toastMessage && <Toast message={toastMessage} clear={() => setToastMessage('')} />}
            <ConfirmationModal modalState={modalState} setModalState={setModalState} />

            {/* Modal Tambah/Edit Kandidat */}
            {editData && (
                <div className="modal-overlay">
                    <div className="modal-content modal-lg">
                        <div className="modal-header-with-close">
                            <h3 className="modal-title">{kandidatList.some(k => k.id === editData.id) ? <Edit size={24} /> : <UserPlus size={24} />} {kandidatList.some(k => k.id === editData.id) ? 'Edit' : 'Tambah'} Kandidat</h3>
                            <button onClick={() => setEditData(null)} className="button-icon-close"><X size={20} /></button>
                        </div>
                        
                        <div className="modal-form-grid">
                            <div className="form-group flex-3">
                                <label className="input-label">Nama Kandidat</label>
                                <input className="form-input" value={editData.nama} onChange={(e) => setEditData(prev => ({ ...prev, nama: e.target.value }))} placeholder="Nama Lengkap Kandidat"/>
                            </div>
                            <div className="form-group flex-1">
                                <label className="input-label">No. Urut</label>
                                <input className="form-input input-number" type="number" min="1" max={kandidatList.length + 1} value={editData.nomorUrut} onChange={(e) => setEditData(prev => ({ ...prev, nomorUrut: parseInt(e.target.value, 10) || 1 }))} />
                            </div>
                        </div>

                        <label className="input-label">Visi & Misi</label>
                        <textarea className="form-input textarea-tall" value={editData.visiMisi} onChange={(e) => setEditData(prev => ({ ...prev, visiMisi: e.target.value }))} placeholder="Jelaskan visi & misi kandidat..."/>
                        
                        <label className="input-label">Foto Kandidat (Rasio 1:1, max 400px)</label>
                        <div className="photo-upload-container">
                            <img src={editData.fotoUrl || placeholderFoto} alt="Preview" className="image-preview"/>
                            <label htmlFor="photo-upload" className="upload-button button-secondary">
                                {loading.photo ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
                                <span>{loading.photo ? 'Memproses...' : 'Unggah Foto'}</span>
                            </label>
                            <input id="photo-upload" type="file" accept="image/*" onChange={handleFotoChange} style={{display: 'none'}}/>
                            {editData.fotoUrl && editData.fotoUrl !== placeholderFoto && <button onClick={() => setEditData(prev => ({...prev, fotoUrl: placeholderFoto}))} className="button-text-danger"><Trash2 size={16} /> Hapus Foto</button>}
                        </div>

                        <div className="modal-actions mt-24">
                            <button onClick={() => setEditData(null)} className="button button-secondary">Batal</button>
                            <button onClick={handleSaveKandidat} className={loading.save ? 'button button-primary-disabled' : 'button button-primary'} disabled={loading.save}>
                                {loading.save ? <><Loader2 size={18} className="animate-spin" /> Menyimpan...</> : 'Simpan Kandidat'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Detail Kandidat */}
            {detailKandidat && (
                <div className="modal-overlay" onClick={() => setDetailKandidat(null)}>
                    <div className="modal-content modal-md" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-with-close">
                             <h3 className="modal-title"><FileText size={24} /> Visi & Misi Kandidat #{detailKandidat.nomorUrut}</h3>
                             <button onClick={() => setDetailKandidat(null)} className="button-icon-close"><X size={20} /></button>
                        </div>
                        
                        <div className="detail-header">
                            <img src={detailKandidat.fotoUrl || placeholderFoto} alt={detailKandidat.nama} className="detail-image"/>
                            <div>
                                <h4 className="detail-title">{detailKandidat.nama}</h4>
                                <p className="detail-subtitle">Visi & Misi:</p>
                            </div>
                        </div>
                        <div className="visi-misi-content">
                            <p className="visi-misi-text">{detailKandidat.visiMisi}</p>
                        </div>
                        <div className="modal-actions mt-24">
                            <button onClick={() => setDetailKandidat(null)} className="button button-secondary">Tutup</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Halaman Utama */}
            <div className="dashboard-container">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Kelola Kandidat</h1>
                        <p className="page-subtitle">Tambah, edit, atau hapus calon untuk pemilihan ini. Urutan akan diatur berdasarkan Nomor Urut.</p>
                    </div>
                    <button onClick={() => openKandidatModal()} className="button button-primary">
                        <Plus size={20} /> Tambah Kandidat
                    </button>
                </div>
                
                {kandidatList.length === 0 ? (
                    <div className="empty-state">
                        <Users size={64} />
                        <p className="empty-title">Belum Ada Kandidat</p>
                        <p className="empty-message">Klik tombol "Tambah Kandidat" di atas untuk mulai menambahkan calon untuk pemilihan ini.</p>
                    </div>
                ) : (
                    <div className="kandidat-grid">
                        {kandidatList.map((k, index) => (
                            <div key={k.id} className="card kandidat-card">
                                <span className="nomor-badge">#{k.nomorUrut}</span>
                                <img src={k.fotoUrl || placeholderFoto} alt={k.nama} className="card-image" />
                                <div className="card-content">
                                    <h4 className="card-title-lg">{k.nama}</h4>
                                    
                                    <div className="kandidat-actions">
                                        <button onClick={() => setDetailKandidat(k)} className="button button-secondary button-fluid button-margin-bottom">
                                            <Eye size={16} /> Lihat Visi & Misi
                                        </button>
                                        
                                        <div className="card-inline-actions">
                                            <button onClick={() => openKandidatModal(k)} className="button button-edit-text button-fluid-half">
                                                <Edit size={16} /> Edit
                                            </button>
                                            <button onClick={() => confirmHapusKandidat(k.id, k.nama)} className="button button-delete-text button-fluid-half">
                                                <Trash2 size={16} /> Hapus
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {/* Div kosong untuk menangani sisa min-height: 100vh di PanitiaLayout */}
            <div className="spacer-bottom"></div>
        </div>
    );
};

// ✅ 3. CSS Stylesheet (FINAL)
const styleSheet = document.createElement("style");
styleSheet.innerHTML = `
    /* Impor font Inter untuk konsistensi */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    .summary-page { 
        font-family: 'Inter', sans-serif; 
        background-color: #f8fafc; 
        min-height: 100vh;
        padding: 20px 16px; 
    }
    .dashboard-container { margin: 0; }
    
    .page-header { 
        display: flex; 
        flex-direction: column;
        justify-content: space-between; 
        align-items: flex-start;
        gap: 16px; 
        margin-bottom: 32px; 
    }
    .page-title { 
        color: #1e293b; 
        font-size: 1.75rem; 
        font-weight: 700; 
        margin: 0; 
    }
    .page-subtitle { 
        color: #64748b; 
        font-size: 1rem; 
        margin: 4px 0 0 0; 
    }
    
    /* --- Buttons & Inputs (Konsisten) --- */
    .button { 
        display: inline-flex; 
        align-items: center; 
        justify-content: center; 
        gap: 6px; 
        padding: 8px 12px; /* Kurangi padding tombol */
        border-radius: 8px; 
        cursor: pointer; 
        font-weight: 600; 
        font-size: 0.85rem; /* Font tombol sedikit lebih kecil */
        text-decoration: none; 
        border: 1px solid transparent; 
        transition: all 0.2s; 
    }
    .button-primary { 
        background-color: #1d4ed8; 
        color: white; 
        width: 100%; 
    }
    .button-primary-disabled {
        background-color: #93c5fd; 
        color: #e2e8f0; 
        cursor: not-allowed;
        width: 100%;
    }
    .button-secondary { 
        background-color: #f1f5f9; 
        color: #475569; 
        border: 1px solid #e2e8f0; 
    }
    .button-danger { 
        background-color: #dc2626; 
        color: white; 
    }
    .button-fluid { width: 100%; }
    .button-fluid-half { width: 50%; }
    .button-margin-bottom { margin-bottom: 8px; }

    
    .button-edit-text, .button-delete-text { 
        background-color: transparent; 
        border: none; 
        cursor: pointer; 
        font-weight: 600; 
        font-size: 0.9rem;
        padding: 8px 0;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        transition: color 0.2s;
        text-align: center;
    }
    .button-edit-text { color: #1d4ed8; }
    .button-edit-text:hover { color: #2563eb; }
    .button-delete-text { color: #ef4444; }
    .button-delete-text:hover { color: #dc2626; }

    .button-icon-close {
        background: none;
        border: none;
        padding: 8px;
        cursor: pointer;
        color: #64748b;
        transition: color 0.2s;
    }
    .button-icon-close:hover {
        color: #1e293b;
    }

    .input-label { 
        display: block; 
        margin-bottom: 8px; 
        font-size: 0.9rem; 
        color: #334155; 
        font-weight: 600; 
        margin-top: 16px;
    }
    .form-input { 
        width: 100%; 
        box-sizing: border-box; 
        padding: 10px 12px; 
        border-radius: 8px; 
        border: 1px solid #cbd5e0; 
        font-size: 1rem; 
        background-color: #ffffff; 
        color: #1e293b; 
        margin-bottom: 8px; 
        transition: border-color 0.2s;
    }
    .textarea-tall { min-height: 120px; resize: vertical; }

    /* --- Grid Kandidat --- */
    .kandidat-grid { 
        display: grid; 
        /* UBAH DARI 280px KE 220px ATAU 240px */
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); 
        gap: 20px; /* Gap juga bisa dikurangi sedikit dari 24px */
        padding-bottom: 32px; 
    }
    .card { 
        background-color: white; 
        border-radius: 12px; 
        border: 1px solid #e2e8f0; 
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); 
        overflow: hidden; 
        display: flex; 
        flex-direction: column;
        position: relative; 
    }
    .card-image { 
        width: 100%; 
        /* Menggunakan Rasio 3:4 agar sama dengan Bilik Suara */
        aspect-ratio: 3/4; 
        /* Menggunakan Contain agar gambar utuh tidak terpotong */
        object-fit: contain;
        object-position: center;
        background-color: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
        flex-shrink: 0;
    }
    .card-content { 
        padding: 12px; /* Kurangi dari 16px */
        display: flex; 
        flex-direction: column; 
        flex-grow: 1;
        justify-content: space-between;
        gap: 10px; /* Kurangi dari 12px */
    }
    .card-title-lg { 
        margin: 0; 
        color: #1e293b; 
        font-size: 1.1rem; /* Kurangi dari 1.25rem */
        font-weight: 700;
        line-height: 1.3;
        flex-grow: 1;
    }
    .nomor-badge {
        position: absolute;
        top: 12px;
        left: 12px;
        background-color: #1d4ed8;
        color: white;
        padding: 6px 10px;
        border-radius: 6px;
        font-size: 0.9rem;
        font-weight: 700;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        z-index: 10;
    }
    .kandidat-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 12px; 
        padding-top: 12px;
        border-top: 1px solid #f1f5f9;
    }
    .card-inline-actions {
        display: flex;
        gap: 8px;
        width: 100%;
        justify-content: space-between;
    }

    /* --- Empty State --- */
    .empty-state { 
        text-align: center; 
        padding: 60px 40px; 
        background-color: #ffffff; 
        border-radius: 16px; 
        border: 1px solid #e2e8f0;
        margin-top: 24px;
    }
    .empty-state svg { color: #cbd5e0; margin-bottom: 16px; }
    .empty-title { font-size: 1.2rem; color: #64748b; margin: 0; font-weight: 600; }
    .empty-message { color: #94a3b8; margin-top: 8px; max-width: 400px; margin-left: auto; margin-right: auto; }

    /* --- Modal & Form (Konsisten) --- */
    .modal-overlay { 
        position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
        background-color: rgba(15, 23, 42, 0.5); 
        backdrop-filter: blur(4px); 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        z-index: 2000; 
    }
    .modal-content { 
        background-color: white; 
        padding: 24px; 
        border-radius: 12px; 
        max-width: 90%; 
        width: 100%;
        box-shadow: 0 10px 25px rgba(0,0,0,0.1); 
        max-height: 90vh; 
        overflow-y: auto;
    }
    .modal-lg { max-width: 600px; }
    .modal-md { max-width: 500px; }
    .modal-header-with-close {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #f1f5f9;
        padding-bottom: 16px;
        margin-bottom: 24px;
    }
    .modal-title { 
        margin: 0; 
        color: #1e293b; 
        font-size: 1.25rem; 
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 12px;
    }
    
    /* --- Styles Tambahan untuk Modal --- */
    .modal-form-grid {
        display: flex;
        flex-direction: column;
        gap: 16px;
        margin-bottom: 16px;
    }
    .flex-3 { flex: 3; }
    .flex-1 { flex: 1; }
    .input-number { text-align: center; font-weight: 700; }
    .mt-24 { margin-top: 24px; }
    .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
    }
    
    .photo-upload-container {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-top: 8px;
        flex-wrap: wrap;
    }
    .image-preview {
        width: 80px;
        height: 80px;
        border-radius: 8px;
        object-fit: cover;
        border: 1px solid #e2e8f0;
    }
    .upload-button {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.9rem;
        font-weight: 600;
    }
    .animate-spin {
        animation: spin 1s linear infinite;
    }
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    .button-text-danger {
        background: none;
        border: none;
        color: #ef4444;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
    }
    
    /* --- Styles untuk Detail Modal --- */
    .detail-header {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 24px;
        padding-bottom: 16px;
        border-bottom: 1px solid #f1f5f9;
    }
    .detail-image {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        object-fit: cover;
        border: 2px solid #e2e8f0;
    }
    .detail-title {
        margin: 0;
        color: #1e293b;
        font-size: 1.25rem;
        font-weight: 700;
    }
    .detail-subtitle {
        margin: 4px 0 0;
        color: #64748b;
        font-size: 0.9rem;
    }
    .visi-misi-content {
        background-color: #f8fafc;
        padding: 16px;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
        max-height: 300px;
        overflow-y: auto;
    }
    .visi-misi-text {
        margin: 0;
        white-space: pre-wrap;
        color: #334155;
        line-height: 1.6;
    }
    
    /* --- Toast Notification --- */
    .toast-notification {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background-color: #1e293b;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 3000;
        font-size: 0.9rem;
        font-weight: 500;
        animation: slideUp 0.3s ease-out;
    }
    @keyframes slideUp {
        from { transform: translate(-50%, 100%); opacity: 0; }
        to { transform: translate(-50%, 0); opacity: 1; }
    }

    /* --- Tampilan Desktop (Responsif) --- */
    @media (min-width: 768px) {
        .page-header { 
            flex-direction: row; 
            align-items: center; 
        }
        .button-primary { width: auto; }
        .button-primary-disabled { width: auto; }
        .modal-form-grid {
            flex-direction: row;
        }
        .kandidat-actions {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
        }
        .button-fluid { width: auto; }
        .button-margin-bottom { margin-bottom: 0; }
        .card-inline-actions {
            width: auto;
        }
        .button-edit-text, .button-delete-text {
            padding: 8px;
        }
    }
    
    /* Batasi lebar maksimum dan pusatkan */
    @media (min-width: 1024px) {
        .dashboard-container {
            max-width: 1300px; 
            margin: 0 auto; 
        }
        .summary-page {
            padding: 40px 24px; 
        }
    }
    
    /* Solusi untuk ruang kosong: Beri padding bawah yang cukup dan tambahkan spacer */
    .spacer-bottom {
        min-height: 40px; /* Tambahkan sedikit ruang kosong jika konten terlalu sedikit */
        width: 100%;
    }
`;
document.head.appendChild(styleSheet);


export default PanitiaKelolaKandidat;