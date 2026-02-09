// src/pages/Berita.js
import React, { useEffect, useState, useMemo } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import ImageSlider from "../components/ImageSlider";
import { Newspaper, Search, Filter, ArrowDownUp, Calendar, User, Tag, Instagram, ChevronLeft, ChevronRight } from "lucide-react";

const Berita = () => {
    const [berita, setBerita] = useState([]);
    const [kategoriFilter, setKategoriFilter] = useState("Semua");
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortBy, setSortBy] = useState("dibuatPada");
    const [loading, setLoading] = useState(true);
    const itemsPerPage = 5;

    useEffect(() => {
        const q = query(collection(db, "berita"), orderBy("dibuatPada", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const beritaList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setBerita(beritaList);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const processedBerita = useMemo(() => {
        return berita
            .filter(item => kategoriFilter === "Semua" || item.kategori === kategoriFilter)
            .filter(item => item.judul.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => {
                if (sortBy === 'tanggalKegiatan') {
                    if (a.tanggalKegiatan && !b.tanggalKegiatan) return -1;
                    if (!a.tanggalKegiatan && b.tanggalKegiatan) return 1;
                    return new Date(b.tanggalKegiatan) - new Date(a.tanggalKegiatan);
                }
                return (b.dibuatPada?.seconds || 0) - (a.dibuatPada?.seconds || 0);
            });
    }, [berita, kategoriFilter, searchTerm, sortBy]);

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return 'Tanggal tidak tersedia';
        return new Date(timestamp.seconds * 1000).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
    };

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = processedBerita.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(processedBerita.length / itemsPerPage);

    const handlePaginate = (pageNumber) => {
        if (pageNumber < 1 || pageNumber > totalPages) return;
        setCurrentPage(pageNumber);
        window.scrollTo(0, 0);
    };

    useEffect(() => {
        document.head.appendChild(styleSheet);
        return () => {
            document.head.removeChild(styleSheet);
        };
    }, []);

    return (
        <div className="berita-page-wrapper">
            <header className="page-header">
                <div className="header-content-wrapper">
                    <Newspaper size={40} />
                    <div>
                        <h1 className="page-title">Arsip Berita & Kegiatan</h1>
                        <p className="page-subtitle">Ikuti perkembangan dan informasi terbaru dari kegiatan kemahasiswaan BEM Poltek Nuklir.</p>
                    </div>
                </div>
            </header>

            <main className="berita-page-content">
                <div className="filter-controls">
                    <div className="input-with-icon search-bar">
                        <Search size={18} />
                        <input type="text" placeholder="Cari judul berita..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input" />
                    </div>
                    <div className="input-with-icon">
                        <Filter size={18} />
                        <select value={kategoriFilter} onChange={(e) => setKategoriFilter(e.target.value)} className="input">
                            <option value="Semua">Semua Kategori</option>
                            <option value="Umum">Umum</option>
                            <option value="Kegiatan">Kegiatan</option>
                            <option value="Informasi">Informasi</option>
                            <option value="Pengumuman">Pengumuman</option>
                        </select>
                    </div>
                    <div className="input-with-icon">
                        <ArrowDownUp size={18} />
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="input">
                            <option value="dibuatPada">Urutkan: Terbaru</option>
                            <option value="tanggalKegiatan">Urutkan: Tgl. Kegiatan</option>
                        </select>
                    </div>
                </div>

                {loading ? <p style={{textAlign: 'center', padding: '40px'}}>Memuat berita...</p> : 
                currentItems.length > 0 ? (
                    currentItems.map((item) => (
                        <div key={item.id} className="berita-card">
                            {item.gambarList && item.gambarList.length > 0 && (
                                <ImageSlider images={item.gambarList} />
                            )}
                            <div className="berita-content">
                                <h2 className="berita-title">{item.judul}</h2>
                                <div className="berita-meta">
                                    <div className="meta-item">
                                        <Calendar size={14} />
                                        <span>
                                            {item.tanggalKegiatan 
                                                // Jika ada tanggal kegiatan, format dan tampilkan
                                                ? `Tanggal Kegiatan: ${new Date(item.tanggalKegiatan).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`
                                                // Jika tidak ada, tampilkan tanggal publikasi
                                                : `Dipublikasikan: ${formatTimestamp(item.dibuatPada)}`
                                            }
                                        </span>
                                    </div>
                                    <div className="meta-item"><User size={14} /><span>Oleh <strong>{item.dibuatOleh}</strong></span></div>
                                    <div className="meta-item"><Tag size={14} /><span>Kategori: {item.kategori}</span></div>
                                </div>
                                <p className="berita-deskripsi">{item.deskripsi}</p>
                                {item.linkInstagram && (
                                    <a href={item.linkInstagram} target="_blank" rel="noopener noreferrer" className="button button-instagram">
                                        <Instagram size={16}/> Lihat di Instagram
                                    </a>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <p style={{textAlign: 'center', padding: '40px'}}>Tidak ada berita yang ditemukan.</p>
                )}

                {totalPages > 1 && (
                    <div className="pagination">
                        <button onClick={() => handlePaginate(currentPage - 1)} disabled={currentPage === 1} className="page-button nav-button">
                            <ChevronLeft size={16} /> Sebelumnya
                        </button>
                        <span className="page-info">Halaman {currentPage} dari {totalPages}</span>
                        <button onClick={() => handlePaginate(currentPage + 1)} disabled={currentPage === totalPages} className="page-button nav-button">
                            Berikutnya <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
};

const styleSheet = document.createElement("style");
styleSheet.innerHTML = `
    .berita-page-wrapper { font-family: 'Inter', sans-serif; background-color: #f8fafc; }

    /* Header Styles (Consistent with other pages) */
    .page-header { 
        padding: 48px 0; /* Padding vertikal mobile */
        background-color: #eff6ff; 
        border-bottom: 1px solid #dbeafe;
    }
    .header-content-wrapper { max-width: 1280px; margin: 0 auto; padding: 0 24px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; color: #1e293b; }
    .page-header svg { color: #1d4ed8; margin-bottom: 8px; }
    .page-title { font-size: 2.5rem; font-weight: 800; margin: 0; }
    .page-subtitle { color: #64748b; font-size: 1.1rem; margin: 8px auto 0; max-width: 600px; }

    /* Main Content */
    .berita-page-content { 
        max-width: 900px; 
        margin: 0 auto; /* ✅ UBAH MENJADI SEPERTI INI */
        padding: 0 24px 48px 24px; 
    }
    
    /* Filter Controls */
    .filter-controls { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 32px; background-color: #fff; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; }
    .input-with-icon { position: relative; display: flex; align-items: center; flex-grow: 1; }
    .input-with-icon svg { position: absolute; left: 14px; color: #9ca3af; pointer-events: none; }
    .input { display: block; width: 100%; padding: 10px 12px 10px 42px; border-radius: 8px; border: 1px solid #cbd5e0; font-size: 1rem; background-color: #fff; }
    .input:focus { border-color: #3b82f6; outline: none; }
    .search-bar { min-width: 250px; }

    /* Berita Card */
    .berita-card { background-color: #fff; border: 1px solid #e2e8f0; border-radius: 16px; margin-bottom: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.04); overflow: hidden; }
    .berita-content { padding: 24px; }
    .berita-title { font-size: 1.75rem; font-weight: 700; color: #1e293b; margin: 0 0 16px 0; }
    .berita-meta { display: flex; flex-wrap: wrap; gap: 12px 24px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #f1f5f9; }
    .meta-item { display: flex; align-items: center; gap: 8px; color: #64748b; font-size: 0.9rem; }
    .meta-item svg { color: #9ca3af; flex-shrink: 0; }
    .berita-deskripsi { white-space: pre-wrap; line-height: 1.7; color: #334155; margin-bottom: 24px; }
    .button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.9rem; text-decoration: none; border: none; transition: all 0.2s; }
    .button-instagram { color: #fff; background: #d62976; background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%); }
    .button-instagram:hover { transform: translateY(-2px); box-shadow: 0 4px 10px rgba(214, 41, 118, 0.3); }

    /* Pagination */
    .pagination { display: flex; justify-content: space-between; align-items: center; margin-top: 32px; }
    .page-info { color: #64748b; font-size: 0.9rem; font-weight: 500; }
    .page-button { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border: 1px solid #e2e8f0; background-color: #fff; border-radius: 8px; cursor: pointer; font-weight: 600; color: #334155; transition: all 0.2s; }
    .page-button:not(:disabled):hover { border-color: #3b82f6; color: #3b82f6; }
    .page-button:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Media Queries */
    @media (max-width: 768px) {
        .page-title { font-size: 1.75rem; }
        .berita-page-content { margin-top: 32px; padding: 0 16px 32px 16px; }
        .filter-controls { flex-direction: column; }
        .berita-title { font-size: 1.5rem; }
    }
`;

export default Berita;