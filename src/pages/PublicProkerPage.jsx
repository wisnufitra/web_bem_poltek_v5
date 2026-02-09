import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase/firebaseConfig';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { ClipboardList, Calendar, Users, Search, ChevronLeft, ChevronRight, X, FileText, CheckCircle2, AlertTriangle, Lightbulb, BookOpen, Filter } from 'lucide-react';

// --- KONSTANTA ---
const kementerianOptions = ["Semua Kementerian", "Pengurus Harian", "Inspektorat Jenderal", "Sekretariat Jenderal", "Kementerian Keuangan", "Kementerian Dalam Negeri", "Kementerian Luar Negeri", "Kementerian Pemuda dan Olahraga (PORA)", "Kementerian PSDM", "Kementerian Komunikasi dan Informasi (KOMINFO)", "Kementerian Ekonomi Kreatif"];
const statusOptions = ["Semua Status", "Perencanaan", "Sedang Berjalan", "Selesai", "Dibatalkan"];
const periodeOptions = ["Semua Periode", "2023", "2024", "2025", "2026"];
const ITEMS_PER_PAGE = 6; // Menampilkan 6 item per halaman agar grid rapi

// --- SUB-COMPONENTS ---
const EmptyState = ({ text, subtext }) => ( 
    <div className="empty-state">
        <div className="empty-icon-bg"><ClipboardList size={40} /></div>
        <h3 className="empty-state-text">{text}</h3>
        <p className="empty-state-subtext">{subtext}</p>
    </div> 
);

