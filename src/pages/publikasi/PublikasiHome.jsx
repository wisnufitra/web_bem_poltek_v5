import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { db } from "../../firebase/firebaseConfig";
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from "firebase/firestore";
import { 
  Search, Filter, ChevronLeft, ChevronRight, BookOpen, 
  Info, HelpCircle, FileText, Shield, Phone, 
  Users, Eye, Download, UploadCloud, Plus 
} from 'lucide-react';

const PublikasiHome = () => {
  // --- STATE DATA ---
  const [allDocs, setAllDocs] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  // --- STATE OPTIONS ---
  const [prodiOptions, setProdiOptions] = useState([]);
  const [jenisOptions, setJenisOptions] = useState([]);
  const [tahunOptions, setTahunOptions] = useState([]);

  // --- STATE FILTER & PAGINATION ---
  const [filters, setFilters] = useState({
    keyword: "",
    prodi: "",
    jenis_karya: "",
    tahun: ""
  });
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 5; 

  // State Statistik
  const [stats, setStats] = useState({ totalDocs: 0, totalViews: 0, totalAuthors: 0, totalDownloads: 0 });

  // --- 1. INITIAL FETCH ---
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        // A. Metadata
        const metaRef = doc(db, "repository_settings", "metadata_options");
        const metaSnap = await getDoc(metaRef);
        if (metaSnap.exists()) {
          const d = metaSnap.data();
          setProdiOptions(d.prodi_list || ["Teknokimia Nuklir", "Elektronika Instrumentasi", "Elektromekanika"]); 
          setJenisOptions(d.jenis_karya_list || ["Paper", "Tugas Akhir", "PKL"]);
        }

        // B. Tahun
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let y = currentYear; y >= 2020; y--) years.push(y.toString());
        setTahunOptions(years);

        // C. Data Repository
        const q = query(
            collection(db, "repository"), 
            where("status", "==", "approved"),
            orderBy("created_at", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const documents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAllDocs(documents);
            
            let views = 0, downloads = 0;
            const authors = new Set();
            documents.forEach(d => {
                views += (d.views || 0);
                downloads += (d.downloads || 0);
                if(d.penulis?.[0]?.nama) authors.add(d.penulis[0].nama);
            });
            setStats({
                totalDocs: documents.length,
                totalViews: views,
                totalDownloads: downloads,
                totalAuthors: authors.size
            });
            
            setLoading(false);
        });

        return () => unsubscribe(); 

      } catch (err) {
        console.error("Error init data:", err);
        setLoading(false);
      }
    };

    initData();
  }, []);

  // --- 2. LOGIC FILTERING ---
  const filteredData = useMemo(() => {
    return allDocs.filter(doc => {
        const searchTerms = filters.keyword.toLowerCase();
        const matchKeyword = !searchTerms || 
            doc.judul.toLowerCase().includes(searchTerms) ||
            doc.penulis[0]?.nama.toLowerCase().includes(searchTerms) ||
            doc.abstrak?.toLowerCase().includes(searchTerms);

        const matchProdi = !filters.prodi || doc.prodi === filters.prodi;
        const matchJenis = !filters.jenis_karya || doc.jenis_karya === filters.jenis_karya;
        const docYear = doc.tanggal_publikasi ? doc.tanggal_publikasi.split('-')[0] : "";
        const matchTahun = !filters.tahun || docYear === filters.tahun;

        return matchKeyword && matchProdi && matchJenis && matchTahun;
    });
  }, [allDocs, filters]);

  // --- 3. PAGINATION ---
  const paginatedData = useMemo(() => {
      const startIndex = (page - 1) * ITEMS_PER_PAGE;
      return filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredData, page]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
        setPage(newPage);
        window.scrollTo({ top: 400, behavior: 'smooth' }); 
    }
  };

  const handleFilterChange = (key, value) => {
      setFilters(prev => ({ ...prev, [key]: value }));
      setPage(1); 
  };

  const resetFilter = () => {
      setFilters({ keyword: "", prodi: "", jenis_karya: "", tahun: "" });
      setPage(1);
  };

  return (
    <div className="pub-wrapper">
      
      {/* HEADER HERO */}
      <header className="pub-header">
         <div className="header-content">
            <div className="header-top-row">
                <span className="badge-repo">REPOSITORY DIGITAL</span>
            </div>
            
            <h1>Pusat Karya Ilmiah & Riset<br/>Mahasiswa Poltek Nuklir</h1>
            <p>Akses terbuka ke berbagai publikasi akademik untuk memajukan ilmu pengetahuan nuklir.</p>
            
            <div className="search-bar-lg">
               <Search className="search-icon" size={20}/>
               <input 
                 type="text" 
                 placeholder="Cari judul, penulis, atau topik..." 
                 value={filters.keyword}
                 onChange={(e) => handleFilterChange('keyword', e.target.value)}
               />
            </div>

            <div className="hero-stats">
               <div className="stat-pill"><FileText size={14}/> <strong>{stats.totalDocs}</strong> Dokumen</div>
               <div className="stat-pill"><Users size={14}/> <strong>{stats.totalAuthors}</strong> Kontributor</div>
               <div className="stat-pill"><Eye size={14}/> <strong>{stats.totalViews}</strong> Pembaca</div>
               <div className="stat-pill"><Download size={14}/> <strong>{stats.totalDownloads}</strong> Unduhan</div>
            </div>
         </div>
      </header>

      <div className="pub-container">
        
        {/* SIDEBAR FILTER */}
        <aside className="filters">
           
           {/* === KOTAK UPLOAD SIDEBAR (BARU & PENTING) === */}
           <div className="card sidebar-card upload-card">
               <div className="card-head"><UploadCloud size={16}/> Submit Karya</div>
               <p>Mahasiswa Poltek Nuklir? Arsipkan karya tulis ilmiah Anda sekarang.</p>
               <Link to="/publikasi/submit" className="btn-upload-block">
                  <UploadCloud size={16}/> Submit Sekarang
               </Link>
           </div>

           <div className="card sidebar-card info-card-side">
               <div className="card-head"><Info size={16}/> Bantuan & Informasi</div>
               <ul>
                  <li><Link to="/publikasi/bantuan"><HelpCircle size={16}/> Pusat Bantuan</Link></li>
                  <li><Link to="/publikasi/panduan"><FileText size={16}/> Panduan Upload</Link></li>
                  <li><Link to="/publikasi/kebijakan"><Shield size={16}/> Kebijakan Privasi</Link></li>
                  <li><Link to="/publikasi/kontak"><Phone size={16}/> Kontak Admin</Link></li>
               </ul>
           </div>

           <div className="card sidebar-card">
              <div className="filter-group">
                 <div className="filter-head"><Filter size={16}/> Filter Hasil</div>
              </div>
              
              <div className="filter-group">
                 <label>Tahun Terbit</label>
                 <select value={filters.tahun} onChange={(e) => handleFilterChange('tahun', e.target.value)}>
                    <option value="">Semua Tahun</option>
                    {tahunOptions.map(t => <option key={t} value={t}>{t}</option>)}
                 </select>
              </div>

              <div className="filter-group">
                 <label>Program Studi</label>
                 <select value={filters.prodi} onChange={(e) => handleFilterChange('prodi', e.target.value)}>
                    <option value="">Semua Prodi</option>
                    {prodiOptions.map((p, idx) => <option key={idx} value={p}>{p}</option>)}
                 </select>
              </div>

              <div className="filter-group">
                 <label>Jenis Koleksi</label>
                 <select value={filters.jenis_karya} onChange={(e) => handleFilterChange('jenis_karya', e.target.value)}>
                    <option value="">Semua Jenis</option>
                    {jenisOptions.map((j, idx) => <option key={idx} value={j}>{j}</option>)}
                 </select>
              </div>

              <button onClick={resetFilter} className="btn-reset-sidebar">Reset Filter</button>
           </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="results">
           
           <div className="results-header">
              <h2>Daftar Publikasi Terbaru</h2>
              <span className="count-badge">
                 {filteredData.length} Dokumen {filters.keyword && `untuk "${filters.keyword}"`}
              </span>
           </div>

           {loading ? (
              <div className="scholar-loading"><div className="spinner"></div> Sedang memuat data...</div>
           ) : paginatedData.length === 0 ? (
              <div className="scholar-empty">
                 <BookOpen size={48} />
                 <h3>Tidak ada dokumen ditemukan</h3>
                 <p>Coba gunakan kata kunci lain atau reset filter.</p>
                 <button onClick={resetFilter} style={{marginTop: '10px', padding: '8px 16px', background:'#e2e8f0', border:'none', borderRadius:'6px', cursor:'pointer'}}>Reset Semua Filter</button>
              </div>
           ) : (
              <div className="scholar-list">
                 {paginatedData.map(doc => (
                    <div key={doc.id} className="scholar-item">
                       <Link to={`/publikasi/${encodeURIComponent(doc.submission_id)}`} className="item-title">
                          {doc.judul}
                       </Link>
                       
                       <div className="item-meta">
                          <span className="author">{doc.penulis?.[0]?.nama || 'Penulis Tidak Diketahui'}</span>
                          <span className="separator">-</span>
                          <span className="source">{doc.jenis_karya}</span>
                          <span className="separator">,</span>
                          <span className="year">{doc.tanggal_publikasi?.split('-')[0]}</span>
                          <span className="separator">-</span>
                          <span className="publisher">Poltek Nuklir</span>
                       </div>

                       <div className="item-abstract">
                          {doc.abstrak?.length > 220 ? doc.abstrak.substring(0, 220) + "..." : doc.abstrak}
                       </div>

                       <div className="item-footer">
                          <div className="footer-links">
                             <Link to={`/publikasi/${encodeURIComponent(doc.submission_id)}`} className="action-link">Lihat Detail</Link>
                             <a href={doc.file_view_url} target="_blank" rel="noreferrer" className="action-link">Pratinjau PDF</a>
                             <span className="stats-tiny"><Eye size={12}/> {doc.views || 0}</span>
                          </div>
                          <span className="badge-prodi">{doc.prodi}</span>
                       </div>
                    </div>
                 ))}
              </div>
           )}

           {/* PAGINATION BUTTONS */}
           {filteredData.length > ITEMS_PER_PAGE && (
               <div className="scholar-pagination">
                  <button onClick={() => handlePageChange(page - 1)} disabled={page === 1} className="btn-page">
                     <ChevronLeft size={16}/> Sebelumnya
                  </button>
                  <span className="page-info">Halaman {page} dari {totalPages}</span>
                  <button onClick={() => handlePageChange(page + 1)} disabled={page === totalPages} className="btn-page">
                     Selanjutnya <ChevronRight size={16}/>
                  </button>
               </div>
           )}

        </main>
      </div>

      <style>{`
        .pub-wrapper { background: #fff; min-height: 100vh; font-family: 'Inter', sans-serif; }
        
        /* HEADER HERO */
        .pub-header { background: #0f172a; color: white; padding: 40px 20px 60px; text-align: center; position: relative; }
        .pub-header::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 40px; background: #fff; border-radius: 50% 50% 0 0 / 40px 40px 0 0; }
        
        .header-content { max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; gap: 16px; position: relative; z-index: 10; }
        
        /* NEW: Header Top Row for Badge & Upload Button */
        .header-top-row { display: flex; align-items: center; gap: 16px; margin-bottom: 8px; flex-wrap: wrap; justify-content: center; }
        .badge-repo { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); padding: 6px 14px; border-radius: 30px; font-size: 0.75rem; font-weight: 700; letter-spacing: 1px; color: #bae6fd; }
        
        /* TOMBOL UPLOAD DI HEADER */
        .btn-upload-header { display: flex; align-items: center; gap: 6px; background: #3b82f6; color: white; padding: 6px 14px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; text-decoration: none; transition: 0.2s; }
        .btn-upload-header:hover { background: #2563eb; transform: translateY(-2px); }

        .pub-header h1 { font-size: 2.5rem; font-weight: 800; margin: 0; line-height: 1.2; }
        .pub-header p { color: #94a3b8; font-size: 1.1rem; margin: 0 0 10px; max-width: 600px; }
        
        .search-bar-lg { position: relative; width: 100%; max-width: 600px; margin-bottom: 30px; }
        .search-icon { position: absolute; left: 20px; top: 50%; transform: translateY(-50%); color: #64748b; }
        .search-bar-lg input { width: 100%; padding: 18px 20px 18px 54px; border-radius: 50px; border: none; font-size: 1rem; outline: none; box-shadow: 0 10px 30px rgba(0,0,0,0.3); transition: 0.2s; }
        .search-bar-lg input:focus { transform: scale(1.02); }
        
        .hero-stats { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-top: -20px; }
        .stat-pill { background: rgba(255,255,255,0.1); backdrop-filter: blur(5px); border: 1px solid rgba(255,255,255,0.15); padding: 8px 16px; border-radius: 20px; font-size: 0.9rem; color: #e0f2fe; display: flex; align-items: center; gap: 8px; }

        /* LAYOUT UTAMA */
        .pub-container { max-width: 1200px; margin: 0 auto 60px; padding: 0 20px; display: grid; grid-template-columns: 280px 1fr; gap: 50px; position: relative; z-index: 20; }
        
        /* SIDEBAR */
        .filters { display: flex; flex-direction: column; gap: 24px; padding-top: 20px; }
        .sidebar-card { background: white; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .card-head, .filter-head { font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; font-size: 1rem; }
        
        /* STYLE UNTUK TOMBOL UPLOAD SIDEBAR */
        .upload-card { background: #eff6ff; border-color: #bfdbfe; }
        .upload-card .card-head { color: #1e40af; border-color: #dbeafe; }
        .upload-card p { font-size: 0.9rem; color: #1e3a8a; margin-bottom: 16px; line-height: 1.5; }
        .btn-upload-block { display: flex; align-items: center; justify-content: center; gap: 8px; background: #2563eb; color: white; padding: 10px; border-radius: 8px; font-weight: 600; text-decoration: none; transition: 0.2s; box-shadow: 0 2px 4px rgba(37,99,235,0.2); }
        .btn-upload-block:hover { background: #1d4ed8; transform: translateY(-2px); }

        .filter-group { margin-bottom: 20px; }
        .filter-group label { display: block; font-weight: 600; font-size: 0.85rem; color: #475569; margin-bottom: 8px; }
        .filter-group select { width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e0; font-size: 0.9rem; background: #fff; outline: none; }
        .btn-reset-sidebar { width: 100%; padding: 10px; background: #f1f5f9; color: #475569; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.85rem; }
        .btn-reset-sidebar:hover { background: #e2e8f0; }

        .info-card-side ul { list-style: none; padding: 0; margin: 0; }
        .info-card-side li { margin-bottom: 10px; }
        .info-card-side a { text-decoration: none; color: #475569; font-size: 0.9rem; display: flex; align-items: center; gap: 8px; transition: 0.2s; }
        .info-card-side a:hover { color: #3b82f6; transform: translateX(4px); }

        /* RESULTS AREA */
        .results { padding-top: 20px; }
        .results-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
        .results-header h2 { margin: 0; font-size: 1.4rem; color: #0f172a; }
        .count-badge { background: #e2e8f0; color: #475569; padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; }

        .scholar-list { display: flex; flex-direction: column; gap: 30px; }
        .scholar-item { padding-bottom: 20px; }
        
        .item-title { display: block; font-size: 1.25rem; color: #1a0dab; text-decoration: none; font-weight: 500; margin-bottom: 6px; font-family: 'Arial', sans-serif; }
        .item-title:hover { text-decoration: underline; }
        
        .item-meta { font-size: 0.9rem; color: #006621; margin-bottom: 8px; font-family: 'Arial', sans-serif; }
        .item-meta .separator { color: #5f6368; margin: 0 4px; }
        
        .item-abstract { font-size: 0.95rem; color: #4d5156; line-height: 1.6; margin-bottom: 10px; font-family: 'Arial', sans-serif; }
        
        .item-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
        .footer-links { font-size: 0.85rem; display: flex; gap: 16px; align-items: center; }
        .footer-links .action-link { color: #1a0dab; text-decoration: none; font-weight: 500; }
        .footer-links .action-link:hover { text-decoration: underline; }
        .stats-tiny { color: #94a3b8; display: flex; align-items: center; gap: 4px; font-size: 0.8rem; }
        
        .badge-prodi { font-size: 0.75rem; background: #f1f3f4; color: #5f6368; padding: 2px 8px; border-radius: 4px; font-weight: 600; }

        .scholar-loading, .scholar-empty { text-align: center; padding: 60px 20px; color: #64748b; font-style: italic; }
        .scholar-empty svg { margin-bottom: 16px; color: #cbd5e1; }
        .spinner { border: 3px solid #e2e8f0; border-top: 3px solid #3b82f6; border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite; display: inline-block; vertical-align: middle; margin-right: 10px; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        /* PAGINATION */
        .scholar-pagination { display: flex; justify-content: center; align-items: center; gap: 20px; margin-top: 50px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
        .btn-page { display: flex; align-items: center; gap: 8px; border: none; background: none; color: #1a73e8; cursor: pointer; font-size: 0.9rem; font-weight: 600; }
        .btn-page:disabled { color: #cbd5e1; cursor: not-allowed; }
        .page-info { color: #0f172a; font-size: 0.9rem; }

        @media (max-width: 900px) {
           .pub-container { grid-template-columns: 1fr; }
           .filters { display: none; }
           .pub-header { padding-bottom: 60px; }
        }
      `}</style>
    </div>
  );
};

export default PublikasiHome;