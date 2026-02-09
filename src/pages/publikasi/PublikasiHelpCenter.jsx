import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, HelpCircle, ChevronDown, ChevronUp, Search, MessageCircle } from 'lucide-react';

const PublikasiHelpCenter = () => {
  const [openIndex, setOpenIndex] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const toggleFaq = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const faqs = [
    // --- KATEGORI: UMUM & AKSES ---
    {
      q: "Apa itu Repository BEM Poltek Nuklir?",
      a: "Repository ini adalah layanan arsip digital untuk menyimpan, mengelola, dan mempublikasikan karya ilmiah mahasiswa (seperti Jurnal, Laporan PKL, Tugas Akhir) agar dapat diakses oleh civitas akademika dan publik."
    },
    {
      q: "Apakah saya harus login untuk melihat dokumen?",
      a: "Tidak. Dokumen dengan status 'Approved' (Disetujui) bersifat Open Access dan dapat dibaca oleh siapa saja tanpa perlu login. Namun, dokumen yang masih 'Pending' tidak dapat diakses publik."
    },
    {
      q: "Apakah layanan ini berbayar?",
      a: "Tidak. Layanan upload dan download di repository ini 100% gratis bagi seluruh mahasiswa Politeknik Teknologi Nuklir Indonesia."
    },

    // --- KATEGORI: PERSYARATAN FILE ---
    {
      q: "Format file apa yang diterima?",
      a: "Saat ini sistem hanya menerima file naskah dalam format **PDF (.pdf)**. Kami tidak menerima format Word (.doc/.docx) untuk menjaga konsistensi tampilan dokumen."
    },
    {
      q: "Berapa ukuran maksimal file upload?",
      a: "Ukuran maksimal file yang diizinkan adalah **10 MB**. Jika file Anda lebih besar, mohon kompres (compress) file PDF Anda terlebih dahulu menggunakan layanan kompresi PDF online."
    },
    {
      q: "Bolehkah file PDF saya diberi password?",
      a: "TIDAK. File PDF tidak boleh dikunci atau diberi password. Sistem perlu membaca file tersebut untuk membuat pratinjau (preview). File yang terkunci akan otomatis ditolak."
    },

    // --- KATEGORI: PROSES UPLOAD ---
    {
      q: "Apa itu ID Submission?",
      a: "ID Submission adalah kode unik (contoh: repo.bem-poltek/2026...) yang Anda dapatkan setelah berhasil mengupload karya. Simpan kode ini untuk melacak status verifikasi."
    },
    {
      q: "Apakah saya wajib mengisi data Dosen Pembimbing?",
      a: "Ya, sangat disarankan. Mencantumkan nama pembimbing (kontributor) akan menambah validitas karya ilmiah Anda dan memudahkan penelusuran akademik."
    },
    {
      q: "Bagaimana jika saya salah memasukkan Judul atau Nama?",
      a: "Jika sudah terlanjur submit, Anda tidak bisa mengedit sendiri. Silakan hubungi Admin melalui menu 'Kontak' dengan menyertakan ID Submission dan detail data yang ingin direvisi."
    },
    {
      q: "Bisakah saya mengupload karya lewat HP?",
      a: "Bisa. Tampilan website ini sudah responsif untuk mobile. Namun, kami menyarankan menggunakan Laptop/PC agar lebih mudah saat mengisi formulir metadata yang panjang."
    },

    // --- KATEGORI: STATUS & VERIFIKASI ---
    {
      q: "Berapa lama proses verifikasi dokumen?",
      a: "Proses verifikasi biasanya memakan waktu **1-3 hari kerja** (Senin-Jumat). Admin akan mengecek kelengkapan metadata dan file naskah sebelum menyetujuinya."
    },
    {
      q: "Kenapa link dokumen saya tidak bisa dibuka (Error)?",
      a: "Jika muncul pesan 'Dokumen Sedang Diverifikasi' atau 'Tidak Ditemukan', itu berarti status dokumen Anda masih **Pending** (belum disetujui Admin). Tunggu hingga status berubah menjadi Approved."
    },
    {
      q: "Mengapa dokumen saya ditolak (Rejected)?",
      a: "Alasan umum penolakan meliputi: File naskah rusak/corrupt, salah upload file, metadata (Judul/Penulis) tidak sesuai dengan isi naskah, atau konten mengandung unsur plagiarisme/SARA."
    },
    {
      q: "Apakah saya mendapat notifikasi jika disetujui?",
      a: "Saat ini notifikasi otomatis via email/WA belum tersedia. Mohon cek secara berkala di halaman Repository menggunakan fitur pencarian nama atau judul Anda."
    },

    // --- KATEGORI: LAIN-LAIN ---
    {
      q: "Apakah file PDF saya aman dari pencurian?",
      a: "Kami menerapkan standar keamanan server. File hanya ditampilkan dalam mode 'Preview' (baca di tempat). Jika Anda khawatir tentang hak cipta, pastikan karya Anda sudah memiliki lisensi yang jelas di dalam naskah."
    },
    {
      q: "Bagaimana cara menyalin sitasi (daftar pustaka)?",
      a: "Buka halaman detail dokumen, lalu lihat di sidebar kanan terdapat kotak **Kutipan (APA)**. Klik tombol 'Salin Teks' untuk meng-copy format sitasi otomatis."
    },
    {
      q: "Bisakah saya menghapus karya yang sudah terbit?",
      a: "Penghapusan karya (Retraction) hanya bisa dilakukan dengan alasan kuat (misal: pelanggaran etik berat atau duplikasi). Silakan ajukan permohonan resmi ke BEM Poltek Nuklir."
    },
    {
      q: "Siapa yang bisa saya hubungi jika ada kendala teknis?",
      a: "Anda dapat menghubungi Admin Teknis melalui WhatsApp atau Email yang tertera di halaman **Kontak Admin**."
    }
  ];

  // Filter sederhana untuk pencarian (Opsional)
  const filteredFaqs = faqs.filter(f => 
    f.q.toLowerCase().includes(searchTerm.toLowerCase()) || 
    f.a.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-wrapper">
      {/* --- Navigation Bar --- */}
      <nav className="simple-nav">
         <div className="nav-container">
            <Link to="/publikasi" className="back-link"><ArrowLeft size={18}/> Kembali ke Repository</Link>
            <div className="nav-title">Pusat Bantuan</div>
         </div>
      </nav>

      {/* --- Main Content --- */}
      <div className="content-container">
         
         {/* Hero Section */}
         <div className="header-hero">
            <div className="hero-icon-wrap">
                <HelpCircle size={40} />
            </div>
            <h1>Halo, ada yang bisa kami bantu?</h1>
            <p>Temukan jawaban atas pertanyaan umum seputar Repository.</p>
            
            {/* Search Box */}
            <div className="search-box">
                <Search className="search-icon" size={20} />
                <input 
                    type="text" 
                    placeholder="Cari topik bantuan (misal: login, verifikasi)..." 
                    className="search-input"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
         </div>

         {/* FAQ List */}
         <div className="faq-list">
            {filteredFaqs.length > 0 ? (
                filteredFaqs.map((item, index) => (
                   <div 
                     key={index} 
                     className={`faq-item ${openIndex === index ? 'active' : ''}`} 
                     onClick={() => toggleFaq(index)}
                   >
                      <div className="faq-head">
                         <h3>{item.q}</h3>
                         <span className="faq-chevron">
                            {openIndex === index ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                         </span>
                      </div>
                      <div className={`faq-body ${openIndex === index ? 'show' : ''}`}>
                         <div className="faq-content">
                            {item.a}
                         </div>
                      </div>
                   </div>
                ))
            ) : (
                <div className="empty-state">
                    <p>Tidak ditemukan hasil untuk "{searchTerm}"</p>
                </div>
            )}
         </div>

         {/* Bottom CTA */}
         <div className="support-cta">
            <p>Masih belum menemukan jawaban?</p>
            <Link to="/publikasi/kontak" className="cta-link">
                <MessageCircle size={18}/> Hubungi Admin
            </Link>
         </div>

      </div>

      <style>{`
        /* --- Global Layout --- */
        .page-wrapper { background: #f8fafc; min-height: 100vh; font-family: 'Inter', sans-serif; color: #0f172a; }
        .simple-nav { background: white; border-bottom: 1px solid #e2e8f0; padding: 0 20px; height: 60px; display: flex; align-items: center; position: sticky; top: 85px; z-index: 50; }
        .nav-container { max-width: 900px; width: 100%; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
        .back-link { text-decoration: none; color: #64748b; font-weight: 500; display: flex; align-items: center; gap: 8px; font-size: 0.9rem; transition: 0.2s; }
        .back-link:hover { color: #0f172a; transform: translateX(-3px); }
        .nav-title { font-weight: 700; color: #0f172a; }

        .content-container { max-width: 800px; margin: 40px auto; padding: 0 20px 80px; }
        
        /* --- Hero Section --- */
        .header-hero { text-align: center; margin-bottom: 50px; max-width: 600px; margin-left: auto; margin-right: auto; }
        .hero-icon-wrap { width: 80px; height: 80px; background: #eff6ff; color: #2563eb; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; }
        .header-hero h1 { margin: 0 0 12px; color: #0f172a; font-size: 2rem; letter-spacing: -0.5px; }
        .header-hero p { color: #64748b; font-size: 1.1rem; line-height: 1.6; margin-bottom: 32px; }

        /* --- Search Box --- */
        .search-box { position: relative; max-width: 480px; margin: 0 auto; }
        .search-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
        .search-input { width: 100%; padding: 14px 14px 14px 48px; border-radius: 12px; border: 1px solid #e2e8f0; font-size: 1rem; outline: none; transition: 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .search-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }

        /* --- FAQ List --- */
        .faq-list { display: flex; flex-direction: column; gap: 16px; }
        
        .faq-item { background: white; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; transition: all 0.2s ease; }
        .faq-item:hover { border-color: #cbd5e1; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .faq-item.active { border-color: #3b82f6; box-shadow: 0 0 0 1px #3b82f6; }
        
        .faq-head { padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none; }
        .faq-head h3 { margin: 0; font-size: 1.05rem; font-weight: 600; color: #0f172a; padding-right: 20px; }
        .faq-chevron { color: #64748b; transition: 0.2s; }
        .faq-item.active .faq-chevron { color: #2563eb; transform: rotate(180deg); } /* Efek rotasi jika menggunakan satu icon chevron */

        .faq-body { height: 0; overflow: hidden; transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1); opacity: 0; }
        .faq-body.show { height: auto; opacity: 1; border-top: 1px solid #f1f5f9; }
        .faq-content { padding: 24px; color: #475569; line-height: 1.6; font-size: 0.95rem; background: #fafafa; }

        .empty-state { text-align: center; padding: 40px; color: #94a3b8; }

        /* --- Bottom CTA --- */
        .support-cta { margin-top: 60px; text-align: center; padding-top: 40px; border-top: 1px solid #e2e8f0; }
        .support-cta p { color: #64748b; margin-bottom: 16px; }
        .cta-link { display: inline-flex; align-items: center; gap: 8px; color: #2563eb; font-weight: 600; text-decoration: none; padding: 10px 20px; background: #eff6ff; border-radius: 50px; transition: 0.2s; }
        .cta-link:hover { background: #dbeafe; color: #1d4ed8; }

        /* Mobile Responsive */
        @media (max-width: 640px) {
           .header-hero h1 { font-size: 1.75rem; }
           .faq-head { padding: 16px 20px; }
           .faq-head h3 { font-size: 1rem; }
        }
      `}</style>
    </div>
  );
};

export default PublikasiHelpCenter;