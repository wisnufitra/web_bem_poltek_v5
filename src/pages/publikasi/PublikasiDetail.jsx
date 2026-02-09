import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from "react-router-dom";
import { db } from "../../firebase/firebaseConfig";
import { collection, query, where, getDocs, updateDoc, doc, increment, limit, orderBy } from "firebase/firestore";
import { 
  FileText, Calendar, User, Download, Eye, ArrowLeft, 
  Quote, Share2, Tag, Globe, AlertCircle, Maximize2, 
  Check, Copy, Linkedin, MessageCircle, GraduationCap, Mail, BookOpen,
  Clock, XCircle, ArrowRight 
} from 'lucide-react';

const PublikasiDetail = () => {
  const { id } = useParams(); 
  const decodedID = decodeURIComponent(id);

  const [data, setData] = useState(null);
  const [relatedDocs, setRelatedDocs] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false); 

  const incrementedID = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);

    const fetchData = async () => {
      setLoading(true);
      setRelatedDocs([]); 
      
      try {
        // --- 1. FETCH DOKUMEN UTAMA ---
        let q = query(
            collection(db, "repository"), 
            where("submission_id", "==", decodedID),
            where("status", "==", "approved")
        );
        
        let querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            // Cek Admin Logic (sama seperti sebelumnya)
            const qAdmin = query(collection(db, "repository"), where("submission_id", "==", decodedID));
            try {
                const snapAdmin = await getDocs(qAdmin);
                if (!snapAdmin.empty) {
                    const docData = snapAdmin.docs[0];
                    setData({ id: docData.id, ...docData.data() });
                } else {
                    setError(true);
                }
            } catch (adminErr) {
                if (adminErr.code === 'permission-denied') {
                    setData({ status: 'pending', submission_id: decodedID });
                    setError(false);
                } else {
                    setError(true);
                }
            }
        } else {
            // Dokumen Ketemu & Approved
            const docData = querySnapshot.docs[0];
            const realData = { id: docData.id, ...docData.data() };
            setData(realData);
            
            if (incrementedID.current !== docData.id) {
                updateDoc(doc(db, "repository", docData.id), { views: increment(1) });
                incrementedID.current = docData.id;
            }

            // --- 2. FETCH DOKUMEN TERKAIT ---
            try {
                const qRelated = query(
                    collection(db, "repository"),
                    where("status", "==", "approved"),
                    where("prodi", "==", realData.prodi),
                    orderBy("created_at", "desc"),
                    limit(5) 
                );
                
                const snapRelated = await getDocs(qRelated);
                const relatedList = snapRelated.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .filter(d => d.submission_id !== realData.submission_id)
                    .slice(0, 3); 

                setRelatedDocs(relatedList);
            } catch (errRelated) {
                console.log("Related warning:", errRelated.message);
            }
        }
      } catch (err) {
        console.error("Error fetching doc:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [decodedID]);

  const handleDownload = () => {
    if (data) {
      updateDoc(doc(db, "repository", data.id), { downloads: increment(1) });
      window.open(data.file_url, '_blank');
    }
  };

  const copyCitation = () => {
    const year = data.tanggal_publikasi ? data.tanggal_publikasi.split('-')[0] : new Date().getFullYear();
    const text = `${data.penulis[0].nama} et al. (${year}). ${data.judul}. Repository BEM KM Poltek Nuklir.`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadCitation = (format) => {
      const year = data.tanggal_publikasi ? data.tanggal_publikasi.split('-')[0] : new Date().getFullYear();
      const authorName = data.penulis[0].nama.split(' ').pop(); 
      const filename = `citation-${data.submission_id}.${format}`;
      
      let content = "";
      if (format === 'bib') {
          content = `@article{${authorName}${year}, title={${data.judul}}, author={${data.penulis.map(p => p.nama).join(' and ')}}, year={${year}}, publisher={Poltek Nuklir}, url={${window.location.href}}}`;
      } else if (format === 'ris') {
          content = `TY  - JOUR\nTI  - ${data.judul}\n${data.penulis.map(p => `AU  - ${p.nama}`).join('\n')}\nPY  - ${year}\nPB  - Poltek Nuklir\nUR  - ${window.location.href}\nER  -`;
      }

      const element = document.createElement("a");
      const file = new Blob([content], {type: 'text/plain'});
      element.href = URL.createObjectURL(file);
      element.download = filename;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const shareLink = window.location.href;
  const shareToWA = () => window.open(`https://wa.me/?text=Baca karya ilmiah ini: ${data.judul} - ${shareLink}`, '_blank');
  const shareToLinkedIn = () => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${shareLink}`, '_blank');

  const getPreviewLink = (url) => {
    if (!url) return "";
    return url.replace(/\/view.*/, '/preview').replace(/\/edit.*/, '/preview');
  };

  const getQRCode = () => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.href)}`;
  };

  // --- RENDER LOADING ---
  if (loading) return (
    <div className="loader-container">
       <div className="spinner"></div>
       <p>Sedang memuat dokumen...</p>
       <style>{`.loader-container { text-align: center; padding: 100px 20px; color: #64748b; } .spinner { border: 4px solid #e2e8f0; border-top: 4px solid #3b82f6; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 16px; } @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
  
  // --- RENDER ERROR ---
  if (error) return (
    <div className="error-container">
      <AlertCircle size={48} />
      <h2>Dokumen Tidak Ditemukan</h2>
      <p>ID: {decodedID} tidak tersedia atau telah dihapus.</p>
      <Link to="/publikasi" className="btn-back">Kembali ke Repository</Link>
      <style>{`.error-container { text-align: center; padding: 100px 20px; color: #64748b; display: flex; flex-direction: column; align-items: center; } .btn-back { margin-top: 20px; background: #0f172a; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; }`}</style>
    </div>
  );

  // --- RENDER BLOCKED ---
  if (data && data.status !== 'approved') {
    return (
      <div className="detail-wrapper">
        <nav className="detail-nav">
           {/* Perbaikan Class Name agar tidak merusak Navbar Utama */}
           <div className="detail-nav-content"><Link to="/publikasi" className="detail-nav-back"><ArrowLeft size={18} /> Kembali</Link></div>
        </nav>
        <div className="block-container">
           {data.status === 'pending' ? (
             <>
               <Clock size={64} color="#f59e0b" />
               <h2>Dokumen Sedang Diverifikasi</h2>
               <p>Dokumen ini telah diunggah tetapi belum disetujui oleh Admin Repository.</p>
               <div className="status-pill pending">Status: Menunggu Verifikasi</div>
             </>
           ) : (
             <>
               <XCircle size={64} color="#ef4444" />
               <h2>Dokumen Tidak Tersedia</h2>
               <p>Dokumen ini telah ditolak atau ditarik dari publikasi.</p>
               <div className="status-pill rejected">Status: Ditolak</div>
             </>
           )}
           <Link to="/publikasi" className="btn-back-home">Cari Dokumen Lain</Link>
        </div>
        <style>{`
           /* CSS Disini juga saya ubah nama classnya */
           .detail-wrapper { background: #f8fafc; min-height: 100vh; font-family: 'Inter', sans-serif; padding-top:20px; }
           .detail-nav { background: white; border-bottom: 1px solid #e2e8f0; padding: 0 20px; height: 60px; display: flex; align-items: center; }
           .detail-nav-content { width: 100%; max-width: 1200px; margin: 0 auto; }
           .detail-nav-back { text-decoration: none; color: #64748b; font-weight: 500; display: flex; align-items: center; gap: 8px; }
           .block-container { text-align: center; padding: 100px 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
           .block-container h2 { color: #0f172a; margin: 20px 0 8px; font-size: 1.5rem; }
           .block-container p { color: #64748b; max-width: 500px; line-height: 1.6; margin-bottom: 24px; }
           .status-pill { padding: 8px 16px; border-radius: 50px; font-weight: 600; font-size: 0.9rem; margin-bottom: 30px; }
           .status-pill.pending { background: #fffbeb; color: #d97706; border: 1px solid #fcd34d; }
           .status-pill.rejected { background: #fef2f2; color: #ef4444; border: 1px solid #fca5a5; }
           .btn-back-home { background: #0f172a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; transition: 0.2s; }
           .btn-back-home:hover { background: #1e293b; }
        `}</style>
      </div>
    );
  }

  // --- RENDER UTAMA ---
  return (
    <div className="detail-wrapper">
      <nav className="detail-nav">
         {/* PERBAIKAN: Ganti nama class .nav-content jadi .detail-nav-content */}
         <div className="detail-nav-content">
            <Link to="/publikasi" className="detail-nav-back">
              <ArrowLeft size={18} /> Kembali ke List
            </Link>
            <div className="detail-meta-id">ID: {data.submission_id}</div>
         </div>
      </nav>

      <div className="detail-container">
        
        <header className="doc-header">
           <div className="header-badges">
              <span className="type-label">{data.jenis_karya}</span>
              <span className="lang-label">{data.bahasa}</span>
           </div>
           <h1 className="doc-title">{data.judul}</h1>
           <div className="meta-row">
              <div className="meta-item"><Calendar size={16}/> {formatDate(data.tanggal_publikasi)}</div>
              <div className="meta-item"><Globe size={16}/> {data.prodi}</div>
              {data.nama_konferensi && <div className="meta-item badge-conf"><BookOpen size={14}/> {data.nama_konferensi}</div>}
           </div>
        </header>

        <div className="doc-layout">
          
          <main className="main-column">
             <section className="section-card">
                <h3 className="section-head">Abstrak</h3>
                <p className="abstract-text">{data.abstrak}</p>
                <div className="tags-container">
                   {data.kata_kunci?.map((k, i) => (
                      <span key={i} className="tag"><Tag size={12}/> {k}</span>
                   ))}
                </div>
             </section>

             <section className="section-card no-padding">
                <div className="pdf-header-bar">
                   <h3 className="section-head"><FileText size={18}/> Pratinjau Dokumen</h3>
                   <div className="pdf-actions">
                      <a href={data.file_view_url} target="_blank" rel="noreferrer" className="btn-icon-pdf" title="Buka di Tab Baru">
                         <Maximize2 size={16}/>
                      </a>
                   </div>
                </div>
                
                <div className="pdf-viewer-wrapper">
                   <iframe 
                      src={getPreviewLink(data.file_view_url)} 
                      title="Document Preview"
                      allow="autoplay"
                   ></iframe>
                   <div className="pdf-overlay"></div>
                </div>
             </section>

             {data.referensi && (
               <section className="section-card">
                  <h3 className="section-head">Referensi</h3>
                  <div className="references-text">
                     {data.referensi.split('\n').map((ref, idx) => <p key={idx}>{ref}</p>)}
                  </div>
               </section>
             )}

             {relatedDocs.length > 0 && (
                <section className="section-card related-section">
                   <h3 className="section-head">Dokumen Terkait dari {data.prodi}</h3>
                   <div className="related-grid">
                      {relatedDocs.map((item) => (
                         <Link to={`/publikasi/${encodeURIComponent(item.submission_id)}`} key={item.id} className="related-card">
                            <div className="rel-icon"><BookOpen size={24}/></div>
                            <div className="rel-info">
                               <h4>{item.judul}</h4>
                               <div className="rel-meta">
                                  <span>{item.penulis[0].nama}</span> &bull; <span>{item.jenis_karya}</span>
                               </div>
                            </div>
                            <div className="rel-arrow"><ArrowRight size={16}/></div>
                         </Link>
                      ))}
                   </div>
                </section>
             )}
          </main>

          <aside className="sidebar-column">
             <div className="sidebar-sticky">
                
                <div className="info-card credit-card">
                   <h4>Tim Penyusun</h4>
                   <div className="credit-group">
                      <div className="credit-label">Penulis</div>
                      {data.penulis.map((p, i) => (
                         <div key={i} className="person-row">
                            <User size={16} className="icon-user"/>
                            <div>
                               <div className="p-name">{p.nama}</div>
                               <div className="p-sub">{p.nim} • {p.peran}</div>
                            </div>
                         </div>
                      ))}
                   </div>

                   {data.kontributor && data.kontributor.length > 0 && (
                      <>
                        <hr className="divider-sm"/>
                        <div className="credit-group">
                           <div className="credit-label">Pembimbing</div>
                           {data.kontributor.map((k, i) => (
                              <div key={i} className="person-row">
                                 <GraduationCap size={16} className="icon-grad"/>
                                 <div>
                                    <div className="p-name">{k.nama}</div>
                                    <div className="p-sub">{k.peran}</div>
                                 </div>
                              </div>
                           ))}
                        </div>
                      </>
                   )}

                   {data.email_kontak && (
                      <>
                        <hr className="divider-sm"/>
                        <div className="contact-row">
                           <Mail size={14}/> <a href={`mailto:${data.email_kontak}`}>Kontak Penulis</a>
                        </div>
                      </>
                   )}
                </div>

                <div className="action-card">
                   <div className="file-preview-mini">
                      <FileText size={32} strokeWidth={1.5}/>
                      <div>
                         <span className="ext">PDF</span>
                         <span className="size">{(data.file_size/1024/1024).toFixed(2)} MB</span>
                      </div>
                   </div>
                   <button onClick={handleDownload} className="btn-download-lg">
                      <Download size={20}/> Download Full Text
                   </button>
                   <div className="stats-row">
                      <span><Eye size={14}/> {data.views} Views</span>
                      <span><Download size={14}/> {data.downloads} Downloads</span>
                   </div>
                </div>

                <div className="info-card">
                   <h4><Quote size={16}/> Kutipan (APA)</h4>
                   <div className="citation-box">
                      {data.penulis[0].nama} et al. ({data.tanggal_publikasi?.split('-')[0]}). {data.judul}...
                   </div>
                   <button onClick={copyCitation} className="btn-outline-sm">
                      {copied ? <Check size={14}/> : <Copy size={14}/>} {copied ? "Tersalin!" : "Salin Teks"}
                   </button>
                   <div className="citation-actions">
                      <button onClick={() => downloadCitation('bib')} className="btn-mini-tag">BibTeX</button>
                      <button onClick={() => downloadCitation('ris')} className="btn-mini-tag">RIS</button>
                   </div>
                </div>

                <div className="info-card">
                   <h4>Bagikan</h4>
                   <div className="share-buttons">
                      <button onClick={shareToWA} className="btn-icon wa"><MessageCircle size={18}/></button>
                      <button onClick={shareToLinkedIn} className="btn-icon ln"><Linkedin size={18}/></button>
                      <button onClick={() => {navigator.clipboard.writeText(shareLink); alert('Link disalin!')}} className="btn-icon link"><Share2 size={18}/></button>
                   </div>
                   <div className="qr-box">
                      <img src={getQRCode()} alt="QR Code" />
                      <span>Scan akses di HP</span>
                   </div>
                </div>

                <div className="tech-meta">
                   {data.penerbit && <div className="row"><span>Penerbit</span> {data.penerbit}</div>}
                   <div className="row"><span>Lisensi</span> CC-BY-NC 4.0</div>
                   <div className="row"><span>Upload</span> {formatDate(data.created_at?.toDate())}</div>
                </div>

             </div>
          </aside>

        </div>
      </div>

      <style>{`
        /* VARIABEL LOKAL SAJA (HAPUS :ROOT AGAR TIDAK KONFLIK GLOBAL) */
        .detail-wrapper { 
            --primary: #0f172a; --accent: #3b82f6; --bg: #f8fafc; --border: #e2e8f0; 
            --text-main: #1e293b; --text-muted: #64748b; 
            background: var(--bg); min-height: 100vh; font-family: 'Inter', sans-serif; 
            padding-bottom: 60px; 
        }
        
        /* CLASS NAVBAR DETAIL (GANTI NAMA CLASS AGAR UNIK) */
        .detail-nav { background: white; border-bottom: 1px solid var(--border); padding: 0 20px; position: sticky; z-index: 100; box-shadow: 0 2px 10px rgba(0,0,0,0.03); top: 88px; }
        
        .detail-nav-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; height: 60px; }
        
        .detail-nav-back { text-decoration: none; color: var(--text-muted); font-weight: 500; display: flex; align-items: center; gap: 8px; font-size: 0.9rem; transition: 0.2s; }
        .detail-nav-back:hover { color: var(--accent); }
        
        .detail-meta-id { font-family: monospace; background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; color: var(--text-main); }

        .detail-container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }

        .doc-header { margin: 40px 0; border-bottom: 1px solid var(--border); padding-bottom: 30px; }
        .header-badges { display: flex; gap: 8px; margin-bottom: 16px; }
        .type-label { background: #dbeafe; color: #1e40af; font-size: 0.8rem; font-weight: 700; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; }
        .lang-label { background: #f1f5f9; color: #475569; font-size: 0.8rem; font-weight: 600; padding: 4px 10px; border-radius: 20px; }
        .doc-title { font-size: 2.2rem; color: var(--primary); margin: 0 0 20px; line-height: 1.25; font-weight: 800; }
        
        .meta-row { display: flex; gap: 24px; color: var(--text-muted); font-size: 0.95rem; flex-wrap: wrap; }
        .meta-item { display: flex; align-items: center; gap: 6px; }
        .badge-conf { color: #d97706; background: #fef3c7; padding: 2px 8px; border-radius: 4px; font-size: 0.85rem; font-weight: 600; }

        .doc-layout { display: grid; grid-template-columns: 2.5fr 1fr; gap: 40px; }
        
        .section-card { background: white; border: 1px solid var(--border); border-radius: 12px; padding: 30px; margin-bottom: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .section-head { font-size: 1.2rem; margin: 0 0 16px; color: var(--primary); font-weight: 700; display: flex; align-items: center; gap: 8px; }
        .section-head-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .abstract-text { line-height: 1.8; color: #334155; text-align: justify; font-size: 1rem; }
        .tags-container { margin-top: 20px; display: flex; gap: 8px; flex-wrap: wrap; }
        .tag { background: #f1f5f9; color: #475569; padding: 4px 10px; border-radius: 6px; font-size: 0.85rem; display: flex; align-items: center; gap: 4px; }
        
        .section-card.no-padding { padding: 0; overflow: hidden; }
        .pdf-header-bar { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; background: #f8fafc; border-bottom: 1px solid var(--border); }
        .pdf-header-bar .section-head { margin: 0; font-size: 1rem; }
        .btn-icon-pdf { color: var(--text-muted); cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 6px; }
        .btn-icon-pdf:hover { background: #e2e8f0; color: var(--primary); }
        .pdf-viewer-wrapper { position: relative; height: 750px; background: #525659; }
        .pdf-viewer-wrapper iframe { width: 100%; height: 100%; border: none; display: block; }
        .link-fullscreen { color: var(--accent); text-decoration: none; font-size: 0.9rem; font-weight: 600; display: flex; align-items: center; gap: 4px; }
        
        .references-text p { font-size: 0.9rem; color: #475569; margin-bottom: 8px; padding-left: 16px; text-indent: -16px; }

        .related-grid { display: flex; flex-direction: column; gap: 12px; }
        .related-card { display: flex; align-items: center; gap: 16px; padding: 16px; border: 1px solid var(--border); border-radius: 8px; text-decoration: none; transition: 0.2s; background: #fafafa; }
        .related-card:hover { border-color: var(--accent); background: white; transform: translateX(5px); box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .rel-icon { color: #94a3b8; background: white; padding: 10px; border-radius: 8px; border: 1px solid var(--border); }
        .related-card:hover .rel-icon { color: var(--accent); border-color: var(--accent); }
        .rel-info { flex: 1; }
        .rel-info h4 { margin: 0 0 4px; font-size: 1rem; color: var(--text-main); font-weight: 600; }
        .rel-meta { font-size: 0.8rem; color: var(--text-muted); }
        .rel-arrow { color: #cbd5e1; }
        .related-card:hover .rel-arrow { color: var(--accent); }

        .sidebar-sticky { position: sticky; top: 140px; display: flex; flex-direction: column; gap: 20px; }
        .info-card { background: white; padding: 20px; border-radius: 12px; border: 1px solid var(--border); }
        .info-card h4 { margin: 0 0 16px; font-size: 0.95rem; color: var(--primary); display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }
        
        .credit-label { font-size: 0.75rem; text-transform: uppercase; color: #94a3b8; font-weight: 700; margin-bottom: 10px; letter-spacing: 0.5px; }
        .person-row { display: flex; gap: 10px; margin-bottom: 12px; align-items: flex-start; }
        .icon-user { color: #3b82f6; margin-top: 2px; flex-shrink: 0; }
        .icon-grad { color: #f59e0b; margin-top: 2px; flex-shrink: 0; }
        .p-name { font-weight: 600; font-size: 0.9rem; color: #1e293b; line-height: 1.3; }
        .p-sub { font-size: 0.8rem; color: #64748b; margin-top: 1px; }
        .divider-sm { border: none; border-top: 1px solid #f1f5f9; margin: 8px 0 16px; }
        .contact-row { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; }
        .contact-row a { color: #3b82f6; text-decoration: none; font-weight: 500; }

        .action-card { background: white; padding: 24px; border-radius: 12px; border: 1px solid var(--border); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); text-align: center; }
        .file-preview-mini { background: #f1f5f9; width: 64px; height: 80px; margin: 0 auto 16px; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #64748b; border: 1px solid var(--border); }
        .file-preview-mini .ext { font-weight: 800; font-size: 0.9rem; color: #0f172a; }
        .file-preview-mini .size { font-size: 0.6rem; margin-top: 2px; }
        .btn-download-lg { width: 100%; background: var(--primary); color: white; border: none; padding: 14px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: 0.2s; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .btn-download-lg:hover { background: #1e293b; transform: translateY(-2px); }
        .stats-row { display: flex; justify-content: center; gap: 16px; margin-top: 16px; font-size: 0.85rem; color: var(--text-muted); font-weight: 500; }

        .citation-box { background: #f8fafc; padding: 10px; border-radius: 6px; font-family: serif; font-size: 0.9rem; color: #334155; margin-bottom: 12px; font-style: italic; line-height: 1.4; border: 1px dashed var(--border); }
        .btn-outline-sm { width: 100%; border: 1px solid var(--border); background: white; padding: 8px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; color: var(--text-main); font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 6px; transition: 0.2s; }
        .btn-outline-sm:hover { border-color: var(--accent); color: var(--accent); }
        
        .citation-actions { margin-top: 10px; display: flex; gap: 8px; }
        .btn-mini-tag { border: 1px solid var(--border); background: white; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; color: var(--text-muted); cursor: pointer; transition: 0.2s; }
        .btn-mini-tag:hover { background: #f1f5f9; color: var(--primary); border-color: #cbd5e1; }

        .share-buttons { display: flex; gap: 10px; margin-bottom: 20px; }
        .btn-icon { flex: 1; border: 1px solid var(--border); background: white; height: 40px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--text-muted); transition: 0.2s; }
        .btn-icon:hover { color: white; border-color: transparent; }
        .btn-icon.wa:hover { background: #25D366; }
        .btn-icon.ln:hover { background: #0077b5; }
        .btn-icon.link:hover { background: var(--primary); }
        .qr-box { display: flex; flex-direction: column; align-items: center; gap: 8px; padding-top: 16px; border-top: 1px solid var(--border); }
        .qr-box img { width: 100px; height: 100px; mix-blend-mode: multiply; }
        .qr-box span { font-size: 0.75rem; color: var(--text-muted); }

        .tech-meta { font-size: 0.85rem; color: var(--text-muted); margin-top: 20px; }
        .tech-meta .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border); }
        .tech-meta .row:last-child { border: none; }
        .tech-meta span { font-weight: 600; }

        @media (max-width: 900px) {
           .doc-layout { grid-template-columns: 1fr; }
           .sidebar-column { order: -1; }
           .sidebar-sticky { position: static; }
           .doc-title { font-size: 1.8rem; }
           .pdf-viewer { height: 400px; }
        }
      `}</style>
    </div>
  );
};

export default PublikasiDetail;