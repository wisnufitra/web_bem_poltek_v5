import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../../firebase/firebaseConfig';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { logActivity } from '../../utils/logActivity';
import html2canvas from 'html2canvas'; 

// --- ICON & LIBRARY IMPORTS ---
import { Box, Plus, X, Save, Trash2, Pencil, ArrowLeft, Eye, EyeOff, QrCode, ArrowRightLeft, UploadCloud, Download, Package, Search, Filter, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { QRCodeSVG } from "qrcode.react";

// --- IMPORT LOKAL LOGO DARI FOLDER ASSETS ---
import logoBem from '../../assets/logo-bem.png';
import logoBrin from '../../assets/logo-brin.png';
import logoPoltek from '../../assets/logo-poltek.png';

// --- IMPORT CSS EKSTERNAL ---
import './AdminAset.css'; 

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

// --- KOMPONEN PEMBANTU ---

const Toast = ({ message, clear }) => {
    useEffect(() => { const timer = setTimeout(clear, 3000); return () => clearTimeout(timer); }, [clear]);
    return <div className="toast">{message}</div>;
};

const ConfirmationModal = ({ modalState, setModalState }) => {
    if (!modalState.show) return null;
    return ( <div className="modal-overlay"><div className="modal-content small-modal"><h3 className="modal-title">{modalState.message}</h3><div className="modal-actions"><button onClick={modalState.onConfirm} className="button button-danger">Ya, Hapus</button><button onClick={() => setModalState({ show: false })} className="button button-secondary">Batal</button></div></div></div> );
};

const EmptyState = ({ text, subtext }) => ( <div className="empty-state"><Box size={48} /><p className="empty-state-text">{text}</p><p className="empty-state-subtext">{subtext}</p></div> );

// Komponen QR Code Modal
const QrCodeModal = ({ data, onClose }) => {
    const printableQrRef = useRef(null); 
    
    if (!data) {
        return null;
    }

    const url = `https://bempolteknuklir.online/keterbukaan-informasi/inventaris/${data.id}`;
    const assetName = data.namaAset;
    const downloadDate = new Date().toLocaleDateString('id-ID', {
        year: 'numeric', month: 'long', day: 'numeric'
    });

    const handleDownload = async () => {
        if (!printableQrRef.current) {
            alert("Elemen QR Code tidak siap untuk diunduh. Coba lagi.");
            return;
        }

        try {
            const canvas = await html2canvas(printableQrRef.current, {
                scale: 3, 
                useCORS: true, 
                backgroundColor: '#FFFFFF',
            });

            const pngUrl = canvas.toDataURL('image/png'); 
            
            const downloadLink = document.createElement('a');
            if (downloadLink.download !== undefined) {
                
                downloadLink.href = pngUrl; 
                
                downloadLink.download = `QR_Aset_Resmi_${data.kodeAset || data.namaAset.replace(/\s/g, '_')}_${new Date().toISOString().slice(0, 10)}.png`;
                downloadLink.style.visibility = 'hidden';
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
            }
        } catch (error) {
            console.error("Gagal mengunduh QR Code dengan frame:", error);
            alert("Gagal mengunduh QR Code. Pastikan Anda menggunakan browser modern."); 
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content small-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>QR Code: {data.namaAset}</h3>
                    <button onClick={onClose} className="close-button"><X size={20}/></button>
                </div>
                <div className="qr-code-container">
                    
                    <div className="qr-preview-simple"> 
                        <QRCodeSVG value={url} size={256} level={"H"} includeMargin={true} />
                    </div>
                    <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>

                    <button onClick={handleDownload} className="button button-primary download-button">
                        <Download size={16}/> Unduh QR Code Resmi
                    </button>
                    <p className="note">Cetak dan tempelkan QR Code ini pada aset fisik.</p>

                    {/* --- Elemen HTML/CSS untuk Frame QR Code yang AKAN DIUNDUH --- */}
                    <div ref={printableQrRef} className="qr-frame-printable">
                        <div className="qr-frame-header">
                            <img src={logoBrin} alt="Logo BRIN" className="logo" />
                            <div className="header-text">
                                <p className="org-name">BEM Poltek Nuklir</p>
                                <p className="poltek-name">Politeknik Teknologi Nuklir Indonesia</p>
                                <p className="brin-name">Badan Riset dan Inovasi Nasional</p>
                            </div>
                            <img src={logoPoltek} alt="Logo Poltek Nuklir" className="logo" />
                        </div>
                        <div className="qr-code-wrapper">
                            <div className="center-logo">
                                <img src={logoBem} alt="Logo BEM" />
                            </div>
                            <QRCodeSVG 
                                value={url} 
                                size={200} 
                                level={"H"} 
                                includeMargin={false}
                                id="printable-qr-svg"
                            />
                        </div>
                        <div className="qr-frame-footer">
                            <p className="asset-code">Kode Aset: {data.kodeAset || '-'}</p>
                            <p className="asset-title">{assetName}</p>
                            <p className="download-info">Scan untuk detail aset. Diunduh: {downloadDate}</p>
                        </div>
                    </div>
                    {/* --- END Elemen HTML/CSS untuk Frame QR Code --- */}
                </div>
            </div>
        </div>
    );
};

// --- KONSTANTA ---
const tipePerolehanOptions = ["Pembelian", "Hibah", "Sponsor", "Lainnya"];
const statusKondisiOptions = ["Baik", "Perlu Perbaikan", "Rusak"];
const statusPinjamOptions = ["Tersedia", "Dipinjam"];
const itemsPerPage = 10;

// --- MAIN COMPONENT ---
const AdminAset = () => {
    const navigate = useNavigate();
    const [assetList, setAssetList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toastMessage, setToastMessage] = useState('');
    const [confirmProps, setConfirmProps] = useState({ show: false });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [qrModalData, setQrModalData] = useState(null);

    // --- STATE FILTER & PAGINASI ---
    const [filters, setFilters] = useState({ 
        search: '', 
        kondisi: 'Semua', 
        peminjaman: 'Semua',
        publik: 'Semua' 
    });
    const [currentPage, setCurrentPage] = useState(1);
    // -------------------------------------

    const initialFormState = {
        namaAset: '', 
        kodeAset: '', 
        tanggalPerolehan: new Date().toISOString().slice(0, 10),
        tipePerolehan: tipePerolehanOptions[0], 
        sumberKeterangan: '', 
        statusKondisi: statusKondisiOptions[0],
        lokasiPenyimpanan: '', 
        isPublic: true, 
        images: [], 
        
        statusPeminjaman: statusPinjamOptions[0], 
        jumlahAset: 1,                           
        dapatDipinjamkan: true,                  
    };
    const [formState, setFormState] = useState(initialFormState);

    // Fetching data dan Auth Check
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, user => { if (!user) navigate('/login'); });
        const qAset = query(collection(db, "inventaris_aset"), orderBy("createdAt", "desc"));
        const unsubAset = onSnapshot(qAset, snapshot => {
            setAssetList(snapshot.docs.map(d => ({ id: d.id, ...d.data(), images: d.data().images || [] })));
            setLoading(false);
        });
        
        return () => { 
            unsubscribeAuth(); 
            unsubAset();
        };
    }, [navigate]);
    
    // Efek untuk mereset halaman saat filter berubah
    useEffect(() => {
        setCurrentPage(1);
    }, [filters]); 

    // Data Dashboard dan Chart (Logika Tetap)
    const dashboardData = useMemo(() => {
        const stats = { total: assetList.length, baik: 0, perbaikan: 0, rusak: 0, tersedia: 0, dipinjam: 0 };
        const locationCounts = {};
        
        assetList.forEach(asset => {
            if (asset.statusKondisi === "Baik") stats.baik++;
            else if (asset.statusKondisi === "Perlu Perbaikan") stats.perbaikan++;
            else if (asset.statusKondisi === "Rusak") stats.rusak++;
            
            if (asset.statusPeminjaman === "Tersedia") stats.tersedia++;
            else if (asset.statusPeminjaman === "Dipinjam") stats.dipinjam++;
            
            const lokasi = asset.lokasiPenyimpanan || 'Tidak Diketahui';
            locationCounts[lokasi] = (locationCounts[lokasi] || 0) + 1;
        });
        
        return {
            stats: stats,
            kondisiChart: { labels: ["Baik", "Perlu Perbaikan", "Rusak"], datasets: [{ data: [stats.baik, stats.perbaikan, stats.rusak], backgroundColor: ['#10b981', '#f97316', '#ef4444'], borderWidth: 0, hoverOffset: 4 }] },
            lokasiChart: { labels: Object.keys(locationCounts), datasets: [{ label: 'Jumlah Aset', data: Object.values(locationCounts), backgroundColor: '#2563eb', borderRadius: 4 }] }
        };
    }, [assetList]);

    // Data yang Difilter
    const filteredAssetList = useMemo(() => {
        const searchTerm = filters.search.toLowerCase();

        return assetList.filter(item => {
            const isSearchMatch = item.namaAset.toLowerCase().includes(searchTerm) || 
                                  (item.kodeAset || '').toLowerCase().includes(searchTerm);
            
            const isKondisiMatch = filters.kondisi === 'Semua' || item.statusKondisi === filters.kondisi;
            
            const isPinjamMatch = filters.peminjaman === 'Semua' || item.statusPeminjaman === filters.peminjaman;

            const isPublikMatch = filters.publik === 'Semua' || 
                                  (filters.publik === 'Ya' && item.isPublic) ||
                                  (filters.publik === 'Tidak' && !item.isPublic);
            
            return isSearchMatch && isKondisiMatch && isPinjamMatch && isPublikMatch;
        });
    }, [assetList, filters]);

    // Data yang Dipaginasi
    const totalPages = Math.ceil(filteredAssetList.length / itemsPerPage);
    const paginatedAssetList = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return filteredAssetList.slice(startIndex, endIndex);
    }, [filteredAssetList, currentPage]);
    
    
    // Handler Form
    const handleFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormState(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    // Handler Gambar (Base64)
    const handleImageUpload = (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                setFormState(prev => ({ ...prev, images: [...(prev.images || []), event.target.result]}));
            }
        });
    };
    const handleRemoveImage = (index) => setFormState(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));

    // Handler CRUD
    const handleSimpan = async (e) => {
        e.preventDefault();
        if (!formState.namaAset) return setToastMessage("Nama Aset wajib diisi.");
        
        // Pastikan jumlahAset adalah angka
        const finalJumlahAset = Number(formState.jumlahAset || 1);
        if (finalJumlahAset < 1) return setToastMessage("Jumlah Aset minimal harus 1.");

        const dataToSave = { 
            ...formState, 
            jumlahAset: finalJumlahAset,
            updatedAt: serverTimestamp() 
        };
        try {
            if (editingId) {
                await updateDoc(doc(db, "inventaris_aset", editingId), dataToSave);
                await logActivity(`Memperbarui aset: "${dataToSave.namaAset}"`);
                setToastMessage('Aset berhasil diperbarui!');
            } else {
                await addDoc(collection(db, "inventaris_aset"), { ...dataToSave, createdAt: serverTimestamp() });
                await logActivity(`Menambahkan aset: "${dataToSave.namaAset}"`);
                setToastMessage('Aset berhasil ditambahkan!');
            }
            closeModal();
        } catch (error) { setToastMessage('Gagal menyimpan: ' + error.message); }
    };

    const handleQuickToggle = async (id, field, currentValue, options) => {
        const docRef = doc(db, "inventaris_aset", id);
        let nextValue;
        if (options) { 
            const currentIndex = options.indexOf(currentValue);
            nextValue = options[(currentIndex + 1) % options.length];
        } else { 
            nextValue = !currentValue;
        }
        try {
            await updateDoc(docRef, { [field]: nextValue, updatedAt: serverTimestamp() });
            setToastMessage("Status berhasil diubah.");
        } catch (error) { setToastMessage("Gagal mengubah status: " + error.message); }
    };
    
    const handleEdit = (item) => { 
        const assetData = { 
            ...item, 
            images: item.images || [],
            jumlahAset: Number(item.jumlahAset || 1), 
            dapatDipinjamkan: item.dapatDipinjamkan !== undefined ? item.dapatDipinjamkan : true 
        };
        setFormState({ ...initialFormState, ...assetData }); 
        setEditingId(item.id); 
        setIsModalOpen(true); 
    };
    
    const handleHapus = (id, nama) => { setConfirmProps({ show: true, message: `Yakin ingin menghapus aset "${nama}"?`, onConfirm: async () => {
        try { await deleteDoc(doc(db, "inventaris_aset", id)); await logActivity(`Menghapus aset: "${nama}"`); setToastMessage('Aset berhasil dihapus!');
        } catch (error) { setToastMessage('Gagal menghapus: ' + error.message); }
        setConfirmProps({ show: false });
    }}); };
    
    const openModalTambah = () => { setEditingId(null); setFormState(initialFormState); setIsModalOpen(true); };
    const closeModal = () => { setIsModalOpen(false); setEditingId(null); };
    
    // Fungsi untuk membuat tombol Pagination 
    const renderPaginationControls = () => {
        if (totalPages <= 1) return null;
        
        const goToPage = (page) => {
            if (page >= 1 && page <= totalPages) {
                setCurrentPage(page);
            }
        };

        const getPageNumbers = () => {
            const pages = [];
            const maxPagesToShow = 5; 
            let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
            let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
            
            if (endPage - startPage < maxPagesToShow - 1) {
                startPage = Math.max(1, endPage - maxPagesToShow + 1);
            }

            for (let i = startPage; i <= endPage; i++) {
                pages.push(i);
            }
            return pages;
        };

        const pageNumbers = getPageNumbers();

        return (
            <div className="pagination-controls">
                <button 
                    onClick={() => goToPage(currentPage - 1)} 
                    disabled={currentPage === 1} 
                    className="button button-secondary button-icon"
                >
                    <ChevronLeft size={16}/> Sebelumnya
                </button>
                
                <div className="page-numbers-group">
                    {pageNumbers.map(number => (
                        <button
                            key={number}
                            className={`pagination-number ${number === currentPage ? 'active' : ''}`}
                            onClick={() => goToPage(number)}
                        >
                            {number}
                        </button>
                    ))}
                </div>
                
                <button 
                    onClick={() => goToPage(currentPage + 1)} 
                    disabled={currentPage === totalPages} 
                    className="button button-secondary button-icon"
                >
                    Berikutnya <ChevronRight size={16}/>
                </button>
            </div>
        );
    };


    return (
        <div className="admin-page">
            <ConfirmationModal modalState={confirmProps} setModalState={setConfirmProps} />
            {toastMessage && <Toast message={toastMessage} clear={() => setToastMessage('')} />}
            <QrCodeModal data={qrModalData} onClose={() => setQrModalData(null)} />

            {/* --- MODAL FORM --- */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content large">
                        <div className="modal-header">
                            <h3>{editingId ? 'Edit Aset' : 'Tambah Aset Baru'}</h3>
                            <button onClick={closeModal} className="close-button"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleSimpan} className="modal-form">
                            <div className="modal-body">
                                {/* SEKSI 1: Informasi Aset */}
                                <div className="form-section">
                                    <h4 className="form-section-title">Informasi Aset</h4>
                                    <div className="form-grid-2-col">
                                        <div className="form-group"><label className="label">Nama Aset</label><input name="namaAset" value={formState.namaAset} onChange={handleFormChange} className="input" placeholder="Contoh: Printer Epson L3210" required /></div>
                                        <div className="form-group"><label className="label">Kode Aset (Opsional)</label><input name="kodeAset" value={formState.kodeAset} onChange={handleFormChange} className="input" placeholder="Contoh: BEM/INV/001" /></div>
                                    </div>
                                    <div className="form-group"><label className="label">Lokasi Penyimpanan</label><input name="lokasiPenyimpanan" value={formState.lokasiPenyimpanan} onChange={handleFormChange} className="input" placeholder="Contoh: Sekretariat BEM" /></div>
                                </div>
                                {/* SEKSI 2: Detail Perolehan & Kondisi */}
                                <div className="form-section">
                                    <h4 className="form-section-title">Detail Perolehan & Kondisi</h4>
                                    <div className="form-grid-2-col">
                                        <div className="form-group"><label className="label">Jumlah Aset (Kuantitas)</label><input name="jumlahAset" type="number" min="1" value={formState.jumlahAset} onChange={handleFormChange} className="input" required /></div>
                                        <div className="form-group"><label className="label">Tanggal Perolehan</label><input name="tanggalPerolehan" type="date" value={formState.tanggalPerolehan} onChange={handleFormChange} className="input" required /></div>
                                    </div>
                                    <div className="form-grid-2-col">
                                        <div className="form-group"><label className="label">Tipe Perolehan</label><select name="tipePerolehan" value={formState.tipePerolehan} onChange={handleFormChange} className="input">{tipePerolehanOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>
                                        <div className="form-group"><label className="label">Status Kondisi</label><select name="statusKondisi" value={formState.statusKondisi} onChange={handleFormChange} className="input">{statusKondisiOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>
                                    </div>
                                    <div className="form-group"><label className="label">Sumber / Keterangan</label><input name="sumberKeterangan" value={formState.sumberKeterangan} onChange={handleFormChange} className="input" placeholder="Contoh: Dana Kemahasiswaan 2024 atau Hibah dari Alumni" /></div>
                                    
                                    {/* KELOMPOK STATUS PINJAMAN (DIPERBAIKI) */}
                                    <div className="form-grid-2-col">
                                        <div className="form-group"><label className="label">Status Peminjaman</label><select name="statusPeminjaman" value={formState.statusPeminjaman} onChange={handleFormChange} className="input">{statusPinjamOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>
                                        
                                        {/* TOGGLE DAPAT DIPINJAMKAN (BARU) */}
                                        <div className="form-group toggle-group" style={{alignSelf: 'flex-end', marginBottom: '0'}}>
                                            <label htmlFor="dapatDipinjamkanToggle">Aset Dapat Dipinjamkan</label>
                                            <div className="toggle-switch">
                                                {/* Hapus checked={...} dan tambahkan value={...} agar handleFormChange lebih mudah memproses */}
                                                <input 
                                                    type="checkbox" 
                                                    id="dapatDipinjamkanToggle" 
                                                    name="dapatDipinjamkan" 
                                                    checked={formState.dapatDipinjamkan} // Biarkan checked untuk visual
                                                    onChange={handleFormChange} // Panggil handler yang sudah benar
                                                />
                                                <span className="slider"></span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* SEKSI 3: Foto & Visibilitas */}
                                <div className="form-section">
                                    <h4 className="form-section-title">Foto & Visibilitas</h4>
                                    <div className="form-group">
                                        <label className="label">Foto Aset</label>
                                        <div className="image-uploader">
                                            <label htmlFor="image-upload-input" className="button button-secondary upload-label"><UploadCloud size={16}/> Unggah Foto</label>
                                            <input id="image-upload-input" type="file" accept="image/*" multiple onChange={handleImageUpload} style={{display: 'none'}} />
                                            <div className="image-preview-grid">
                                                {(formState.images || []).map((img, index) => (
                                                    <div key={index} className="image-preview-item">
                                                        <img src={img} alt={`preview ${index}`} />
                                                        <button type="button" onClick={() => handleRemoveImage(index)}><X size={12}/></button>
                                                    </div>
                                                ))}
                                            </div>
                                            {(formState.images || []).length === 0 && <p className="image-uploader-note">Maksimal 5 foto. Unggah foto terbaik aset.</p>}
                                        </div>
                                    </div>
                                    <div className="form-group toggle-group">
                                        <label htmlFor="isPublicToggle">Tampilkan di Halaman Publik</label>
                                        <div className="toggle-switch">
                                            <input type="checkbox" id="isPublicToggle" name="isPublic" checked={formState.isPublic} onChange={handleFormChange} />
                                            <span className="slider"></span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={closeModal} className="button button-secondary">Batal</button>
                                <button type="submit" className="button button-success"><Save size={16}/> {editingId ? 'Simpan Perubahan' : 'Simpan'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* --- END MODAL FORM --- */}


            <header className="page-header"><div><h1 className="page-title">Dashboard Inventaris Aset</h1><p className="page-subtitle">Kelola, lacak, dan visualisasikan semua aset fisik organisasi.</p></div></header>

            {/* --- STATISTIC CARDS (TIDAK BERUBAH) --- */}
            <div className="stat-card-grid">
                <div className="stat-card"><h4 >Total Aset</h4><p>{dashboardData.stats.total}</p></div>
                <div className="stat-card good"><h4>Kondisi Baik</h4><p>{dashboardData.stats.baik}</p></div>
                <div className="stat-card warning"><h4>Perlu Perbaikan</h4><p>{dashboardData.stats.perbaikan}</p></div>
                <div className="stat-card danger"><h4>Rusak</h4><p>{dashboardData.stats.rusak}</p></div>
                <div className="stat-card primary"><h4>Tersedia</h4><p>{dashboardData.stats.tersedia}</p></div>
                <div className="stat-card info"><h4>Dipinjam</h4><p>{dashboardData.stats.dipinjam}</p></div>
            </div>
            
            {/* --- CHARTS (TIDAK BERUBAH) --- */}
            <div className="chart-grid">
                <div className="card chart-card"><h3 className="card-title">Distribusi Kondisi Aset</h3><div className="chart-container-wrapper"><Doughnut data={dashboardData.kondisiChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} /></div></div>
                <div className="card chart-card"><h3 className="card-title">Distribusi Aset per Lokasi</h3><div className="chart-container-wrapper"><Bar data={dashboardData.lokasiChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} /></div></div>
            </div>

            {/* --- ASSET LIST DENGAN FILTER & PAGINASI --- */}
            <div className="card">
                <div className="list-header">
                    <h3 className="card-title">Daftar Aset ({filteredAssetList.length} Aset)</h3>
                    <div className="list-header-actions">
                        <button onClick={openModalTambah} className="button button-primary"><Plus size={16}/> Tambah Aset</button>
                    </div>
                </div>

                {/* KONTROL FILTER & SEARCH */}
                <div className="filter-controls search-input-row">
                    <div className="input-with-icon search-full-width">
                        <Search size={16}/>
                        <input 
                            type="text" 
                            className="input" 
                            placeholder="Cari Nama atau Kode Aset..." 
                            value={filters.search}
                            onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
                        />
                    </div>
                </div>
                <div className="filter-controls dropdown-row">
                    {/* Filter Kondisi */}
                    <div className="input-with-icon"><Filter size={16}/>
                        <select className="input" value={filters.kondisi} onChange={e => setFilters(p => ({ ...p, kondisi: e.target.value }))}>
                            <option value="Semua">Semua Kondisi</option>
                            {statusKondisiOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>
                    {/* Filter Peminjaman */}
                    <div className="input-with-icon"><Filter size={16}/>
                        <select className="input" value={filters.peminjaman} onChange={e => setFilters(p => ({ ...p, peminjaman: e.target.value }))}>
                            <option value="Semua">Semua Peminjaman</option>
                            {statusPinjamOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>
                    {/* Filter Publikasi */}
                    <div className="input-with-icon"><Filter size={16}/>
                        <select className="input" value={filters.publik} onChange={e => setFilters(p => ({ ...p, publik: e.target.value }))}>
                            <option value="Semua">Semua Visibilitas</option>
                            <option value="Ya">Publik (Ya)</option>
                            <option value="Tidak">Privat (Tidak)</option>
                        </select>
                    </div>
                </div>
                {/* AKHIR KONTROL FILTER & SEARCH */}

                <div className="item-list">
                    {loading ? <p className="loading-text">Memuat...</p> : (
                        paginatedAssetList.length > 0 ? paginatedAssetList.map(item => (
                            // KOREKSI STRUKTUR GRID DI SINI
                            <div key={item.id} className="list-item-condensed aset-item">
                                
                                {/* KOLOM 1: MAIN INFO (Nama, Kode, Thumb) */}
                                <div className="item-main-info">
                                    {item.images && item.images[0] ? <img src={item.images[0]} alt={item.namaAset} className="item-thumbnail" /> : <Package size={50} className="item-thumbnail no-image-icon"/>}
                                    <div>
                                        <strong title={item.namaAset}>{item.namaAset}</strong>
                                        <small>{item.kodeAset || 'Tanpa Kode'} | Update: {item.updatedAt ? new Date(item.updatedAt.seconds * 1000).toLocaleDateString('id-ID') : 'N/A'}</small>
                                    </div>
                                </div>
                                
                                {/* KOLOM 2: DETAILS (Lokasi, Jumlah, Perolehan, Status Global Pinjam) */}
                                <div className="item-details">
                                    <p><strong>Lokasi:</strong> {item.lokasiPenyimpanan || '-'}</p>
                                    <p><strong>Jumlah:</strong> {item.jumlahAset || 1} Unit</p> 
                                    <p>
                                        <strong>Perolehan:</strong> {item.tipePerolehan || '-'} ({new Date(item.tanggalPerolehan + 'T00:00:00').toLocaleDateString('id-ID', {year: 'numeric', month: 'short'})})
                                    </p>
                                    {/* Status Dapat Dipinjamkan sebagai label status di baris terpisah */}
                                    <span className={`status-label status-${item.dapatDipinjamkan ? 'diperbolehkan' : 'dilarang'}`}>
                                        {item.dapatDipinjamkan ? 'Boleh Pinjam' : 'Tidak Dipinjamkan'}
                                    </span>
                                </div>
                                
                                {/* KOLOM 3: KONDISI DAN STATUS PINJAM (2 Status Badge utama) */}
                                <div className="item-status"> 
                                    <span className={`status-badge status-${(item.statusKondisi || 'baik').toLowerCase().replace(/\s/g, '-')}`}>{item.statusKondisi}</span>
                                    <span className={`status-badge status-${(item.statusPeminjaman || 'tersedia').toLowerCase()}`}>{item.statusPeminjaman}</span>
                                </div>
                                
                                {/* KOLOM 4: ACTIONS */}
                                <div className="item-actions">
                                    {/* Tombol Quick Toggle isPublic (Sudah Ada) */}
                                    <button onClick={() => handleQuickToggle(item.id, 'isPublic', item.isPublic)} className="button-icon" title={item.isPublic ? 'Publik' : 'Privat'}>{item.isPublic ? <Eye size={16} /> : <EyeOff size={16} />}</button>
                                    
                                    {/* TOMBOL QUICK TOGGLE "DAPAT DIPINJAMKAN" (BARU) */}
                                    <button 
                                        onClick={() => handleQuickToggle(item.id, 'dapatDipinjamkan', item.dapatDipinjamkan)} 
                                        className="button-icon primary-hover" 
                                        title={item.dapatDipinjamkan ? 'Dapat Dipinjamkan' : 'Tidak Dipinjamkan'}
                                    >
                                        {/* Gunakan ikon yang sesuai, misal Box untuk ketersediaan, atau LinkIcon/Check */}
                                        {item.dapatDipinjamkan ? <Check size={16} color="#10b981"/> : <Box size={16} color="#ef4444"/>}
                                    </button> 
                                    {/* CATATAN: Anda mungkin perlu mengimpor ikon Check jika belum ada */}

                                    {/* Tombol Quick Toggle statusPeminjaman (Sudah Ada) */}
                                    <button onClick={() => handleQuickToggle(item.id, 'statusPeminjaman', item.statusPeminjaman, statusPinjamOptions)} className="button-icon" title="Ubah Status Pinjam"><ArrowRightLeft size={16}/></button>

                                    <button onClick={() => setQrModalData(item)} className="button-icon" title="Tampilkan QR Code"><QrCode size={16}/></button>
                                    <button onClick={() => handleEdit(item)} className="button-icon primary-hover"><Pencil size={16}/></button>
                                    <button onClick={() => handleHapus(item.id, item.namaAset)} className="button-icon danger-hover" title="Hapus"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        )) : <EmptyState text="Tidak Ada Aset Ditemukan" subtext="Coba ubah filter pencarian atau pastikan ada aset."/>
                    )}
                </div>
                
                {/* KONTROL PAGINASI */}
                {renderPaginationControls()} 
            </div>
            
            <button onClick={() => navigate("/admin")} className="button button-secondary full-width-button"><ArrowLeft size={16}/> Kembali ke Dashboard</button>
        </div>
    );
};

export default AdminAset;