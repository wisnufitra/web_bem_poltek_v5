import React, { useState, useEffect } from "react";
import { db } from "../firebase/firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";
import { Info, Mail, Phone, Instagram, Twitter, Facebook, Globe, Smartphone, Link as LinkIcon } from 'lucide-react';

// --- Helper Components ---

// Pemetaan Ikon Kontak (Sama seperti di halaman Admin)
const contactIconMap = {
    Email: Mail,
    WhatsApp: Smartphone,
    Telepon: Phone,
    Instagram: Instagram,
    'X (Twitter)': Twitter,
    Facebook: Facebook,
    Website: Globe,
    Lainnya: LinkIcon,
};

const ContactItem = ({ type, value }) => {
    const Icon = contactIconMap[type] || LinkIcon;
    let href = value;
    let display_text = value;

    switch (type) {
        case 'Email': href = `mailto:${value}`; break;
        case 'WhatsApp': href = `https://wa.me/${value.replace(/\D/g, '')}`; break;
        case 'Instagram': href = `https://instagram.com/${value.replace('@', '')}`; display_text = `@${value.replace('@', '')}`; break;
        case 'Telepon': href = `tel:${value.replace(/\D/g, '')}`; break;
        default: break;
    }

    return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="contact-item">
            <Icon size={20} />
            <span>{display_text}</span>
        </a>
    );
};

// Komponen untuk merender konten secara cerdas
const SmartContentRenderer = ({ section }) => {
    if (section.judul === 'Misi') {
        const misiItems = section.isi.split('\n').filter(item => item.trim() !== '');
        return (
            <ol className="misi-list">
                {misiItems.map((item, index) => (
                    <li key={index}>{item.replace(/^- /, '')}</li>
                ))}
            </ol>
        );
    }
    // Render default untuk Visi, Deskripsi Awal, dll.
    return <p className="section-content-text">{section.isi}</p>;
};


// --- Main Component ---

const Tentang = () => {
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const docRef = doc(db, 'halaman', 'tentang');
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists() && docSnap.data().sections) {
                const sortedSections = docSnap.data().sections.sort((a, b) => (a.urutan || 0) - (b.urutan || 0));
                setSections(sortedSections);
            } else {
                setSections([]);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);
    
    useEffect(() => {
        document.head.appendChild(styleSheet);
        return () => { document.head.removeChild(styleSheet); };
    }, []);

    // Memisahkan Visi, Misi, dan Kontak dari bagian lain
    const visi = sections.find(s => s.judul === 'Visi');
    const misi = sections.find(s => s.judul === 'Misi');
    const contactSections = sections.filter(s => s.judul === 'Kontak Kami');
    const otherSections = sections.filter(s => s.judul !== 'Visi' && s.judul !== 'Misi' && s.judul !== 'Kontak Kami');

    return (
        <div className="tentang-page-wrapper">
            <header className="page-header">
                <div className="header-content-wrapper">
                    <Info size={40} />
                    <div>
                        <h1 className="page-title">Tentang BEM</h1>
                        <p className="page-subtitle">Mengenal lebih dekat Badan Eksekutif Mahasiswa Politeknik Teknologi Nuklir Indonesia.</p>
                    </div>
                </div>
            </header>

            <main className="tentang-page-content">
                {loading ? <p className="loading-text">Memuat halaman...</p> : (
                    sections.length === 0 ? (
                        <div className="card empty-state">
                            <p>Konten untuk halaman ini sedang disiapkan.</p>
                        </div>
                    ) : (
                        <>
                            {/* Render Visi & Misi secara khusus */}
                            {(visi || misi) && (
                                <div className="vision-mission-grid">
                                    {visi && (
                                        <div className="card">
                                            <h2 className="section-title">Visi</h2>
                                            <SmartContentRenderer section={visi} />
                                        </div>
                                    )}
                                    {misi && (
                                        <div className="card">
                                            <h2 className="section-title">Misi</h2>
                                            <SmartContentRenderer section={misi} />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Render bagian-bagian lainnya */}
                            {otherSections.map((section) => (
                                <div key={section.id} className="card">
                                    <h2 className="section-title">{section.judul}</h2>
                                    <SmartContentRenderer section={section} />
                                </div>
                            ))}
                            
                            {/* Render Kontak Kami secara khusus */}
                            {contactSections.length > 0 && (
                                <div className="card">
                                    <h2 className="section-title">Kontak Kami</h2>
                                    <div className="contact-grid">
                                        {contactSections.map((section) => (
                                            <ContactItem key={section.id} type={section.contactType} value={section.isi} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )
                )}
            </main>
        </div>
    );
};

const styleSheet = document.createElement("style");
styleSheet.innerHTML = `
    .tentang-page-wrapper { font-family: 'Inter', sans-serif; background-color: #f8fafc; }

    /* Header Styles */
    .page-header { padding: 48px 0; background-color: #eff6ff; border-bottom: 1px solid #dbeafe; }
    .header-content-wrapper { max-width: 1280px; margin: 0 auto; padding: 0 24px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; color: #1e293b; }
    .page-header svg { color: #1d4ed8; margin-bottom: 8px; }
    .page-title { font-size: 2.5rem; font-weight: 800; margin: 0; }
    .page-subtitle { color: #64748b; font-size: 1.1rem; margin: 8px auto 0; max-width: 600px; }

    /* Main Content */
    .tentang-page-content { max-width: 960px; margin: 48px auto; padding: 0 24px 48px 24px; display: flex; flex-direction: column; gap: 40px; }
    
    .card { background-color: #fff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.04); padding: 32px; }
    
    .section-title {
        font-size: 1.75rem;
        font-weight: 700;
        color: #1e293b;
        margin-top: 0;
        margin-bottom: 24px;
        padding-bottom: 12px;
        border-bottom: 1px solid #e2e8f0;
    }

    .section-content-text {
        white-space: pre-wrap;
        text-align: justify;
        line-height: 1.8;
        color: #334155;
        margin: 0;
    }

    /* Vision & Mission Grid */
    .vision-mission-grid { display: grid; grid-template-columns: 1fr; gap: 40px; }
    
    .misi-list { padding-left: 20px; margin: 0; }
    .misi-list li { margin-bottom: 12px; line-height: 1.8; color: #334155; }
    
    /* Contact Section */
    .contact-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
    .contact-item { display: flex; align-items: center; gap: 12px; text-decoration: none; color: #1d4ed8; font-weight: 500; padding: 12px; border-radius: 8px; background-color: #f1f5f9; transition: all 0.2s; }
    .contact-item:hover { background-color: #e2e8f0; color: #1e293b; }
    .contact-item svg { flex-shrink: 0; }
    
    .loading-text, .empty-state { text-align: center; color: #6b7280; font-size: 1rem; padding: 40px; }

    /* Media Queries */
    @media (min-width: 768px) {
        .vision-mission-grid { grid-template-columns: 1fr 1fr; }
    }
    @media (max-width: 768px) {
        .page-header { padding: 32px 0; }
        .page-title { font-size: 1.75rem; }
        .tentang-page-content { margin-top: 32px; padding: 0 16px 32px 16px; }
        .card { padding: 24px; }
        .section-title { font-size: 1.5rem; }
    }
`;

export default Tentang;