const DetailModal = ({ proker, onClose }) => {
    if (!proker) return null;
    const renderText = (text) => text ? text.split('\n').map((str, i) => <p key={i}>{str}</p>) : <p className="text-muted italic">Tidak ada data / Belum diisi.</p>;

    // Helper untuk warna status
    const getStatusClass = (status) => {
        const s = (status || '').toLowerCase();
        if(s === 'selesai') return 'status-success';
        if(s === 'sedang berjalan') return 'status-blue';
        if(s === 'dibatalkan') return 'status-red';
        return 'status-gray';
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="detail-modal" onClick={e => e.stopPropagation()}>
                {/* Header Modal */}
                <div className="dm-header">
                    <div className="dm-header-left">
                        <div className="dm-badges">
                            <span className="badge-dept">{proker.kementerianPelaksana}</span>
                            <span className="badge-periode">{proker.periode || 'N/A'}</span>
                        </div>
                        <h2 className="dm-title">{proker.namaProgram}</h2>
                    </div>
                    <button onClick={onClose} className="dm-close-btn" title="Tutup"><X size={24}/></button>
                </div>
                
                {/* Content Scrollable */}
                <div className="dm-content">
                    {/* Ringkasan Data */}
                    <div className="dm-summary-card">
                        <div className="dm-stat">
                            <span className="dm-label">Status Saat Ini</span>
                            <span className={`status-pill ${getStatusClass(proker.statusProker)}`}>{proker.statusProker}</span>
                        </div>
                        <div className="dm-stat border-l">
                            <span className="dm-label">Tanggal Pelaksanaan</span>
                            <div className="dm-value flex-center"><Calendar size={14}/> {proker.tanggalPelaksanaan ? new Date(proker.tanggalPelaksanaan).toLocaleDateString('id-ID', {dateStyle: 'long'}) : '-'}</div>
                        </div>
                        <div className="dm-stat border-l">
                            <span className="dm-label">Realisasi Peserta</span>
                            <div className="dm-value flex-center"><Users size={14}/> {proker.jumlahPesertaRealisasi || 0} Orang</div>
                        </div>
                    </div>

                    <div className="dm-grid">
                        {/* Kolom Kiri */}
                        <div className="dm-left">
                            <div className="dm-section">
                                <h3 className="dm-section-title"><FileText size={18} className="text-slate-500"/> Deskripsi & Detail</h3>
                                <div className="dm-text-box">
                                    {renderText(proker.detailPelaksanaan || proker.deskripsiSingkat)}
                                </div>
                            </div>
                            
                            <div className="dm-section">
                                <h3 className="dm-section-title"><CheckCircle2 size={18} className="text-emerald-600"/> Capaian & Keberhasilan</h3>
                                <div className="dm-text-box success-bg">
                                    {proker.capaianKualitatif ? renderText(proker.capaianKualitatif) : (
                                        <div className="progress-display">
                                            <span>Persentase Kehadiran:</span>
                                            <strong>{proker.targetPeserta > 0 ? ((proker.jumlahPesertaRealisasi/proker.targetPeserta)*100).toFixed(1) : 0}%</strong>
                                            <small>(Target: {proker.targetPeserta} orang)</small>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Kolom Kanan */}
                        <div className="dm-right">
                            <div className="dm-section">
                                <h3 className="dm-section-title"><AlertTriangle size={18} className="text-amber-500"/> Kendala Lapangan</h3>
                                <div className="dm-text-box warning-bg">
                                    {renderText(proker.kendala)}
                                </div>
                            </div>

                            <div className="dm-section">
                                <h3 className="dm-section-title"><Lightbulb size={18} className="text-blue-500"/> Evaluasi & Saran</h3>
                                <div className="saran-wrapper">
                                    <div className="saran-card">
                                        <strong className="saran-label">Untuk Kepengurusan Selanjutnya (Umum):</strong>
                                        <div className="saran-text">{renderText(proker.saranUmum)}</div>
                                    </div>
                                    <div className="saran-card mt-3">
                                        <strong className="saran-label">Saran Teknis (Khusus):</strong>
                                        <div className="saran-text">{renderText(proker.saranKhusus)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Modal */}
                <div className="dm-footer">
                    {proker.linkLPJ && (
                        <a href={proker.linkLPJ} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                            <BookOpen size={16}/> Lihat Dokumen LPJ
                        </a>
                    )}
                    <button onClick={onClose} className="btn btn-secondary">Tutup</button>
                </div>
            </div>
        </div>
    );
};

const PublicProkerPage = () => {
    const [prokerList, setProkerList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ kementerian: 'Semua Kementerian', status: 'Semua Status', periode: 'Semua Periode', searchText: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedProker, setSelectedProker] = useState(null);

    useEffect(() => {
        const styleTag = document.createElement('style'); styleTag.innerHTML = styleSheet; styleTag.id = 'public-proker-style'; document.head.appendChild(styleTag);
        
        // Query untuk mengambil data (pastikan index Firestore sudah dibuat jika error)
        const qProker = query(collection(db, "program_kerja"), where("createdAt", "!=", null), orderBy("createdAt", "desc"));
        
        const unsubProker = onSnapshot(qProker, snapshot => {
            setProkerList(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
            setCurrentPage(1);
        }, (error) => {
            console.error("Error fetching data: ", error);
            setLoading(false);
        });

        return () => { unsubProker(); document.getElementById('public-proker-style')?.remove(); };
    }, []);

    const filteredProkerList = useMemo(() => {
        let list = prokerList;
        if (filters.kementerian !== 'Semua Kementerian') list = list.filter(item => item.kementerianPelaksana === filters.kementerian);
        if (filters.status !== 'Semua Status') list = list.filter(item => item.statusProker === filters.status);
        if (filters.periode !== 'Semua Periode') list = list.filter(item => item.periode === filters.periode);
        if (filters.searchText) {
            const lower = filters.searchText.toLowerCase();
            list = list.filter(item => item.namaProgram?.toLowerCase().includes(lower) || item.deskripsiSingkat?.toLowerCase().includes(lower));
        }
        return list;
    }, [prokerList, filters]);

    const totalPages = Math.ceil(filteredProkerList.length / ITEMS_PER_PAGE);
    const currentProkers = filteredProkerList.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    
    const handlePageChange = (p) => { 
        if(p > 0 && p <= totalPages) { 
            setCurrentPage(p); 
            window.scrollTo({ top: 300, behavior: 'smooth' }); // Scroll halus ke awal list
        }
    };

    // Helper status class untuk card utama
    const getCardStatusClass = (status) => {
        const s = (status || '').toLowerCase();
        if(s.includes('selesai')) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
        if(s.includes('jalan')) return 'text-blue-600 bg-blue-50 border-blue-100';
        if(s.includes('batal')) return 'text-red-600 bg-red-50 border-red-100';
        return 'text-slate-500 bg-slate-100 border-slate-200';
    };

    return (
        <div className="public-page-wrapper">
            {selectedProker && <DetailModal proker={selectedProker} onClose={() => setSelectedProker(null)} />}

            {/* HERO SECTION */}
            <header className="hero-header">
                <div className="hero-content">
                    <h1 className="hero-title">Arsip Program Kerja</h1>
                    <p className="hero-subtitle">Platform transparansi kinerja, laporan pertanggungjawaban, dan evaluasi kegiatan BEM Politeknik Teknologi Nuklir Indonesia.</p>
                </div>
            </header>

            <main className="main-container">
                {/* FILTER BAR */}
                <div className="filter-card">
                    <div className="search-section">
                        <Search className="search-icon" size={20}/>
                        <input 
                            type="text" 
                            className="search-input" 
                            placeholder="Cari nama program atau kata kunci..." 
                            value={filters.searchText} 
                            onChange={e => {setFilters(p=>({...p, searchText:e.target.value})); setCurrentPage(1);}} 
                        />
                    </div>
                    <div className="filter-actions">
                        <div className="select-wrapper">
                            <select value={filters.periode} onChange={e => {setFilters(p=>({...p, periode:e.target.value})); setCurrentPage(1);}}>
                                {periodeOptions.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>
                        <div className="select-wrapper flex-grow">
                            <select value={filters.kementerian} onChange={e => {setFilters(p=>({...p, kementerian:e.target.value})); setCurrentPage(1);}}>
                                {kementerianOptions.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>
                        <div className="select-wrapper">
                            <select value={filters.status} onChange={e => {setFilters(p=>({...p, status:e.target.value})); setCurrentPage(1);}}>
                                {statusOptions.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* CONTENT LIST */}
                <div className="content-area">
                    <div className="list-info">
                        <strong>{filteredProkerList.length}</strong> Program Ditemukan
                        {filters.searchText && <span> untuk pencarian "{filters.searchText}"</span>}
                    </div>

                    {loading ? (
                        <div className="loading-state">Memuat data arsip...</div>
                    ) : (
                        currentProkers.length > 0 ? (
                            <div className="proker-grid">
                                {currentProkers.map(item => (
                                    <div key={item.id} className="proker-card" onClick={() => setSelectedProker(item)}>
                                        <div className="card-top">
                                            <div className="card-badges">
                                                <span className={`status-badge-sm ${getCardStatusClass(item.statusProker)}`}>{item.statusProker}</span>
                                                <span className="periode-badge-sm">{item.periode || '2025'}</span>
                                            </div>
                                            <h3 className="card-title">{item.namaProgram}</h3>
                                            <div className="card-dept">{item.kementerianPelaksana}</div>
                                            <p className="card-desc">{item.deskripsiSingkat || "Tidak ada deskripsi singkat."}</p>
                                        </div>
                                        <div className="card-bottom">
                                            <div className="card-meta">
                                                <span><Calendar size={14}/> {item.tanggalPelaksanaan ? new Date(item.tanggalPelaksanaan).toLocaleDateString('id-ID', {day:'numeric', month:'short'}) : 'TBA'}</span>
                                            </div>
                                            <button className="btn-detail">Detail <ChevronRight size={14}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <EmptyState 
                                text="Data Tidak Ditemukan" 
                                subtext="Coba ubah filter periode atau kata kunci pencarian Anda."
                            />
                        )
                    )}

                    {/* PAGINATION */}
                    {totalPages > 1 && (
                        <div className="pagination-wrapper">
                            <button className="page-btn" disabled={currentPage===1} onClick={()=>handlePageChange(currentPage-1)}>
                                <ChevronLeft size={18}/> Sebelumnya
                            </button>
                            <span className="page-info">Halaman <strong>{currentPage}</strong> dari {totalPages}</span>
                            <button className="page-btn" disabled={currentPage===totalPages} onClick={()=>handlePageChange(currentPage+1)}>
                                Selanjutnya <ChevronRight size={18}/>
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

// CSS STYLE
const styleSheet = `
    /* --- RESET & BASE --- */
    .public-page-wrapper { font-family: 'Inter', sans-serif; background-color: #f8fafc; color: #334155; min-height: 100vh; }
    .text-muted { color: #94a3b8; } .italic { font-style: italic; }
    .flex-center { display: flex; align-items: center; gap: 6px; }

    /* --- HERO SECTION --- */
    .hero-header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #fff; padding: 60px 24px 100px; text-align: center; }
    .hero-content { max-width: 700px; margin: 0 auto; }
    .hero-title { font-size: 2.5rem; font-weight: 800; margin: 0 0 16px; letter-spacing: -0.025em; }
    .hero-subtitle { font-size: 1.1rem; color: #cbd5e1; line-height: 1.6; font-weight: 300; }

    /* --- MAIN CONTAINER --- */
    .main-container { max-width: 1100px; margin: -60px auto 40px; padding: 0 24px; position: relative; z-index: 10; }

    /* --- FILTER CARD --- */
    .filter-card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 16px; }
    
    .search-section { position: relative; width: 100%; }
    .search-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
    .search-input { width: 100%; padding: 14px 16px 14px 48px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 1rem; outline: none; transition: all 0.2s; box-sizing: border-box; }
    .search-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }

    .filter-actions { display: flex; gap: 12px; flex-wrap: wrap; }
    .select-wrapper { flex: 1; min-width: 150px; position: relative; }
    .select-wrapper select { width: 100%; padding: 12px 16px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; background-color: #fff; cursor: pointer; color: #475569; appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); background-position: right 0.75rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; }
    .select-wrapper select:focus { border-color: #3b82f6; outline: none; }
    .flex-grow { flex-grow: 2; }

    /* --- CONTENT LIST --- */
    .content-area { margin-top: 32px; }
    .list-info { margin-bottom: 20px; color: #64748b; font-size: 0.95rem; }
    .loading-state { text-align: center; padding: 40px; color: #94a3b8; font-style: italic; }

    /* --- PROKER GRID & CARD --- */
    .proker-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; }
    
    .proker-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.2s; cursor: pointer; overflow: hidden; height: 100%; position: relative; top: 0; }
    .proker-card:hover { transform: translateY(-4px); box-shadow: 0 12px 20px -8px rgba(0,0,0,0.1); border-color: #cbd5e1; }
    
    .card-top { padding: 24px; flex: 1; }
    .card-badges { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .status-badge-sm { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; padding: 4px 8px; border-radius: 6px; border: 1px solid; }
    .periode-badge-sm { font-size: 0.75rem; font-weight: 600; color: #64748b; background: #f1f5f9; padding: 2px 8px; border-radius: 4px; }
    
    .card-title { font-size: 1.15rem; font-weight: 700; color: #0f172a; margin: 0 0 4px; line-height: 1.4; }
    .card-dept { font-size: 0.8rem; color: #64748b; font-weight: 600; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.025em; }
    .card-desc { font-size: 0.9rem; color: #475569; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; margin: 0; }

    .card-bottom { padding: 16px 24px; background: #f8fafc; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
    .card-meta { font-size: 0.85rem; color: #64748b; display: flex; align-items: center; }
    .card-meta span { display: flex; align-items: center; gap: 6px; }
    .btn-detail { font-size: 0.85rem; font-weight: 600; color: #2563eb; background: none; border: none; cursor: pointer; display: flex; align-items: center; gap: 2px; transition: gap 0.2s; }
    .proker-card:hover .btn-detail { gap: 6px; }

    /* --- PAGINATION --- */
    .pagination-wrapper { display: flex; justify-content: center; align-items: center; gap: 20px; margin-top: 48px; }
    .page-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; font-weight: 600; color: #475569; cursor: pointer; transition: all 0.2s; }
    .page-btn:disabled { opacity: 0.5; cursor: not-allowed; background: #f1f5f9; }
    .page-btn:not(:disabled):hover { border-color: #3b82f6; color: #2563eb; }
    .page-info { font-size: 0.9rem; color: #64748b; }

    /* --- EMPTY STATE --- */
    .empty-state { text-align: center; padding: 60px 20px; }
    .empty-icon-bg { width: 80px; height: 80px; background: #f1f5f9; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: #94a3b8; }
    .empty-state-text { font-size: 1.25rem; font-weight: 700; color: #334155; margin: 0 0 8px; }
    .empty-state-subtext { color: #94a3b8; }

    /* --- MODAL DESIGN --- */
    .modal-backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(4px); z-index: 1000; display: flex; justify-content: center; align-items: center; padding: 20px; opacity: 1; }
    .detail-modal { background: #fff; width: 100%; max-width: 900px; max-height: 90vh; border-radius: 16px; display: flex; flex-direction: column; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); overflow: hidden; animation: modalIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }

    .dm-header { padding: 24px 32px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: flex-start; background: #fff; flex-shrink: 0; }
    .dm-badges { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .badge-dept { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #64748b; background: #f1f5f9; padding: 4px 10px; border-radius: 6px; }
    .badge-periode { font-size: 0.75rem; font-weight: 700; color: #0369a1; background: #e0f2fe; padding: 4px 10px; border-radius: 6px; }
    .dm-title { font-size: 1.5rem; font-weight: 800; color: #0f172a; margin: 0; line-height: 1.3; }
    .dm-close-btn { background: transparent; border: none; color: #94a3b8; cursor: pointer; padding: 8px; border-radius: 8px; transition: all 0.2s; }
    .dm-close-btn:hover { background: #f1f5f9; color: #ef4444; }

    .dm-content { padding: 32px; overflow-y: auto; flex: 1; background: #fcfcfc; }
    
    .dm-summary-card { display: grid; grid-template-columns: repeat(3, 1fr); background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 32px; }
    .dm-stat { padding: 0 24px; display: flex; flex-direction: column; gap: 6px; }
    .border-l { border-left: 1px solid #e2e8f0; }
    .dm-label { font-size: 0.8rem; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .dm-value { font-size: 1rem; font-weight: 600; color: #0f172a; }
    .status-pill { display: inline-block; padding: 4px 12px; border-radius: 99px; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; width: fit-content; }
    .status-success { background: #dcfce7; color: #166534; }
    .status-blue { background: #dbeafe; color: #1e40af; }
    .status-red { background: #fee2e2; color: #991b1b; }
    .status-gray { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }

    .dm-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 32px; }
    .dm-section { margin-bottom: 32px; }
    .dm-section-title { font-size: 1rem; font-weight: 700; color: #334155; margin: 0 0 12px; display: flex; align-items: center; gap: 8px; text-transform: uppercase; }
    
    .dm-text-box { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; font-size: 0.95rem; line-height: 1.6; color: #334155; }
    .success-bg { background: #f0fdf4; border-color: #bbf7d0; color: #166534; }
    .warning-bg { background: #fffbeb; border-color: #fde68a; color: #92400e; }
    .progress-display { display: flex; flex-direction: column; gap: 4px; }
    .progress-display strong { font-size: 1.5rem; color: #166534; }

    .saran-wrapper { display: flex; flex-direction: column; gap: 12px; }
    .saran-card { background: #fff; border: 1px solid #e2e8f0; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 16px; }
    .saran-label { font-size: 0.85rem; color: #3b82f6; display: block; margin-bottom: 8px; text-transform: uppercase; font-weight: 700; }
    .saran-text { font-size: 0.95rem; line-height: 1.6; }

    .dm-footer { padding: 20px 32px; background: #fff; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 12px; flex-shrink: 0; }
    .btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; border: none; font-size: 0.9rem; text-decoration: none; }
    .btn-primary { background: #2563eb; color: #fff; } .btn-primary:hover { background: #1d4ed8; }
    .btn-secondary { background: #f1f5f9; color: #475569; } .btn-secondary:hover { background: #e2e8f0; }
    .mt-3 { margin-top: 12px; }

    @media (max-width: 768px) {
        .page-title { font-size: 1.75rem; }
        .hero-header { padding: 40px 20px 80px; }
        .filter-actions { flex-direction: column; }
        .dm-grid, .dm-summary-card { grid-template-columns: 1fr; gap: 20px; }
        .border-l { border-left: none; border-top: 1px solid #e2e8f0; padding-top: 12px; }
        .dm-stat { padding: 0; }
        .proker-grid { grid-template-columns: 1fr; }
    }
`;

export default PublicProkerPage;