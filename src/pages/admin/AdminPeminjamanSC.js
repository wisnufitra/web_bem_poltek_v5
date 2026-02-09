// src/pages/admin/AdminPeminjamanSC.js

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'; // <-- Tambahkan useRef
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../layouts/AdminLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { db } from '../../firebase/firebaseConfig';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, arrayUnion, arrayRemove, query, orderBy } from 'firebase/firestore';
import { Trash2, PlusCircle, AlertCircle, Search, SlidersHorizontal, GripVertical, Save, X, Edit, Camera, Clock, Calendar, Phone, FileText, Projector, CheckCircle } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import './AdminPeminjamanSC.css';

const formatTimestamp = (timestamp) => {
    if (!timestamp) return '-'; // Jika data tidak ada, tampilkan strip
    const date = timestamp.toDate();
    return date.toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    }).replace(/\./g, ':'); // Mengganti format jam 14.30 menjadi 14:30
};
// -----

// --- Komponen Modal untuk Pratinjau Foto (Disederhanakan) ---
const PhotoViewerModal = ({ isOpen, onClose, photoData, title }) => {
    if (!isOpen) return null;
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content photo-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{title}</h2>
                    <button onClick={onClose} className="close-btn"><X size={24}/></button>
                </div>
                <div className="modal-body photo-body">
                    {photoData ? (
                        <img src={photoData} alt={title} />
                    ) : (
                        <p>Foto tidak tersedia.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Komponen Modal Editor Field ---
const FieldEditorModal = ({ isOpen, onClose, onSave, fieldData, setFieldData, isEditing }) => {
    if (!isOpen) return null;
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (name === 'id') {
            setFieldData(prev => ({ ...prev, id: value.replace(/\s/g, '') }));
        } else {
            setFieldData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        }
    };
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{isEditing ? 'Ubah Isian Formulir' : 'Tambah Isian Formulir Baru'}</h2>
                    <button onClick={onClose} className="close-btn"><X size={24}/></button>
                </div>
                <div className="modal-body">
                    <div className="form-group"><label>ID Field (unik, tanpa spasi)</label><input type="text" name="id" value={fieldData.id || ''} onChange={handleChange} disabled={isEditing} />{isEditing && <small className="input-hint">ID tidak dapat diubah setelah dibuat.</small>}</div>
                    <div className="form-group"><label>Label Tampilan</label><input type="text" name="label" value={fieldData.label || ''} onChange={handleChange} /></div>
                    <div className="form-group"><label>Tipe Input</label><select name="type" value={fieldData.type || 'text'} onChange={handleChange}><option value="text">Teks Singkat</option><option value="textarea">Teks Panjang</option><option value="date">Tanggal</option><option value="time">Waktu</option><option value="select">Pilihan (Dropdown)</option></select></div>
                    <div className="form-group"><label>Placeholder (opsional)</label><input type="text" name="placeholder" value={fieldData.placeholder || ''} onChange={handleChange} /></div>
                    <div className="form-group-checkbox"><input type="checkbox" name="required" id="required-check" checked={fieldData.required || false} onChange={handleChange} /><label htmlFor="required-check">Wajib diisi?</label></div>
                </div>
                <div className="modal-footer"><button onClick={onClose} className="button-secondary">Batal</button><button onClick={onSave} className="button-primary"><Save size={16}/> Simpan</button></div>
            </div>
        </div>
    );
};

// --- Komponen Modal untuk Mengedit Peminjaman ---
const BookingEditorModal = ({ isOpen, onClose, bookingData, onSave, locations, formFields }) => {
    const [localData, setLocalData] = useState(null);

    useEffect(() => {
        setLocalData(bookingData);
    }, [bookingData]);

    const handleChange = (e) => {
        setLocalData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // Gunakan renderFormField yang sama dari FormPeminjamanSC
    const renderFormField = useCallback((field) => {
        const commonProps = {
            id: field.id,
            name: field.id,
            value: localData[field.id] || '',
            onChange: handleChange,
            required: field.required,
            placeholder: field.placeholder || '',
        };
        switch (field.type) {
            case 'text': return <input type="text" {...commonProps} />;
            case 'textarea': return <textarea rows="3" {...commonProps}></textarea>;
            case 'date': return <input type="date" {...commonProps} />;
            case 'time': return <input type="time" {...commonProps} />;
            case 'select': return (
                <select {...commonProps}>
                    <option value="" disabled>-- Pilih Lokasi --</option>
                    {locations.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
            );
            default: return null;
        }
    }, [localData, locations, handleChange]);

    if (!isOpen || !localData) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Ubah Detail Peminjaman #{localData.ticketCode}</h2>
                    <button onClick={onClose} className="close-btn"><X size={24}/></button>
                </div>
                <div className="modal-body">
                    {/* Render formulir secara dinamis berdasarkan formFields */}
                    {formFields.map(field => (
                        <div key={field.id} className="form-group">
                            <label htmlFor={field.id}>{field.label}</label>
                            {renderFormField(field)}
                        </div>
                    ))}
                </div>
                <div className="modal-footer">
                    <button onClick={onClose} className="button-secondary">Batal</button>
                    <button onClick={() => onSave(localData)} className="button-primary"><Save size={16}/> Simpan Perubahan</button>
                </div>
            </div>
        </div>
    );
};

// --- Komponen Kartu Statistik ---
const StatCard = ({ icon, label, value, color }) => (
    <div className={`stat-card ${color}`}><div className="stat-icon">{icon}</div><div className="stat-info"><span className="stat-label">{label}</span><span className="stat-value">{value}</span></div></div>
);

// --- Komponen Modal Konfirmasi ---
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText, confirmType = 'danger' }) => {
    if (!isOpen) return null;
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content confirmation-modal" onClick={e => e.stopPropagation()}>
                <div className={`confirmation-icon ${confirmType}`}>
                    <AlertCircle size={48} />
                </div>
                <h2 className="confirmation-title">{title}</h2>
                <p className="confirmation-message">{message}</p>
                <div className="modal-footer">
                    <button onClick={onClose} className="button-secondary">Batal</button>
                    <button onClick={onConfirm} className={`button button-${confirmType}`}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

const NarahubungEditor = ({ configData, setConfigData, onSave, showNotification }) => { // <-- Tambah showNotification
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        const success = await onSave(configData); // <-- Tangkap status sukses/gagal
        setLoading(false);
        if (success) { // <-- Cek jika sukses
            showNotification('Info narahubung berhasil disimpan!'); // <-- Ganti alert()
        }
    };

    return (
        // Tambahkan className 'narahubung-editor'
        <div className="admin-card narahubung-editor"> 
            <h2><Phone size={20} /> Kelola Narahubung WA</h2>
            <p className="card-subtitle">Atur kontak yang akan muncul di tombol bantuan halaman peminjaman.</p>
            
            <div className="form-group">
                <label htmlFor="narahubungNama">Nama Narahubung</label>
                <div> {/* Tambahkan <div> wrapper */}
                    <input
                        type="text"
                        id="narahubungNama"
                        value={configData.narahubungNama || ''}
                        onChange={(e) => setConfigData(prev => ({ ...prev, narahubungNama: e.target.value }))}
                        placeholder="cth: Misbah"
                        className="form-input"
                    />
                </div>
            </div>
            <div className="form-group">
                <label htmlFor="narahubungNomor">Nomor WhatsApp</label>
                <div> {/* Tambahkan <div> wrapper */}
                    <input
                        type="text"
                        id="narahubungNomor"
                        value={configData.narahubungNomor || ''}
                        onChange={(e) => setConfigData(prev => ({ ...prev, narahubungNomor: e.target.value }))}
                        placeholder="cth: 62813..."
                        className="form-input"
                    />
                    <small className="input-hint">Gunakan format internasional tanpa tanda tambah (+), contoh: 628123456789</small>
                </div>
            </div>
            {/* Tambahkan className 'textarea-group' */}
            <div className="form-group textarea-group"> 
                <label htmlFor="narahubungTemplate">Templat Pesan Otomatis</label>
                <textarea
                    id="narahubungTemplate"
                    value={configData.narahubungTemplate || ''}
                    onChange={(e) => setConfigData(prev => ({ ...prev, narahubungTemplate: e.target.value }))}
                    className="form-input"
                    rows="3"
                />
            </div>
            
            <div className="modal-footer">
                <button onClick={handleSave} className="button-primary" disabled={loading}>
                    {loading ? 'Menyimpan...' : <><Save size={16}/> Simpan Info Kontak</>}
                </button>
            </div>
        </div>
    );
};
// ------------------------------------------------

