// src/pages/Layanan.js
import React, { useState, useEffect, useMemo } from "react";
import { db } from "../firebase/firebaseConfig";
import { collection, onSnapshot, query, orderBy, where, doc } from "firebase/firestore";
import { Link } from "react-router-dom";

// Impor ikon
import { 
    Handshake, FileUp, Search, X, Loader2, FileText, Mail, ClipboardList, FileSignature, 
    PenSquare, Archive, BookMarked, CalendarDays, CalendarCheck, Clock, Hourglass, Timer, 
    CalendarPlus, AlarmClock, Building, MapPin, School, Home, Key, Library, Landmark, 
    Wallet, Coins, Receipt, Banknote, Ticket, PartyPopper, Users, Flag, Swords, 
    Sparkles, Megaphone, Link as LinkIcon, Star, Info, HelpCircle, Award, LifeBuoy 
} from 'lucide-react';

// Mapping ikon
const iconComponents = {
    Handshake, FileUp, Search, X, Loader2, FileText, Mail, ClipboardList, FileSignature, 
    PenSquare, Archive, BookMarked, CalendarDays, CalendarCheck, Clock, Hourglass, Timer, 
    CalendarPlus, AlarmClock, Building, MapPin, School, Home, Key, Library, Landmark, 
    Wallet, Coins, Receipt, Banknote, Ticket, PartyPopper, Users, Flag, Swords, 
    Sparkles, Megaphone, Link: LinkIcon, Star, Info, HelpCircle, Award, LifeBuoy
};

const LoadingSpinner = () => ( <div className="loading-container"><Loader2 className="spinner" size={32}/></div> );

