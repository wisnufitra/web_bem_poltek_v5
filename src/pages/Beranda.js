import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { db } from "../firebase/firebaseConfig";
import { collection, onSnapshot, query, where, orderBy, limit } from "firebase/firestore";
import BeritaTerbaru from "../components/BeritaTerbaru";
import heroImage from "../assets/hero-image.JPG"; 

// ✅ Ditambahkan: Ikon untuk tombol
import { ArrowRight, Users, Video, MapPin } from 'lucide-react';

const Beranda = () => {
    const [upcomingEvent, setUpcomingEvent] = useState(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const qEvents = query(collection(db, "pemilihan_events"), where("status", "in", ["setup", "berlangsung"]), orderBy("dibuatPada", "desc"), limit(1));
        const unsubEvents = onSnapshot(qEvents, (snapshot) => {
            if (!snapshot.empty) {
                setUpcomingEvent({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
            } else {
                setUpcomingEvent(null);
            }
        });
        return () => unsubEvents();
    }, []);
    
    // Kode CSS untuk hover effect, agar JSX tetap bersih
    useEffect(() => {
        const styleTag = document.createElement("style");
        styleTag.id = 'beranda-hover-style';
        styleTag.innerHTML = `
            .button-primary-hover:hover { background-color: #ffd700 !important; color: #00092f !important; }
            .button-secondary-hover:hover { background-color: #ffd700 !important; color: #00092f !important; }
        `;
        document.head.appendChild(styleTag);
        return () => {
            const styleElement = document.getElementById('beranda-hover-style');
            if (styleElement) styleElement.parentNode.removeChild(styleElement);
        };
    }, []);

    // --- Styles ---
    const heroStyle = {
        display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        color: 'white', minHeight: '70vh', padding: '40px 20px',
        backgroundImage: `linear-gradient(rgba(0, 9, 47, 0.7), rgba(0, 9, 47, 0.7)), url(${heroImage})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
    };
    const titleStyle = {
        fontSize: isMobile ? "36px" : "48px", fontWeight: "bold", color: "#FFFFFF",
        marginBottom: "16px", textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
    };
    const subtitleStyle = {
        fontSize: isMobile ? "18px" : "22px", lineHeight: "1.6",
        marginBottom: "40px", color: '#c9caca',
    };
    const sectionStyle = { padding: '60px 20px', maxWidth: '1200px', margin: '0 auto', textAlign: 'center' };
    const sectionTitleStyle = {
        fontSize: "28px",             // Sedikit lebih kecil agar seimbang
        fontWeight: "700",            // Menggunakan angka untuk konsistensi
        color: "#1e293b",             // Warna gelap yang lebih modern
        marginBottom: "24px",         // Mengurangi jarak bawah
        display: 'flex',              // Mengaktifkan flexbox
        alignItems: 'center',         // Membuat ikon dan teks sejajar
        gap: '12px',                  // Memberi jarak antara ikon dan teks
        justifyContent: 'center',     // Pastikan posisi tetap di tengah
    };
    const dynamicGridStyle = {
        display: 'grid', gap: '30px', alignItems: 'stretch',
        gridTemplateColumns: isMobile ? '1fr' : (upcomingEvent ? '1.5fr 1fr 1.5fr' : '1fr 1fr')
    };
    const videoContainerStyle = {
        position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden',
        maxWidth: '100%', background: '#000', borderRadius: '12px',
        boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
    };
    const iframeStyle = { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' };
    const ctaCardStyle = {
        backgroundColor: '#00092f', borderRadius: '12px', color: 'white', padding: '30px 20px',
        height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center',
        boxSizing: 'border-box'
    };
    const buttonGroupStyle = { display: "flex", justifyContent: "center", gap: "15px", flexWrap: "wrap" };
    
    // ✅ PERBAIKAN: Padding dan font-size disesuaikan agar tombol tidak terlalu besar
    const buttonStyle = {
        padding: "10px 20px",
        fontSize: "0.9rem", // Sedikit lebih kecil dari standar
        backgroundColor: "#00092f",
        color: "#fff",
        textDecoration: "none",
        borderRadius: "8px",
        fontWeight: "bold",
        border: "2px solid #ffd700",
        transition: "background-color 0.3s, color 0.3s",
        display: 'inline-flex', // Agar ikon dan teks sejajar
        alignItems: 'center',
        gap: '8px'
    };

    return (
        <div>
            <div style={heroStyle}>
                <div style={{ maxWidth: '800px' }}>
                    <h1 style={titleStyle}>Selamat Datang di Website Resmi BEM KM Poltek Nuklir</h1>
                    <p style={subtitleStyle}>
                        Mengabdi dengan Aksi, Berkarya untuk Negeri. Bersama membangun KM Poltek Nuklir yang lebih baik.
                    </p>
                    <div style={buttonGroupStyle}>
                        <Link to="/tentang" style={buttonStyle} className="button-primary-hover">
                            Tentang Kami <ArrowRight size={16}/>
                        </Link>
                        <Link to="/struktur" style={{...buttonStyle, backgroundColor: 'transparent'}} className="button-secondary-hover">
                            Lihat Struktur <Users size={16}/>
                        </Link>
                    </div>
                </div>
            </div>

            <div style={{backgroundColor: '#f9f9f9'}}>
                <BeritaTerbaru />
            </div>

            <div style={sectionStyle}>
                <div style={dynamicGridStyle}>
                    <div>
                        <h2 style={sectionTitleStyle}><Video size={28} /> Profil Kampus</h2>
                        <div style={videoContainerStyle}>
                            <iframe 
                                style={iframeStyle}
                                src="https://www.youtube.com/embed/gpOL94CNMbw?playlist=gpOL94CNMbw&loop=1&mute=1&autoplay=1" 
                                title="YouTube video player" frameBorder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen>
                            </iframe>
                        </div>
                    </div>

                    {upcomingEvent && (
                        <div style={ctaCardStyle}>
                            <h2 style={{...sectionTitleStyle, fontSize: '24px', color: 'white', borderBottomColor: '#ffd700'}}>{upcomingEvent.status === 'berlangsung' ? 'Pemilihan Sedang Berlangsung!' : 'Pemilihan Akan Datang'}</h2>
                            <h3 style={{color: '#ffd700', marginTop: '-20px'}}>{upcomingEvent.namaEvent}</h3>
                            <p style={{color: '#c9caca', flexGrow: 1}}>
                                Salurkan aspirasi Anda dan berpartisipasilah dalam pesta demokrasi KM Poltek Nuklir.
                            </p>
                            <Link to="/pemilihan" style={{padding: '12px 24px', backgroundColor: '#ffd700', color: '#00092f', textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold'}}>
                                Masuk ke Portal E-Voting
                            </Link>
                        </div>
                    )}

                    <div>
                        <h2 style={sectionTitleStyle}><MapPin size={28} /> Lokasi Kami</h2>
                        <div style={{...videoContainerStyle, border: '3px solid #00092f'}}>
                             {/* ✅ PERBAIKAN: Link embed Google Maps yang benar */}
                            <iframe 
                                style={iframeStyle}
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3953.1075750779455!2d110.4117637!3d-7.7784172!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e7a5996aaaaaaab%3A0xdd5277d8652c4602!2sIndonesian%20Polytechnic%20of%20Nuclear%20Technology!5e0!3m2!1sen!2sid!4v1759900105221!5m2!1sen!2sid"
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade">
                            </iframe>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Beranda;