// File: src/pages/PublicTransparencyPage.jsx

// --- BAGIAN 1: SEMUA IMPORT HARUS DI SINI ---
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { db } from "../firebase/firebaseConfig";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { Info, Wallet, Filter, Link as LinkIcon, X, List, Calendar, User, Tag, ChevronDown, ChevronLeft, ChevronRight, Search } from 'lucide-react'; 
// Import Chart.js yang baru (Harus di atas!)
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale } from 'chart.js';

// Import CSS lokal (Harus di atas!)
import './PublicTransparencyPage.css'; 

// --- BAGIAN 2: REGISTRASI CHART.JS (Logika, bukan import) ---
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale); 

// --- BAGIAN 3: UTILITY FUNCTIONS, KONSTANTA, DAN KOMPONEN LAINNYA ---
const formatRupiah = (number) => {
    if (number === null || number === undefined || number === '') return '0';
    return new Intl.NumberFormat('id-ID').format(number);
}

const calculateTotalRealisasi = (item) => {
    // Memastikan Realisasi dihitung dari rincian jika ada, atau dari totalRealisasi jika mode rekap
    if (item.rincianPengeluaran && item.rincianPengeluaran.length > 0) {
        return item.rincianPengeluaran.reduce((sum, r) => sum + Number(r.jumlah || 0), 0);
    }
    return Number(item.totalRealisasi || 0);
};

// --- KONSTANTA ---
const itemsPerPage = 10; // Batas item per halaman
const ormawaOptions = [ "BEM", "MM", "DPM", "Hima EMC", "Hima Einsten.com", "Hima TKN", "UKM Kalam", "UKM Walang", "UKM Robotika", "UKM Seni", "UKM Riset", "UKM Voli", "UKM Basket", "UKM Badminton", "UKM Beladiri", "UKM Futsal", "UKM PMK" ];
const statusOptions = ["Perencanaan", "Disetujui", "Berjalan", "Selesai", "Dibatalkan", "SPJ Masuk"];
const STATUS_COLORS = {
    "Perencanaan": '#94a3b8', 
    "Disetujui": '#3b82f6',
    "Berjalan": '#f97316',
    "Selesai": '#10b981',
    "Dibatalkan": '#dc2626',
    "SPJ Masuk": '#a855f7'
};

// --- UI COMPONENTS ---
const EmptyState = ({ text, subtext }) => ( <div className="empty-state"><Info size={32} /><p className="empty-state-text">{text}</p><p className="empty-state-subtext">{subtext}</p></div> );


// --- SUB-COMPONENT: GLOBAL SUMMARY CARD (Tetap) ---
const GlobalSummaryCard = ({ grandTotal }) => {
    if (!grandTotal || grandTotal.disetujui === undefined) {
        return (
            <div className="card global-summary-card">
                <h2 className="section-title">Memuat Ringkasan Dana...</h2>
            </div>
        );
    }
    const { disetujui, terlaksana, persentaseRealisasi, sisa } = grandTotal;
    const progressValue = grandTotal.persentaseRealisasi > 100 ? 100 : grandTotal.persentaseRealisasi;

    return (
        <div className="card global-summary-card">
            <h2 className="section-title">Ringkasan Dana Global</h2>
            <div className="summary-grid">
                <div className="summary-chart-container">
                    <div className="progress-circle" style={{ '--progress': `${progressValue}%`}}>
                        <span className="progress-text">{grandTotal.persentaseRealisasi.toFixed(1)}%</span>
                        <span className="progress-label">Serapan Dana</span>
                    </div>
                </div>
                <div className="summary-stats">
                    <div className="stat-item"><small>TOTAL DIAJUKAN</small><strong>Rp {formatRupiah(grandTotal.diajukan)}</strong></div>
                    <div className="stat-item primary"><small>TOTAL DISETUJUI</small><strong>Rp {formatRupiah(grandTotal.disetujui)}</strong></div>
                    <div className="stat-item success"><small>TOTAL REALISASI</small><strong>Rp {formatRupiah(grandTotal.terlaksana)}</strong></div>
                    <div className={`stat-item ${grandTotal.sisa < 0 ? 'danger' : 'safe'}`}><small>SISA DANA</small><strong>Rp {formatRupiah(grandTotal.sisa)}</strong></div>
                </div>
            </div>
        </div>
    );
};

