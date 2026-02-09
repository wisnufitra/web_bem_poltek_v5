// src/pages/HasilPemilihan.js
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../firebase/firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart2, Users, UserCheck, Percent, ArrowLeft, Loader2, ShieldX } from 'lucide-react';

// --- Komponen Pembantu ---

/**
 * Komponen untuk menampilkan kartu statistik.
 */
const StatCard = ({ icon: Icon, title, value }) => (
    <div className="stat-card">
        <div className="stat-icon-wrapper">
            <Icon size={24} />
        </div>
        <div className="stat-text">
            <p className="stat-title">{title}</p>
            <p className="stat-value">{value}</p>
        </div>
    </div>
);

/**
 * Komponen untuk menampilkan pesan jika hasil belum tersedia.
 */
const EmptyState = ({ title, message }) => (
    <div className="page-center">
        <div className="card empty-state">
            <ShieldX size={48} />
            <h1>{title}</h1>
            <p>{message}</p>
            <Link to="/pemilihan" className="button button-secondary">
                <ArrowLeft size={16} />
                <span>Kembali ke Daftar Pemilihan</span>
            </Link>
        </div>
    </div>
);


// --- Komponen Utama ---

const HasilPemilihan = () => {
    const { eventId } = useParams();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);

    // Warna untuk grafik, disiapkan di luar logika utama
    const COLORS = useMemo(() => ['#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#34d399', '#f97316'], []);

    // 1. Fetching Data
    useEffect(() => {
        if (!eventId) return;

        const eventDocRef = doc(db, 'pemilihan_events', eventId);
        const unsubscribe = onSnapshot(eventDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setEvent({ id: docSnap.id, ...docSnap.data() });
            } else {
                setEvent(null);
            }
            if (loading) setLoading(false);
        }, (error) => {
            console.error("Error fetching event data:", error);
            setEvent(null);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [eventId, loading]);

    // 2. Perhitungan Statistik
    const stats = useMemo(() => {
        if (!event) return null;
        
        const kandidatList = event.kandidat || [];
        const sortedKandidat = [...kandidatList].sort((a, b) => b.suara - a.suara);
        
        const totalSuaraKandidat = sortedKandidat.reduce((acc, curr) => acc + (curr.suara || 0), 0);
        
        // Asumsi event.pemilih adalah objek atau array yang berisi semua pemilih terdaftar
        const totalPemilihTerdaftar = event.pemilih?.length || Object.keys(event.pemilih || {}).length || 0;
        
        const pemilihInfo = event.pemilihInfo || {};
        const suaraTelahMemilih = Object.values(pemilihInfo).filter(p => p.telahMemilih).length;
        
        let abstainSuara = 0;
        if (event.allowAbstain && suaraTelahMemilih > totalSuaraKandidat) {
            abstainSuara = suaraTelahMemilih - totalSuaraKandidat;
        }

        const partisipasi = totalPemilihTerdaftar > 0 
            ? ((suaraTelahMemilih / totalPemilihTerdaftar) * 100).toFixed(1) 
            : 0;
        
        const chartData = sortedKandidat.map(k => ({ 
            nama: k.nama, 
            suara: k.suara || 0 
        }));

        if(event.allowAbstain && abstainSuara > 0){
            chartData.push({ nama: 'Abstain', suara: abstainSuara });
        }

        return { 
            chartData, 
            totalSuaraMasuk: suaraTelahMemilih, 
            totalPemilihTerdaftar, 
            partisipasi 
        };
    }, [event]);

    // 3. Status Halaman & Render Kondisional
    if (loading) {
        return <div className="page-center"><Loader2 className="animate-spin text-primary-blue" size={48} /></div>;
    }
    
    const now = new Date();
    const endTime = event ? event.tanggalSelesai?.toDate() : null;
    const isFinished = (event && event.status === 'selesai') || (endTime && now > endTime);

    if (!event || !isFinished || !event.publishResults) {
        return (
            <EmptyState 
                title="Hasil Belum Tersedia"
                message="Hasil untuk pemilihan ini belum dipublikasikan, sesi voting belum selesai, atau event tidak ditemukan."
            />
        );
    }
    
    // Perhitungan tinggi grafik dinamis untuk tampilan lega
    const chartHeight = Math.max(300, stats.chartData.length * 50);

    // 4. Tampilan Utama
    return (
        <div className="hasil-page">
            <div className="container">
                {/* Header */}
                <header className="page-header">
                    <BarChart2 size={36} className="text-primary-blue" />
                    <div>
                        <h1 className="page-title">Hasil Resmi Pemilihan</h1>
                        <p className="page-subtitle">{event.namaEvent}</p>
                    </div>
                </header>

                {/* Kartu Statistik */}
                <div className="stats-grid">
                    <StatCard 
                        icon={Users} 
                        title="Total Pemilih Terdaftar" 
                        value={stats.totalPemilihTerdaftar} 
                    />
                    <StatCard 
                        icon={UserCheck} 
                        title="Total Suara Masuk" 
                        value={stats.totalSuaraMasuk} 
                    />
                    <StatCard 
                        icon={Percent} 
                        title="Tingkat Partisipasi" 
                        value={`${stats.partisipasi}%`} 
                    />
                </div>

                {/* Grafik Perolehan Suara */}
                <div className="card chart-card">
                    <h2 className="chart-title">Grafik Perolehan Suara</h2>
                    {stats.chartData.length > 0 ? (
                        <div className="chart-wrapper">
                            <ResponsiveContainer width="100%" height={chartHeight}>
                                <BarChart 
                                    data={stats.chartData} 
                                    layout="vertical" 
                                    margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
                                    <XAxis type="number" allowDecimals={false} stroke="#64748b" />
                                    <YAxis 
                                        type="category" 
                                        dataKey="nama" 
                                        width={50} 
                                        interval={0} 
                                        tick={{ fontSize: 13, fill: '#334155' }} 
                                        padding={{ top: 10, bottom: 10 }}
                                    />
                                    <Tooltip 
                                        cursor={{ fill: '#f1f5f9', opacity: 0.5 }}
                                        formatter={(value) => [`${value} Suara`, 'Total Suara']}
                                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' }}
                                    />
                                    <Bar dataKey="suara" name="Total Suara" barSize={60}>
                                        {stats.chartData.map((entry, index) => (
                                            <Cell 
                                                key={`cell-${index}`} 
                                                fill={COLORS[index % COLORS.length]} 
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <p className="text-center text-gray-500">Tidak ada data perolehan suara untuk ditampilkan.</p>
                    )}
                </div>

                {/* Tombol Kembali */}
                <div className="button-container">
                    <Link to="/pemilihan" className="button button-primary">
                        <ArrowLeft size={16} />
                        <span>Kembali ke Daftar Pemilihan</span>
                    </Link>
                </div>
            </div>
        </div>
    );
};


// --- Styling CSS Global yang Ditingkatkan (Mencakup Spasi/Padding yang Lega) ---

const styleSheet = document.createElement("style");
styleSheet.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    
    /* VARIABEL WARNA */
    :root {
        --color-primary: #3b82f6;
        --color-text-dark: #1e293b;
        --color-text-medium: #475569;
        --color-text-light: #64748b;
        --color-bg-light: #f8fafc;
        --color-border: #e2e8f0;
        --color-white: #ffffff;
    }

    /* TATA LETAK DASAR - PADDING LEGA */
    .hasil-page, .page-center { 
        font-family: 'Inter', sans-serif; 
        background-color: var(--color-bg-light); 
        min-height: 100vh; 
        /* Meningkatkan padding horizontal dan bawah (40px/60px) */
        padding: 40px 20px 60px 20px; 
    }
    .page-center { display: flex; align-items: center; justify-content: center; }
    
    .container { 
        max-width: 1200px; 
        margin: 0 auto;
        padding-bottom: 16px;
        padding-top: 16px;
        padding-left: 16px;
        padding-right: 16px;
        display: flex;
        flex-direction: column;
        /* Meningkatkan jarak antar section */
        gap: 40px; 
    }
    
    /* HEADER HALAMAN */
    .page-header { 
        display: flex; 
        align-items: center; 
        gap: 20px; 
        color: var(--color-text-dark); 
        padding-bottom: 16px; /* Tambahan ruang di bawah judul */
        padding-top: 16px;
        padding-left: 16px;
        border-bottom: 2px solid var(--color-border);
    }
    .page-title { font-size: 2.25rem; font-weight: 800; margin: 0; line-height: 1.2; }
    .page-subtitle { color: var(--color-text-light); font-size: 1.1rem; margin: 4px 0 0; font-weight: 500;}
    .text-primary-blue { color: var(--color-primary); }

    /* KARTU STATISTIK - PADDING LEGA */
    .stats-grid { 
        display: grid; 
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); 
        gap: 24px; 
    }
    .stat-card { 
        padding: 28px; /* Padding kartu diperbesar */
        display: flex; 
        align-items: center; 
        gap: 16px; 
        background-color: var(--color-white); 
        border-radius: 12px; 
        border: 1px solid var(--color-border); 
        box-shadow: 0 4px 10px rgba(0,0,0,0.05);
    }
    .stat-icon-wrapper {
        flex-shrink: 0; width: 56px; height: 56px;
        border-radius: 50%; display: flex; align-items: center; justify-content: center;
        background-color: #eff6ff;
    }
    .stat-icon-wrapper svg { color: var(--color-primary); }
    .stat-title { margin: 0; color: var(--color-text-light); font-size: 0.9rem; font-weight: 500; }
    .stat-value { margin: 4px 0 0; color: var(--color-text-dark); font-size: 2.25rem; font-weight: 800; line-height: 1; }

    /* KARTU GRAFIK - PADDING LEGA */
    .card { background-color: var(--color-white); border-radius: 16px; border: 1px solid var(--color-border); box-shadow: 0 8px 16px rgba(0,0,0,0.05); }
    .chart-card { padding: 10px; } /* Padding kartu grafik diperbesar */
    .chart-title { 
        margin: 0 0 32px 0; /* Margin bawah diperbesar */
        font-size: 1.5rem; font-weight: 700; color: var(--color-text-dark); border-bottom: 1px solid #f1f5f9; padding-bottom: 16px;
    }
    .chart-wrapper { width: 100%; min-height: 300px; }

    /* TOMBOL */
    .button-container { text-align: center; margin-top: 16px; }
    .button { 
        display: inline-flex; align-items: center; justify-content: center; gap: 8px; 
        padding: 12px 24px; text-decoration: none; font-weight: 600; border-radius: 10px; 
        cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .button-primary { background-color: var(--color-text-dark); color: var(--color-white); border: 1px solid var(--color-text-dark); }
    .button-primary:hover { background-color: var(--color-text-medium); border-color: var(--color-text-medium); }
    .button-secondary { background-color: transparent; color: var(--color-text-medium); border: 1px solid var(--color-border); box-shadow: none; }
    .button-secondary:hover { background-color: #f1f5f9; color: var(--color-text-dark); }

    /* EMPTY STATE */
    .empty-state { padding: 60px 40px; text-align: center; max-width: 600px; }
    .empty-state svg { color: #ef4444; margin-bottom: 24px; }
    .empty-state h1 { font-size: 1.8rem; color: var(--color-text-dark); margin: 0 0 12px; font-weight: 700; }
    .empty-state p { color: var(--color-text-medium); margin: 0 0 32px; line-height: 1.6; font-size: 1rem;}

    /* UTILITAS */
    .animate-spin { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    /* MEDIA QUERIES (Untuk Tampilan Desktop yang Lebih Lega) */
    @media (min-width: 768px) {
        /* Meningkatkan padding horizontal dan gap pada desktop */
        .hasil-page { padding: 60px 60px 80px 60px; }
        .container { gap: 60px; }
        .page-title { font-size: 3rem; }
    }
`;
document.head.appendChild(styleSheet);


export default HasilPemilihan;