const SKEditor = ({ configData, setConfigData, onSave, showNotification }) => { // <-- Tambah showNotification
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        const success = await onSave(configData); // <-- Tangkap status sukses/gagal
        setLoading(false);
        if (success) { // <-- Cek jika sukses
            showNotification('Syarat & Ketentuan berhasil disimpan!'); // <-- Ganti alert()
        }
    };

    return (
        <div className="admin-card sk-editor">
            <h2><FileText size={20} /> Kelola Info & S&K Peminjaman</h2>
            <p className="card-subtitle">Atur teks yang akan muncul pada pop-up informasi dan formulir persetujuan.</p>
            
            <div className="form-group">
                <label>Judul Informasi Awal</label>
                <input
                    type="text"
                    value={configData.infoJudul || ''}
                    onChange={(e) => setConfigData(prev => ({ ...prev, infoJudul: e.target.value }))}
                    className="form-input"
                />
            </div>
            <div className="form-group">
                <label>Konten Informasi Awal</label>
                <textarea
                    value={configData.infoKonten || ''}
                    onChange={(e) => setConfigData(prev => ({ ...prev, infoKonten: e.target.value }))}
                    className="form-input"
                    rows="5"
                />
            </div>
            
            <div className="divider"></div>

            <div className="form-group">
                <label>Judul Prosedur</label>
                <input
                    type="text"
                    value={configData.prosedurJudul || ''}
                    onChange={(e) => setConfigData(prev => ({ ...prev, prosedurJudul: e.target.value }))}
                    className="form-input"
                />
            </div>
            <div className="form-group">
                <label>Konten Prosedur (Gunakan angka untuk daftar)</label>
                <textarea
                    value={configData.prosedurKonten || ''}
                    onChange={(e) => setConfigData(prev => ({ ...prev, prosedurKonten: e.target.value }))}
                    className="form-input"
                    rows="5"
                />
            </div>
            
            <div className="divider"></div>

            <div className="form-group">
                <label>Pertanyaan Persetujuan Prosedur</label>
                <input
                    type="text"
                    value={configData.pertanyaanSetuju || ''}
                    onChange={(e) => setConfigData(prev => ({ ...prev, pertanyaanSetuju: e.target.value }))}
                    className="form-input"
                />
            </div>
            <div className="form-group">
                <label>Pertanyaan Tanggung Jawab</label>
                <input
                    type="text"
                    value={configData.pertanyaanTanggungJawab || ''}
                    onChange={(e) => setConfigData(prev => ({ ...prev, pertanyaanTanggungJawab: e.target.value }))}
                    className="form-input"
                />
            </div>
            
            <div className="modal-footer">
                <button onClick={handleSave} className="button-primary" disabled={loading}>
                    {loading ? 'Menyimpan...' : <><Save size={16}/> Simpan S&K</>}
                </button>
            </div>
        </div>
    );
};

