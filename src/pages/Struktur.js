// src/pages/Struktur.js
import React, { useEffect, useState, useMemo } from "react";
import { db } from "../firebase/firebaseConfig";
import { collection, onSnapshot, query } from "firebase/firestore";

import { Users, Network, BookOpen, Mail, Instagram, Linkedin, GraduationCap, X, Phone } from 'lucide-react';

const StrukturCard = ({ anggota, onCardClick }) => {
    return (
        <div className="struktur-card" onClick={onCardClick}>
            <img 
                src={anggota.foto || `https://ui-avatars.com/api/?name=${anggota.nama.replace(/\s/g, '+')}`} 
                alt={anggota.nama} 
                className="struktur-card-img"
            />
            <div className="struktur-card-body">
                <h4 className="struktur-card-name">{anggota.nama}</h4>
                <p className="struktur-card-jabatan">{anggota.jabatan}</p>
            </div>
        </div>
    );
};

const Struktur = () => {
    const [struktur, setStruktur] = useState([]);
    const [pembina, setPembina] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMember, setSelectedMember] = useState(null);

    useEffect(() => {
        const qStruktur = query(collection(db, "struktur"));
        const unsubStruktur = onSnapshot(qStruktur, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            const predefinedOrder = [
                "Pengurus Harian", "Inspektorat Jenderal", "Sekretariat Jenderal",
                "Kementerian Keuangan", "Kementerian Dalam Negeri", "Kementerian Luar Negeri",
                "Kementerian Pemuda dan Olahraga (PORA)", "Kementerian PSDM",
                "Kementerian Komunikasi dan Informasi (KOMINFO)", "Kementerian Ekonomi Kreatif"
            ];
            const sortedData = data.sort((a, b) => predefinedOrder.indexOf(a.divisi) - predefinedOrder.indexOf(b.divisi));
            setStruktur(sortedData);
            setLoading(false);
        });

        const qPembina = query(collection(db, "pembina"));
        const unsubPembina = onSnapshot(qPembina, (snapshot) => {
            setPembina(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => {
            unsubStruktur();
            unsubPembina();
        };
    }, []);
    
    const stats = useMemo(() => {
        let totalAnggota = 0;
        const prodiCount = { "Teknokimia Nuklir": 0, "Elektronika Instrumentasi": 0, "Elektro Mekanika": 0 };
        struktur.forEach(divisi => {
            const anggotaDivisi = divisi.anggota || [];
            totalAnggota += anggotaDivisi.length;
            anggotaDivisi.forEach(anggota => {
                if (prodiCount.hasOwnProperty(anggota.prodi)) {
                    prodiCount[anggota.prodi]++;
                }
            });
        });
        return { totalDivisi: struktur.length, totalAnggota, ...prodiCount };
    }, [struktur]);
    const jabatanPimpinan = ["Presiden Mahasiswa", "Wakil Presiden Mahasiswa", "Sekretaris Jendral", "Wakil Sekretaris Jendral", "Kepala Menteri", "Wakil Menteri"];

    const DetailModal = ({ member, onClose }) => {
        if (!member) return null;
        return (
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <button onClick={onClose} className="close-button"><X size={24} /></button>
                    <img src={member.foto || `https://ui-avatars.com/api/?name=${member.nama.replace(/\s/g, '+')}`} alt={member.nama} className="modal-avatar" />
                    <h2 className="modal-name">{member.nama}</h2>
                    <p className="modal-jabatan">{member.jabatan}</p>

                    <div className="modal-details">
                        {member.nim && <p><strong>NIM:</strong> {member.nim}</p>}
                        {member.prodi && <p><strong>Prodi:</strong> {member.prodi}</p>}
                        {member.nip && <p><strong>NIP:</strong> {member.nip}</p>}
                        {member.golongan && <p><strong>Golongan:</strong> {member.golongan}</p>}
                    </div>

                    <div className="modal-contact">
                        {member.email && <a href={`mailto:${member.email}`} className="contact-item"><Mail size={16}/> Email</a>}
                        {member.nohp && <div className="contact-item"><Phone size={16}/> {member.nohp}</div>}
                        {member.instagram && <a href={`https://instagram.com/${member.instagram}`} target="_blank" rel="noopener noreferrer" className="contact-item"><Instagram size={16}/> Instagram</a>}
                        {member.linkedin && <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="contact-item"><Linkedin size={16}/> LinkedIn</a>}
                        {member.scholar && <a href={member.scholar} target="_blank" rel="noopener noreferrer" className="contact-item"><GraduationCap size={16}/> Google Scholar</a>}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="root-wrapper"> {/* Wrapper Baru untuk menampung semua di dalam layout */}
            
            {/* HEADER KONTEN - Diperlukan untuk background full width */}
            <header className="page-header">
                {/* Pembatas Judul - Ini yang membatasi ikon/judul agar rata tengah */}
                <div className="header-content-wrapper"> 
                    <Users size={40} />
                    <div>
                        <h1 className="page-title">Struktur Organisasi</h1>
                        <p className="page-subtitle">Kenali lebih dekat jajaran pengurus dan pembina BEM Politeknik Teknologi Nuklir Indonesia.</p>
                    </div>
                </div>
            </header>
            
            {/* KONTEN UTAMA - Konten yang memiliki padding samping */}
            <div className="struktur-public-page">
                
                {loading ? (
                    <p className="loading-text">Memuat struktur organisasi...</p>
                ) : (
                    <>
                        {/* Pembina Organisasi */}
                        {pembina.length > 0 && (
                            <div className="division-section">
                                <div className="division-title-container"><h2 className="division-title">Pembina Organisasi</h2></div>
                                <div className="card-grid">
                                    {pembina.map((item) => <StrukturCard key={item.id} anggota={item} onCardClick={() => setSelectedMember(item)} />)}
                                </div>
                            </div>
                        )}
                        
                        {/* Struktur Divisi */}
                        {struktur.map((divisiData) => {
                            if (!divisiData.anggota || divisiData.anggota.length === 0) return null;
                            const pimpinan = divisiData.anggota.filter(p => jabatanPimpinan.includes(p.jabatan));
                            const Staf = divisiData.anggota.filter(p => !pimpinan.includes(p));

                            return (
                                <div key={divisiData.id} className="division-section">
                                    <div className="division-title-container"><h2 className="division-title">{divisiData.divisi}</h2></div>
                                    {pimpinan.length > 0 && (
                                        <div className="card-grid pimpinan">
                                            {pimpinan.map((item, idx) => <StrukturCard key={idx} anggota={item} onCardClick={() => setSelectedMember(item)} />)}
                                        </div>
                                    )}
                                    {Staf.length > 0 && (
                                        <div className="card-grid Staf">
                                            {Staf.map((item, idx) => <StrukturCard key={idx} anggota={item} onCardClick={() => setSelectedMember(item)} />)}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Statistik Keanggotaan */}
                        <div className="division-section">
                            <div className="division-title-container"><h2 className="division-title">Statistik Keanggotaan</h2></div>
                            <div className="stats-grid">
                                <div className="stat-card"><Network size={28}/><div><h4>Total Divisi</h4><p>{stats.totalDivisi}</p></div></div>
                                <div className="stat-card"><Users size={28}/><div><h4>Total Pengurus</h4><p>{stats.totalAnggota}</p></div></div>
                                <div className="stat-card"><BookOpen size={28}/><div><h4>Teknokimia Nuklir</h4><p>{stats["Teknokimia Nuklir"]}</p></div></div>
                                <div className="stat-card"><BookOpen size={28}/><div><h4>Elektronika Instrumentasi</h4><p>{stats["Elektronika Instrumentasi"]}</p></div></div>
                                <div className="stat-card"><BookOpen size={28}/><div><h4>Elektro Mekanika</h4><p>{stats["Elektro Mekanika"]}</p></div></div>
                            </div>
                        </div>
                    </>
                )}
            </div>
            <DetailModal member={selectedMember} onClose={() => setSelectedMember(null)} />
        </div>
    );
};

const styleSheet = document.createElement("style");
styleSheet.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    
    /* === GLOBAL RESET UNTUK MENGHILANGKAN GAP GLOBAL DI ATAS/SAMPING === */
    html, body {
        padding: 0 !important;
        margin: 0 !important;
        background-color: #f8fafc; /* Menjaga warna latar belakang konsisten */
    }

    .root-wrapper {
        min-height: 100vh;
        background-color: #f8fafc;
    }
    
    .struktur-public-page { 
        font-family: 'Inter', sans-serif; 
        background-color: #f8fafc; 
        padding: 0 24px 24px 24px; 
        max-width: 1280px; 
        margin: 0 auto; 
        box-sizing: border-box;
    }
    .loading-text { text-align: center; font-size: 1.2rem; color: #64748b; padding: 40px; }
    
    /* --- Header Halaman (Full Width) --- */
    .page-header { 
        padding: 24px 0; /* Padding vertikal mobile */
        background-color: #eff6ff; 
        border-bottom: 1px solid #dbeafe;
        margin-bottom: 48px;
    }
    
    /* ✅ REVISI UTAMA: Mengatur Ikon di Atas Judul di SEMUA LAYAR */
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
    
    .division-section { margin-bottom: 48px; }
    .division-title-container { text-align: center; margin-bottom: 32px; }
    .division-title { 
        display: inline-block; position: relative; font-size: 1.75rem; 
        font-weight: 700; color: #1e293b; padding-bottom: 8px; border: none;
    }
    .division-title::after {
        content: ''; position: absolute; bottom: 0; left: 50%;
        transform: translateX(-50%); width: 50px; height: 4px;
        background-color: #3b82f6; border-radius: 2px;
    }

    /* --- Penataan Grid Kartu Anggota --- */
    .card-grid { 
        display: grid; 
        gap: 24px; 
        justify-content: center; 
        grid-template-columns: repeat(auto-fit, minmax(240px, 350px)); 
    }
    .card-grid.pimpinan { margin-bottom: 32px; }

    /* --- Styling Kartu --- */
    .struktur-card {
        text-align: center; padding: 24px 20px; background-color: white;
        border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.04), 0 2px 4px -2px rgba(0, 0, 0, 0.04);
        border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.2s;
        display: flex; flex-direction: column; align-items: center;
        min-height: 200px; 
    }
    .struktur-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.07), 0 4px 6px -4px rgba(0, 0, 0, 0.07);
        border-color: #a5b4fc;
    }
    .struktur-card-img {
        width: 100px; height: 100px; border-radius: 50%; object-fit: cover;
        margin-bottom: 16px; border: 4px solid white; box-shadow: 0 0 0 1px #e2e8f0;
        flex-shrink: 0;
    }
    .struktur-card-body { display: flex; flex-direction: column; flex-grow: 1; justify-content: center; }
    .struktur-card-name { margin: 0 0 4px; font-size: 1.1rem; font-weight: 600; color: #1e293b; }
    .struktur-card-jabatan { font-size: 0.85rem; color: #94a3b8; margin: 0; flex-grow: 1; }
    
    /* --- Statistik & Modal (Tetap Sama) --- */
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
    .stat-card { background-color: #fff; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; display: flex; align-items: center; gap: 16px; transition: all 0.2s; }
    .stat-card:hover { transform: translateY(-4px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.07); }
    .stat-card svg { color: #1d4ed8; flex-shrink: 0; }
    .stat-card h4 { margin: 0 0 4px 0; color: #64748b; font-size: 0.9rem; font-weight: 500; }
    .stat-card p { margin: 0; color: #1e293b; font-size: 2rem; font-weight: 700; }
    
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(15, 23, 42, 0.8); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 2000; padding: 20px; }
    .modal-content { background-color: white; padding: 32px; border-radius: 16px; width: 100%; max-width: 450px; text-align: center; position: relative; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2); }
    .close-button { position: absolute; top: 16px; right: 16px; background: none; border: none; cursor: pointer; color: #9ca3af; }
    .modal-avatar { width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 4px solid #1d4ed8; margin: 0 auto 16px; }
    .modal-name { color: #1e293b; font-size: 1.5rem; font-weight: 700; margin: 0 0 4px; }
    .modal-jabatan { color: #64748b; font-weight: 500; margin: 0 0 20px; }
    .modal-details { text-align: left; margin-bottom: 20px; border-top: 1px solid #f1f5f9; padding-top: 20px; }
    .modal-details p { margin: 0 0 8px; color: #334155; }
    .modal-contact { display: flex; flex-wrap: wrap; justify-content: center; gap: 20px; }
    .contact-item { display: flex; align-items: center; gap: 6px; color: #334155; text-decoration: none; font-size: 0.9rem; }
    .contact-item svg { color: #9ca3af; }
    .contact-item:hover { color: #1d4ed8; }

    /* --- Media Queries (Desktop/Laptop) --- */
    @media (max-width: 768px) {
        .page-title { font-size: 1.75rem; }
        .division-title { font-size: 1.5rem; }
        .header-content-wrapper { padding: 0 16px; } /* Padding sisi mobile */
    }
    
    @media (min-width: 1024px) {
        /* PADDING & PUSATKAN KONTEN UTAMA */
        .struktur-public-page {
            /* structure-public-page adalah container konten, kita batasi lebarnya dan beri padding sisi */
            max-width: 1280px; 
            margin: 0 auto;
            padding: 0 40px 40px 40px; /* Padding sisi 40px di desktop */
        }
        
        .page-header {
            padding: 48px 0; /* Padding vertikal yang lebih lega di desktop */
            margin: 0; /* Hapus margin negatif, biarkan browser yang handle 100% width */
        }

        .header-content-wrapper {
            max-width: 1280px; 
            margin: 0 auto;
            padding: 0 40px; /* PADDING SISI KANAN-KIRI YANG DIINGINKAN (40px) */
        }

        /* KONTROL KARTU TUNGGAL */
        .card-grid:has(> *:only-child) {
            grid-template-columns: minmax(300px, 500px); 
            justify-content: center;
        }
        .card-grid:has(> *:nth-child(2)) {
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        }

        .struktur-card { max-width: none; width: 100%; }
        
        /* REVISI STATS GRID agar rata */
        .stats-grid { 
            grid-template-columns: repeat(5, 1fr); 
            gap: 24px;
        }
    }
`;
document.head.appendChild(styleSheet);


export default Struktur;