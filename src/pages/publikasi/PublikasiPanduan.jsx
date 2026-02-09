import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, UploadCloud, FileText, Globe, CheckCircle, Save } from 'lucide-react';

const PublikasiPanduan = () => {
  return (
    <div className="page-wrapper">
      {/* --- Navigation Bar (Konsisten dengan halaman Kontak) --- */}
      <nav className="simple-nav">
         <div className="nav-container">
            <Link to="/publikasi" className="back-link"><ArrowLeft size={18}/> Kembali ke Repository</Link>
            <div className="nav-title">Panduan Upload</div>
         </div>
      </nav>

      {/* --- Main Content --- */}
      <div className="content-container">
         {/* Header Section */}
         <div className="header-hero">
            <div className="hero-icon">
                <UploadCloud size={40} strokeWidth={1.5} />
            </div>
            <h1>Cara Upload Karya</h1>
            <p>Panduan langkah demi langkah mempublikasikan karya ilmiah Anda ke repository Politeknik Teknologi Nuklir Indonesia.</p>
         </div>

         {/* Timeline Steps */}
         <div className="timeline">
            {/* Step 1 */}
            <div className="timeline-item">
               <div className="marker-col">
                  <div className="marker">1</div>
                  <div className="line"></div>
               </div>
               <div className="content-col">
                  <div className="step-card">
                     <div className="step-header">
                        <FileText size={20} className="step-icon blue"/>
                        <h3>Persiapkan Berkas</h3>
                     </div>
                     <p>Pastikan karya tulis Anda sudah dalam format <strong>PDF</strong>. Ukuran maksimal file adalah <strong>10 MB</strong>. Pastikan file tidak dikunci (<em>password protected</em>) agar sistem bisa membacanya.</p>
                  </div>
               </div>
            </div>

            {/* Step 2 */}
            <div className="timeline-item">
               <div className="marker-col">
                  <div className="marker">2</div>
                  <div className="line"></div>
               </div>
               <div className="content-col">
                  <div className="step-card">
                     <div className="step-header">
                        <Globe size={20} className="step-icon blue"/>
                        <h3>Akses Halaman Upload</h3>
                     </div>
                     <p>Klik tombol <strong>"Upload Karya"</strong> di halaman utama repository atau <Link to="/publikasi/submit" className="text-link">klik di sini</Link> untuk langsung menuju formulir.</p>
                  </div>
               </div>
            </div>

            {/* Step 3 */}
            <div className="timeline-item">
               <div className="marker-col">
                  <div className="marker">3</div>
                  <div className="line"></div>
               </div>
               <div className="content-col">
                  <div className="step-card">
                     <div className="step-header">
                        <FileText size={20} className="step-icon blue"/>
                        <h3>Isi Metadata</h3>
                     </div>
                     <p>Lengkapi formulir dengan detail: <strong>Judul, Abstrak, Penulis (Mahasiswa), dan Pembimbing (Dosen)</strong>. Data yang akurat memudahkan pencarian karya Anda nantinya.</p>
                  </div>
               </div>
            </div>

            {/* Step 4 */}
            <div className="timeline-item">
               <div className="marker-col">
                  <div className="marker">4</div>
                  <div className="line"></div>
               </div>
               <div className="content-col">
                  <div className="step-card">
                     <div className="step-header">
                        <UploadCloud size={20} className="step-icon blue"/>
                        <h3>Unggah & Kirim</h3>
                     </div>
                     <p>Pilih file PDF Anda dari komputer, centang <strong>pernyataan keaslian</strong>, lalu klik tombol <strong>Kirim</strong>. Mohon tunggu hingga proses upload bar mencapai 100% selesai.</p>
                  </div>
               </div>
            </div>

            {/* Step 5 */}
            <div className="timeline-item">
               <div className="marker-col">
                  <div className="marker check"><CheckCircle size={20}/></div>
                  {/* No line for the last item */}
               </div>
               <div className="content-col">
                  <div className="step-card success">
                     <div className="step-header">
                        <Save size={20} className="step-icon green"/>
                        <h3>Simpan Bukti</h3>
                     </div>
                     <p>Setelah berhasil, Anda akan mendapatkan <strong>Tanda Terima Digital</strong> berisi ID Submission. Simpan atau cetak bukti ini sebagai syarat administrasi.</p>
                  </div>
               </div>
            </div>
         </div>
      </div>

      <style>{`
        /* --- Global Layout (Sama dengan Kontak) --- */
        .page-wrapper { background: #f8fafc; min-height: 100vh; font-family: 'Inter', sans-serif; color: #0f172a; }
        .simple-nav { background: white; border-bottom: 1px solid #e2e8f0; padding: 0 20px; height: 60px; display: flex; align-items: center; position: sticky; top: 85px; z-index: 50; }
        .nav-container { max-width: 900px; width: 100%; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
        .back-link { text-decoration: none; color: #64748b; font-weight: 500; display: flex; align-items: center; gap: 8px; font-size: 0.9rem; transition: 0.2s; }
        .back-link:hover { color: #0f172a; transform: translateX(-3px); }
        .nav-title { font-weight: 700; color: #0f172a; }

        .content-container { max-width: 800px; margin: 40px auto; padding: 0 20px 80px; }
        
        /* --- Hero Section --- */
        .header-hero { text-align: center; margin-bottom: 60px; max-width: 600px; margin-left: auto; margin-right: auto; }
        .hero-icon { width: 80px; height: 80px; background: #eff6ff; color: #2563eb; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; }
        .header-hero h1 { margin: 0 0 12px; color: #0f172a; font-size: 2rem; letter-spacing: -0.5px; }
        .header-hero p { color: #64748b; font-size: 1.1rem; line-height: 1.6; }

        /* --- Timeline CSS --- */
        .timeline { position: relative; max-width: 700px; margin: 0 auto; }
        
        .timeline-item { display: flex; gap: 24px; position: relative; }
        
        .marker-col { display: flex; flex-direction: column; align-items: center; min-width: 40px; }
        .marker { width: 40px; height: 40px; border-radius: 50%; background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.1rem; z-index: 2; flex-shrink: 0; border: 4px solid #f8fafc; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .marker.check { background: #16a34a; }
        
        .line { width: 2px; background: #e2e8f0; flex-grow: 1; margin: 4px 0; min-height: 40px; }
        
        .content-col { padding-bottom: 40px; width: 100%; }
        
        .step-card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; transition: 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .step-card:hover { border-color: #94a3b8; transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); }
        .step-card.success { background: #f0fdf4; border-color: #bbf7d0; }

        .step-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
        .step-icon { flex-shrink: 0; }
        .step-icon.blue { color: #2563eb; }
        .step-icon.green { color: #16a34a; }
        
        .step-card h3 { margin: 0; font-size: 1.15rem; color: #0f172a; }
        .step-card p { margin: 0; color: #475569; line-height: 1.6; font-size: 0.95rem; }
        
        .text-link { color: #2563eb; text-decoration: none; font-weight: 500; }
        .text-link:hover { text-decoration: underline; }

        /* Responsive Fixes */
        @media (max-width: 640px) {
           .timeline-item { gap: 16px; }
           .marker { width: 32px; height: 32px; font-size: 0.9rem; }
           .header-hero h1 { font-size: 1.75rem; }
           .step-card { padding: 20px; }
        }
      `}</style>
    </div>
  );
};

export default PublikasiPanduan;