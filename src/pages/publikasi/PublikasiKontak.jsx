import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, MapPin } from 'lucide-react';

const PublikasiKontak = () => {
  return (
    <div className="page-wrapper">
      <nav className="simple-nav">
         <div className="nav-container">
            <Link to="/publikasi" className="back-link"><ArrowLeft size={18}/> Kembali ke Repository</Link>
            <div className="nav-title">Hubungi Kami</div>
         </div>
      </nav>

      <div className="content-container">
         <div className="header-hero">
            <h1>Kontak & Dukungan</h1>
            <p>Jika Anda mengalami kendala teknis atau memiliki pertanyaan seputar repository, silakan hubungi kami melalui saluran berikut.</p>
         </div>

         <div className="contact-grid">
            <div className="contact-card">
               <div className="icon-wrap blue"><Mail size={24}/></div>
               <h3>Email Support</h3>
               <p>Kirim pertanyaan detail atau lampiran dokumen.</p>
               <a href="mailto:bem@polteknuklir.ac.id" className="btn-contact">bem@polteknuklir.ac.id</a>
            </div>
            
            <div className="contact-card">
               <div className="icon-wrap green"><Phone size={24}/></div>
               <h3>WhatsApp Center</h3>
               <p>Respon cepat pada jam kerja (Senin - Jumat, 08.00 - 16.00).</p>
               <a href="https://wa.me/6285161924113" target="_blank" rel="noreferrer" className="btn-contact">Chat via WhatsApp</a>
            </div>

            <div className="contact-card">
               <div className="icon-wrap purple"><MapPin size={24}/></div>
               <h3>Sekretariat BEM</h3>
               <p>Gedung Student Center, Politeknik Teknologi Nuklir Indonesia.<br/>Jl. Babarsari, Caturtunggal, Depok, Sleman, DIY 55281.</p>
            </div>
         </div>
      </div>

      <style>{`
        .page-wrapper { background: #f8fafc; min-height: 100vh; font-family: 'Inter', sans-serif; }
        .simple-nav { background: white; border-bottom: 1px solid #e2e8f0; padding: 0 20px; height: 60px; display: flex; align-items: center; position: sticky; top: 85px; z-index: 50; }
        .nav-container { max-width: 900px; width: 100%; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
        .back-link { text-decoration: none; color: #64748b; font-weight: 500; display: flex; align-items: center; gap: 8px; font-size: 0.9rem; }
        .back-link:hover { color: #0f172a; }
        .nav-title { font-weight: 700; color: #0f172a; }

        .content-container { max-width: 900px; margin: 40px auto; padding: 0 20px 60px; }
        
        .header-hero { text-align: center; margin-bottom: 50px; max-width: 600px; margin-left: auto; margin-right: auto; }
        .header-hero h1 { margin: 0 0 12px; color: #0f172a; font-size: 2rem; }
        .header-hero p { color: #64748b; font-size: 1.1rem; line-height: 1.6; }

        .contact-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 30px; }
        
        .contact-card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; text-align: center; transition: 0.2s; display: flex; flex-direction: column; align-items: center; }
        .contact-card:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.05); border-color: #3b82f6; }
        
        .icon-wrap { width: 56px; height: 56px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; }
        .icon-wrap.blue { background: #dbeafe; color: #2563eb; }
        .icon-wrap.green { background: #dcfce7; color: #16a34a; }
        .icon-wrap.purple { background: #f3e8ff; color: #7c3aed; }

        .contact-card h3 { margin: 0 0 8px; color: #0f172a; font-size: 1.2rem; }
        .contact-card p { color: #64748b; line-height: 1.5; margin-bottom: 24px; flex-grow: 1; }
        
        .btn-contact { display: inline-block; padding: 10px 24px; background: #0f172a; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; transition: 0.2s; }
        .btn-contact:hover { background: #1e293b; }
      `}</style>
    </div>
  );
};

export default PublikasiKontak;