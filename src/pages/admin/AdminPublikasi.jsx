import React, { useState, useEffect, useMemo } from 'react';
import { db } from "../../firebase/firebaseConfig";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import emailjs from '@emailjs/browser';
import { Toaster, toast } from 'react-hot-toast';
import { 
  CheckCircle2, XCircle, Trash2, FileText, Calendar, 
  Search, BookOpen, Clock, Edit, Save, X, 
  Users, GraduationCap, Phone, Mail, Tag, Globe, Plus,
  Printer, RotateCcw, Eye, Download, AlertTriangle, MoreVertical,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Send
} from 'lucide-react';
import logo from "../../assets/logo-bempoltek.png"; // Pastikan path logo sesuai

// --- KOMPONEN TAMBAHAN (DITARUH DI LUAR AGAR RAPI) ---

// --- HELPER: ALGORITMA SIMILARITY (LEVENSHTEIN) ---
// Mengembalikan nilai 0.0 s/d 1.0 (1.0 = persis sama)
const getSimilarity = (s1, s2) => {
  let longer = s1;
  let shorter = s2;
  if (s1.length < s2.length) {
    longer = s2;
    shorter = s1;
  }
  const longerLength = longer.length;
  if (longerLength === 0) {
    return 1.0;
  }
  return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
};

const editDistance = (s1, s2) => {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();
  const costs = new Array();
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) costs[j] = j;
      else {
        if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
};

const SkeletonList = () => {
  return (
    <div className="skeleton-wrapper">
      {[1, 2, 3, 4, 5].map((n) => (
        <div key={n} className="skeleton-card">
          <div style={{display:'flex', justifyContent:'space-between'}}>
             <div style={{width:'100%'}}>
               <div className="sk-line sk-title"></div>
               <div className="sk-line sk-badge"></div>
             </div>
             <div className="sk-line" style={{width:'30px', height:'20px'}}></div>
          </div>
          <div className="sk-line sk-meta"></div>
          <div className="sk-line sk-text"></div>
          <div className="sk-line sk-text-2"></div>
        </div>
      ))}
    </div>
  );
};

const getPreviewLink = (url) => {
    if (!url) return "";
    return url.replace(/\/view.*/, '/preview').replace(/\/edit.*/, '/preview');
};

const PdfPreviewModal = ({ url, onClose }) => (
    <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-panel pdf-panel" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
                <h3>Pratinjau Dokumen</h3>
                <div className="head-actions">
                    <a href={url} target="_blank" rel="noreferrer" className="btn-icon-head" title="Download Asli">
                        <Download size={20}/>
                    </a>
                    <button onClick={onClose} className="btn-close-modal"><X size={24}/></button>
                </div>
            </div>
            <div className="pdf-body">
                <iframe src={getPreviewLink(url)} title="PDF Preview" width="100%" height="100%"></iframe>
            </div>
        </div>
    </div>
);

// --- KOMPONEN SEND MODAL (DIPINDAHKAN KESINI AGAR BISA DIAKSES GLOBAL) ---
const SendModal = ({ docData, onClose, onConfirm, isLoading }) => {
    if (!docData) return null;

    return (
       <div className="modal-backdrop" onClick={onClose}>
          <div className="modal-panel send-panel" onClick={e => e.stopPropagation()}>
          
          {/* Header Visual */}
          <div className="send-header-visual">
             <div className="icon-circle">
                <Mail size={32} color="white"/>
             </div>
          </div>

          <div className="send-body">
             <h3>Konfirmasi Pengiriman</h3>
             <p className="desc-text">
                Sistem akan men-generate bukti PDF dengan QR Code dan mengirimkannya ke email penulis.
             </p>

             <div className="preview-card">
                <div className="preview-row">
                   <span className="label">Penerima:</span>
                   <span className="val highlight">{docData.email_kontak}</span>
                </div>
                <div className="preview-row">
                   <span className="label">Penulis:</span>
                   <span className="val">{docData.penulis && docData.penulis[0]?.nama}</span>
                </div>
                <div className="preview-row">
                   <span className="label">Judul:</span>
                   <span className="val trunc">{docData.judul}</span>
                </div>
             </div>
             
             <div className="info-box">
                <AlertTriangle size={16}/>
                <span>Pastikan data di atas sudah benar sebelum mengirim.</span>
             </div>
          </div>

          <div className="send-footer">
             <button onClick={onClose} className="btn-cancel" disabled={isLoading}>
                Batal
             </button>
             <button onClick={onConfirm} className="btn-confirm-send" disabled={isLoading}>
                {isLoading ? (
                   <>Wait...</> 
                ) : (
                   <><Send size={16}/> Kirim Sekarang</>
                )}
             </button>
          </div>

          </div>
       </div>
    );
};

