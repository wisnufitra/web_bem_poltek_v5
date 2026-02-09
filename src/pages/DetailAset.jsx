import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../firebase/firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
import { Box, ArrowLeft, MapPin, Hash, Calendar, Gift, Info, Clock, Package, Zap } from 'lucide-react'; // Zap untuk Kondisi

// --- IMPORT CSS EKSTERNAL ---
import './DetailAset.css'; 

// --- Komponen Pembantu UI yang Disarankan untuk Dipindahkan ---
const LoadingSpinner = () => ( <div className="loading-spinner-container"><div className="loading-spinner"></div></div> );
const NotFound = () => (
    <div className="empty-state">
        <Box size={48} />
        <p className="empty-state-text">Aset Tidak Ditemukan</p>
        <p className="empty-state-subtext">Aset dengan ID ini tidak ada atau tidak untuk ditampilkan ke publik.</p>
        <Link to="/keterbukaan-informasi/inventaris" className="button button-primary" style={{marginTop: '20px'}}>
            <ArrowLeft size={16}/> Kembali ke Daftar Aset
        </Link>
    </div>
);
// ----------------------------------------------------------------

const DetailAset = () => {
    const { assetId } = useParams();
    const [asset, setAsset] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(0);

    // Fungsi untuk memformat tanggal
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString + 'T00:00:00').toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    // Fungsi untuk memformat timestamp (diperlukan untuk updatedAt)
    const formatTimestamp = (timestamp) => {
        if (!timestamp) return 'N/A';
        // Timestamp Firebase
        return new Date(timestamp.seconds * 1000).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
    }

    useEffect(() => {
        // --- HAPUS KODE INJEKSI CSS LAMA ---
        // Pindahkan CSS ke file eksternal DetailAset.css.
        // --- END HAPUS KODE INJEKSI CSS LAMA ---
        
        const docRef = doc(db, "inventaris_aset", assetId);
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            setLoading(false);
            if (docSnap.exists() && docSnap.data().isPublic) {
                const data = docSnap.data();
                setAsset({ 
                    id: docSnap.id, 
                    ...data, 
                    images: data.images || [],
                    // Pastikan field baru memiliki nilai default yang benar
                    jumlahAset: data.jumlahAset || 1, 
                    dapatDipinjamkan: data.dapatDipinjamkan !== undefined ? data.dapatDipinjamkan : true 
                }); 
            } else {
                setAsset(null);
            }
        });

        return () => { 
            unsubscribe();
        };
    }, [assetId]);

    if (loading) return <LoadingSpinner />;
    if (!asset) return <div className="public-page-wrapper"><main className="public-page-content"><NotFound /></main></div>;
    
    // Tentukan status pinjam global
    const isBorrowable = asset.dapatDipinjamkan === true;

    return (
        <div className="public-page-wrapper">
            <main className="public-page-content">
                <div className="card detail-card">
                    <div className="detail-grid">
                        
                        {/* -------------------- KIRI: IMAGE GALLERY -------------------- */}
                        <div className="image-gallery">
                            <div className="main-image">
                                {asset.images.length > 0 ? (
                                    <img src={asset.images[selectedImage]} alt={asset.namaAset} />
                                ) : (
                                    <div className="image-placeholder"><Package size={64} /><p>Tidak Ada Foto</p></div>
                                )}
                            </div>
                            {asset.images.length > 1 && (
                                <div className="thumbnail-grid">
                                    {asset.images.map((img, index) => (
                                        <img 
                                            key={index}
                                            src={img} 
                                            alt={`Thumbnail ${index + 1}`}
                                            className={selectedImage === index ? 'active' : ''}
                                            onClick={() => setSelectedImage(index)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                        {/* ------------------------------------------------------------- */}


                        {/* -------------------- KANAN: INFO PANEL -------------------- */}
                        <div className="info-panel">
                            {/* BADGES KONDISI & STATUS PINJAM SAAT INI */}
                            <div className="asset-badges">
                                <span className={`status-badge status-${(asset.statusKondisi || 'baik').toLowerCase().replace(/\s/g, '-')}`}>{asset.statusKondisi}</span>
                                <span className={`status-badge status-${(asset.statusPeminjaman || 'tersedia').toLowerCase()}`}>{asset.statusPeminjaman}</span>
                            </div>
                            
                            <h1 className="asset-title">{asset.namaAset}</h1>
                            <p className="asset-subtitle">Detail Inventaris Fisik yang Terdaftar</p>
                            
                            {/* Grid Detail Info */}
                            <div className="details-grid">
                                
                                {/* 1. Kode Aset */}
                                <div className="detail-item detail-highlight">
                                    <Hash size={20}/><div className="content">
                                        <small>Kode Aset</small>
                                        <strong>{asset.kodeAset || 'Tanpa Kode Resmi'}</strong>
                                    </div>
                                </div>
                                
                                {/* 2. Lokasi Penyimpanan */}
                                <div className="detail-item detail-highlight">
                                    <MapPin size={20}/><div className="content">
                                        <small>Lokasi Penyimpanan</small>
                                        <strong>{asset.lokasiPenyimpanan || 'Tidak Diketahui'}</strong>
                                    </div>
                                </div>
                                
                                {/* 3. Status Pinjam Global (BARU) */}
                                <div className={`detail-item ${isBorrowable ? 'safe' : 'warning'}`}>
                                    <Zap size={18}/><div className="content">
                                        <small>Ketersediaan Pinjam</small>
                                        <strong>{isBorrowable ? 'DAPAT DIPINJAMKAN' : 'TIDAK DIPINJAMKAN'}</strong>
                                    </div>
                                </div>
                                
                                {/* 4. Jumlah Aset (BARU) */}
                                <div className="detail-item">
                                    <Package size={18}/><div className="content">
                                        <small>Kuantitas/Jumlah</small>
                                        <strong>{asset.jumlahAset || 1} Unit</strong>
                                    </div>
                                </div>
                                
                                {/* 5. Tanggal Perolehan */}
                                <div className="detail-item">
                                    <Calendar size={18}/><div className="content">
                                        <small>Tanggal Perolehan</small>
                                        <strong>{formatDate(asset.tanggalPerolehan)}</strong>
                                    </div>
                                </div>
                                
                                {/* 6. Tipe Perolehan */}
                                <div className="detail-item">
                                    <Gift size={18}/><div className="content">
                                        <small>Tipe Perolehan</small>
                                        <strong>{asset.tipePerolehan || '-'}</strong>
                                    </div>
                                </div>
                                
                                {/* 7. Sumber/Keterangan */}
                                <div className="detail-item full-width-item">
                                    <Info size={18}/><div className="content">
                                        <small>Sumber/Keterangan</small>
                                        <strong>{asset.sumberKeterangan || '-'}</strong>
                                    </div>
                                </div>
                                
                                {/* 8. Update Terakhir */}
                                <div className="detail-item full-width-item">
                                    <Clock size={18}/><div className="content">
                                        <small>Update Terakhir</small>
                                        <strong>{formatTimestamp(asset.updatedAt)}</strong>
                                    </div>
                                </div>
                                
                            </div>
                            {/* End Grid Detail Info */}

                            <Link to="/keterbukaan-informasi/inventaris" className="button button-secondary-full">
                                <ArrowLeft size={16}/> Kembali ke Daftar Aset Lainnya
                            </Link>

                        </div>
                        {/* ----------------------------------------------------------- */}

                    </div>
                </div>
            </main>
        </div>
    );
};

export default DetailAset;