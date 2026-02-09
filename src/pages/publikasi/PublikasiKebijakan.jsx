import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

const PublikasiKebijakan = () => {
  return (
    <div className="page-wrapper">
      <nav className="simple-nav">
         <div className="nav-container">
            <Link to="/publikasi" className="back-link"><ArrowLeft size={18}/> Kembali ke Repository</Link>
            <div className="nav-title">Kebijakan Privasi</div>
         </div>
      </nav>

      <div className="content-container">
         <div className="doc-paper">
            <div className="doc-head">
               <Shield size={32} className="doc-icon"/>
               <h1>Kebijakan Privasi & Hak Cipta</h1>
               <p>Terakhir diperbarui: Januari 2025</p>
            </div>
            
            <div className="doc-body">
               <h3>1. Pendahuluan</h3>
               <p>Repository BEM KM Poltek Nuklir berkomitmen untuk melindungi privasi pengguna dan menghormati hak kekayaan intelektual penulis. Kebijakan ini menjelaskan bagaimana data dikumpulkan, digunakan, dan dilindungi.</p>

               <h3>2. Kebijakan Akses Terbuka (Open Access)</h3>
               <p>Sistem ini menganut prinsip <strong>Open Access</strong>. Artinya, metadata (Judul, Abstrak, Nama Penulis) dan naskah lengkap (Full Text) yang berstatus "Approved" dapat diakses secara bebas oleh publik untuk tujuan pendidikan, penelitian, dan referensi akademis.</p>

               <h3>3. Hak Cipta (Copyright)</h3>
               <p>Hak cipta atas karya tulis tetap berada pada <strong>Penulis/Pencipta</strong>. Dengan mengunggah karya ke sistem ini, Penulis memberikan lisensi non-eksklusif kepada BEM Poltek Nuklir untuk:</p>
               <ul>
                  <li>Menyimpan dan mengalihmediakan karya untuk tujuan pengarsipan.</li>
                  <li>Mempublikasikan karya di internet agar dapat diakses publik.</li>
               </ul>

               <h3>4. Tanggung Jawab Penulis</h3>
               <p>Penulis bertanggung jawab penuh atas orisinalitas karya yang diunggah. Segala bentuk plagiarisme, pelanggaran hak cipta pihak ketiga, atau konten yang melanggar hukum adalah tanggung jawab pribadi penulis.</p>

               <h3>5. Data Pribadi</h3>
               <p>Informasi pribadi seperti Nomor WhatsApp dan Email yang dikumpulkan saat proses upload hanya digunakan untuk keperluan komunikasi administratif antara Admin dan Penulis. Data ini <strong>tidak akan dipublikasikan</strong> secara terbuka di halaman detail karya.</p>
            </div>
         </div>
      </div>

      <style>{`
        .page-wrapper { background: #f8fafc; min-height: 100vh; font-family: 'Inter', sans-serif; }
        .simple-nav { background: white; border-bottom: 1px solid #e2e8f0; padding: 0 20px; height: 60px; display: flex; align-items: center; position: sticky; top: 85px; z-index: 50; }
        .nav-container { max-width: 800px; width: 100%; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
        .back-link { text-decoration: none; color: #64748b; font-weight: 500; display: flex; align-items: center; gap: 8px; font-size: 0.9rem; }
        .back-link:hover { color: #0f172a; }
        .nav-title { font-weight: 700; color: #0f172a; }

        .content-container { max-width: 800px; margin: 40px auto; padding: 0 20px 60px; }
        
        .doc-paper { background: white; padding: 60px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .doc-head { text-align: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 30px; margin-bottom: 30px; }
        .doc-icon { color: #16a34a; margin-bottom: 16px; }
        .doc-head h1 { margin: 0 0 8px; color: #0f172a; font-size: 1.8rem; }
        .doc-head p { color: #64748b; font-size: 0.9rem; }

        .doc-body h3 { color: #0f172a; margin-top: 30px; margin-bottom: 12px; font-size: 1.1rem; }
        .doc-body p { color: #475569; line-height: 1.8; margin-bottom: 16px; text-align: justify; }
        .doc-body ul { padding-left: 20px; color: #475569; margin-bottom: 16px; }
        .doc-body li { margin-bottom: 8px; line-height: 1.6; }

        @media (max-width: 600px) {
           .doc-paper { padding: 30px; }
        }
      `}</style>
    </div>
  );
};

export default PublikasiKebijakan;