// --- KOMPONEN UTAMA ---
const AdminPublikasi = () => {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  
  // State untuk Modal & Aksi
  const [selectedDoc, setSelectedDoc] = useState(null); // Untuk Edit/Detail
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null); // Untuk Popup PDF
  const [printingDoc, setPrintingDoc] = useState(null); // Untuk Cetak Bukti
  const [metaOptions, setMetaOptions] = useState({ 
     prodi_list: [], 
     jenis_karya_list: [] 
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [sendingDoc, setSendingDoc] = useState(null); // Data dokumen yang mau dikirim
  const [isSendingProcess, setIsSendingProcess] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchTerm]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "repository_settings", "metadata_options"), (docSnap) => {
      if (docSnap.exists()) {
        setMetaOptions(docSnap.data());
      }
    });
    return () => unsub();
  }, []);

  // 1. Fetch Data
  useEffect(() => {
    const q = query(collection(db, "repository"), orderBy("created_at", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDocs(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 2. Stats & Filter
  const stats = useMemo(() => ({
    total: docs.length,
    pending: docs.filter(d => d.status === 'pending').length,
    approved: docs.filter(d => d.status === 'approved').length,
    rejected: docs.filter(d => d.status === 'rejected').length
  }), [docs]);

  const duplicateIds = useMemo(() => {
    const ids = new Set(); // Set untuk menyimpan ID dokumen yang duplikat
    const threshold = 0.85; // 85% kemiripan dianggap duplikat

    // Loop nested (O(N^2)) - Hati-hati jika data > 2000, tapi untuk ratusan masih kilat
    for (let i = 0; i < docs.length; i++) {
        for (let j = i + 1; j < docs.length; j++) {
            const docA = docs[i];
            const docB = docs[j];

            // Jangan bandingkan jika salah satu sudah ditandai (opsional, tapi biar akurat kita cek semua)
            
            // Cek Kemiripan Judul
            const similarity = getSimilarity(docA.judul, docB.judul);
            
            if (similarity >= threshold) {
                ids.add(docA.id);
                ids.add(docB.id);
            }
        }
    }
    return Array.from(ids);
  }, [docs]);

  const filteredDocs = docs.filter(doc => {
    // A. Filter Status
    let matchesStatus = true;
    if (filterStatus === 'duplicates') {
        matchesStatus = duplicateIds.includes(doc.id);
    } else {
        matchesStatus = filterStatus === 'all' ? true : doc.status === filterStatus;
    }
    
    // B. Filter Pencarian (Advanced)
    if (!searchTerm) return matchesStatus; 

    const lowerTerm = searchTerm.toLowerCase();

    // 1. Cek Field Teks Utama
    const matchTextUtama = 
        (doc.judul || "").toLowerCase().includes(lowerTerm) ||
        (doc.submission_id || "").toLowerCase().includes(lowerTerm) ||
        (doc.abstrak || "").toLowerCase().includes(lowerTerm) ||
        (doc.prodi || "").toLowerCase().includes(lowerTerm) ||
        (doc.jenis_karya || "").toLowerCase().includes(lowerTerm);

    // 2. Cek Daftar Penulis
    const matchPenulis = doc.penulis?.some(p => 
        (p.nama || "").toLowerCase().includes(lowerTerm) || 
        (p.nim || "").toLowerCase().includes(lowerTerm)
    );

    // 3. Cek Daftar Kata Kunci
    const matchKeyword = doc.kata_kunci?.some(tag => 
        tag.toLowerCase().includes(lowerTerm)
    );

    // 4. Cek Dosen Pembimbing
    const matchDosen = doc.kontributor?.some(k => 
        (k.nama || "").toLowerCase().includes(lowerTerm)
    );

    return matchesStatus && (matchTextUtama || matchPenulis || matchKeyword || matchDosen);
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredDocs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredDocs.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    document.querySelector('.content-list')?.scrollTo(0, 0); 
  };

  // 3. Actions Global
  const handleQuickStatus = async (id, newStatus, docData) => {
    let confirmMsg = `Ubah status menjadi "${newStatus}"?`;
    if (!window.confirm(confirmMsg)) return;
    const loadingToast = toast.loading('Memproses status...');

      try {
        await updateDoc(doc(db, "repository", id), { status: newStatus });
        
        if (newStatus === 'approved' || newStatus === 'rejected') {
            
            const statusLabel = newStatus === 'approved' ? 'DISETUJUI / TERBIT' : 'DITOLAK / REVISI';
            const linkPublikasi = `${window.location.origin}/publikasi/${encodeURIComponent(docData.submission_id)}`;
            
            const emailParams = {
                  to_name: docData.penulis[0].nama,
                  to_email: docData.email_kontak,
                  judul_karya: docData.judul,
                  submission_id: docData.submission_id,
                  status_verifikasi: statusLabel,
                  status_besar: statusLabel, 
                  pesan_tambahan: newStatus === 'rejected' ? 'Mohon periksa kembali kesesuaian format atau hubungi admin.' : 'Karya Anda kini dapat diakses oleh publik.',
                  link_publikasi: linkPublikasi
            };

            emailjs.send('service_957o6ud', 'template_7v71409', emailParams, 'mR4WC1z6KwUPQI5hc')
                  .then(() => {
                      toast.success('Email notifikasi terkirim ke penulis', { id: loadingToast });
                  })
                  .catch((err) => {
                      console.error(err);
                      toast.error('Status oke, tapi gagal kirim email', { id: loadingToast });
                  });
         } else {
               toast.success(`Status berhasil diubah ke ${newStatus}`, { id: loadingToast });
         }
         
         setSelectedDoc(null);
      } catch (err) {
         toast.error(`Gagal: ${err.message}`, { id: loadingToast });
      }
   };

   // --- FUNGSI KIRIM BUKTI PDF KE EMAIL ---
   const openSendModal = (docData) => {
      setSendingDoc(docData);
   };

   const executeSend = async () => {
    if (!sendingDoc) return;
    
    setIsSendingProcess(true);
    const loadingToast = toast.loading('Sedang generate PDF & kirim email...');

    // KONFIGURASI GAS
    const GAS_URL = "https://script.google.com/macros/s/AKfycbx7xnEpjOUlVjQZ-kGYaaT52XrO_yy4FhzNVJ0LGj8d28d6ITK95s-L3xipjYC3LIxJPA/exec"; 
    const API_KEY = "BEM_POLTEK_170126_2026"; 

    const payload = {
       secret_key: API_KEY,
       submission_id: sendingDoc.submission_id,
       judul: sendingDoc.judul,
       jenis_karya: sendingDoc.jenis_karya,
       prodi: sendingDoc.prodi,
       penulis_nama: sendingDoc.penulis[0]?.nama || '-',
       penulis_nim: sendingDoc.penulis[0]?.nim || '-',
       tanggal_publikasi: sendingDoc.created_at?.toDate().toLocaleDateString('id-ID'),
       email_tujuan: sendingDoc.email_kontak,
       link_publikasi: `${window.location.origin}/publikasi/${sendingDoc.submission_id}`
    };

    try {
       await fetch(GAS_URL, {
          method: "POST",
          body: JSON.stringify(payload)
       });

       toast.success("Email berhasil dikirim!", { id: loadingToast });
       setSendingDoc(null); // Tutup modal otomatis

    } catch (error) {
       console.error(error);
       toast.error("Gagal kirim: " + error.message, { id: loadingToast });
    } finally {
       setIsSendingProcess(false);
    }
  };

  // 4. Handle Print Bukti
  const handlePrintBukti = (docData) => {
    setPrintingDoc(docData);
    setTimeout(() => {
        window.print();
    }, 800);
  };

  // --- SUB-COMPONENT: DETAIL MODAL (FULL EDIT & VIEW LENGKAP) ---
  // (Tetap di dalam agar bisa akses fungsi handleQuickStatus dll dengan mudah)
  const DetailModal = ({ docData, onClose, metaOptions, onSendProof }) => {
    const [isEditing, setIsEditing] = useState(false);
    
    // State Form Utama
    const [formData, setFormData] = useState({
      judul: docData.judul || "",
      abstrak: docData.abstrak || "",
      jenis_karya: docData.jenis_karya || "",
      prodi: docData.prodi || "",
      tanggal_publikasi: docData.tanggal_publikasi || "",
      bahasa: docData.bahasa || "Bahasa Indonesia",
      email_kontak: docData.email_kontak || "",
      no_wa: docData.no_wa || "", 
      nama_konferensi: docData.nama_konferensi || "", 
      penerbit: docData.penerbit || "", 
      referensi: docData.referensi || "", 
      status: docData.status || "pending",
      kata_kunci_str: docData.kata_kunci ? docData.kata_kunci.join(", ") : ""
    });

    const [penulisList, setPenulisList] = useState(docData.penulis || []);
    const [kontributorList, setKontributorList] = useState(docData.kontributor || []);

    const handlePenulisChange = (idx, field, val) => { const list = [...penulisList]; list[idx][field] = val; setPenulisList(list); };
    const addPenulis = () => setPenulisList([...penulisList, { nama: "", nim: "", peran: "Anggota" }]);
    const removePenulis = (idx) => { const list = [...penulisList]; list.splice(idx, 1); setPenulisList(list); };

    const handleKontributorChange = (idx, field, val) => { const list = [...kontributorList]; list[idx][field] = val; setKontributorList(list); };
    const addKontributor = () => setKontributorList([...kontributorList, { nama: "", peran: "Pembimbing 2" }]);
    const removeKontributor = (idx) => { const list = [...kontributorList]; list.splice(idx, 1); setKontributorList(list); };

    const handleSave = async () => {
      const loadingToast = toast.loading('Menyimpan perubahan...');
      try {
        const keywordString = formData.kata_kunci_str || ""; 
        const dataToSave = { 
            ...formData,
            penulis: penulisList,
            kontributor: kontributorList,
            updated_at: new Date()
        };
        dataToSave.kata_kunci = keywordString.split(',').map(k => k.trim()).filter(k => k !== "");
        delete dataToSave.kata_kunci_str;

        await updateDoc(doc(db, "repository", docData.id), dataToSave);
        setIsEditing(false);
        toast.success("Data berhasil diperbarui!", { id: loadingToast });
      } catch (error) {
        toast.error("Gagal menyimpan: " + error.message, { id: loadingToast });
      }
    };

    const handleDelete = async () => {
      if(!window.confirm("PERINGATAN KERAS: Data akan dihapus permanen. Lanjutkan?")) return;
      
      const loadingToast = toast.loading('Menghapus data...');
      try { 
         await deleteDoc(doc(db, "repository", docData.id)); 
         onClose();
         toast.success("Dokumen berhasil dihapus", { id: loadingToast });
      } catch (err) { 
         toast.error("Gagal menghapus: " + err.message, { id: loadingToast });
      }
   };

    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-panel" onClick={e => e.stopPropagation()}>
          
          {/* HEAD */}
          <div className="modal-head">
            <div className="head-left">
               {isEditing ? <span className="badge-mode">Mode Edit</span> : <span className={`status-badge-lg ${docData.status}`}>{docData.status}</span>}
               <div>
                   <h3 className="trunc-title">Detail Dokumen</h3>
                   <div style={{fontSize:'0.8rem', color:'#64748b', fontFamily:'monospace'}}>ID: {docData.submission_id}</div>
               </div>
            </div>
            <div className="head-actions">
               {!isEditing && docData.status === 'approved' && (
                 <button onClick={() => handlePrintBukti(docData)} className="btn-icon-head print" title="Cetak Bukti">
                    <Printer size={18}/>
                 </button>
               )}
               <button onClick={() => setIsEditing(!isEditing)} className={`btn-icon-head ${isEditing ? 'cancel' : ''}`} title={isEditing ? "Batal" : "Edit"}>
                  {isEditing ? <X size={20}/> : <Edit size={20}/>}
               </button>
               <button onClick={onClose} className="btn-close-modal"><X size={24}/></button>
            </div>
          </div>
          
          {/* BODY */}
          <div className="modal-scroll">
            {isEditing ? (
              // MODE EDIT
              <div className="edit-form-wrapper">
                 <div className="edit-section">
                    <h4>Informasi Dasar</h4>
                    <div className="form-group">
                       <label>Judul Karya</label>
                       <textarea className="input-text area-sm" value={formData.judul} onChange={e => setFormData({...formData, judul: e.target.value})} />
                    </div>
                    <div className="form-row">
                       <div className="form-group">
                        <label>Jenis Karya</label>
                        <select 
                           className="input-select" 
                           value={formData.jenis_karya} 
                           onChange={e => setFormData({...formData, jenis_karya: e.target.value})}
                        >
                           <option value="" disabled>-- Pilih Jenis Karya --</option>
                           
                           {/* Logika: Jika data lama tidak ada di list */}
                           {formData.jenis_karya && !metaOptions.jenis_karya_list?.includes(formData.jenis_karya) && (
                              <option value={formData.jenis_karya}>{formData.jenis_karya} (Data Lama/Custom)</option>
                           )}

                           {/* Mapping dari Database */}
                           {metaOptions.jenis_karya_list?.map((item, idx) => (
                              <option key={idx} value={item}>{item}</option>
                           ))}
                        </select>
                       </div>
                       <div className="form-group">
                        <label>Prodi</label>
                        <select 
                           className="input-select" 
                           value={formData.prodi} 
                           onChange={e => setFormData({...formData, prodi: e.target.value})}
                        >
                           <option value="" disabled>-- Pilih Prodi --</option>

                           {formData.prodi && !metaOptions.prodi_list?.includes(formData.prodi) && (
                              <option value={formData.prodi}>{formData.prodi} (Data Lama)</option>
                           )}

                           {metaOptions.prodi_list?.map((item, idx) => (
                              <option key={idx} value={item}>{item}</option>
                           ))}
                        </select>
                       </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group"><label>Tanggal Publikasi</label><input type="date" className="input-text" value={formData.tanggal_publikasi} onChange={e => setFormData({...formData, tanggal_publikasi: e.target.value})}/></div>
                        <div className="form-group"><label>Status Verifikasi</label><select className="input-select" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div>
                    </div>
                 </div>
                 
                 <div className="edit-section">
                    <h4>Detail Publikasi & Kontak</h4>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Nama Konferensi / Jurnal</label>
                            <input type="text" className="input-text" placeholder="Misal: Prosiding Seminar Nasional..." value={formData.nama_konferensi} onChange={e => setFormData({...formData, nama_konferensi: e.target.value})} />
                        </div>
                        <div className="form-group">
                            <label>Penerbit / Penyelenggara</label>
                            <input type="text" className="input-text" placeholder="Misal: Poltek Nuklir" value={formData.penerbit} onChange={e => setFormData({...formData, penerbit: e.target.value})} />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Email Kontak</label>
                            <input type="email" className="input-text" value={formData.email_kontak} onChange={e => setFormData({...formData, email_kontak: e.target.value})} />
                        </div>
                        <div className="form-group">
                            <label>No. WhatsApp</label>
                            <input type="text" className="input-text" value={formData.no_wa} onChange={e => setFormData({...formData, no_wa: e.target.value})} />
                        </div>
                    </div>
                 </div>

                 <div className="edit-section">
                    <div className="sec-head"><h4>Tim Penulis (Mahasiswa)</h4> <button onClick={addPenulis} className="btn-mini-add"><Plus size={14}/> Add</button></div>
                    {penulisList.map((p, i) => (
                        <div key={i} className="dynamic-row">
                            <input className="input-text grow" value={p.nama} onChange={e => handlePenulisChange(i, 'nama', e.target.value)} placeholder="Nama"/>
                            <input className="input-text w-sm" value={p.nim} onChange={e => handlePenulisChange(i, 'nim', e.target.value)} placeholder="NIM"/>
                            <input className="input-text w-md" value={p.peran} onChange={e => handlePenulisChange(i, 'peran', e.target.value)} placeholder="Peran"/>
                            <button onClick={() => removePenulis(i)} className="btn-mini-del"><X size={16}/></button>
                        </div>
                    ))}
                 </div>

                 <div className="edit-section">
                    <div className="sec-head"><h4>Kontributor / Pembimbing</h4> <button onClick={addKontributor} className="btn-mini-add"><Plus size={14}/> Add</button></div>
                    {kontributorList.map((p, i) => (
                        <div key={i} className="dynamic-row">
                            <input className="input-text grow" value={p.nama} onChange={e => handleKontributorChange(i, 'nama', e.target.value)} placeholder="Nama Dosen"/>
                            <select className="input-select w-md" value={p.peran} onChange={e => handleKontributorChange(i, 'peran', e.target.value)}>
                                <option>Pembimbing 1</option><option>Pembimbing 2</option>
                            </select>
                            <button onClick={() => removeKontributor(i)} className="btn-mini-del"><X size={16}/></button>
                        </div>
                    ))}
                 </div>

                 <div className="edit-section">
                    <h4>Isi Naskah</h4>
                    <div className="form-group"><label>Abstrak</label><textarea className="input-text area-lg" value={formData.abstrak} onChange={e => setFormData({...formData, abstrak: e.target.value})} /></div>
                    <div className="form-group"><label>Kata Kunci</label><input type="text" className="input-text" value={formData.kata_kunci_str} onChange={e => setFormData({...formData, kata_kunci_str: e.target.value})} /></div>
                    <div className="form-group"><label>Referensi / Pustaka</label><textarea className="input-text area-sm" value={formData.referensi} onChange={e => setFormData({...formData, referensi: e.target.value})} placeholder="Daftar pustaka..." /></div>
                 </div>
                 
                 <div className="modal-footer-edit">
                    <button onClick={handleSave} className="btn-act save full"><Save size={18}/> Simpan Perubahan</button>
                 </div>
              </div>
            ) : (
              // MODE VIEW
              <>
                <h2 className="modal-title">{docData.judul}</h2>
                
                <div className="view-grid">
                   <div className="view-box full">
                      <label><Users size={14}/> Penulis & Tim</label>
                      <div className="list-stack">
                          {docData.penulis.map((p, i) => (
                             <div key={i}>
                               {p.nama} <span className="sub-txt">({p.nim}) — <span style={{color:'#3b82f6'}}>{p.peran}</span></span>
                             </div>
                          ))}
                          {docData.kontributor && docData.kontributor.map((k, i) => (
                             <div key={`dosen-${i}`} style={{marginTop:'4px', borderTop:'1px dashed #e2e8f0', paddingTop:'4px'}}>
                                {k.nama} <span className="sub-txt">({k.peran})</span>
                             </div>
                          ))}
                      </div>
                   </div>

                   <div className="view-box"><label>Prodi</label><p>{docData.prodi}</p></div>
                   <div className="view-box"><label>Jenis Karya</label><p>{docData.jenis_karya}</p></div>
                   <div className="view-box"><label>Tanggal</label><p>{docData.tanggal_publikasi}</p></div>
                   <div className="view-box"><label>Bahasa</label><p>{docData.bahasa}</p></div>
                   
                   <div className="view-box full" style={{background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius:'6px', padding:'10px'}}>
                      <label style={{color:'#1e40af'}}><Phone size={14}/> Informasi Kontak</label>
                      <div style={{display:'flex', gap:'20px', flexWrap:'wrap'}}>
                          <div>
                             <span className="sub-txt">Email:</span> <br/>
                             <strong style={{color:'#1e293b'}}>{docData.email_kontak || '-'}</strong>
                          </div>
                          <div>
                             <span className="sub-txt">WhatsApp:</span> <br/>
                             <strong style={{color:'#1e293b'}}>{docData.no_wa || '-'}</strong>
                          </div>
                      </div>
                   </div>

                   {(docData.nama_konferensi || docData.penerbit) && (
                       <div className="view-box full">
                          <label>Publikasi / Event</label>
                          {docData.nama_konferensi && <div><span className="sub-txt">Konferensi:</span> <b>{docData.nama_konferensi}</b></div>}
                          {docData.penerbit && <div><span className="sub-txt">Penerbit:</span> {docData.penerbit}</div>}
                       </div>
                   )}
                </div>

                <div className="view-section">
                   <label>Abstrak</label>
                   <div className="abstract-view">{docData.abstrak}</div>
                   {docData.kata_kunci && docData.kata_kunci.length > 0 && (
                       <div style={{marginTop:'10px', fontSize:'0.85rem', color:'#64748b'}}>
                           <strong>Kata Kunci:</strong> {docData.kata_kunci.join(", ")}
                       </div>
                   )}
                </div>

                {docData.referensi && (
                    <div className="view-section">
                       <label>Referensi / Daftar Pustaka</label>
                       <div className="abstract-view" style={{fontSize:'0.85rem', whiteSpace: 'pre-line'}}>
                           {docData.referensi}
                       </div>
                    </div>
                )}

                <div className="view-section">
                   <label>File Naskah</label>
                   <div className="file-actions-row">
                       <button onClick={() => setPreviewPdfUrl(docData.file_view_url)} className="btn-file-view primary">
                           <Eye size={18}/> Baca Dokumen
                       </button>
                       <a href={docData.file_url} target="_blank" rel="noreferrer" className="btn-file-view secondary">
                           <Download size={18}/> Download
                       </a>
                       <div style={{fontSize:'0.75rem', color:'#94a3b8', display:'flex', flexDirection:'column', justifyContent:'center'}}>
                           <span>Size: {(docData.file_size / 1024 / 1024).toFixed(2)} MB</span>
                           <span>Type: {docData.file_type}</span>
                       </div>
                   </div>
                </div>
              </>
            )}
          </div>

          {/* FOOTER ACTIONS (VIEW MODE) */}
          {!isEditing && (
              <div className="modal-footer">
                 {docData.status === 'pending' && (
                    <>
                       <button 
                           onClick={() => handleQuickStatus(docData.id, 'rejected', docData)} 
                           className="btn-act reject"
                        >
                           <XCircle size={18}/> Tolak
                        </button>
                       <button onClick={() => handleQuickStatus(docData.id, 'approved', docData)} className="btn-act approve"><CheckCircle2 size={18}/> Setujui</button>
                    </>
                 )}
                 {docData.status === 'approved' && (
                     <>
                        {/* Tombol Kirim Bukti Baru (FIXED) */}
                        <button onClick={() => onSendProof(docData)} className="btn-act" style={{background:'#0f172a', color:'white'}}>
                           <Send size={18}/> Kirim Bukti (PDF)
                        </button>

                        <button onClick={() => handleQuickStatus(docData.id, 'pending')} className="btn-act warning"><RotateCcw size={18}/> Tarik (Unpublish)</button>
                     </>
                 )}
                 {docData.status === 'rejected' && (
                    <button onClick={() => handleQuickStatus(docData.id, 'pending')} className="btn-act neutral"><RotateCcw size={18}/> Pulihkan</button>
                 )}
                 <button onClick={handleDelete} className="btn-act delete"><Trash2 size={18}/> Hapus</button>
              </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="page-container">
      <Toaster position="top-right" reverseOrder={false} />
      {/* 1. LAYAR UTAMA */}
      <div className="screen-content">
          <div className="page-header">
            <div>
               <h1>Verifikasi Publikasi</h1>
               <p>Kelola, edit, verifikasi, dan cetak bukti publikasi mahasiswa.</p>
            </div>
            <div className="header-stats">
               <div className="stat-item pending"><Clock size={16}/> <span>Pending: <strong>{stats.pending}</strong></span></div>
               <div className="stat-item approved"><CheckCircle2 size={16}/> <span>Active: <strong>{stats.approved}</strong></span></div>
            </div>
          </div>

          {duplicateIds.length > 0 && filterStatus !== 'duplicates' && (
             <div className="alert-duplicate" onClick={() => setFilterStatus('duplicates')}>
                <div className="alert-content">
                   <AlertTriangle size={20} className="blink"/>
                   <div>
                      <strong>Terdeteksi {duplicateIds.length} Dokumen Berpotensi Duplikat!</strong>
                      <p>Ada beberapa judul karya yang sangat mirip atau sama persis. Klik di sini untuk meninjau.</p>
                   </div>
                </div>
                <button className="btn-check-dup">Tinjau Data</button>
             </div>
          )}
          
          {/* Jika sedang mode duplikat, beri tombol kembali */}
          {filterStatus === 'duplicates' && (
             <div className="alert-duplicate info-mode">
                <div className="alert-content">
                   <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                      <span className="badge-dup-count">{duplicateIds.length} Item</span>
                      <p style={{margin:0}}>Menampilkan data yang memiliki kemiripan judul.</p>
                   </div>
                </div>
                <button className="btn-check-dup outline" onClick={() => setFilterStatus('all')}>
                   <X size={16}/> Tutup Mode Review
                </button>
             </div>
          )}

          <div className="filter-bar">
             <div className="tabs">
                {['pending', 'approved', 'rejected', 'all'].map(status => (
                   <button key={status} onClick={() => setFilterStatus(status)} className={`tab-btn ${filterStatus === status ? 'active' : ''}`}>
                      {status === 'pending' ? 'Menunggu' : status === 'approved' ? 'Diterima' : status === 'rejected' ? 'Ditolak' : 'Semua'}
                   </button>
                ))}
             </div>
             <div className="search-wrap">
                <Search size={18}/>
                <input 
                  type="text" 
                  placeholder="Cari Judul / Penulis..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && <button onClick={() => setSearchTerm("")} className="btn-clear-search"><X size={14}/></button>}
             </div>
          </div>

          <div className="content-list">
            {loading ? (
               <SkeletonList /> 
            ) : filteredDocs.length === 0 ? (
               <div className="state-msg empty">
                     <BookOpen size={48} className="icon-empty"/>
                     <h3>Tidak ada dokumen</h3>
               </div> 
            ) : (
               <>
                     <div className="cards-wrapper">
                        {currentItems.map((doc) => (
                           <div key={doc.id} className="admin-list-item" onClick={() => setSelectedDoc(doc)}>
                                 <div className={`status-indicator ${doc.status}`}></div>
                                 <div className="list-content">
                                    <div className="list-header">
                                       <div style={{display:'flex', flexDirection:'column', gap:'2px'}}>
                                             <span className="list-title">{doc.judul}</span>
                                             <span className="badge-id">ID: {doc.submission_id}</span>
                                       </div>
                                       <span className={`status-pill-sm ${doc.status}`}>{doc.status}</span>
                                    </div>
                                    <div className="list-meta">
                                       <span className="author">{doc.penulis[0]?.nama || "Tanpa Nama"}</span> &bull; 
                                       <span className="type">{doc.jenis_karya}</span> &bull; 
                                       <span className="date">{doc.created_at?.toDate().toLocaleDateString('id-ID')}</span>
                                    </div>
                                    <div className="list-snippet">
                                       {doc.abstrak ? doc.abstrak.substring(0, 140) + "..." : "Tidak ada abstrak."}
                                    </div>
                                 </div>
                                 <div className="list-actions">
                                    {/* Jika status approved, munculkan tombol kirim bukti */}
                                    {doc.status === 'approved' && (
                                       <button 
                                       onClick={(e) => { e.stopPropagation(); openSendModal(doc); }}
                                       className="btn-mini" 
                                       style={{marginRight:'8px', color:'#16a34a', borderColor:'#16a34a'}}
                                       title="Kirim Bukti PDF ke Email"
                                       >
                                       <Send size={14}/> Bukti
                                       </button>
                                    )}
                                    <button className="btn-mini">Kelola</button>
                                 </div>
                           </div>
                        ))}
                     </div>

                     {/* AREA PAGINATION */}
                     {filteredDocs.length > itemsPerPage && (
                        <div className="pagination-container">
                           <div className="pagination-info">
                                 Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong> 
                                 <span className="text-muted">(Total {filteredDocs.length} data)</span>
                           </div>
                           
                           <div className="pagination-buttons">
                                 <button 
                                    onClick={() => handlePageChange(1)} 
                                    disabled={currentPage === 1}
                                    className="btn-page icon"
                                    title="Awal"
                                 >
                                    <ChevronsLeft size={18}/>
                                 </button>
                                 <button 
                                    onClick={() => handlePageChange(currentPage - 1)} 
                                    disabled={currentPage === 1}
                                    className="btn-page icon"
                                    title="Sebelumnya"
                                 >
                                    <ChevronLeft size={18}/>
                                 </button>

                                 {/* Tombol Angka */}
                                 {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum = i + 1;
                                    if (totalPages > 5 && currentPage > 3) {
                                       pageNum = currentPage - 3 + i;
                                       if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                                    }
                                    
                                    if (pageNum < 1) pageNum = 1;

                                    return (
                                       <button 
                                             key={i} 
                                             onClick={() => handlePageChange(pageNum)}
                                             className={`btn-page ${currentPage === pageNum ? 'active' : ''}`}
                                       >
                                             {pageNum}
                                       </button>
                                    );
                                 })}

                                 <button 
                                    onClick={() => handlePageChange(currentPage + 1)} 
                                    disabled={currentPage === totalPages}
                                    className="btn-page icon"
                                    title="Selanjutnya"
                                 >
                                    <ChevronRight size={18}/>
                                 </button>
                                 <button 
                                    onClick={() => handlePageChange(totalPages)} 
                                    disabled={currentPage === totalPages}
                                    className="btn-page icon"
                                    title="Akhir"
                                 >
                                    <ChevronsRight size={18}/>
                                 </button>
                           </div>
                        </div>
                     )}
               </>
            )}
          </div>
      </div>

      {/* 2. MODAL & POPUP */}
      {selectedDoc && (
         <DetailModal 
            docData={selectedDoc} 
            metaOptions={metaOptions} 
            onClose={() => setSelectedDoc(null)} 
            onSendProof={openSendModal} // <--- FIXED: Panggil openSendModal (bukan handleSendProof)
         />
      )}
      {previewPdfUrl && <PdfPreviewModal url={previewPdfUrl} onClose={() => setPreviewPdfUrl(null)} />}
      
      {/* 3. SEND MODAL (Sekarang ada di sini dan visible) */}
      {sendingDoc && (
        <SendModal 
           docData={sendingDoc} 
           onClose={() => setSendingDoc(null)} 
           onConfirm={executeSend}
           isLoading={isSendingProcess}
        />
      )}


      {/* 3. AREA CETAK BUKTI */}
      <div className="printable-area">
        {printingDoc && (
           <>
              <div className="print-header">
                <img src={logo} alt="Logo" className="print-logo" />
                <div className="print-header-text">
                  <h2>BEM KM POLTEK NUKLIR</h2>
                  <h3>SISTEM REPOSITORY KARYA ILMIAH MAHASISWA</h3>
                  <p>Jl. Babarsari, Caturtunggal, Depok, Sleman, DIY 55281</p>
                </div>
              </div>
              <div className="print-divider-thick"></div>

              <div className="print-doc-title">
                <h1>TANDA TERIMA PENYERAHAN DIGITAL</h1>
                <p>Submission Receipt (Reprint by Admin)</p>
              </div>

              <div className="print-body">
                <p>Menerangkan bahwa karya tulis ilmiah dengan rincian berikut telah diterima oleh sistem database:</p>
                
                <table className="print-table">
                  <tbody>
                    <tr><td className="td-label">ID Submission</td><td className="td-val bold">{printingDoc.submission_id || printingDoc.id}</td></tr>
                    <tr><td className="td-label">Judul Karya</td><td className="td-val">{printingDoc.judul}</td></tr>
                    <tr><td className="td-label">Jenis Karya</td><td className="td-val">{printingDoc.jenis_karya}</td></tr>
                    <tr><td className="td-label">Penulis Utama</td><td className="td-val">{printingDoc.penulis && printingDoc.penulis[0] ? `${printingDoc.penulis[0].nama} (${printingDoc.penulis[0].nim})` : '-'}</td></tr>
                    <tr><td className="td-label">Program Studi</td><td className="td-val">{printingDoc.prodi}</td></tr>
                    <tr><td className="td-label">Tanggal Upload</td><td className="td-val">{printingDoc.created_at?.toDate ? printingDoc.created_at.toDate().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'}) : printingDoc.tanggal_publikasi}</td></tr>
                    <tr><td className="td-label">Status Terkini</td><td className="td-val" style={{textTransform: 'uppercase', fontWeight:'bold'}}>{printingDoc.status}</td></tr>
                  </tbody>
                </table>

                <div className="print-footer-grid">
                  <div className="qr-section">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.origin + "/publikasi/" + (printingDoc.submission_id || printingDoc.id))}`} alt="QR Code" className="qr-img" />
                    <span>Scan untuk Validasi</span>
                  </div>
                  <div className="signature-section">
                    <p>Yogyakarta, {new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
                    <div className="digital-stamp"><span>TERVERIFIKASI SISTEM</span><small>REPOSITORY BEM</small></div>
                    <p className="signer-name">Admin Repository</p>
                  </div>
                </div>
              </div>
              <div className="print-bottom-footer"><p>Dokumen ini dihasilkan secara otomatis oleh sistem admin dan sah tanpa tanda tangan basah.</p></div>
           </>
        )}
      </div>

      <style>{`
          /* --- LAYOUT UTAMA --- */
          .page-container { font-family: 'Inter', sans-serif; max-width: 1200px; margin: 0 auto; padding-bottom: 60px; }
          .page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 20px; }
          .page-header h1 { margin: 0; font-size: 1.8rem; color: #0f172a; letter-spacing: -0.5px; }
          .page-header p { margin: 4px 0 0; color: #64748b; }
          
          .header-stats { display: flex; gap: 10px; }
          .stat-item { padding: 6px 12px; border-radius: 20px; font-size: 0.85rem; display: flex; align-items: center; gap: 6px; font-weight: 500; border: 1px solid transparent; }
          .stat-item.pending { background: #fffbeb; color: #d97706; border-color: #fcd34d; }
          .stat-item.approved { background: #f0fdf4; color: #16a34a; border-color: #86efac; }

          /* --- FILTER BAR --- */
          .filter-bar { display: flex; justify-content: space-between; margin-bottom: 20px; gap: 16px; flex-wrap: wrap; }
          .tabs { background: #f1f5f9; padding: 4px; border-radius: 8px; display: flex; gap: 4px; }
          .tab-btn { border: none; background: none; padding: 8px 16px; border-radius: 6px; font-size: 0.9rem; font-weight: 600; color: #64748b; cursor: pointer; transition: 0.2s; }
          .tab-btn:hover { color: #0f172a; background: rgba(255,255,255,0.5); }
          .tab-btn.active { background: white; color: #0f172a; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          
          .search-wrap { display: flex; align-items: center; background: white; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 8px; width: 300px; transition: 0.2s; position: relative; }
          .search-wrap:focus-within { border-color: #3b82f6; ring: 2px solid #bfdbfe; }
          .search-wrap input { border: none; outline: none; margin-left: 8px; width: 100%; font-size: 0.9rem; }
          .btn-clear-search { background: none; border: none; color: #94a3b8; cursor: pointer; }
          .btn-clear-search:hover { color: #ef4444; }

          /* --- LIST VIEW --- */
          .cards-wrapper { display: flex; flex-direction: column; gap: 10px; }
          .admin-list-item { display: flex; background: white; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; cursor: pointer; transition: 0.2s; position: relative; }
          .admin-list-item:hover { border-color: #3b82f6; box-shadow: 0 4px 12px rgba(0,0,0,0.05); transform: translateY(-1px); }
          
          .status-indicator { width: 5px; flex-shrink: 0; }
          .status-indicator.pending { background: #f59e0b; }
          .status-indicator.approved { background: #10b981; }
          .status-indicator.rejected { background: #ef4444; }

          .list-content { flex: 1; padding: 14px 16px; display: flex; flex-direction: column; gap: 4px; }
          .list-header { display: flex; justify-content: space-between; margin-bottom: 2px; }
          .list-title { font-weight: 700; color: #1e293b; font-size: 1.05rem; }
          
          .status-pill-sm { font-size: 0.65rem; padding: 2px 8px; border-radius: 10px; font-weight: 700; text-transform: uppercase; border: 1px solid transparent; }
          .status-pill-sm.pending { background: #fffbeb; color: #b45309; border-color: #fcd34d; }
          .status-pill-sm.approved { background: #dcfce7; color: #166534; border-color: #86efac; }
          .status-pill-sm.rejected { background: #fee2e2; color: #991b1b; border-color: #fca5a5; }

          .list-meta { font-size: 0.85rem; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .list-snippet { font-size: 0.9rem; color: #4d5156; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

          .list-actions { padding: 0 20px; display: flex; align-items: center; border-left: 1px solid #f1f5f9; background: #fafafa; }
          .btn-mini { background: white; border: 1px solid #cbd5e1; padding: 8px 16px; border-radius: 6px; font-size: 0.85rem; cursor: pointer; color: #475569; font-weight: 600; transition: 0.2s; }
          .btn-mini:hover { border-color: #3b82f6; color: #3b82f6; background: #eff6ff; }

          /* --- MODAL --- */
          .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 2000; backdrop-filter: blur(4px); animation: fadeIn 0.2s; }
          .modal-panel { background: white; width: 800px; max-width: 95%; max-height: 95vh; border-radius: 16px; display: flex; flex-direction: column; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); animation: slideUp 0.3s; }
          .pdf-panel { width: 1000px; height: 90vh; }
          .pdf-body { flex: 1; background: #525659; overflow: hidden; }
          
          .modal-head { padding: 16px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border-radius: 16px 16px 0 0; }
          .badge-mode { background: #3b82f6; color: white; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; margin-right: 10px; }
          .status-badge-lg { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 20px; margin-right: 10px; }
          .status-badge-lg.pending { background: #fffbeb; color: #d97706; }
          .status-badge-lg.approved { background: #f0fdf4; color: #16a34a; }
          .status-badge-lg.rejected { background: #fef2f2; color: #ef4444; }
          
          .trunc-title { margin: 0; display: inline-block; font-size: 1.1rem; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 400px; vertical-align: middle; }
          .head-actions { display: flex; gap: 8px; }
          
          .btn-icon-head { background: white; border: 1px solid #e2e8f0; color: #3b82f6; width: 36px; height: 36px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
          .btn-icon-head:hover { background: #eff6ff; }
          .btn-icon-head.cancel { color: #ef4444; }
          .btn-icon-head.cancel:hover { background: #fef2f2; }
          .btn-icon-head.print { color: #0f172a; }
          .btn-icon-head.print:hover { background: #cbd5e1; }
          .btn-close-modal { background: none; border: none; color: #94a3b8; cursor: pointer; transition: 0.2s; }
          .btn-close-modal:hover { color: #ef4444; }

          .modal-scroll { padding: 24px; overflow-y: auto; flex: 1; }
          .modal-title { font-size: 1.4rem; font-weight: 800; color: #1e293b; margin: 0 0 20px; line-height: 1.3; }
          
          .view-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; }
          .view-box label { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 4px; }
          .view-box p { margin: 0; font-weight: 600; color: #334155; font-size: 0.95rem; }
          .view-box.full { grid-column: span 2; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 12px; }
          .list-stack div { font-size: 0.95rem; font-weight: 600; color: #334155; margin-bottom: 4px; }
          .sub-txt { font-weight: 400; color: #64748b; font-size: 0.85rem; }

          .view-section { margin-bottom: 24px; }
          .view-section label { display: block; font-size: 0.9rem; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
          .abstract-view { font-size: 0.95rem; line-height: 1.7; color: #475569; text-align: justify; background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; }
          
          .file-actions-row { display: flex; gap: 12px; }
          .btn-file-view { display: inline-flex; align-items: center; gap: 8px; padding: 12px 20px; border-radius: 8px; font-weight: 600; transition: 0.2s; text-decoration: none; cursor: pointer; border: none; }
          .btn-file-view.primary { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
          .btn-file-view.primary:hover { background: #dbeafe; transform: translateY(-2px); }
          .btn-file-view.secondary { background: white; color: #475569; border: 1px solid #cbd5e1; }
          .btn-file-view.secondary:hover { background: #f1f5f9; }

          .modal-footer, .modal-footer-edit { padding: 20px 24px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 12px; background: #f8fafc; border-radius: 0 0 16px 16px; }
          .btn-act { padding: 10px 18px; border-radius: 8px; font-weight: 600; border: none; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 0.9rem; transition: 0.2s; }
          .btn-act.approve { background: #10b981; color: white; }
          .btn-act.approve:hover { background: #059669; }
          .btn-act.reject { background: white; color: #ef4444; border: 1px solid #fecaca; }
          .btn-act.reject:hover { background: #fef2f2; border-color: #ef4444; }
          .btn-act.warning { background: #f59e0b; color: white; }
          .btn-act.warning:hover { background: #d97706; }
          .btn-act.neutral { background: #64748b; color: white; }
          .btn-act.delete { background: #ef4444; color: white; }
          .btn-act.delete:hover { background: #b91c1c; }
          .btn-act.save { background: #3b82f6; color: white; }
          .btn-act.save.full { width: 100%; justify-content: center; }

          /* --- EDIT FORM --- */
          .edit-form-wrapper { display: flex; flex-direction: column; gap: 20px; }
          .edit-section { background: #fff; border: 1px solid #e2e8f0; padding: 16px; border-radius: 12px; }
          .edit-section h4 { margin: 0 0 16px 0; font-size: 1rem; color: #0f172a; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }
          .sec-head { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 12px; }
          .sec-head h4 { border: none; padding: 0; margin: 0; }
          
          .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
          .form-group { margin-bottom: 12px; }
          .form-group label { display: block; font-size: 0.8rem; font-weight: 600; color: #475569; margin-bottom: 4px; }
          .input-text, .input-select { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.9rem; outline: none; box-sizing: border-box; }
          .input-text:focus, .input-select:focus { border-color: #3b82f6; ring: 2px solid #bfdbfe; }
          .area-sm { height: 60px; } .area-lg { height: 150px; }
          .dynamic-row { display: flex; gap: 8px; margin-bottom: 8px; }
          .grow { flex: 1; } .w-sm { width: 100px; } .w-md { width: 140px; }
          .btn-mini-add { background: none; border: none; color: #3b82f6; font-size: 0.8rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 4px; }
          .btn-mini-del { background: #fef2f2; border: 1px solid #fecaca; color: #ef4444; width: 32px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; }

          .state-msg { text-align: center; padding: 60px; color: #94a3b8; }
          .spinner { border: 3px solid #e2e8f0; border-top: 3px solid #3b82f6; border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite; display: inline-block; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

          /* ========================================= */
          /* =           CSS KHUSUS PRINT            = */
          /* ========================================= */
          
          .printable-area { 
            display: none; 
          }

          @media print {
              /* 1. Sembunyikan SEMUA elemen body secara default */
              body * {
                  visibility: hidden;
              }

              /* 2. Reset margin & padding browser agar tidak ada halaman kosong */
              html, body {
                  height: 100vh;
                  margin: 0 !important;
                  padding: 0 !important;
                  overflow: hidden !important; /* Mencegah scroll yang bikin halaman 2 muncul */
              }

              /* 3. Tampilkan hanya elemen .printable-area dan isinya */
              .printable-area, .printable-area * {
                  visibility: visible;
              }

              /* 4. Posisikan area cetak di paling atas dan menutupi segalanya */
              .printable-area {
                  display: block !important;
                  position: absolute;
                  top: 0;
                  left: 0;
                  width: 100%;
                  height: 100%;
                  background: white;
                  z-index: 9999;
                  padding: 40px !important; /* Margin kertas diatur lewat padding ini */
              }

              /* 5. Paksa ukuran kertas A4 */
              @page {
                  size: A4 portrait;
                  margin: 0; /* Margin dinolkan, kita atur lewat padding .printable-area */
              }

              /* Styling Internal Print */
              .print-header { display: flex; align-items: center; gap: 20px; margin-bottom: 10px; }
              .print-logo { height: 80px; width: auto; object-fit: contain; }
              .print-header-text h2 { margin: 0; font-size: 16pt; font-weight: 800; text-transform: uppercase; color: #000; }
              .print-header-text h3 { margin: 4px 0; font-size: 12pt; font-weight: 600; color: #333; }
              .print-header-text p { margin: 0; font-size: 9pt; color: #555; }
              .print-divider-thick { border-bottom: 3px solid #000; margin-bottom: 2px; }
              .print-doc-title { text-align: center; margin: 40px 0; }
              .print-doc-title h1 { margin: 0; font-size: 18pt; text-decoration: underline; font-weight: bold; }
              .print-doc-title p { margin: 5px 0 0; font-size: 10pt; font-style: italic; }
              .print-body { font-size: 11pt; line-height: 1.5; }
              .print-table { width: 100%; border-collapse: collapse; margin: 20px 0 40px; }
              .print-table td { padding: 8px 12px; vertical-align: top; border-bottom: 1px solid #eee; }
              .td-label { width: 180px; font-weight: bold; color: #444; }
              .td-val { color: #000; }
              .td-val.bold { font-weight: bold; font-family: monospace; font-size: 12pt; }
              .print-footer-grid { display: flex; justify-content: space-between; margin-top: 60px; }
              .qr-section { display: flex; flex-direction: column; align-items: center; gap: 5px; }
              .qr-img { width: 100px; height: 100px; border: 1px solid #000; }
              .signature-section { text-align: center; width: 250px; }
              .digital-stamp { border: 2px solid #16a34a; color: #16a34a; padding: 10px; margin: 15px auto; display: inline-block; font-weight: bold; transform: rotate(-5deg); opacity: 0.8; }
              .digital-stamp span { display: block; font-size: 12pt; }
              .digital-stamp small { font-size: 8pt; text-transform: uppercase; }
              .signer-name { font-weight: bold; text-decoration: underline; margin-top: 60px; }
              .print-bottom-footer { margin-top: 50px; border-top: 1px solid #ccc; pt: 10px; font-size: 8pt; color: #666; text-align: center; }
          }
          
          /* --- SKELETON LOADING --- */
          .skeleton-wrapper {
              display: flex;
              flex-direction: column;
              gap: 10px;
           }
           .skeleton-card {
              background: #fff;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 16px;
              display: flex;
              flex-direction: column;
              gap: 10px;
              position: relative;
              overflow: hidden;
           }
           /* Efek Animasi Shimmer */
           .skeleton-card::after {
              content: "";
              position: absolute;
              top: 0; right: 0; bottom: 0; left: 0;
              transform: translateX(-100%);
              background-image: linear-gradient(
                  90deg,
                  rgba(255, 255, 255, 0) 0,
                  rgba(255, 255, 255, 0.4) 20%,
                  rgba(255, 255, 255, 0.7) 60%,
                  rgba(255, 255, 255, 0)
            );
            animation: shimmer 2s infinite;
           }
           @keyframes shimmer {
            100% { transform: translateX(100%); }
           }

           /* Elemen-elemen bayangan */
           .sk-line { background: #e2e8f0; border-radius: 4px; }
           .sk-title { height: 20px; width: 60%; margin-bottom: 4px; }
           .sk-badge { height: 14px; width: 80px; }
           .sk-meta { height: 12px; width: 40%; margin-top: 6px; }
           .sk-text { height: 12px; width: 90%; margin-top: 10px; }
           .sk-text-2 { height: 12px; width: 70%; }

           .pagination-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 0 10px;
            border-top: 1px solid #e2e8f0;
            margin-top: 20px;
            }

            .pagination-info {
            font-size: 0.9rem;
            color: #64748b;
            }

            .text-muted {
            color: #94a3b8;
            font-size: 0.85rem;
            margin-left: 6px;
            }

            .pagination-buttons {
            display: flex;
            gap: 6px;
            }

            .btn-page {
            border: 1px solid #cbd5e1;
            background: white;
            min-width: 36px;
            height: 36px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: #475569;
            font-weight: 600;
            font-size: 0.9rem;
            transition: 0.2s;
            }

            .btn-page:hover:not(:disabled) {
            border-color: #3b82f6;
            color: #3b82f6;
            background: #eff6ff;
            }

            .btn-page.active {
            background: #3b82f6;
            color: white;
            border-color: #3b82f6;
            }

            .btn-page:disabled {
            background: #f1f5f9;
            color: #cbd5e1;
            cursor: not-allowed;
            border-color: #e2e8f0;
            }

            .btn-page.icon {
            padding: 0 8px;
            }

            /* --- SEND MODAL CSS --- */
            .send-panel { width: 400px; max-width: 90%; overflow: hidden; display: flex; flex-direction: column; padding: 0; border-radius: 16px; animation: slideUp 0.3s; }

            .send-header-visual { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); height: 100px; display: flex; align-items: center; justify-content: center; position: relative; }
            .send-header-visual::after { content: ""; position: absolute; bottom: -20px; left: 0; right: 0; height: 40px; background: white; border-radius: 50% 50% 0 0; }

            .icon-circle { width: 60px; height: 60px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); border: 2px solid rgba(255,255,255,0.4); box-shadow: 0 4px 10px rgba(0,0,0,0.1); }

            .send-body { padding: 10px 30px 20px; text-align: center; }
            .send-body h3 { margin: 8px 0 8px; color: #1e293b; font-size: 1.25rem; }
            .desc-text { color: #64748b; font-size: 0.9rem; line-height: 1.5; margin-bottom: 20px; }

            .preview-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; text-align: left; margin-bottom: 16px; }
            .preview-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.9rem; }
            .preview-row:last-child { margin-bottom: 0; }
            .preview-row .label { color: #94a3b8; font-weight: 500; }
            .preview-row .val { color: #334155; font-weight: 600; text-align: right; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .preview-row .val.highlight { color: #2563eb; }
            .preview-row .val.trunc { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px; }

            .info-box { display: flex; align-items: center; gap: 8px; background: #fff7ed; color: #c2410c; padding: 10px; border-radius: 8px; font-size: 0.8rem; text-align: left; border: 1px solid #ffedd5; }

            .send-footer { padding: 20px; background: #fff; border-top: 1px solid #f1f5f9; display: flex; gap: 12px; }
            .btn-cancel { flex: 1; padding: 10px; border: 1px solid #cbd5e1; background: white; border-radius: 8px; font-weight: 600; color: #64748b; cursor: pointer; transition: 0.2s; }
            .btn-cancel:hover { background: #f1f5f9; color: #334155; }

            .btn-confirm-send { flex: 2; padding: 10px; background: #2563eb; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: 0.2s; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2); }
            .btn-confirm-send:hover:not(:disabled) { background: #1d4ed8; transform: translateY(-1px); }
            .btn-confirm-send:disabled { background: #93c5fd; cursor: wait; }

            /* --- DUPLICATE ALERT CSS --- */
            .alert-duplicate {
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: #991b1b;
            padding: 16px 20px;
            border-radius: 12px;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            transition: 0.2s;
            box-shadow: 0 2px 5px rgba(239, 68, 68, 0.1);
            }
            .alert-duplicate:hover {
            background: #fee2e2;
            transform: translateY(-1px);
            }
            .alert-content {
            display: flex;
            align-items: center;
            gap: 16px;
            }
            .alert-content p {
            margin: 4px 0 0;
            font-size: 0.9rem;
            color: #b91c1c;
            }
            .blink {
            animation: blinker 2s linear infinite;
            color: #ef4444;
            }
            @keyframes blinker {
            50% { opacity: 0.5; }
            }

            .btn-check-dup {
            background: #ef4444;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            font-size: 0.9rem;
            }
            .btn-check-dup:hover { background: #dc2626; }

            /* Mode Info (Saat banner diklik) */
            .alert-duplicate.info-mode {
            background: #eff6ff;
            border-color: #bfdbfe;
            color: #1e40af;
            cursor: default;
            }
            .alert-duplicate.info-mode:hover { transform: none; }
            .badge-dup-count {
            background: #2563eb;
            color: white;
            padding: 4px 10px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 0.85rem;
            }
            .btn-check-dup.outline {
            background: white;
            border: 1px solid #bfdbfe;
            color: #1e40af;
            display: flex;
            align-items: center;
            gap: 6px;
            }
            .btn-check-dup.outline:hover { background: #dbeafe; }
      `}</style>
    </div>
  );
};

export default AdminPublikasi;