// --- Komponen Utama Dasbor Admin ---
const AdminPeminjamanSC = () => {
    const { profil } = useAdmin();
    const navigate = useNavigate();
    const [bookings, setBookings] = useState([]);
    const [locations, setLocations] = useState([]);
    const [formFields, setFormFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('bookings');
    const [filters, setFilters] = useState({ searchTerm: '', location: 'Semua', startDate: '', endDate: '' });
    const [sortBy, setSortBy] = useState('createdAt_desc');
    const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
    const [editingField, setEditingField] = useState(null);
    const [fieldData, setFieldData] = useState({});
    const [isOrderChanged, setIsOrderChanged] = useState(false);
    const [photoModal, setPhotoModal] = useState({ isOpen: false, data: null, title: '' });
    const [stats, setStats] = useState({ today: 0, active: 0, overdue: 0 });
    const [overdueBookings, setOverdueBookings] = useState([]);
    const [newLocation, setNewLocation] = useState('');
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [currentBooking, setCurrentBooking] = useState(null);
    const [confirmation, setConfirmation] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
    const [notification, setNotification] = useState({ show: false, message: '', type: 'success', closing: false });
    const notificationTimerRef = useRef(null);

    const [configData, setConfigData] = useState({
        narahubungNama: '',
        narahubungNomor: '',
        narahubungTemplate: '',
        infoJudul: '',
        infoKonten: '',
        prosedurJudul: '',
        prosedurKonten: '',
        pertanyaanSetuju: '',
        pertanyaanTanggungJawab: '',
        pertanyaanProyektor: '', // <-- TAMBAHKAN INI
        infoProyektor: ''         // <-- DAN INI
    });

    const handleCloseNotification = useCallback(() => {
        // Hapus timer utama jika ada (misal, jika ditutup manual)
        if (notificationTimerRef.current) {
            clearTimeout(notificationTimerRef.current);
            notificationTimerRef.current = null;
        }

        // 1. Memicu animasi 'closing'
        setNotification(prev => ({ ...prev, closing: true }));

        // 2. Set timer untuk menghapus elemen dari DOM setelah animasi selesai
        // Durasinya harus SAMA dengan 'animation-duration' di CSS (misal 0.5s)
        setTimeout(() => {
            setNotification({ show: false, message: '', type: 'success', closing: false });
        }, 500); // 500ms (sesuaikan dengan CSS Anda nanti)
    }, []); // useCallback agar stabil

    const showNotification = (message, type = 'success') => {
        // Hapus timer notifikasi sebelumnya jika ada
        if (notificationTimerRef.current) {
            clearTimeout(notificationTimerRef.current);
        }

        // Tampilkan notifikasi baru (pastikan 'closing' di-reset ke false)
        setNotification({ show: true, message, type, closing: false }); 

        // Set timer untuk auto-close menggunakan fungsi yang baru
        notificationTimerRef.current = setTimeout(handleCloseNotification, 3000);
    };

    useEffect(() => {
        if (!profil) return;
        const isMaster = profil.role === 'master';
        const isKemenpora = profil.kementerian === 'Kementerian Pemuda dan Olahraga (PORA)';
        if (!isMaster && !isKemenpora) {
            showNotification('Anda tidak memiliki hak akses untuk halaman ini.', 'error');
            navigate('/admin');
            return;
        }

        const unsubscribers = [];
        const bookingsQuery = query(collection(db, "peminjamanSC"), orderBy("createdAt", "desc"));
        unsubscribers.push(onSnapshot(bookingsQuery, snapshot => {
            const allBookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setBookings(allBookings);
            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];
            let todayCount = 0, activeCount = 0;
            const overdue = [];
            allBookings.forEach(booking => {
                if (booking.tanggal === todayStr) todayCount++;
                if (booking.status === 'aktif') activeCount++;
                const eventEndTime = new Date(`${booking.tanggal}T${booking.waktuSelesai}`);
                if (booking.status === 'aktif' && booking.waktuMulaiAktual && !booking.waktuSelesaiAktual && now > eventEndTime) {
                    overdue.push(booking);
                }
            });
            setStats({ today: todayCount, active: activeCount, overdue: overdue.length });
            setOverdueBookings(overdue);
            setLoading(false);
        }));
        
        const locationRef = doc(db, "pengaturan", "lokasiPeminjaman");
        unsubscribers.push(onSnapshot(locationRef, (doc) => { if (doc.exists()) setLocations(doc.data().options?.sort() || []); }));
        const formConfigRef = doc(db, "pengaturan", "formPeminjamanConfig");
        unsubscribers.push(onSnapshot(formConfigRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                const fields = data.fields || [];
                setFormFields(fields.sort((a, b) => a.order - b.order));
                
                // Muat SEMUA data ke state, beri nilai default '' untuk mencegah 'undefined'
                setConfigData({
                    narahubungNama: data.narahubungNama || '',
                    narahubungNomor: data.narahubungNomor || '',
                    narahubungTemplate: data.narahubungTemplate || '',
                    infoJudul: data.infoJudul || '',
                    infoKonten: data.infoKonten || '',
                    prosedurJudul: data.prosedurJudul || '',
                    prosedurKonten: data.prosedurKonten || '',
                    pertanyaanSetuju: data.pertanyaanSetuju || '',
                    pertanyaanTanggungJawab: data.pertanyaanTanggungJawab || '',
                    pertanyaanProyektor: data.pertanyaanProyektor || '', // <-- TAMBAHKAN INI
                    infoProyektor: data.infoProyektor || '' // <-- DAN INI
                });
            } else {
                // Jika dokumen config tidak ada, set state loading menjadi false
                setLoading(false);
            }
        }));
        
        return () => unsubscribers.forEach(unsub => unsub());
    }, [profil, navigate]);

    const processedBookings = useMemo(() => {
        let filtered = bookings.filter(booking => 
            (filters.searchTerm.toLowerCase() === '' || booking.nama.toLowerCase().includes(filters.searchTerm.toLowerCase()) || booking.organisasi.toLowerCase().includes(filters.searchTerm.toLowerCase())) &&
            (filters.location === 'Semua' || booking.lokasi === filters.location) &&
            (!filters.startDate || booking.tanggal >= filters.startDate) &&
            (!filters.endDate || booking.tanggal <= filters.endDate)
        );
        switch (sortBy) {
            case 'tanggal_desc': filtered.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal)); break;
            case 'tanggal_asc': filtered.sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal)); break;
            default: filtered.sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0)); break;
        }
        return filtered;
    }, [bookings, filters, sortBy]);

    const calculateDuration = (start, end) => {
        if (!start || !end) return '-';
        const duration = (end.toDate() - start.toDate()) / 1000;
        const hours = Math.floor(duration / 3600);
        const minutes = Math.floor((duration % 3600) / 60);
        return `${hours}j ${minutes}m`;
    };

    const handleConfirmAction = () => {
        if (confirmation.onConfirm) {
            confirmation.onConfirm();
        }
        setConfirmation({ isOpen: false });
    };

    const handleAddLocation = async () => {
        if (!newLocation.trim()) return;
        const locationRef = doc(db, "pengaturan", "lokasiPeminjaman");
        await updateDoc(locationRef, { options: arrayUnion(newLocation.trim()) });
        setNewLocation('');
    };

    const handleRemoveLocation = (locationToRemove) => {
        setConfirmation({
            isOpen: true, title: 'Konfirmasi Hapus Lokasi',
            message: `Anda yakin ingin menghapus lokasi "${locationToRemove}"?`,
            confirmText: 'Ya, Hapus', confirmType: 'danger',
            onConfirm: async () => {
                const locationRef = doc(db, "pengaturan", "lokasiPeminjaman");
                await updateDoc(locationRef, { options: arrayRemove(locationToRemove) });
            }
        });
    };
    
    const openModalForAdd = () => {
        setEditingField(null);
        setFieldData({ id: '', label: '', type: 'text', required: false, placeholder: '' });
        setIsFieldModalOpen(true);
    };

    const openModalForEdit = (field) => {
        setEditingField(field);
        setFieldData(field);
        setIsFieldModalOpen(true);
    };

    const handleSaveField = async () => {
        if (!fieldData.id || !fieldData.label) { showNotification("ID dan Label Field tidak boleh kosong.", "error"); return; }
        const formConfigRef = doc(db, "pengaturan", "formPeminjamanConfig");
        if (editingField) {
            const updatedFields = formFields.map(f => f.id === editingField.id ? { ...fieldData } : f);
            await updateDoc(formConfigRef, { fields: updatedFields });
        } else {
            await updateDoc(formConfigRef, { fields: arrayUnion({ ...fieldData, order: formFields.length + 1 }) });
        }
        setIsFieldModalOpen(false);
        showNotification(editingField ? 'Isian formulir berhasil diubah!' : 'Isian baru berhasil ditambah!'); // <-- TAMBAHAN
    };

    const handleRemoveField = (fieldToRemove) => {
        setConfirmation({
            isOpen: true, title: 'Konfirmasi Hapus Isian',
            message: `Yakin ingin menghapus isian "${fieldToRemove.label}"?`,
            confirmText: 'Ya, Hapus', confirmType: 'danger',
            onConfirm: async () => {
                const formConfigRef = doc(db, "pengaturan", "formPeminjamanConfig");
                await updateDoc(formConfigRef, { fields: arrayRemove(fieldToRemove) });
            }
        });
    };

    const onDragEnd = (result) => {
        if (!result.destination) return;
        const items = Array.from(formFields);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        const updatedFields = items.map((field, index) => ({ ...field, order: index + 1 }));
        setFormFields(updatedFields);
        setIsOrderChanged(true);
    };

    const handleSaveOrder = async () => {
        const formConfigRef = doc(db, "pengaturan", "formPeminjamanConfig");
        await updateDoc(formConfigRef, { fields: formFields });
        showNotification('Urutan berhasil disimpan!');
        setIsOrderChanged(false);
    };

    const handleOpenEditModal = (booking) => {
        setCurrentBooking(booking);
        setIsBookingModalOpen(true);
    };

    const handleUpdateBooking = async (updatedData) => {
        const docRef = doc(db, "peminjamanSC", updatedData.id);
        try {
            // Kita tidak perlu menyebutkan setiap field lagi.
            // Kita simpan saja seluruh objek 'updatedData'.
            // Hapus field 'id' agar tidak tersimpan kembali di dalam dokumen.
            const { id, ...dataToSave } = updatedData;
            await updateDoc(docRef, dataToSave);
            
            showNotification('Data peminjaman berhasil diperbarui!');
        } catch (error) {
            console.error("Gagal memperbarui peminjaman:", error);
            showNotification("Gagal memperbarui data.", "error");
        } finally { 
            setIsBookingModalOpen(false);
        }
    };

    const handleCancelBooking = (bookingId) => {
        setConfirmation({
            isOpen: true, title: 'Konfirmasi Pembatalan',
            message: 'Anda yakin ingin mengubah status peminjaman ini menjadi "dibatalkan"?',
            confirmText: 'Ya, Batalkan', confirmType: 'warning',
            onConfirm: async () => {
                const bookingRef = doc(db, "peminjamanSC", bookingId);
                await updateDoc(bookingRef, { status: 'dibatalkan' });
            }
        });
    };

    const handleDeleteBooking = (bookingId) => {
        setConfirmation({
            isOpen: true, title: 'Konfirmasi Hapus Permanen',
            message: 'PERINGATAN: Aksi ini tidak dapat diurungkan. Anda akan MENGHAPUS PERMANEN data peminjaman ini. Lanjutkan?',
            confirmText: 'Ya, Hapus Permanen', confirmType: 'danger',
            onConfirm: async () => {
                const bookingRef = doc(db, "peminjamanSC", bookingId);
                await deleteDoc(bookingRef);
            }
        });
    };

    const handleSaveConfig = async (newConfigData) => {
        const configRef = doc(db, "pengaturan", "formPeminjamanConfig");
        try {
            // Hanya update field yang relevan (bukan 'fields' atau 'options')
            await updateDoc(configRef, {
                narahubungNama: newConfigData.narahubungNama,
                narahubungNomor: newConfigData.narahubungNomor,
                narahubungTemplate: newConfigData.narahubungTemplate,
                infoJudul: newConfigData.infoJudul,
                infoKonten: newConfigData.infoKonten,
                prosedurJudul: newConfigData.prosedurJudul,
                prosedurKonten: newConfigData.prosedurKonten,
                pertanyaanSetuju: newConfigData.pertanyaanSetuju,
                pertanyaanTanggungJawab: newConfigData.pertanyaanTanggungJawab,
                pertanyaanProyektor: newConfigData.pertanyaanProyektor,
                infoProyektor: newConfigData.infoProyektor
            });
            return true; // <-- Beri tahu sukses
        } catch (error) {
            console.error("Gagal menyimpan konfigurasi:", error);
            showNotification(`Gagal menyimpan: ${error.message}`, "error"); // <-- Tampilkan notifikasi error di sini
            return false; // <-- Beri tahu gagal
        }
    };

    if (!profil || loading) {
        return <LoadingSpinner />;
    }

    const NotificationIcon = ({ type }) => {
        const style = { marginRight: '10px', flexShrink: 0 };
        if (type === 'error') {
            return <AlertCircle size={22} style={style} />;
        }
        return <CheckCircle size={22} style={style} />;
    };

    return (
    <div className="admin-peminjaman-container">
        {notification.show && (
            <div className={`notification-popup ${notification.type} ${notification.closing ? 'closing' : ''}`}>
                <NotificationIcon type={notification.type} />
                <span>{notification.message}</span>
                <button onClick={handleCloseNotification} className="notification-close-btn">
                    <X size={18}/>
                </button>
            </div>
        )}
        <div className="admin-header"><h1>Dasbor Peminjaman</h1><p>Pantau, kelola, dan atur semua aktivitas peminjaman fasilitas.</p></div>
            <div className="stats-container">
                <StatCard icon={<Calendar size={24}/>} label="Jadwal Hari Ini" value={stats.today} color="blue" />
                <StatCard icon={<Clock size={24}/>} label="Peminjaman Aktif" value={stats.active} color="green" />
                <StatCard icon={<AlertCircle size={24}/>} label="Keterlambatan" value={stats.overdue} color="red" />
            </div>
            <div className="admin-tabs"><button onClick={() => setActiveTab('bookings')} className={`tab-button ${activeTab === 'bookings' ? 'active' : ''}`}>Daftar Peminjaman</button><button onClick={() => setActiveTab('settings')} className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}>Pengaturan</button></div>

            {activeTab === 'bookings' && (
                <>
                    {overdueBookings.length > 0 && (
                        <div className="admin-card alert-card">
                            <h2><AlertCircle size={20}/> Peringatan Keterlambatan Check-out</h2>
                            <p className="card-subtitle">Peminjaman berikut telah melewati jadwal selesai tetapi belum melakukan check-out.</p>
                            <ul className="alert-list">{overdueBookings.map(b => (<li key={b.id}><strong>{b.organisasi}</strong> ({b.lokasi}) - seharusnya selesai pukul {b.waktuSelesai}</li>))}</ul>
                        </div>
                    )}
                    <div className="admin-card">
                        <h2>Daftar Semua Peminjaman ({processedBookings.length})</h2>
                        <div className="filter-bar">
                            <div className="filter-group search"><Search size={18} /><input type="text" placeholder="Cari nama atau organisasi..." value={filters.searchTerm} onChange={e => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))} /></div>
                            <div className="filter-group location"><SlidersHorizontal size={18} /><select value={filters.location} onChange={e => setFilters(prev => ({ ...prev, location: e.target.value }))}><option value="Semua">Semua Lokasi</option>{locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}</select></div>
                            <div className="filter-group date"><label>Dari:</label><input type="date" value={filters.startDate} onChange={e => setFilters(prev => ({ ...prev, startDate: e.target.value }))} /></div>
                            <div className="filter-group date"><label>Sampai:</label><input type="date" value={filters.endDate} onChange={e => setFilters(prev => ({ ...prev, endDate: e.target.value }))} /></div>
                            <div className="filter-group sort"><label>Urutkan:</label><select value={sortBy} onChange={e => setSortBy(e.target.value)}><option value="createdAt_desc">Tanggal Dibuat (Terbaru)</option><option value="tanggal_desc">Tanggal Acara (Terbaru)</option><option value="tanggal_asc">Tanggal Acara (Terlama)</option></select></div>
                        </div>
                        <div className="table-wrapper">
                            <table>
                                <thead><tr><th>Tanggal Acara</th><th>Lokasi</th><th>Penanggung Jawab</th><th>Check-in</th><th>Check-out</th><th>Durasi Aktual</th><th>Bukti Foto</th><th>Status</th><th>Aksi</th></tr></thead>
                                <tbody>
                                    {processedBookings.length > 0 ? (
                                        processedBookings.map(booking => (
                                            <tr key={booking.id} className={`status-${booking.status}`}>
                                                <td className="timestamp-cell">{new Date(booking.tanggal + 'T00:00:00').toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})}</td>
                                                <td>{booking.lokasi}</td>
                                                <td>
                                                    {booking.nama} ({booking.organisasi})
                                                    {/* Tampilkan ikon jika pinjamProyektor == 'Ya' */}
                                                    {booking.pinjamProyektor === 'Ya' && (
                                                        <Projector size={16} title="Meminjam Proyektor" className="projector-icon" />
                                                    )}
                                                </td>
                                                <td className="timestamp-cell">{formatTimestamp(booking.waktuMulaiAktual)}</td>
                                                <td className="timestamp-cell">{formatTimestamp(booking.waktuSelesaiAktual)}</td>
                                                <td>{calculateDuration(booking.waktuMulaiAktual, booking.waktuSelesaiAktual)}</td>
                                                <td className="photo-cell cell-center">{booking.fotoAwalBase64 && <button onClick={() => setPhotoModal({ isOpen: true, data: booking.fotoAwalBase64, title: 'Foto Awal' })} className="photo-btn"><Camera size={16}/> Awal</button>}{booking.fotoAkhirBase64 && <button onClick={() => setPhotoModal({ isOpen: true, data: booking.fotoAkhirBase64, title: 'Foto Akhir' })} className="photo-btn"><Camera size={16}/> Akhir</button>}</td>
                                                <td className="status-cell cell-center"><span className="status-badge">{booking.status}</span></td>
                                                <td className="actions-cell cell-center">
                                                    <button onClick={() => handleOpenEditModal(booking)} className="icon-btn edit-btn" title="Ubah Detail"><Edit size={16}/></button>
                                                    {booking.status === 'aktif' && (<button onClick={() => handleCancelBooking(booking.id)} className="icon-btn cancel-btn" title="Batalkan Sesi"><AlertCircle size={16}/></button>)}
                                                    <button onClick={() => handleDeleteBooking(booking.id)} className="icon-btn delete-btn" title="Hapus Permanen"><Trash2 size={16}/></button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : ( <tr><td colSpan="9">Tidak ada data yang cocok.</td></tr> )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'settings' && (
                <div className="settings-grid">
                    <div className="admin-card">
                        <h2>Kelola Lokasi</h2>
                        <p className="card-subtitle">Tambah atau hapus lokasi yang tersedia untuk peminjaman.</p>
                        <div className="location-list">{locations.map(loc => (<div key={loc} className="location-item"><span>{loc}</span><button onClick={() => handleRemoveLocation(loc)} className="delete-btn"><Trash2 size={16}/></button></div>))}</div>
                        <div className="add-location-form"><input type="text" value={newLocation} onChange={(e) => setNewLocation(e.target.value)} placeholder="Nama lokasi baru..." className="form-input" /><button onClick={handleAddLocation} className="button-primary"><PlusCircle size={18}/> Tambah</button></div>
                    </div>
                    <div className="admin-card">
                        <div className="card-header-actions">
                            <div><h2>Kelola Isian Formulir</h2><p className="card-subtitle">Seret untuk mengubah urutan. Klik ikon pensil untuk mengedit.</p></div>
                            <div><button onClick={handleSaveOrder} className="button-secondary" disabled={!isOrderChanged}><Save size={16}/> Simpan Urutan</button><button onClick={openModalForAdd} className="button-primary"><PlusCircle size={16}/> Tambah Isian</button></div>
                        </div>
                        <DragDropContext onDragEnd={onDragEnd}>
                            <Droppable droppableId="fields">
                                {(provided) => (
                                    <div {...provided.droppableProps} ref={provided.innerRef} className="field-list">
                                        {formFields.map((field, index) => (
                                            <Draggable key={field.id} draggableId={field.id} index={index}>
                                                {(provided, snapshot) => (
                                                    <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className={`field-item ${snapshot.isDragging ? 'is-dragging' : ''}`}>
                                                        <GripVertical className="drag-handle"/>
                                                        <div className="field-info"><span>{field.label} {field.required && <span className="required-asterisk">*</span>}</span><small>{field.type} / id: {field.id}</small></div>
                                                        <div className="field-actions"><button onClick={() => openModalForEdit(field)} className="icon-btn edit-btn"><Edit size={16}/></button><button onClick={() => handleRemoveField(field)} className="icon-btn delete-btn"><Trash2 size={16}/></button></div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>
                    </div>
                    <NarahubungEditor
                        configData={configData}
                        setConfigData={setConfigData}
                        onSave={handleSaveConfig}
                        showNotification={showNotification}
                    />
                    <SKEditor
                        configData={configData}
                        setConfigData={setConfigData}
                        onSave={handleSaveConfig}
                        showNotification={showNotification}
                    />
                </div>
            )}
            
            <PhotoViewerModal isOpen={photoModal.isOpen} onClose={() => setPhotoModal({ isOpen: false, data: null, title: '' })} photoData={photoModal.data} title={photoModal.title}/>
            <FieldEditorModal isOpen={isFieldModalOpen} onClose={() => setIsFieldModalOpen(false)} onSave={handleSaveField} fieldData={fieldData} setFieldData={setFieldData} isEditing={!!editingField}/>
            <BookingEditorModal
                isOpen={isBookingModalOpen}
                onClose={() => setIsBookingModalOpen(false)}
                bookingData={currentBooking}
                onSave={handleUpdateBooking}
                locations={locations}
                formFields={formFields} 
            />
            <ConfirmationModal
                isOpen={confirmation.isOpen}
                onClose={() => setConfirmation({ isOpen: false })}
                onConfirm={handleConfirmAction}
                title={confirmation.title}
                message={confirmation.message}
                confirmText={confirmation.confirmText}
                confirmType={confirmation.confirmType}
            />
        </div>
    );
};

export default AdminPeminjamanSC;