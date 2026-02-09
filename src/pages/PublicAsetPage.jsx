import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../firebase/firebaseConfig';
import { collection, query, where, orderBy, getDocs, limit, startAfter } from 'firebase/firestore'; 
import { Box, Search, Filter, MapPin, Package, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

import './PublicAsetPage.css';

// --- UTILITY FUNCTIONS ---
const getInitials = (name = '') => {
    const words = name.split(' ').filter(Boolean);
    if (words.length > 1) {
        return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

const EmptyState = ({ text, subtext }) => (
    <div className="empty-state">
        <Box size={48} />
        <p className="empty-state-text">{text}</p>
        <p className="empty-state-subtext">{subtext}</p>
    </div>
);

// --- KONSTANTA ---
const ASSETS_PER_PAGE = 9; 
const statusKondisiOptions = ["Baik", "Perlu Perbaikan", "Rusak"];
const dapatDipinjamkanOptions = [
    { label: 'Boleh Dipinjam', value: 'Ya' },
    { label: 'Tidak Dipinjamkan', value: 'Tidak' }
];

// --- MAIN COMPONENT ---
const PublicAsetPage = () => {
    const [assetList, setAssetList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ searchTerm: '', kondisi: 'Semua', lokasi: 'Semua', dapatDipinjamkan: 'Semua' });
    
    // STATE PAGINASI
    const [lastVisible, setLastVisible] = useState(null); 
    const [hasMore, setHasMore] = useState(true);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    // useCallback untuk fungsi fetching aset dari Firestore
    const fetchAssets = useCallback(async (startAfterDoc, currentFilters) => {
        setLoading(true);

        // 1. Definisikan Base Query (Filter isPublic == true)
        let baseQuery = query(
            collection(db, "inventaris_aset"), 
            where("isPublic", "==", true),
            orderBy("createdAt", "desc")
        );
        
        // 2. Terapkan Filter Firestore (hanya yang didukung oleh indeks)
        if (currentFilters.kondisi !== 'Semua') {
            baseQuery = query(baseQuery, where("statusKondisi", "==", currentFilters.kondisi));
        }
        if (currentFilters.lokasi !== 'Semua') {
            // Perlu diperhatikan: Lokasi harus di-query di sini. Pastikan indeks sudah ada.
            baseQuery = query(baseQuery, where("lokasiPenyimpanan", "==", currentFilters.lokasi));
        }
        if (currentFilters.dapatDipinjamkan !== 'Semua') {
            const isFilterTrue = currentFilters.dapatDipinjamkan === 'Ya';
            baseQuery = query(baseQuery, where("dapatDipinjamkan", "==", isFilterTrue));
        }

        // 3. Terapkan Paginasi dan Batasan
        let pageQuery = baseQuery;
        if (startAfterDoc) {
            pageQuery = query(pageQuery, startAfter(startAfterDoc));
        }
        pageQuery = query(pageQuery, limit(ASSETS_PER_PAGE));

        try {
            const snapshot = await getDocs(pageQuery);
            
            const newAssets = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            const isLastPage = snapshot.docs.length < ASSETS_PER_PAGE;

            setAssetList(prevList => startAfterDoc ? [...prevList, ...newAssets] : newAssets);
            
            setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
            setHasMore(!isLastPage);
            setIsInitialLoad(false);

        } catch (error) {
            console.error("Gagal mengambil aset:", error);
            // Menonaktifkan hasMore jika terjadi kesalahan
            setHasMore(false);
            setIsInitialLoad(false);
        } finally {
            setLoading(false);
        }
    }, []); 

    // Effect untuk muatan awal dan ketika filter KUNCI (kondisi/lokasi/dapatDipinjamkan) berubah
    useEffect(() => {
        // Atur ulang state dan muat ulang data dari awal
        setAssetList([]);
        setLastVisible(null);
        setHasMore(true);
        setIsInitialLoad(true); // Set true untuk menampilkan loading penuh

        // Panggil fetchAssets tanpa startAfterDoc
        fetchAssets(null, filters); 
        
        // Catatan: Asumsikan CSS sudah diimpor secara eksternal (PublicAsetPage.css)
    }, [filters.kondisi, filters.lokasi, filters.dapatDipinjamkan, fetchAssets]);
    
    // Handler untuk tombol "Muat Lebih Banyak"
    const handleLoadMore = () => {
        if (!loading && hasMore && lastVisible) {
            fetchAssets(lastVisible, filters);
        }
    };

    // Data Lokasi yang tersedia (dihitung dari seluruh list aset yang sudah dimuat)
    const availableLocations = useMemo(() => ['Semua', ...Array.from(new Set(assetList.map(item => item.lokasiPenyimpanan).filter(Boolean)))], [assetList]);

    // Filtering di sisi klien (untuk searchTerm)
    const filteredBySearch = useMemo(() => {
        if (!filters.searchTerm) return assetList;

        const searchTermLower = filters.searchTerm.toLowerCase();
        return assetList.filter(item => {
            return item.namaAset.toLowerCase().includes(searchTermLower) || 
                   (item.kodeAset && item.kodeAset.toLowerCase().includes(searchTermLower));
        });
    }, [assetList, filters.searchTerm]);
    
    const displayList = filteredBySearch;

    return (
        <div className="public-page-wrapper">
            <header className="page-header">
                <div className="header-content-wrapper">
                    <Box size={40} className="header-icon"/>
                    <div>
                        <h1 className="page-title">Inventaris Aset Publik</h1>
                        <p className="page-subtitle">Transparansi data aset dan barang inventaris BEM KM Poltek Nuklir yang tersedia untuk umum.</p>
                    </div>
                </div>
            </header>

            <main className="public-page-content">
                <div className="card filter-card">
                    <div className="input-with-icon search-bar">
                        <Search size={18} />
                        <input 
                            type="text" 
                            placeholder="Cari nama atau kode aset..." 
                            className="input" 
                            value={filters.searchTerm} 
                            onChange={e => setFilters(p => ({...p, searchTerm: e.target.value}))}
                        />
                    </div>
                    <div className="filter-controls">
                        {/* Filter Kondisi */}
                        <div className="input-with-icon">
                            <Filter size={16}/>
                            <select className="input input-select" value={filters.kondisi} onChange={e => setFilters(p => ({...p, kondisi: e.target.value}))}>
                                <option value="Semua">Semua Kondisi</option>
                                {statusKondisiOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                        
                        {/* Filter Lokasi */}
                        <div className="input-with-icon">
                            <MapPin size={16}/>
                            <select className="input input-select" value={filters.lokasi} onChange={e => setFilters(p => ({...p, lokasi: e.target.value}))}>
                                <option value="Semua">Semua Lokasi</option>
                                {availableLocations.map(loc => loc !== 'Semua' && <option key={loc} value={loc}>{loc}</option>)} 
                            </select>
                        </div>
                        
                        {/* FILTER BARU: DAPAT DIPINJAMKAN */}
                        <div className="input-with-icon">
                            <Filter size={16}/>
                            <select className="input input-select" value={filters.dapatDipinjamkan} onChange={e => setFilters(p => ({...p, dapatDipinjamkan: e.target.value}))}>
                                <option value="Semua">Ketersediaan Pinjam</option>
                                {dapatDipinjamkanOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                        </div>

                    </div>
                </div>
                
                <div className="asset-grid">
                    {/* Tampilkan Loading saat pemuatan awal atau memuat lebih banyak */}
                    {isInitialLoad && loading ? <p className="loading-text">Memuat daftar aset...</p> : 
                    
                    displayList.length > 0 ? displayList.map(item => {
                        const initials = getInitials(item.namaAset);
                        
                        // BARU: Tentukan badge Status Pinjam Global
                        const isBorrowable = item.dapatDipinjamkan === true || item.dapatDipinjamkan === undefined;
                        
                        return (
                            <Link to={`/keterbukaan-informasi/inventaris/${item.id}`} key={item.id} className="card asset-card">
                                <div className="asset-card-image">
                                    {item.images && item.images[0] ? (
                                        <img src={item.images[0]} alt={item.namaAset} />
                                    ) : (
                                        <div className="image-placeholder">
                                            <span className="initials-placeholder">{initials}</span>
                                        </div>
                                    )}
                                    <div className="asset-card-badges">
                                        {/* Status Global Pinjam (BARU) */}
                                        <span className={`status-badge status-${isBorrowable ? 'diperbolehkan' : 'dilarang'}`}>
                                            {isBorrowable ? 'Bisa Dipinjam' : 'Tidak Dipinjamkan'}
                                        </span>
                                        {/* Status Kondisi */}
                                        <span className={`status-badge status-${(item.statusKondisi || 'baik').toLowerCase().replace(/\s/g, '-')}`}>{item.statusKondisi}</span>
                                        {/* Status Peminjaman Saat Ini */}
                                        <span className={`status-badge status-${(item.statusPeminjaman || 'tersedia').toLowerCase()}`}>{item.statusPeminjaman}</span>
                                    </div>
                                </div>
                                <div className="asset-card-content">
                                    <h3>{item.namaAset}</h3>
                                    <p className="asset-code">{item.kodeAset || 'Tanpa Kode'}</p>
                                    <ul className="asset-details">
                                        <li><MapPin size={16}/> <span>{item.lokasiPenyimpanan || 'Tidak Diketahui'}</span></li>
                                        {/* TAMPILKAN JUMLAH ASET (BARU) */}
                                        <li className="asset-quantity"><Package size={16}/> <span>{item.jumlahAset || 1} Unit</span></li>
                                        <li><Calendar size={16}/> <span>{item.tanggalPerolehan ? new Date(item.tanggalPerolehan + 'T00:00:00').getFullYear() : '-'} ({item.tipePerolehan || '-'})</span></li>
                                    </ul>
                                </div>
                            </Link>
                        )
                    }) : <EmptyState text="Aset Tidak Ditemukan" subtext="Tidak ada aset publik yang cocok dengan kriteria Anda."/>
                    }

                    {/* Tampilkan indikator loading untuk Muat Lebih Banyak */}
                    {!isInitialLoad && loading && <p className="loading-text loading-more">Memuat aset selanjutnya...</p>}
                </div>
                
                {/* Tombol Muat Lebih Banyak */}
                {hasMore && !loading && displayList.length > 0 && (
                    <div className="load-more-container">
                        <button 
                            onClick={handleLoadMore} 
                            className="button button-primary" 
                            disabled={loading}
                        >
                            Muat Aset Lebih Banyak ({ASSETS_PER_PAGE} Item)
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
};

export default PublicAsetPage;