const StatusDistributionCard = ({ distribution }) => {
    if (distribution.totalDanaTerdistribusi === 0) {
        return (
            <div className="card status-chart-card">
                <h2 className="section-title">Distribusi Program Berdasarkan Status</h2>
                <EmptyState text="Belum ada data anggaran" subtext="Tidak ada program yang disetujui untuk dianalisis."/>
            </div>
        );
    }

    const totalAnggaran = distribution.totalDanaTerdistribusi;
    const chartData = distribution.chartData;

    const data = {
        labels: chartData.map(d => `${d.status}`),
        datasets: [
            {
                data: chartData.map(d => d.totalAnggaran),
                backgroundColor: chartData.map(d => STATUS_COLORS[d.status] || '#ccc'),
                hoverOffset: 4,
                borderWidth: 0,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { 
                position: 'bottom', 
                align: 'start', 
                labels: { 
                    padding: 15,
                    // Callback untuk menampilkan persentase di legend
                    generateLabels: (chart) => {
                        const data = chart.data;
                        if (data.labels.length && data.datasets.length) {
                            return data.labels.map((label, i) => {
                                const value = data.datasets[0].data[i];
                                const percentage = totalAnggaran > 0 ? ((value / totalAnggaran) * 100).toFixed(1) : 0;
                                return {
                                    text: `${label}: Rp ${formatRupiah(value)} (${percentage}%)`, // Tampilkan nilai dan persentase
                                    fillStyle: data.datasets[0].backgroundColor[i],
                                    strokeStyle: data.datasets[0].backgroundColor[i],
                                    lineWidth: 0,
                                    hidden: isNaN(value), 
                                    index: i,
                                };
                            });
                        }
                        return [];
                    }
                } 
            },
            title: { display: false },
            tooltip: {
                callbacks: {
                    label: (context) => {
                        const label = context.label || '';
                        const value = context.parsed;
                        const percentage = totalAnggaran > 0 ? ((value / totalAnggaran) * 100).toFixed(1) : 0;
                        return `${label}: Rp ${formatRupiah(value)} (${percentage}%)`;
                    }
                }
            }
        },
    };

    return (
        <div className="card status-chart-card">
            <h2 className="section-title">Distribusi Program Berdasarkan Status</h2>
            <div className="chart-container-wrapper chart-medium-doughnut">
                <Doughnut data={data} options={options} /> 
            </div>
        </div>
    );
};

// --- SUB-COMPONENT: PROGRAM DETAIL MODAL (Tetap) ---
const ProgramDetailModal = ({ modalState, closeModal }) => {
    if (!modalState.show || !modalState.data) return null;
    const item = modalState.data;
    const totalRealisasi = calculateTotalRealisasi(item);
    const disetujui = Number(item.totalAnggaran || 0);
    const sisaDana = disetujui - totalRealisasi;
    const persentaseSerapan = disetujui > 0 ? (totalRealisasi / disetujui) * 100 : 0;
    
    return (
        <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header"><h3>{item.namaProgram}</h3><button onClick={closeModal} className="close-button"><X size={20}/></button></div>
                <div className="modal-body">
                    <div className="detail-meta-grid">
                        <p><User size={14}/> <strong>Organisasi:</strong> {item.ormawa}</p>
                        <p><Calendar size={14}/> <strong>Tgl. Kegiatan:</strong> {item.tanggalKegiatan ? new Date(item.tanggalKegiatan + 'T00:00:00').toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}</p>
                        <p><Tag size={14}/> <strong>Status:</strong> <span className={`status-badge status-${(item.status || 'perencanaan').toLowerCase().replace(/\s/g, '-')}`}>{item.status}</span></p>
                        {item.linkSPJ && <p className="link-spj"><LinkIcon size={14}/><strong>Dokumen SPJ:</strong> <a href={item.linkSPJ} target="_blank" rel="noopener noreferrer">Lihat Dokumen</a></p>}
                    </div>
                    <div className="detail-stat-box">
                        <div className="stat-item primary"><small>DISETUJUI</small><strong>Rp {formatRupiah(disetujui)}</strong></div>
                        <div className="stat-item success"><small>REALISASI</small><strong>Rp {formatRupiah(totalRealisasi)}</strong></div>
                        <div className={`stat-item ${sisaDana < 0 ? 'danger' : 'safe'}`}><small>SISA</small><strong>Rp {formatRupiah(sisaDana)}</strong></div>
                    </div>
                    <div className="detail-progress-chart">
                        <div className="progress-display"><div className="progress-bar big"><div className="progress-bar-fill" style={{width: `${persentaseSerapan > 100 ? 100 : persentaseSerapan}%`}}></div></div><span className="progress-percentage">{persentaseSerapan.toFixed(1)}%</span></div>
                    </div>
                    <h4 className="rincian-title">Rincian Pengeluaran ({item.rincianPengeluaran?.length > 0 ? `${item.rincianPengeluaran.length} Item` : 'Data Rekap'})</h4>
                    {(item.rincianPengeluaran && item.rincianPengeluaran.length > 0) ? (
                        <div className="rincian-list-public">{item.rincianPengeluaran.map((r, i) => (<div key={r.id || i} className="rincian-item-public"><span>{r.deskripsi}</span><span className="rincian-jumlah-public">Rp {formatRupiah(r.jumlah)}</span></div>))}</div>
                    ) : ( <div className="empty-rincian-box"><Info size={16}/> Realisasi program ini dimasukkan dalam mode Rekapitulasi Total.</div> )}
                </div>
            </div>
        </div>
    );
};


// --- SUB-COMPONENT: SBM CARD (Tetap) ---
const SbmCard = ({ sbmData }) => {
    const [openCategories, setOpenCategories] = useState({});
    const toggleCategory = (kategori) => setOpenCategories(prev => ({...prev, [kategori]: !prev[kategori]}));
    
    const groupedSbm = useMemo(() => {
        return (sbmData.rincianSbm || []).reduce((acc, item) => {
            const key = item.kategori || 'Lain-lain';
            if (!acc[key]) acc[key] = [];
            acc[key].push(item);
            return acc;
        }, {});
    }, [sbmData.rincianSbm]);

    return (
        <div className="card sbm-card">
            <h2 className="section-title">Standar Biaya Masukan (SBM) TAHUN {sbmData.tahun}</h2>
            {Object.keys(groupedSbm).length > 0 ? (
                <div className="sbm-groups-container">
                    {Object.keys(groupedSbm).map(kategori => (
                        <div key={kategori} className="sbm-group">
                            <button className="sbm-kategori-title" onClick={() => toggleCategory(kategori)}>
                                {kategori} ({groupedSbm[kategori].length} item)
                                <ChevronDown size={20} className={`chevron ${openCategories[kategori] ? 'open' : ''}`} />
                            </button>
                            {openCategories[kategori] && (
                                <div className="sbm-table-container">
                                    <table className="sbm-table">
                                        <thead><tr><th>Rincian</th><th>Satuan</th><th className="text-right">Harga</th><th>Ketentuan</th></tr></thead>
                                        <tbody>{groupedSbm[kategori].map((item, index) => (<tr key={item.id || index}><td>{item.rincian}</td><td>{item.satuan}</td><td className="text-right">Rp {formatRupiah(item.harga)}</td><td>{item.ketentuan}</td></tr>))}</tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : <EmptyState text="Data SBM Belum Tersedia" subtext={`Admin belum mengisi data untuk tahun ${sbmData.tahun}.`}/>}
        </div>
    );
};


// --- SUB-COMPONENT: PAGINATION COMPONENT (New) ---
const Pagination = ({ totalPages, currentPage, onPageChange }) => {
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
        const pages = [];
        const maxPagesToShow = 5; 
        const startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
        const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }
        return pages;
    };

    const pageNumbers = getPageNumbers();

    return (
        <div className="pagination-container">
            <button 
                className="pagination-button button-secondary"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
            >
                <ChevronLeft size={16}/> Sebelumnya
            </button>

            <div className="page-numbers-group">
                {pageNumbers.map(number => (
                    <button
                        key={number}
                        className={`pagination-number button-secondary ${number === currentPage ? 'active' : ''}`}
                        onClick={() => onPageChange(number)}
                    >
                        {number}
                    </button>
                ))}
            </div>

            <button
                className="pagination-button button-secondary"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
            >
                Berikutnya <ChevronRight size={16}/>
            </button>
        </div>
    );
};


// --- MAIN COMPONENT: PublicTransparencyPage ---
const PublicTransparencyPage = () => {
    const [anggaranList, setAnggaranList] = useState([]);
    const [sbmData, setSbmData] = useState({ rincianSbm: [], tahun: new Date().getFullYear() });
    const [loading, setLoading] = useState(true);
    
    // --- STATE FILTER & PAGINASI BARU ---
    const [filters, setFilters] = useState({ tahun: 'Semua', ormawa: 'Semua', search: '' });
    const [currentPage, setCurrentPage] = useState(1);
    // -------------------------------------

    const [detailModal, setDetailModal] = useState({ show: false, data: null });

    const openDetailModal = useCallback((item) => setDetailModal({ show: true, data: item }), []);
    const closeDetailModal = useCallback(() => setDetailModal({ show: false, data: null }), []);

    // Fetch data and subscribe to changes
    useEffect(() => {
        // Logika CSS injection dihapus, diasumsikan dimuat via import.
        
        const qAnggaran = query(collection(db, "anggaran_program"), orderBy("tahun", "desc"), orderBy("namaProgram", "asc"));
        const unsubAnggaran = onSnapshot(qAnggaran, snapshot => {
            setAnggaranList(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        const qSbm = query(collection(db, "standar_biaya"), orderBy("tahun", "desc"), limit(1));
        const unsubSbm = onSnapshot(qSbm, snapshot => {
            if (!snapshot.empty) setSbmData(snapshot.docs[0].data());
        });
        return () => { unsubAnggaran(); unsubSbm(); };
    }, []);

    // Reset halaman ke 1 setiap kali filter berubah
    useEffect(() => {
        setCurrentPage(1);
    }, [filters.tahun, filters.ormawa, filters.search]); // PERBARUI DEPENDENCY ARRAY INI


    // Processing data: Calculate realisasi for each item
    const processedAnggaranList = useMemo(() => anggaranList.map(item => ({ 
        ...item, 
        calculatedRealisasi: calculateTotalRealisasi(item) 
    })), [anggaranList]);
    
    // Filtered List (Data yang akan di-slice)
    const filteredAnggaranList = useMemo(() => {
        // PENCEGAHAN DUPLIKASI TAHUN: Konversi tahun ke String saat memfilter
        const normalizedYear = String(filters.tahun); 
        const searchTerm = filters.search.toLowerCase(); // Ambil istilah pencarian
        
        return processedAnggaranList.filter(item => {
            // Filter 1: Tahun
            const isYearMatch = (normalizedYear === 'Semua' || String(item.tahun) === normalizedYear);
            
            // Filter 2: Ormawa
            const isOrmawaMatch = (filters.ormawa === 'Semua' || item.ormawa === filters.ormawa);
            
            // Filter 3: Pencarian Teks (BARU)
            const isSearchMatch = item.namaProgram.toLowerCase().includes(searchTerm);
            
            // Gabungkan semua filter
            return isYearMatch && isOrmawaMatch && isSearchMatch;
        });
    }, [processedAnggaranList, filters]);

    // Available Filters (LOGIKA UNIQUE TAHUN)
    const availableYears = useMemo(() => {
        const rawYears = anggaranList.map(item => String(item.tahun));
        const uniqueYears = Array.from(new Set(rawYears));
        uniqueYears.sort((a, b) => Number(b) - Number(a));
        return ['Semua', ...uniqueYears];
    }, [anggaranList]);
    
    // Logika Paginasi
    const totalPages = Math.ceil(filteredAnggaranList.length / itemsPerPage);
    
    const currentAnggaran = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        
        return filteredAnggaranList.slice(startIndex, endIndex);
    }, [filteredAnggaranList, currentPage]);


    // Calculate Global Rekapitulasi
    const { grandTotal: rekapGrandTotal, statusDistribution } = useMemo(() => { // TAMBAHKAN 'statusDistribution' DI DESTRUCTURE
        const dataToProcess = processedAnggaranList; 
        
        // Perhitungan Rekapitulasi Global (TIDAK BERUBAH)
        const totals = ormawaOptions.reduce((acc, ormawa) => ({ ...acc, [ormawa]: { diajukan: 0, disetujui: 0, terlaksana: 0 } }), {});
        let grandTotal = { diajukan: 0, disetujui: 0, terlaksana: 0, sisa: 0, persentaseRealisasi: 0 };

        if (!dataToProcess || dataToProcess.length === 0) {
            // PERHATIKAN: Return object HARUS SAMA
            return { grandTotal, statusDistribution: { chartData: [], totalDanaTerdistribusi: 0 } };
        }

        // --- LOGIC DISTRIBUSI STATUS PROGRAM (BARU) ---
        const distribution = statusOptions.reduce((acc, status) => { acc[status] = 0; return acc; }, {});
        let totalDanaTerdistribusi = 0;

        dataToProcess.forEach(item => {
            const disetujui = Number(item.totalAnggaran || 0);
            const terlaksana = item.calculatedRealisasi;
            const diajukan = Number(item.totalDiajukan || item.totalAnggaran || 0);

            // Perhitungan Grand Total
            if (totals[item.ormawa]) {
                totals[item.ormawa].diajukan += diajukan;
                totals[item.ormawa].disetujui += disetujui;
                totals[item.ormawa].terlaksana += terlaksana;
            }

            // Perhitungan Distribusi Status
            const status = item.status || 'Perencanaan';
            const anggaran = Number(item.totalAnggaran || 0); 
            if (distribution.hasOwnProperty(status)) {
                distribution[status] += anggaran;
                totalDanaTerdistribusi += anggaran;
            }
        });

        // Sum grand totals
        Object.values(totals).forEach(data => {
            grandTotal.diajukan += data.diajukan;
            grandTotal.disetujui += data.disetujui;
            grandTotal.terlaksana += data.terlaksana;
        });

        grandTotal.sisa = grandTotal.disetujui - grandTotal.terlaksana;
        grandTotal.persentaseRealisasi = grandTotal.disetujui > 0 ? (grandTotal.terlaksana / grandTotal.disetujui) * 100 : 0;
        
        const chartData = Object.keys(distribution)
            .filter(status => distribution[status] > 0)
            .map(status => ({
                status: status,
                totalAnggaran: distribution[status]
            }));
        // --- AKHIR LOGIC DISTRIBUSI STATUS PROGRAM ---

        return { 
            grandTotal, 
            statusDistribution: { chartData, totalDanaTerdistribusi } // RETURN DATA BARU
        };

    }, [processedAnggaranList]);


    return (
        <div className="public-page-wrapper">
            <ProgramDetailModal modalState={detailModal} closeModal={closeDetailModal} />
            <header className="page-header">
                <div className="header-content-wrapper">
                    <Wallet size={40}/>
                    <div>
                        <h1 className="page-title">Transparansi Anggaran</h1>
                        <p className="page-subtitle">Rincian alokasi, realisasi, dan pertanggungjawaban dana kemahasiswaan Organisasi Mahasiswa Poltek Nuklir.</p>
                    </div>
                </div>
            </header>
            <main className="public-page-content">
                {loading ? <p className="loading-text">Memuat data keuangan...</p> : (
                    <>
                    {/* WRAPPER BARU */}
                        <div className="summary-section-grid">
                            <GlobalSummaryCard grandTotal={rekapGrandTotal} />
                            <StatusDistributionCard distribution={statusDistribution} /> {/* PANGGIL KOMPONEN BARU */}
                        </div>
                        
                        {/* SBM Card */}
                        <SbmCard sbmData={sbmData} />

                        {/* Filter Card */}
                        <div className="card">
                            <h2 className="section-title">Filter Data Anggaran</h2>
                            {/* PISAHKAN INPUT SEARCH DARI DROPDOWN AGAR TAMPIL LEBIH LUAS */}
                            <div className="filter-controls search-input-row"> 
                                <div className="input-with-icon" style={{ flex: 2 }}>
                                    <Search size={16}/> {/* GANTI DENGAN IKON SEARCH */}
                                    <input 
                                        className="input" 
                                        type="text" 
                                        placeholder="Cari Nama Program..."
                                        value={filters.search} 
                                        onChange={e => setFilters(p => ({...p, search: e.target.value}))}
                                    />
                                </div>
                            </div>
                            <div className="filter-controls dropdown-row"> {/* Beri nama kelas baru jika perlu styling terpisah */}
                                <div className="input-with-icon">
                                    <Filter size={16}/>
                                    <select className="input" name="tahun" value={filters.tahun} onChange={e => setFilters(p => ({...p, tahun: e.target.value}))}>
                                        {availableYears.map(y => <option key={y} value={y}>{y === 'Semua' ? 'Semua Tahun' : y}</option>)}
                                    </select>
                                </div>
                                <div className="input-with-icon">
                                    <Filter size={16}/>
                                    <select className="input" name="ormawa" value={filters.ormawa} onChange={e => setFilters(p => ({...p, ormawa: e.target.value}))}>
                                        <option value="Semua">Semua Organisasi</option>{ormawaOptions.map(o => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        {/* Program List */}
                        <div className="card">
                            <h2 className="section-title">Daftar Program Anggaran ({filteredAnggaranList.length} Program)</h2>
                            <div className="item-list">
                                {currentAnggaran.length > 0 ? currentAnggaran.map(item => {
                                    const serapan = item.totalAnggaran > 0 ? (item.calculatedRealisasi / item.totalAnggaran) * 100 : 0;
                                    return (
                                        <div key={item.id} className="list-item-condensed actionable-item" onClick={() => openDetailModal(item)}>
                                            <div className="item-main-info"><strong title={item.namaProgram}>{item.namaProgram}</strong><small>{item.ormawa} • {item.tahun}</small></div>
                                            <div className="item-stats"><div><small>Disetujui</small><strong>Rp {formatRupiah(item.totalAnggaran)}</strong></div><div><small>Realisasi</small><strong>Rp {formatRupiah(item.calculatedRealisasi)}</strong></div></div>
                                            <div className="item-progress"><small>{serapan.toFixed(1)}%</small><div className="progress-bar"><div className="progress-bar-fill" style={{width: `${serapan > 100 ? 100 : serapan}%`}}></div></div></div>
                                            <div className="item-status"><span className={`status-badge status-${(item.status || '').toLowerCase().replace(/\s/g, '-')}`}>{item.status}</span>{item.linkSPJ && <a href={item.linkSPJ} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="link-icon"><LinkIcon size={14} title="Lihat SPJ"/></a>}</div>
                                            <div className="item-actions"><List size={18} title="Lihat Rincian"/></div>
                                        </div>
                                    )
                                }) : <EmptyState text="Tidak Ada Data Program" subtext="Tidak ada program yang cocok dengan filter yang dipilih."/>}
                            </div>
                            
                            {/* Paginasi Diletakkan di bawah item-list */}
                            <Pagination 
                                totalPages={totalPages} 
                                currentPage={currentPage} 
                                onPageChange={setCurrentPage} 
                            />
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};

export default PublicTransparencyPage;