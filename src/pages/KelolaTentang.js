import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase/firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { logActivity } from '../utils/logActivity';

// ICON IMPORTS
import { Info, Plus, X, Save, Trash2, GripVertical, ArrowLeft, Mail, Phone, Globe, Instagram, Twitter, Facebook, Smartphone, Link as LinkIcon } from 'lucide-react';

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

const contactIconMap = {
    Email: Mail,
    WhatsApp: Smartphone, // Menggunakan ikon Smartphone sebagai representasi
    Telepon: Phone,
    Instagram: Instagram,
    'X (Twitter)': Twitter,
    Facebook: Facebook,
    Website: Globe,
    Lainnya: LinkIcon, // Pastikan LinkIcon sudah diimpor juga
};

// Komponen helper kecil untuk menampilkan ikon yang benar
const ContactIcon = ({ type }) => {
    const Icon = contactIconMap[type] || Mail; // Default ke ikon Mail jika tidak ditemukan
    return <Icon size={16} />;
};

// --- MAIN COMPONENT ---
const KelolaTentang = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [toastMessage, setToastMessage] = useState('');
    const [sections, setSections] = useState([]);
    const [confirmProps, setConfirmProps] = useState({ show: false });

    const draggedItem = useRef(null);
    const draggedOverItem = useRef(null);

    const docRef = doc(db, 'halaman', 'tentang');

    const titleOptions = [ 'Deskripsi Awal', 'Visi', 'Misi', 'Tujuan', 'Fungsi dan Tugas', 'Sejarah Singkat', 'Kontak Kami', 'Lainnya' ];
    const contactOptions = [ 'Email', 'WhatsApp', 'Telepon', 'Instagram', 'X (Twitter)', 'Facebook', 'Website', 'Lainnya' ];
    const placeholderMap = {
        'Deskripsi Awal': 'Tuliskan paragraf pengenalan singkat tentang BEM...',
        'Visi': 'Tuliskan visi organisasi...',
        'Misi': '- Misi pertama...\n- Misi kedua...',
        'Tujuan': 'Jelaskan tujuan utama BEM...',
        'Kontak Kami': 'Masukkan username, nomor, atau alamat...',
        'default': 'Tuliskan konten untuk bagian ini...'
    };

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, user => {
            if (!user) navigate('/login');
        });

        const fetchData = async () => {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists() && docSnap.data().sections) {
                const sortedSections = docSnap.data().sections.sort((a, b) => (a.urutan || 0) - (b.urutan || 0));
                setSections(sortedSections);
            } else {
                setSections([{ id: Date.now(), judul: 'Deskripsi Awal', isi: '', contactType: 'Email', urutan: 0 }]);
            }
            setLoading(false);
        };

        fetchData();
        return () => unsubscribeAuth();
    }, [navigate]);

    const handleInputChange = (id, field, value) => {
        setSections(prevSections => 
            prevSections.map(section => 
                section.id === id ? { ...section, [field]: value } : section
            )
        );
    };

    const handleTambahBagian = () => {
        const urutanBaru = sections.length > 0 ? Math.max(...sections.map(s => s.urutan || 0)) + 1 : 0;
        setSections(prev => [...prev, { id: Date.now(), judul: '', isi: '', contactType: 'Email', urutan: urutanBaru }]);
    };

    const handleHapusBagian = (id, judul) => {
        setConfirmProps({
            show: true,
            message: `Yakin ingin menghapus bagian "${judul || 'tanpa judul'}"?`,
            onConfirm: () => {
                setSections(prev => prev.filter(section => section.id !== id));
                setConfirmProps({ show: false });
            }
        });
    };

    const handleSimpan = async (e) => {
        e.preventDefault();
        setToastMessage('Menyimpan...');
        try {
            const sectionsToSave = sections.map((section, index) => ({ ...section, urutan: index }));
            await setDoc(docRef, { sections: sectionsToSave });
            await logActivity('Memperbarui halaman "Tentang BEM"');
            setToastMessage('Halaman "Tentang" berhasil diperbarui!');
        } catch (error) {
            console.error("Error updating page:", error);
            setToastMessage('Gagal memperbarui halaman.');
        }
    };

    const handleSort = () => {
        if (draggedItem.current === null || draggedOverItem.current === null) return;
        const sectionsClone = [...sections];
        const temp = sectionsClone.splice(draggedItem.current, 1)[0];
        sectionsClone.splice(draggedOverItem.current, 0, temp);
        setSections(sectionsClone);
        draggedItem.current = null;
        draggedOverItem.current = null;
    };
    
    useEffect(() => {
        document.head.appendChild(styleSheet);
        return () => { document.head.removeChild(styleSheet); };
    }, []);

    if (loading) return <p style={{ textAlign: 'center', marginTop: '40px' }}>Memuat editor...</p>;

    return (
        <div className="admin-page">
            <ConfirmationModal modalState={confirmProps} setModalState={setConfirmProps} />
            {toastMessage && <Toast message={toastMessage} clear={() => setToastMessage('')} />}

            <header className="page-header">
                <div>
                    <h1 className="page-title">Kelola Halaman "Tentang"</h1>
                    <p className="page-subtitle">Atur, tambah, dan urutkan setiap bagian konten di halaman "Tentang".</p>
                </div>
            </header>
            
            <form onSubmit={handleSimpan}>
                <datalist id="title-options-list">
                    {titleOptions.map(option => <option key={option} value={option} />)}
                </datalist>

                <div className="section-list">
                    {sections.map((section, index) => (
                        <div key={section.id} className="card draggable-section" draggable 
                            onDragStart={() => (draggedItem.current = index)}
                            onDragEnter={() => (draggedOverItem.current = index)}
                            onDragEnd={handleSort} onDragOver={(e) => e.preventDefault()}>
                            
                            <div className="section-header">
                                <GripVertical size={20} className="drag-handle"/>
                                <input
                                    type="text"
                                    list="title-options-list"
                                    value={section.judul}
                                    onChange={(e) => handleInputChange(section.id, 'judul', e.target.value)}
                                    className="input title-input"
                                    placeholder="Masukkan Judul Bagian"
                                />
                                <button type="button" onClick={() => handleHapusBagian(section.id, section.judul)} className="button-icon danger">
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div className="section-content">
                                {section.judul === 'Kontak Kami' ? (
                                    <div className="contact-input-group">
                                        <select 
                                            value={section.contactType} 
                                            onChange={(e) => handleInputChange(section.id, 'contactType', e.target.value)} 
                                            className="input contact-type-select"
                                        >
                                            {contactOptions.map(option => <option key={option} value={option}>{option}</option>)}
                                        </select>
                                        <div className="input-with-icon" style={{flexGrow: 1}}>
                                            <ContactIcon type={section.contactType} />
                                            <input 
                                                value={section.isi} 
                                                onChange={(e) => handleInputChange(section.id, 'isi', e.target.value)} 
                                                className="input" 
                                                placeholder={placeholderMap[section.judul] || placeholderMap.default}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <textarea 
                                        value={section.isi} 
                                        onChange={(e) => handleInputChange(section.id, 'isi', e.target.value)} 
                                        className="input"
                                        rows="5"
                                        placeholder={placeholderMap[section.judul] || placeholderMap.default}
                                    ></textarea>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="action-footer">
                    <button type="button" onClick={handleTambahBagian} className="button button-secondary">
                        <Plus size={16}/> Tambah Bagian
                    </button>
                    <button type="submit" className="button button-success">
                        <Save size={16}/> Simpan Semua Perubahan
                    </button>
                </div>
            </form>
            
            <button onClick={() => navigate("/admin")} className="button button-secondary" style={{width: '100%', marginTop: '24px'}}>
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
    .card { background-color: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .input { display: block; width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid #cbd5e0; font-size: 1rem; background-color: #fff; }
    .input:focus { border-color: #3b82f6; outline: none; }
    .input-with-icon { position: relative; display: flex; align-items: center; } 
    .input-with-icon svg { position: absolute; left: 12px; color: #9ca3af; pointer-events: none; }
    .input-with-icon .input { padding-left: 40px; }
    .button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.9rem; border: 1px solid transparent; transition: all 0.2s; }
    .button-primary { background-color: #1d4ed8; color: white; } .button-primary:hover { background-color: #1e40af; }
    .button-secondary { background-color: #f1f5f9; color: #475569; border-color: #e2e8f0; } .button-secondary:hover { background-color: #e2e8f0; }
    .button-success { background-color: #16a34a; color: white; } .button-success:hover { background-color: #15803d; }
    .button-danger { background-color: #dc2626; color: white; } .button-danger:hover { background-color: #b91c1c; }
    .button-icon { padding: 8px; border-radius: 50%; border: none; background-color: transparent; color: #64748b; cursor: pointer; }
    .button-icon:hover { background-color: #f1f5f9; }
    .button-icon.danger:hover { background-color: #fee2e2; color: #dc2626; }
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(15,23,42,0.6); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .modal-content { background-color: white; padding: 24px; border-radius: 12px; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; }
    .modal-header h3, .modal-title { font-size: 1.25rem; color: #1e293b; margin: 0; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }
    .modal-content.small-modal { max-width: 400px; text-align: center; }
    .toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background-color: #1e293b; color: white; padding: 12px 24px; border-radius: 8px; z-index: 1001; }
    
    .section-list { display: flex; flex-direction: column; gap: 24px; }
    .draggable-section { padding: 16px; }
    .section-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; }
    .drag-handle { cursor: grab; color: #9ca3af; }
    .title-input { font-weight: 700; font-size: 1.1rem; color: #1e293b; flex-grow: 1; }
    .contact-input-group { display: flex; flex-direction: column; gap: 12px; }
    .action-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 24px; padding-top: 24px; border-top: 1px solid #e2e8f0; }

    @media (min-width: 768px) {
        .page-title { font-size: 2rem; }
        .contact-input-group { flex-direction: row; }
        .contact-type-select { max-width: 180px; }
    }
`;

export default KelolaTentang;