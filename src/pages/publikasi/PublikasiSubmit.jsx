import React, { useState, useEffect } from 'react';
import { db, auth } from "../../firebase/firebaseConfig";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Link } from "react-router-dom";
import emailjs from '@emailjs/browser';
import { 
  UploadCloud, FileText, Users, Tag, CheckCircle2, 
  Printer, BookOpen, Save, File, X, Plus, GraduationCap, 
  Phone, Mail, Copy, Loader2, AlertCircle // <--- TAMBAHAN: Loader2 untuk spinner
} from 'lucide-react';
import logo from "../../assets/logo-bempoltek.png"; 

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzXF8YW1VlS6u8pHoVFFYs-mJCliMvFyH4UDVK0zfkYosn_GrjfN9xYCvmp_QtlaPzG/exec"; 

const PublikasiSubmit = () => {
  // ... (State user, formData, dll TETAP SAMA) ...
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('form');
  const [submissionReceipt, setSubmissionReceipt] = useState(null);
  
  const [optionLists, setOptionLists] = useState({
    prodi: ["Teknokimia Nuklir", "Elektronika Instrumentasi", "Elektromekanika"], // Default fallback
    jenis_karya: ["Paper / Jurnal Ilmiah", "Laporan Magang (PKL)", "Tugas Akhir / Skripsi"], // Default fallback
    bahasa: ["Bahasa Indonesia", "English"] // Default fallback
  });

  // ... (State formData, penulis, kontributor, file, agreement TETAP SAMA) ...
  const [formData, setFormData] = useState({
    judul: "",
    abstrak: "",
    jenis_karya: "Paper / Jurnal Ilmiah",
    prodi: "",
    tanggal_publikasi: new Date().toISOString().slice(0,10),
    bahasa: "Bahasa Indonesia",
    kata_kunci: "",
    email_kontak: "",
    no_wa: "",
    nama_konferensi: "", 
    penerbit: "",        
    referensi: ""        
  });

  const [penulis, setPenulis] = useState([{ nama: "", nim: "", peran: "Penulis Utama" }]);
  const [kontributor, setKontributor] = useState([{ nama: "", peran: "Pembimbing 1" }]);
  const [file, setFile] = useState(null);
  const [agreement, setAgreement] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // 1. Auto-Save ke LocalStorage setiap ada perubahan (TETAP SAMA)
  useEffect(() => {
    if (!isInitialized) return; // <--- GEMBOK: Jangan simpan kalau belum selesai loading

    const draft = { formData, penulis };
    localStorage.setItem("publikasi_draft", JSON.stringify(draft));
  }, [formData, penulis, isInitialized]);

  // 2. Logic Gabungan: Style, Auth, Fetch DB, dan Load Draft (DIPERBAIKI)
  useEffect(() => {
    // A. Pasang CSS Print
    const styleEl = document.createElement('style');
    styleEl.innerHTML = styleSheet;
    document.head.appendChild(styleEl);
    
    // B. Cek Auth
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if(currentUser) {
         setFormData(prev => ({ 
             ...prev, 
             email_kontak: prev.email_kontak || currentUser.email 
         }));
         
         if(penulis[0].nama === "") {
            const newPenulis = [...penulis];
            newPenulis[0].nama = currentUser.displayName || "";
            setPenulis(newPenulis);
         }
      }
    });

    // C. Fetch Settings & Load Draft
    const initializeData = async () => {
      try {
        // C.1 Ambil Data Database
        const docRef = doc(db, "repository_settings", "metadata_options");
        const docSnap = await getDoc(docRef);
        
        let dbData = {};
        if (docSnap.exists()) {
          dbData = docSnap.data();
          setOptionLists({
            prodi: dbData.prodi_list || [],
            jenis_karya: dbData.jenis_karya_list || [],
            bahasa: dbData.bahasa_list || []
          });
        }

        // C.2 Cek LocalStorage (Draft)
        const savedDraft = localStorage.getItem("publikasi_draft");
        
        // --- DEBUGGING LOG (Cek Console Browser F12) ---
        console.log("1. Raw Draft dari Storage:", savedDraft);
        // -----------------------------------------------

        let parsedDraft = null;
        if (savedDraft) {
            try { 
              parsedDraft = JSON.parse(savedDraft); 
              console.log("2. Data Judul di Draft:", parsedDraft?.formData?.judul);
            } catch (e) {
              console.log("Error parsing draft");
            }
        }

        // C.3 Tentukan Nilai Akhir Form
        setFormData(prev => {
            const newData = {
                ...prev,
                ...(parsedDraft?.formData || {}), 

                // Dropdown logic
                prodi: parsedDraft?.formData?.prodi || prev.prodi || dbData.prodi_list?.[0] || "",
                jenis_karya: parsedDraft?.formData?.jenis_karya || prev.jenis_karya || dbData.jenis_karya_list?.[0] || "",
                bahasa: parsedDraft?.formData?.bahasa || prev.bahasa || dbData.bahasa_list?.[0] || "Bahasa Indonesia"
            };
            
            console.log("3. Data Akhir yang di-Set ke Form:", newData); // Cek hasil akhir
            return newData;
        });

        // C.4 Load Penulis
        if (parsedDraft?.penulis) {
            setPenulis(parsedDraft.penulis);
        }

      } catch (error) {
        console.error("Gagal inisialisasi:", error);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeData();

    return () => { document.head.removeChild(styleEl); unsub(); };
  }, []);

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handlePenulisChange = (idx, field, val) => { const list = [...penulis]; list[idx][field] = val; setPenulis(list); };
  const addPenulis = () => setPenulis([...penulis, { nama: "", nim: "", peran: "Anggota" }]);
  const removePenulis = (idx) => { const list = [...penulis]; list.splice(idx, 1); setPenulis(list); };
  const handleKontributorChange = (idx, field, val) => { const list = [...kontributor]; list[idx][field] = val; setKontributor(list); };
  const addKontributor = () => setKontributor([...kontributor, { nama: "", peran: "Pembimbing 2" }]);
  const removeKontributor = (idx) => { const list = [...kontributor]; list.splice(idx, 1); setKontributor(list); };
  
  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      if (e.target.files[0].size > 10 * 1024 * 1024) return alert("Maksimal 10MB");
      setFile(e.target.files[0]);
    }
  };

  // --- SUBMIT ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return alert("File Naskah PDF Wajib Diupload!");
    const phoneRegex = /^[0-9]{10,15}$/;
    if (!phoneRegex.test(formData.no_wa)) {
      return alert("Format Nomor WhatsApp salah! Masukkan hanya angka (Contoh: 08123456789).");
    }
    if (penulis[0].nim.length < 5) { // Sesuaikan dengan standar Poltek
       return alert("NIM Penulis Utama tampaknya terlalu pendek.");
    }
    if (!agreement) return alert("Anda harus menyetujui pernyataan keaslian karya.");

    setLoading(true); // START LOADING

    try {
      const dateCode = new Date().toISOString().slice(0,10).replace(/-/g,"");
      const randomCode = Math.floor(1000 + Math.random() * 9000);
      const submissionID = `repo.bem-poltek/${dateCode}.${randomCode}`; 

      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async function() {
        const base64Raw = reader.result.split(',')[1];
        
        const payloadGAS = {
          filename: `[${submissionID}] ${formData.judul}.pdf`,
          type: file.type,
          file: base64Raw
        };

        try {
          // Proses 1: Upload ke Google Script (Biasanya paling lama)
          const responseGAS = await fetch(GOOGLE_SCRIPT_URL, { method: "POST", body: JSON.stringify(payloadGAS) });
          const resultGAS = await responseGAS.json();

          if (resultGAS.status !== 'success') throw new Error(resultGAS.message);

          // Proses 2: Simpan ke Firestore
          const finalData = {
            submission_id: submissionID,
            judul: formData.judul,
            abstrak: formData.abstrak,
            jenis_karya: formData.jenis_karya,
            prodi: formData.prodi,
            tanggal_publikasi: formData.tanggal_publikasi,
            bahasa: formData.bahasa,
            kata_kunci: formData.kata_kunci.split(',').map(k => k.trim()),
            nama_konferensi: formData.nama_konferensi,
            penerbit: formData.penerbit,
            referensi: formData.referensi,
            email_kontak: formData.email_kontak,
            no_wa: formData.no_wa,
            penulis: penulis,
            kontributor: kontributor,
            file_url: resultGAS.fileUrl,
            file_view_url: resultGAS.viewUrl,
            file_type: file.type,
            file_size: file.size,
            uploader_uid: user ? user.uid : "anonymous_guest",
            status: "pending", 
            created_at: serverTimestamp(),
            updated_at: serverTimestamp(),
            views: 0, downloads: 0
          };

          await addDoc(collection(db, "repository"), finalData);

          const linkBukti = `${window.location.origin}/publikasi/${encodeURIComponent(submissionID)}`;

          const emailParams = {
            to_name: penulis[0].nama,
            to_email: formData.email_kontak,
            judul_karya: formData.judul,
            submission_id: submissionID,
            tanggal: new Date().toLocaleDateString('id-ID'),
            link_bukti: linkBukti
          };

          // Proses 3: Kirim Email (Non-blocking, tapi kita tunggu sebentar agar smooth)
          emailjs.send('service_957o6ud', 'template_mba7bnd', emailParams, 'mR4WC1z6KwUPQI5hc')
            .then((result) => console.log('Email terkirim!', result.text), 
                  (error) => console.log('Email gagal:', error.text));

          setSubmissionReceipt({
            ...finalData,
            created_at_date: new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
          });
          setStep('success');
          localStorage.removeItem("publikasi_draft");

        } catch (err) {
          alert("Gagal upload: " + err.message);
        } finally {
          // STOP LOADING (Hanya jika error, jika sukses dia pindah halaman jadi loading hilang otomatis oleh render ulang)
          if(step !== 'success') setLoading(false);
        }
      };
    } catch (error) {
      alert("Error sistem.");
      setLoading(false);
    }
  };

  const handlePrint = () => {
    setTimeout(() => { window.print(); }, 500);
  };

  const copyCitation = () => {
     const text = `${submissionReceipt.penulis[0].nama} et al. (${submissionReceipt.tanggal_publikasi.split('-')[0]}). ${submissionReceipt.judul}. Repository BEM KM Poltek Nuklir.`;
     navigator.clipboard.writeText(text);
     alert("Kutipan disalin!");
  };

  // --- HALAMAN SUKSES ---
  if (step === 'success' && submissionReceipt) {
     // ... (Kode Halaman Sukses TETAP SAMA, tidak perlu diubah) ...
     const permalink = `${window.location.origin}/publikasi/${encodeURIComponent(submissionReceipt.submission_id)}`;
     const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(permalink)}`;
 
     return (
       <div className="dokumen-page-wrapper">
         <div className="receipt-container">
           <div className="card receipt-card">
             {/* VIEW LAYAR (Website) */}
             <div className="screen-success-view">
               <div className="success-header">
                 <div className="icon-wrapper-check">
                   <CheckCircle2 size={48} />
                 </div>
                 <h1>Upload Berhasil!</h1>
                 <p>Karya Anda telah tersimpan di sistem Repository dan saat ini berstatus <strong>Menunggu Verifikasi</strong>.</p>
               </div>
 
               <div className="success-actions-grid">
                 <div className="action-box highlight">
                   <span className="lbl">ID Dokumen</span>
                   <span className="val code">{submissionReceipt.submission_id}</span>
                 </div>
                 <div className="action-box">
                   <span className="lbl">Link Akses</span>
                   <div className="val link disabled" style={{opacity: 0.6, cursor: 'not-allowed'}}>
                     {window.location.origin}/publikasi/...
                   </div>
                   <small style={{color: '#d97706', fontSize: '0.8rem', marginTop: '4px', display:'block'}}>
                     *Link akan aktif setelah disetujui Admin.
                   </small>
                 </div>
               </div>
 
               <div className="citation-box-wrapper">
                 <div className="citation-box">
                     <p>"{submissionReceipt.penulis[0].nama} et al. ({submissionReceipt.tanggal_publikasi.split('-')[0]}). {submissionReceipt.judul}..."</p>
                     <button onClick={copyCitation} className="btn-copy"><Copy size={16}/> Salin Sitasi</button>
                 </div>
               </div>
             </div>
 
             {/* VIEW CETAK (Hanya Muncul saat CTRL+P) */}
             <div className="printable-area">
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
                 <p>Submission Receipt</p>
               </div>
 
               <div className="print-body">
                 <p>Menerangkan bahwa karya tulis ilmiah dengan rincian berikut telah diterima oleh sistem database:</p>
                 
                 <table className="print-table">
                   <tbody>
                     <tr>
                       <td className="td-label">ID Submission</td>
                       <td className="td-val bold">{submissionReceipt.submission_id}</td>
                     </tr>
                     <tr>
                       <td className="td-label">Judul Karya</td>
                       <td className="td-val">{submissionReceipt.judul}</td>
                     </tr>
                     <tr>
                       <td className="td-label">Jenis Karya</td>
                       <td className="td-val">{submissionReceipt.jenis_karya}</td>
                     </tr>
                     <tr>
                       <td className="td-label">Penulis Utama</td>
                       <td className="td-val">{submissionReceipt.penulis[0].nama} ({submissionReceipt.penulis[0].nim})</td>
                     </tr>
                     <tr>
                       <td className="td-label">Program Studi</td>
                       <td className="td-val">{submissionReceipt.prodi}</td>
                     </tr>
                     <tr>
                       <td className="td-label">Tanggal Upload</td>
                       <td className="td-val">{submissionReceipt.created_at_date}</td>
                     </tr>
                     <tr>
                       <td className="td-label">Status</td>
                       <td className="td-val">Submitted</td>
                     </tr>
                   </tbody>
                 </table>
 
                 <div className="print-footer-grid">
                   <div className="qr-section">
                     <img src={qrCodeUrl} alt="QR Code" className="qr-img" />
                     <span>Scan untuk Validasi</span>
                   </div>
                   <div className="signature-section">
                     <p>Yogyakarta, {new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
                     <div className="digital-stamp">
                       <span>TERVERIFIKASI SISTEM</span>
                       <small>REPOSITORY BEM</small>
                     </div>
                     <p className="signer-name">Admin Repository</p>
                   </div>
                 </div>
               </div>
 
               <div className="print-bottom-footer">
                 <p>Dokumen ini dihasilkan secara otomatis oleh komputer dan sah tanpa tanda tangan basah.</p>
               </div>
             </div>
 
             <div className="receipt-actions">
               <button onClick={handlePrint} className="action-button primary"><Printer size={18} /> Cetak Bukti</button>
               <Link to="/publikasi" className="action-button secondary">Kembali ke Depan</Link>
             </div>
 
           </div>
         </div>
       </div>
     );
  }

  // --- FORM VIEW ---
  return (
    <div className="dokumen-page-wrapper">
      
      {/* --- BAGIAN BARU: LOADING OVERLAY --- */}
      {loading && (
        <div className="loading-overlay">
           <div className="loading-box">
              <Loader2 className="spinner-lg" />
              <h3>Sedang Memproses...</h3>
              <p>Mohon jangan tutup halaman ini.</p>
              <p className="sub-text">Mengupload file & mengirim email notifikasi.</p>
           </div>
        </div>
      )}
      {/* ------------------------------------ */}

      <header className="page-header">
        <div className="header-content-wrapper">
          <UploadCloud size={40} />
          <div>
            <h1 className="page-title">Penyerahan Karya Ilmiah</h1>
            <p className="page-subtitle">Wadah publikasi karya tulis dan riset mahasiswa Poltek Nuklir.</p>
          </div>
        </div>
      </header>

      <main className="dokumen-page-content">
        <div className="card form-card">
          <form onSubmit={handleSubmit}>
            
            <section className="form-section">
              <h3 className="section-title"><BookOpen size={20}/> Informasi Karya</h3>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Judul Lengkap <span className="req">*</span></label>
                  {/* PERBAIKAN: Tambahkan value={formData.judul} */}
                  <input 
                    type="text" 
                    name="judul" 
                    className="input" 
                    placeholder="Judul naskah..." 
                    value={formData.judul} 
                    required 
                    onChange={handleInputChange}
                  />
                </div>

                {/* Select sudah benar karena sudah pakai value */}
                <div className="form-group">
                  <label>Jenis Karya <span className="req">*</span></label>
                  <select name="jenis_karya" className="input" onChange={handleInputChange} value={formData.jenis_karya} required>
                    <option value="" disabled>-- Pilih Jenis Karya --</option>
                    {optionLists.jenis_karya.map((item, idx) => (
                      <option key={idx} value={item}>{item}</option>
                    ))}
                  </select>
                </div>
                
                {/* Select Prodi sudah benar */}
                <div className="form-group">
                   <label>Program Studi <span className="req">*</span></label>
                   <select name="prodi" className="input" onChange={handleInputChange} value={formData.prodi} required>
                     <option value="" disabled>-- Pilih Prodi --</option>
                     {optionLists.prodi.map((item, idx) => (
                       <option key={idx} value={item}>{item}</option>
                     ))}
                   </select>
                </div>

                <div className="form-group">
                  <label>Tgl. Publikasi</label>
                  {/* PERBAIKAN: Ganti defaultValue jadi value */}
                  <input 
                    type="date" 
                    name="tanggal_publikasi" 
                    className="input" 
                    value={formData.tanggal_publikasi} 
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                   <label>Bahasa</label>
                   <select name="bahasa" className="input" onChange={handleInputChange} value={formData.bahasa}>
                     {optionLists.bahasa.map((item, idx) => (
                       <option key={idx} value={item}>{item}</option>
                     ))}
                   </select>
                </div>
              </div>
            </section>

            {/* Bagian Penulis sudah benar karena pakai map dan value={p.nama} */}
            <section className="form-section">
              <h3 className="section-title"><Users size={20}/> Penulis (Mahasiswa) <span className="req">*</span></h3>
              {penulis.map((p, idx) => (
                <div key={idx} className="author-row">
                   <div className="form-group grow">
                      <input type="text" className="input" placeholder="Nama Lengkap" value={p.nama} onChange={(e) => handlePenulisChange(idx, 'nama', e.target.value)} required />
                   </div>
                   <div className="form-group w-small">
                      <input type="text" className="input" placeholder="NIM" value={p.nim} onChange={(e) => handlePenulisChange(idx, 'nim', e.target.value)} required />
                   </div>
                   <div className="form-group w-medium">
                      <select className="input" value={p.peran} onChange={(e) => handlePenulisChange(idx, 'peran', e.target.value)}>
                        <option value="Penulis Utama">Penulis Utama</option>
                        <option value="Anggota">Anggota</option>
                      </select>
                   </div>
                   {penulis.length > 1 && (
                     <button type="button" onClick={() => removePenulis(idx)} className="btn-icon-danger"><X size={18}/></button>
                   )}
                </div>
              ))}
              <button type="button" onClick={addPenulis} className="btn-add-author"><Plus size={16}/> Tambah Penulis</button>
            </section>

             <section className="form-section">
              <h3 className="section-title"><GraduationCap size={20}/> Pembimbing (Dosen)</h3>
              {kontributor.map((k, idx) => (
                <div key={idx} className="author-row">
                   <div className="form-group grow">
                      <input type="text" className="input" placeholder="Nama Dosen" value={k.nama} onChange={(e) => handleKontributorChange(idx, 'nama', e.target.value)} />
                   </div>
                   <div className="form-group w-medium">
                      <select className="input" value={k.peran} onChange={(e) => handleKontributorChange(idx, 'peran', e.target.value)}>
                        <option value="Pembimbing 1">Pembimbing 1</option>
                        <option value="Pembimbing 2">Pembimbing 2</option>
                      </select>
                   </div>
                   <button type="button" onClick={() => removeKontributor(idx)} className="btn-icon-danger"><X size={18}/></button>
                </div>
              ))}
              <button type="button" onClick={addKontributor} className="btn-add-author"><Plus size={16}/> Tambah Pembimbing</button>
            </section>

            <section className="form-section">
              <h3 className="section-title"><FileText size={20}/> Detail Naskah</h3>
              <div className="form-grid">
                <div className="form-group full-width">
                   <label>Abstrak <span className="req">*</span></label>
                   {/* PERBAIKAN: Tambahkan value={formData.abstrak} */}
                   <textarea 
                     name="abstrak" 
                     rows="6" 
                     className="input textarea" 
                     placeholder="Ringkasan isi karya..." 
                     required 
                     value={formData.abstrak} 
                     onChange={handleInputChange}
                   ></textarea>
                </div>
                <div className="form-group full-width">
                   <label>Kata Kunci <span className="req">*</span></label>
                   <div className="input-with-icon-right">
                     <Tag size={18} />
                     {/* PERBAIKAN: Tambahkan value={formData.kata_kunci} */}
                     <input 
                       type="text" 
                       name="kata_kunci" 
                       className="input" 
                       placeholder="Contoh: IoT, Radiasi (Pisahkan koma)" 
                       required 
                       value={formData.kata_kunci} 
                       onChange={handleInputChange}
                     />
                   </div>
                </div>
                <div className="form-group full-width">
                   <label>Referensi (Opsional)</label>
                   {/* PERBAIKAN: Tambahkan value={formData.referensi} */}
                   <textarea 
                     name="referensi" 
                     rows="3" 
                     className="input textarea" 
                     placeholder="Daftar pustaka..." 
                     value={formData.referensi} 
                     onChange={handleInputChange}
                   ></textarea>
                </div>
              </div>
            </section>

            <section className="form-section">
              <h3 className="section-title"><Phone size={20}/> Kontak</h3>
              <div className="form-grid">
                 <div className="form-group">
                    <label>Email <span className="req">*</span></label>
                    <div className="input-with-icon-right">
                      <Mail size={18}/>
                      {/* PERBAIKAN: Ganti defaultValue jadi value */}
                      <input 
                        type="email" 
                        name="email_kontak" 
                        className="input" 
                        placeholder="mahasiswa@polteknuklir.ac.id"
                        value={formData.email_kontak} 
                        required 
                        onChange={handleInputChange}
                      />
                    </div>
                 </div>
                 <div className="form-group">
                    <label>No. WhatsApp <span className="req">*</span></label>
                    <div className="input-with-icon-right">
                      <Phone size={18}/>
                      {/* PERBAIKAN: Tambahkan value={formData.no_wa} */}
                      <input 
                        type="text" 
                        name="no_wa" 
                        className="input" 
                        placeholder="08xxxxx" 
                        required 
                        value={formData.no_wa} 
                        onChange={handleInputChange}
                      />
                    </div>
                 </div>
              </div>
            </section>

             <section className="form-section">
              <h3 className="section-title"><UploadCloud size={20}/> File & Lisensi</h3>
              {/* Bagian File Upload sudah benar (File input memang uncontrolled/read-only secara visual) */}
              <div className="file-upload-area">
                <input type="file" id="fileUpload" accept=".pdf" onChange={handleFileChange} required />
                <label htmlFor="fileUpload" className="file-upload-label">
                  {file ? (
                    <div className="file-selected"><File size={32} /><span>{file.name}</span><small>{(file.size/1024/1024).toFixed(2)} MB</small></div>
                  ) : (
                    <div className="file-placeholder"><UploadCloud size={32} /><span>Upload Naskah (PDF)</span></div>
                  )}
                </label>
              </div>
              <div className="agreement-box">
                <label className="checkbox-container">
                  <input type="checkbox" checked={agreement} onChange={(e) => setAgreement(e.target.checked)} />
                  <span className="checkmark"></span>
                  <div className="agreement-text">
                    <strong>Pernyataan Keaslian</strong>
                    <p>Saya menyatakan karya ini adalah asli dan saya mengizinkan BEM KM Poltek Nuklir untuk mempublikasikannya (Open Access).</p>
                  </div>
                </label>
              </div>
            </section>

            <div className="form-actions">
               <Link to="/publikasi" className="btn-cancel">Batal</Link>
               <button type="submit" className="btn-submit" disabled={loading}>
                 {loading ? <><Loader2 className="animate-spin" size={18}/> Memproses...</> : <><Save size={18}/> Kirim Karya</>}
               </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

// --- CSS STYLESHEET ---
const styleSheet = `
  /* RESET GLOBAL PADA SAAT PRINT */
  @media print {
    body * { visibility: hidden; height: 0; overflow: hidden; }
    .printable-area, .printable-area * { visibility: visible; height: auto; overflow: visible; }
    .printable-area { position: absolute; top: 0; left: 0; width: 100%; margin: 0; padding: 40px; background: white; color: black; z-index: 99999; display: block !important; }
    nav, footer, .page-header, .receipt-actions, .screen-success-view, .form-card, .btn-submit, .btn-cancel, .main-navbar { display: none !important; }
  }

  /* --- STYLE REGULER (WEB) --- */
  .dokumen-page-wrapper { font-family: 'Inter', sans-serif; background-color: #f8fafc; min-height: 100vh; }
  
  /* LOADING OVERLAY STYLES */
  .loading-overlay {
    position: fixed;
    top: 0; left: 0;
    width: 100vw; height: 100vh;
    background-color: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(4px);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
  }
  .loading-box {
    text-align: center;
    background: white;
    padding: 40px;
    border-radius: 16px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    border: 1px solid #e2e8f0;
    max-width: 400px;
  }
  .spinner-lg {
    width: 64px; height: 64px;
    color: #3b82f6;
    animation: spin 1s linear infinite;
    margin-bottom: 24px;
  }
  .loading-box h3 { font-size: 1.5rem; color: #0f172a; margin: 0 0 8px 0; font-weight: 700; }
  .loading-box p { color: #64748b; margin: 0; font-size: 1rem; }
  .loading-box .sub-text { font-size: 0.85rem; color: #94a3b8; margin-top: 8px; }
  
  .animate-spin { animation: spin 1s linear infinite; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

  /* EXISTING STYLES */
  .page-header { padding: 48px 0; background-color: #eff6ff; border-bottom: 1px solid #dbeafe; }
  .header-content-wrapper { max-width: 1280px; margin: 0 auto; padding: 0 24px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; color: #1e293b; }
  .page-header svg { color: #1d4ed8; margin-bottom: 8px; }
  .page-title { font-size: 2.2rem; font-weight: 800; margin: 0; }
  .page-subtitle { color: #64748b; font-size: 1.1rem; margin: 8px auto 0; }
  
  .dokumen-page-content { max-width: 900px; margin: -32px auto 48px; padding: 0 24px; position: relative; z-index: 10; }
  .card { background-color: #fff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.04); }
  .form-card { padding: 40px; }
  .section-title { font-size: 1.2rem; font-weight: 700; color: #1e293b; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px; margin-bottom: 8px; display: flex; align-items: center; gap: 10px; }
  .form-section { margin-bottom: 48px; }
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .full-width { grid-column: span 2; }
  .form-group label { display: block; font-weight: 600; font-size: 0.9rem; color: #334155; margin-bottom: 8px; }
  .req { color: #ef4444; }
  .input { width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #cbd5e0; font-size: 0.95rem; transition: all 0.2s; box-sizing: border-box; }
  .input:focus { border-color: #3b82f6; outline: none; ring: 3px solid #bfdbfe; }
  .textarea { resize: vertical; font-family: inherit; }
  .input-with-icon-right { position: relative; display: flex; align-items: center; }
  .input-with-icon-right svg { position: absolute; left: 12px; color: #94a3b8; pointer-events: none; }
  .input-with-icon-right input { padding-left: 40px; }
  .file-upload-label { display: block; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 40px; text-align: center; cursor: pointer; transition: all 0.2s; background-color: #f8fafc; }
  .file-upload-label:hover { border-color: #3b82f6; background-color: #eff6ff; }
  .file-upload-area input { display: none; }
  .file-placeholder, .file-selected { display: flex; flex-direction: column; align-items: center; gap: 8px; color: #64748b; }
  .file-selected { color: #0f172a; }
  .file-selected svg { color: #3b82f6; }
  .agreement-box { margin-top: 20px; padding: 16px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; }
  .checkbox-container { display: flex; gap: 12px; cursor: pointer; align-items: flex-start; }
  .agreement-text { font-size: 0.9rem; color: #166534; line-height: 1.5; }
  .author-row { display: flex; gap: 12px; margin-bottom: 12px; align-items: flex-start; }
  .grow { flex: 1; }
  .w-small { width: 120px; }
  .w-medium { width: 180px; }
  .btn-icon-danger { background: none; border: 1px solid #fecaca; color: #ef4444; border-radius: 6px; width: 42px; height: 42px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
  .btn-icon-danger:hover { background-color: #fee2e2; }
  .btn-add-author { background: none; border: none; color: #3b82f6; font-weight: 600; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; gap: 6px; margin-top: 8px; }
  .form-actions { display: flex; justify-content: flex-end; gap: 16px; margin-top: 40px; pt: 20px; border-top: 1px solid #e2e8f0; }
  .btn-submit { background-color: #0f172a; color: white; border: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 1rem; transition: 0.2s; }
  .btn-submit:hover { background-color: #1e293b; }
  .btn-submit:disabled { background-color: #94a3b8; cursor: not-allowed; opacity: 0.7; }
  .btn-cancel { padding: 12px 24px; color: #64748b; text-decoration: none; font-weight: 600; }
  
  .receipt-container { max-width: 800px; margin: 40px auto; padding: 0 20px; }
  .receipt-card { padding: 0; overflow: hidden; }
  .screen-success-view { padding: 40px; text-align: center; }
  .success-header { margin-bottom: 40px; }
  .icon-wrapper-check { background: #dcfce7; color: #16a34a; width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
  .success-header h1 { color: #0f172a; margin: 0 0 10px 0; }
  .success-header p { color: #64748b; margin: 0; }
  .success-actions-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; text-align: left; }
  .action-box { background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 6px; }
  .action-box.highlight { background: #eff6ff; border-color: #bfdbfe; }
  .action-box .lbl { font-size: 0.85rem; color: #64748b; font-weight: 600; text-transform: uppercase; }
  .action-box .val { font-weight: 700; color: #0f172a; font-size: 1.1rem; }
  .action-box .val.code { font-family: monospace; }
  .action-box .val.link { color: #2563eb; text-decoration: none; display: flex; align-items: center; gap: 6px; }
  .citation-box-wrapper { margin-top: 20px; }
  .citation-box { background: #f1f5f9; padding: 16px; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; gap: 20px; text-align: left; }
  .citation-box p { margin: 0; font-family: 'Times New Roman', serif; color: #334155; font-style: italic; font-size: 0.95rem; }
  .btn-copy { border: 1px solid #cbd5e0; background: white; padding: 8px 12px; border-radius: 6px; cursor: pointer; color: #475569; display: flex; align-items: center; gap: 6px; font-weight: 600; font-size: 0.85rem; }
  .receipt-actions { background-color: #f8fafc; padding: 24px; display: flex; justify-content: center; gap: 16px; border-top: 1px solid #e2e8f0; }
  .action-button { padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; text-decoration: none; }
  .action-button.primary { background-color: #0f172a; color: white; border: none; }
  .action-button.secondary { background-color: white; border: 1px solid #cbd5e0; color: #475569; }
  
  /* --- LAYOUT CETAK (Hanya tampil saat Print) --- */
  .printable-area { display: none; }
  
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
  .print-footer-grid { display: flex; justify-content: space-between; margin-top: 60px; page-break-inside: avoid; }
  .qr-section { display: flex; flex-direction: column; align-items: center; gap: 5px; }
  .qr-img { width: 100px; height: 100px; border: 1px solid #000; }
  .signature-section { text-align: center; width: 250px; }
  .digital-stamp { border: 2px solid #16a34a; color: #16a34a; padding: 10px; margin: 15px auto; display: inline-block; font-weight: bold; transform: rotate(-5deg); opacity: 0.8; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .digital-stamp span { display: block; font-size: 12pt; }
  .digital-stamp small { font-size: 8pt; text-transform: uppercase; }
  .signer-name { font-weight: bold; text-decoration: underline; margin-top: 60px; }
  .print-bottom-footer { margin-top: 50px; border-top: 1px solid #ccc; pt: 10px; font-size: 8pt; color: #666; text-align: center; position: fixed; bottom: 20px; width: 100%; }

  @media (max-width: 768px) {
    .form-grid, .success-actions-grid { grid-template-columns: 1fr; }
    .full-width { grid-column: span 1; }
    .citation-box { flex-direction: column; align-items: flex-start; }
    .btn-copy { width: 100%; justify-content: center; }
  }
`;

export default PublikasiSubmit;