const Layanan = () => {
    const [layanan, setLayanan] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedLayanan, setSelectedLayanan] = useState(null);
    const [activeCategory, setActiveCategory] = useState("Semua");
    const [showFeaturedServices, setShowFeaturedServices] = useState(true);

    useEffect(() => {
        const q = query(
            collection(db, "layanan"),
            where("isPublished", "==", true),
            orderBy("urutan", "asc")
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setLayanan(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });

        const settingsDocRef = doc(db, 'settings', 'general');
        const unsubSettings = onSnapshot(settingsDocRef, (docSnap) => {
            if (docSnap.exists() && docSnap.data().isPublishedFeaturedServices !== undefined) {
                setShowFeaturedServices(docSnap.data().isPublishedFeaturedServices);
            }
        });
        return () => { unsubscribe(); unsubSettings(); };
    }, []);

    const { groupedLayanan, categories } = useMemo(() => {
        const grouped = layanan.reduce((acc, item) => {
            const category = item.kategori || "Lainnya";
            if (!acc[category]) acc[category] = [];
            acc[category].push(item);
            return acc;
        }, {});
        const categoriesList = ["Semua", ...Object.keys(grouped)];
        return { groupedLayanan: grouped, categories: categoriesList };
    }, [layanan]);

    const handleCardClick = (item) => {
        setSelectedLayanan(item);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedLayanan(null);
    };

    const createDirectLink = (embedLink) => {
        if (!embedLink) return "#";
        return embedLink.includes("?embedded=true") ? embedLink.replace("?embedded=true", "") : embedLink;
    };
    
    const IconComponent = ({ name, ...props }) => {
        const LucideIcon = iconComponents[name] || Handshake;
        return <LucideIcon {...props} />;
    };

    return (
        <div className="layanan-page-wrapper">
            {/* ✅ REVISI 1: Menyamakan struktur JSX Header seperti di Struktur.js */}
            <header className="page-header">
                <div className="header-content-wrapper">
                    <Handshake size={40} />
                    <div>
                        <h1 className="page-title">Pusat Layanan BEM</h1>
                        <p className="page-subtitle">Temukan berbagai layanan administrasi dan fasilitas yang kami sediakan untuk menunjang kegiatan Anda.</p>
                    </div>
                </div>
            </header>

            <main className="main-content-container">
                {showFeaturedServices && (
                    <section className="division-section">
                        <div className="division-title-container"><h2 className="division-title">Layanan Digital Terpadu</h2></div>
                        <div className="card-grid">
                            {/* <div className="struktur-card disabled">
                                <div className="coming-soon-badge">Segera Hadir</div>
                                <div className="service-icon-wrapper"><FileUp size={32}/></div>
                                <h3 className="card-title">SI-BERKAS</h3>
                                <p className="card-description">Punya pengajuan baru? Mulai proses pengumpulan berkas Anda di sini.</p>
                            </div>
                            <div className="struktur-card disabled">
                                <div className="coming-soon-badge">Segera Hadir</div>
                                <div className="service-icon-wrapper"><Search size={32}/></div>
                                <h3 className="card-title">SI-LAKAS</h3>
                                <p className="card-description">Sudah mengajukan? Lacak status dan progres berkas Anda di sini.</p>
                            </div> */}
                            <Link to="/pinjam-sc" className="struktur-card">
                                {/* <div className="new-badge">Baru</div> */}
                                <div className="service-icon-wrapper"><CalendarPlus size={32}/></div>
                                <h3 className="card-title">Formulir Peminjaman SC</h3>
                                <p className="card-description">Ajukan peminjaman ruangan atau fasilitas di Student Center melalui kalender interaktif.</p>
                            </Link>
                            <Link to="/pinjam-sc/kelola" className="struktur-card">
                                {/*<div className="new-badge">Baru</div> */}
                                <div className="service-icon-wrapper"><Ticket size={32}/></div>
                                <h3 className="card-title">Kelola Peminjaman SC</h3>
                                <p className="card-description">Ubah detail jadwal atau batalkan peminjaman Anda menggunakan Nomor Tiket.</p>
                            </Link>
                        </div>
                    </section>
                )}

                <section className="division-section">
                    <div className="division-title-container"><h2 className="division-title">Layanan Lainnya</h2></div>
                    <div className="filter-container">
                        {categories.map((cat) => (
                            <button key={cat} onClick={() => setActiveCategory(cat)} className={`filter-button ${activeCategory === cat ? 'active' : ''}`}>
                                {cat}
                            </button>
                        ))}
                    </div>

                    {loading ? <LoadingSpinner /> : Object.keys(groupedLayanan).length > 0 ? (
                        Object.keys(groupedLayanan).map((category) =>
                            activeCategory === "Semua" || activeCategory === category ? (
                                <div key={category} className="category-group">
                                    <h3 className="category-title">{category}</h3>
                                    <div className="card-grid">
                                        {groupedLayanan[category].map((item) => (
                                            <div key={item.id} className="struktur-card" onClick={() => handleCardClick(item)}>
                                                <div className="service-icon-wrapper"><IconComponent name={item.iconName} size={32}/></div>
                                                <h3 className="card-title">{item.judul}</h3>
                                                <p className="card-description">{item.deskripsi}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : null
                        )
                    ) : (
                        !loading && <p className="empty-text">Belum ada layanan yang dipublikasikan.</p>
                    )}
                </section>
            </main>

            {showModal && selectedLayanan && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2 className="modal-title">{selectedLayanan.judul}</h2>
                            <button onClick={closeModal} className="close-button"><X size={24}/></button>
                        </div>
                        <iframe src={selectedLayanan.link} title={selectedLayanan.judul} className="iframe-form" allowFullScreen></iframe>
                        <p className="modal-footer">
                            Jika formulir tidak muncul,{" "}
                            <a href={createDirectLink(selectedLayanan.link)} target="_blank" rel="noopener noreferrer">
                                buka di tab baru
                            </a>.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};


const styleSheet = document.createElement("style");
styleSheet.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    
    .layanan-page-wrapper { font-family: 'Inter', sans-serif; background-color: #f8fafc; }
    .loading-container { display: flex; justify-content: center; padding: 40px; }
    .spinner { animation: spin 1s linear infinite; color: #3b82f6; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    /* ✅ REVISI 2: Menggunakan blok CSS Header yang sama persis dari Struktur.js */
    /* --- Header Halaman (Full Width) --- */
    .page-header { 
        padding: 24px 0; /* Padding vertikal mobile */
        background-color: #eff6ff; 
        border-bottom: 1px solid #dbeafe;
        margin-bottom: 48px;
    }
    
    .header-content-wrapper { 
        max-width: 1280px; 
        margin: 0 auto;
        padding: 0 24px; 
        
        display: flex; 
        flex-direction: column; /* Selalu vertikal (ikon di atas) */
        align-items: center; /* Selalu rata tengah */
        text-align: center;
        gap: 8px; /* Kurangi jarak antara ikon dan judul */
        color: #1e293b; 
    }
    .page-header svg { color: #1d4ed8; margin-bottom: 8px; flex-shrink: 0; }
    .page-title { font-size: 2.5rem; font-weight: 800; margin: 0; color: #1e293b; }
    .page-subtitle { color: #64748b; font-size: 1.1rem; margin: 8px auto 0; max-width: 600px; }
    
    /* --- Konten Utama & Judul Seksi --- */
    .main-content-container { max-width: 1280px; margin: 0 auto; padding: 0 24px 24px 24px; }
    .division-section, .category-group { margin-bottom: 48px; }
    .division-title-container { text-align: center; margin-bottom: 32px; }
    .division-title { display: inline-block; position: relative; font-size: 1.75rem; font-weight: 700; color: #1e293b; padding-bottom: 8px; border: none; }
    .division-title::after { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 50px; height: 4px; background-color: #3b82f6; border-radius: 2px; }
    .category-title { font-size: 1.5rem; font-weight: 600; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 24px; }

    /* --- Filter --- */
    .filter-container { display: flex; justify-content: center; gap: 12px; margin-bottom: 40px; flex-wrap: wrap; }
    .filter-button { padding: 10px 20px; border: 1px solid #d1d5db; border-radius: 9999px; background: white; cursor: pointer; font-weight: 600; color: #4b5563; transition: all 0.2s; }
    .filter-button:hover { border-color: #3b82f6; color: #3b82f6; }
    .filter-button.active { background-color: #3b82f6; color: white; border-color: #3b82f6; }
    
    /* --- Grid & Kartu --- */
    .card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
    .struktur-card {
        text-align: center; padding: 32px 24px; background-color: white; border-radius: 16px;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.04), 0 2px 4px -2px rgba(0,0,0,0.04);
        border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.2s;
        display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
        text-decoration: none; min-height: 240px;
        position: relative; /* Wajib agar badge bisa absolute di dalamnya */
        overflow: hidden;
    }
    .struktur-card:hover { transform: translateY(-5px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.07); border-color: #a5b4fc; }
    .card-title { color: #1e293b; font-size: 1.25rem; font-weight: 600; margin: 0 0 10px 0; }
    .card-description { color: #64748b; font-size: 0.9rem; margin: 0; line-height: 1.6; flex-grow: 1; }
    .service-icon-wrapper {
        width: 64px; height: 64px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        background-color: #eff6ff; color: #3b82f6; margin-bottom: 20px;
        flex-shrink: 0;
    }
    .empty-text { text-align: center; padding: 20px; color: #9ca3af; }

    /* --- Modal --- */
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(15, 23, 42, 0.8); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 2000; padding: 20px; }
    .modal-content { display: flex; flex-direction: column; background-color: white; border-radius: 16px; width: 100%; max-width: 900px; height: 90%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2); }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #e2e8f0; }
    .modal-title { color: #1e293b; margin: 0; font-size: 1.5rem; font-weight: 700; }
    .close-button { background: none; border: none; cursor: pointer; color: #9ca3af; }
    .iframe-form { width: 100%; flex-grow: 1; border: none; }
    .modal-footer { text-align: center; font-size: 0.9rem; color: #6b7280; padding: 16px; border-top: 1px solid #e2e8f0; }
    .modal-footer a { color: #3b82f6; font-weight: 600; text-decoration: none; }
    
    .coming-soon-badge {
        position: absolute;
        top: 28px;
        right: -30px; /* sedikit lebih ke dalam agar tidak terpotong */
        transform: rotate(45deg);
        background-color: #FFB347; /* biru tema */
        color: #fff;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        text-align: center;
        width: 140px;
        padding: 6px 0;
        font-size: 0.75rem;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
        z-index: 5;
    }

    .new-badge {
        position: absolute;
        top: 16px;
        right: -28px;
        transform: rotate(45deg);
        background-color: #10b981; /* hijau cerah emerald */
        color: #fff;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        text-align: center;
        width: 140px;
        padding: 6px 0;
        font-size: 0.75rem;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
        z-index: 5;
    }

    @media (max-width: 768px) {
        .coming-soon-badge {
            top: 21px;
            right: -24px;
            width: 110px;
            font-size: 0.65rem;
            padding: 4px 0;
        }

        .new-badge {
            top: 21px;
            right: -24px;
            width: 110px;
            font-size: 0.65rem;
            padding: 4px 0;
        }
    }
    @media (min-width: 1440px) {
        .coming-soon-badge {
            top: 22px;
            right: -32px;
            width: 160px;
            font-size: 0.8rem;
            padding: 7px 0;
        }

        .new-badge {
            top: 22px;
            right: -32px;
            width: 160px;
            font-size: 0.8rem;
            padding: 7px 0;
        }
    }
    @keyframes pulseBanner {
        0%, 100% { opacity: 1; transform: rotate(45deg) scale(1); }
        50% { opacity: 0.9; transform: rotate(45deg) scale(1.05); }
    }
    .coming-soon-badge {
        animation: pulseBanner 3s ease-in-out infinite;
    }
`;
document.head.appendChild(styleSheet);


export default Layanan;