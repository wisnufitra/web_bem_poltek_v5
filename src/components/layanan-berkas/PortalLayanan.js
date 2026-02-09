// src/components/layanan-berkas/PortalLayanan.js
import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Komponen ini adalah halaman utama (portal) untuk layanan berkas.
 * Halaman ini akan ditampilkan di URL /layanan/berkaskm.
 * Tujuannya adalah untuk memberikan pengguna dua pilihan utama yang jelas:
 * 1. SI-BERKAS: Untuk memulai pengajuan baru.
 * 2. SI-LAKAS: Untuk melacak pengajuan yang sudah ada.
 */
const PortalLayanan = () => {
    // Definisi gaya untuk kartu-kartu agar konsisten
    const cardStyle = {
        backgroundColor: "white",
        padding: "24px 20px",
        borderRadius: "14px",
        boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
        textAlign: "center",
        cursor: "pointer",
        transition: "transform 0.2s, box-shadow 0.2s",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        textDecoration: "none",
        color: "inherit",
    };

    // Definisi gaya untuk grid yang menampung kartu
    const featuredGridStyle = {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "28px",
        alignItems: "stretch" // Memastikan kartu dalam satu baris sama tinggi
    };

    return (
        <div style={{ maxWidth: '900px', margin: '50px auto', padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '50px' }}>
                <h1 style={{ color: "#00092f", fontSize: "34px", fontWeight: "bold" }}>Sistem Berkas & Pelacakan KM</h1>
                <p style={{ color: '#555', maxWidth: '600px', margin: '10px auto 0', lineHeight: '1.6' }}>
                    Pusat layanan untuk mengajukan, melacak, dan mengelola semua pengajuan berkas Anda secara online.
                </p>
            </div>
            <div style={featuredGridStyle}>
                {/* Kartu SI-BERKAS */}
                <Link to="/layanan/berkaskm/ajukan" style={cardStyle}
                    onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.12)"; }}
                    onMouseOut={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.08)"; }}
                >
                    <span style={{ fontSize: "52px" }}>📄</span>
                    <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                        <h3 style={{ color: "#00092f", marginTop: "18px", fontSize: "20px" }}>SI-BERKAS</h3>
                    </div>
                    <p style={{ color: "#666", fontSize: "15px", marginTop: "12px" }}>Punya pengajuan baru? Mulai proses pengumpulan berkas Anda di sini.</p>
                </Link>

                {/* Kartu SI-LAKAS */}
                <Link to="/layanan/berkaskm/lacak" style={cardStyle}
                    onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.12)"; }}
                    onMouseOut={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.08)"; }}
                >
                    <span style={{ fontSize: "52px" }}>🔍</span>
                    <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                        <h3 style={{ color: "#00092f", marginTop: "18px", fontSize: "20px" }}>SI-LAKAS</h3>
                    </div>
                    <p style={{ color: "#666", fontSize: "15px", marginTop: "12px" }}>Sudah mengajukan? Lacak status dan progres berkas Anda di sini.</p>
                </Link>
            </div>
            <div style={{ textAlign: 'center', marginTop: '40px' }}>
                <Link to="/admin/berkas" style={{ color: '#00092f', fontWeight: 'bold' }}>Login Staf/Admin</Link>
            </div>
        </div>
    );
};

export default PortalLayanan;

