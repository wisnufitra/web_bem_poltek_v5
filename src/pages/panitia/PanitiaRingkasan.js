// src/pages/panitia/PanitiaRingkasan.js
import React, { useMemo, useState, useEffect } from 'react';
import { useEvent } from '../../layouts/PanitiaLayout';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import poltekLogo from '../../assets/logo-poltek.png';

import { Users, UserCheck, Activity, Percent, Eye, EyeOff, Download, PieChart as PieChartIcon, BarChart2, Users as UsersIcon } from 'lucide-react';

// --- 1. DEFINISI CSS (Disimpan dalam string, bukan langsung di-append) ---
const cssStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    /* Wrapper khusus untuk mengisolasi style halaman ini */
    .ringkasan-page-wrapper { font-family: 'Inter', sans-serif; }
    
    .page-header { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; }
    .page-title { color: #1e293b; font-size: 1.75rem; font-weight: 700; margin: 0; }
    .page-subtitle { color: #64748b; font-size: 1rem; margin: 4px 0 0 0; }
    .header-actions { display: flex; flex-direction: column; gap: 12px; }

    /* Style Tombol yang Konsisten */
    .button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.9rem; text-decoration: none; border: 1px solid transparent; transition: all 0.2s; }
    .button-primary { background-color: #1d4ed8; color: white; }
    .button-primary:hover { background-color: #1e40af; }
    .button-secondary { background-color: white; color: #1d4ed8; border-color: #e2e8f0; } /* Border abu tipis agar terlihat rapi */
    .button-secondary:hover { background-color: #f8fafc; border-color: #cbd5e1; }

    .stats-grid { display: grid; grid-template-columns: 1fr; gap: 16px; margin-bottom: 24px; }
    .stat-card { display: flex; align-items: center; gap: 12px; background-color: #ffffff; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-left-width: 4px; }
    .stat-icon-wrapper { border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .stat-title { margin: 0; color: #64748b; font-size: 0.8rem; font-weight: 500; }
    .stat-value { margin: 4px 0 0; color: #1e293b; font-size: 1.25rem; font-weight: 700; }
    .stat-suffix { font-size: 1rem; color: #94a3b8; }
    
    .charts-grid { display: grid; grid-template-columns: 1fr; gap: 24px; }
    .card { background-color: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    /* Perbaikan margin title agar tidak terlalu jauh */
    .card-title { margin: 0; color: #1e293b; font-size: 1.25rem; font-weight: 600; display: flex; align-items: center; gap: 8px; }
    
    .empty-state {
        text-align: center;
        color: #9ca3b8;
        padding: 40px 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
    }
    .empty-state svg { color: #cbd5e0; margin-bottom: 16px; }
    .empty-state p { font-size: 1rem; font-weight: 500; margin: 0; }
    
    /* Tampilan Desktop */
    @media (min-width: 768px) {
        .page-header { flex-direction: row; justify-content: space-between; align-items: center; }
        .page-title { font-size: 2rem; }
        .header-actions { flex-direction: row; }
        .stats-grid { grid-template-columns: repeat(4, 1fr); }
        .stat-value { font-size: 1.75rem; }
        .charts-grid { grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); }
    }
    @media (min-width: 1200px) {
        .charts-grid { grid-template-columns: repeat(3, 1fr); }
    }
`;

// --- 2. Komponen Helper ---
const StatCard = ({ icon, title, value, suffix, color }) => (
    <div className="stat-card" style={{ borderLeftColor: color }}>
        <div className="stat-icon-wrapper" style={{ backgroundColor: `${color}20`, color }}>{icon}</div>
        <div>
            <p className="stat-title">{title}</p>
            <p className="stat-value">{value} <span className="stat-suffix">{suffix}</span></p>
        </div>
    </div>
);

const EmptyState = ({ icon, message }) => (
    <div className="empty-state">
        {icon}
        <p>{message}</p>
    </div>
);

// --- 3. Komponen Utama ---
const PanitiaRingkasan = () => {
    const { event, eventId } = useEvent(); // Ambil eventId dari sini juga untuk link
    const [showResults, setShowResults] = useState(false);

    // --- 🔥 LOGIKA ISOLASI CSS (Pasang saat masuk, Hapus saat keluar) 🔥 ---
    useEffect(() => {
        const styleElement = document.createElement("style");
        styleElement.innerHTML = cssStyles;
        styleElement.id = "panitia-ringkasan-styles"; 
        document.head.appendChild(styleElement);

        return () => {
            if (document.head.contains(styleElement)) {
                document.head.removeChild(styleElement);
            }
        };
    }, []); 
    // -----------------------------------------------------------------------

    const stats = useMemo(() => {
        if (!event) return { totalPemilih: 0, sudahMemilih: 0, partisipasi: 0, totalSuaraMasuk: 0, abstainSuara: 0, prodiChartData: [], kandidatChartData: [], totalKandidat: 0, angkatanChartData: [] };
        
        const totalPemilih = event.pemilih?.length || 0;
        const sudahMemilih = Object.values(event.pemilihInfo || {}).filter(p => p.telahMemilih).length;
        const partisipasi = totalPemilih > 0 ? ((sudahMemilih / totalPemilih) * 100).toFixed(1) : 0;
        const totalKandidat = Array.isArray(event.kandidat) ? event.kandidat.length : 0;
        const totalSuaraKandidat = Array.isArray(event.kandidat) ? event.kandidat.reduce((acc, curr) => acc + (curr.suara || 0), 0) : 0;
        
        const abstainSuara = (event.allowAbstain && (sudahMemilih > totalSuaraKandidat)) ? (sudahMemilih - totalSuaraKandidat) : 0;
        const totalSuaraMasuk = sudahMemilih > 0 ? sudahMemilih : 1;

        const kandidatChartData = Array.isArray(event.kandidat) ? 
            event.kandidat.map(k => ({
                ...k,
                persentase: ((k.suara || 0) / totalSuaraMasuk) * 100
            })) 
        : [];
        
        if (event.allowAbstain) {
            kandidatChartData.push({ 
                nama: 'Abstain', 
                suara: abstainSuara,
                persentase: (abstainSuara / totalSuaraMasuk) * 100
            });
        }

        const partisipasiProdi = {};
        const partisipasiAngkatan = {};
        if (event.pemilihInfo && event.pemilih) {
            Object.keys(event.pemilihInfo).forEach(uid => {
                if (event.pemilihInfo[uid]?.telahMemilih) {
                    const pemilihDetail = event.pemilih.find(p => p.uid === uid);
                    if (pemilihDetail) {
                        const prodi = pemilihDetail?.prodi || 'Lainnya';
                        partisipasiProdi[prodi] = (partisipasiProdi[prodi] || 0) + 1;
                        
                        if (pemilihDetail.nim && pemilihDetail.nim.length >= 4) {
                            const angkatanStr = pemilihDetail.nim.substring(2, 4);
                            const angkatanTahun = `20${angkatanStr}`;
                            partisipasiAngkatan[angkatanTahun] = (partisipasiAngkatan[angkatanTahun] || 0) + 1;
                        } else {
                            partisipasiAngkatan['Lainnya'] = (partisipasiAngkatan['Lainnya'] || 0) + 1;
                        }
                    }
                }
            });
        }
        const prodiChartData = Object.keys(partisipasiProdi).map(prodi => ({ name: prodi, value: partisipasiProdi[prodi] }));
        
        const angkatanChartData = Object.keys(partisipasiAngkatan)
            .map(angkatan => ({ 
                name: angkatan, 
                jumlah: partisipasiAngkatan[angkatan] 
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

        return { totalPemilih, sudahMemilih, partisipasi, abstainSuara, prodiChartData, kandidatChartData, totalKandidat, angkatanChartData };
    }, [event]);

    const handleExportPDF = () => {
        if (!event) return;
        const doc = new jsPDF();
        const sortedKandidat = [...(stats.kandidatChartData || [])].sort((a, b) => b.suara - a.suara);
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();
    
        // Header
        doc.addImage(poltekLogo, 'PNG', 14, 15, 20, 20);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(`BERITA ACARA HASIL PEMILIHAN`, pageWidth / 2, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.text(event.namaEvent.toUpperCase(), pageWidth / 2, 28, { align: 'center' });
        doc.setDrawColor(226, 232, 240);
        doc.line(14, 40, pageWidth - 14, 40);
    
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Diselenggarakan oleh: ${event.ormawa}`, 14, 48);
        doc.text(`Waktu Cetak: ${new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}`, pageWidth - 14, 48, { align: 'right' });
    
        let startY = 60;
    
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(30, 41, 59);
        doc.text("A. Ringkasan Partisipasi", 14, startY);
        startY += 7;
        autoTable(doc, {
            body: [
                ['Total Pemilih Terdaftar', stats.totalPemilih],
                ['Total Suara Masuk (Partisipasi)', stats.sudahMemilih],
                ['Tingkat Partisipasi', `${stats.partisipasi}%`],
            ],
            startY: startY, theme: 'grid', styles: { font: 'helvetica', fontSize: 10 },
            headStyles: { fillColor: [248, 250, 252] },
        });
        startY = doc.lastAutoTable.finalY + 15;
    
        doc.text("B. Rincian Perolehan Suara", 14, startY);
        startY += 7;
        const kandidatTableRows = sortedKandidat.map((kandidat, index) => [ 
            index + 1, 
            kandidat.nama, 
            kandidat.suara || 0,
            `${(kandidat.persentase || 0).toFixed(2)}%`
        ]);
        autoTable(doc, {
            head: [["Peringkat", "Nama Kandidat", "Jumlah Suara", "Persentase"]],
            body: kandidatTableRows, startY: startY, theme: 'striped',
            headStyles: { fillColor: [30, 41, 59], font: 'helvetica', fontStyle: 'bold' },
            styles: { font: 'helvetica', fontSize: 10 }
        });
        startY = doc.lastAutoTable.finalY + 20;
    
        doc.setFont('helvetica', 'normal');
        const statement = `Demikian Berita Acara ini dibuat dengan sebenar-benarnya berdasarkan hasil rekapitulasi suara dari sistem e-voting untuk dapat dipergunakan sebagaimana mestinya. Hasil yang tercantum dalam dokumen ini adalah sah dan final.`;
        doc.text(doc.splitTextToSize(statement, pageWidth - 28), 14, startY);
        startY += 30;
    
        let signatureBlockY = startY;
        if (signatureBlockY > pageHeight - 60) {
            doc.addPage();
            signatureBlockY = 20;
        }
        
        doc.text(`Yogyakarta, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, pageWidth - 14, signatureBlockY, { align: 'right' });
        signatureBlockY += 10;
    
        doc.text("Perwakilan Saksi,", 14, signatureBlockY);
        doc.text("(___________________)", 14, signatureBlockY + 23);
    
        doc.text("Ketua Panitia Pemilihan,", pageWidth - 14, signatureBlockY, { align: 'right' });
        doc.text("(___________________)", pageWidth - 14, signatureBlockY + 23, { align: 'right' });

        doc.addPage();
        let lampiranY = 20;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text("Lampiran: Pernyataan dan Ketentuan Sistem E-Voting", 14, lampiranY);
        lampiranY += 15;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);

        const addSection = (title, content) => {
            const splitContent = doc.splitTextToSize(content, pageWidth - 28);
            const sectionHeight = 6 + (splitContent.length * 5) + 8;
            if (lampiranY + sectionHeight > pageHeight - 20) {
                doc.addPage();
                lampiranY = 20;
            }

            doc.setFont('helvetica', 'bold');
            doc.text(title, 14, lampiranY);
            lampiranY += 6;
            doc.setFont('helvetica', 'normal');
            doc.text(splitContent, 14, lampiranY);
            lampiranY += (splitContent.length * 5) + 8;
        };

        addSection("1. Keabsahan Suara", "Setiap suara yang masuk melalui sistem e-voting dianggap sah jika dan hanya jika berasal dari akun pemilih yang telah terverifikasi dan disetujui oleh panitia. Sistem secara otomatis menolak suara ganda dari pemilih yang sama.");
        addSection("2. Kerahasiaan Data", "Data pilihan suara setiap individu dienkripsi dan dianonimkan. Panitia maupun administrator sistem tidak dapat melihat atau melacak pilihan suara individu. Data yang ditampilkan adalah data agregat hasil rekapitulasi total.");
        addSection("3. Periode Pemilihan", "Pemungutan suara hanya dapat dilakukan dalam rentang waktu yang telah ditetapkan oleh panitia pada menu Pengaturan. Sistem akan secara otomatis membuka dan menutup akses ke bilik suara sesuai jadwal.");
        addSection("4. Penyelesaian Sengketa", "Segala bentuk sengketa atau perselisihan hasil pemilihan akan diselesaikan melalui mekanisme yang diatur dalam Anggaran Dasar/Anggaran Rumah Tangga (AD/ART) organisasi penyelenggara. Data log aktivitas dari sistem ini dapat dijadikan sebagai alat bantu bukti yang sah.");
        addSection("5. Keterangan Lanjutan", "Dokumen ini dicetak dan dihasilkan secara otomatis oleh Sistem E-Voting BEM Poltek Nuklir. Tanda tangan basah pada dokumen fisik (jika dicetak) menjadi bukti pengesahan akhir dari berita acara ini.");

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Berita Acara | ${event.namaEvent}`, 14, pageHeight - 10);
            doc.text(`Halaman ${i} dari ${pageCount}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
        }
        
        doc.save(`Berita_Acara_${event.namaEvent.replace(/ /g, "_")}.pdf`);
    };

    const PRODI_COLORS = {'Teknokimia Nuklir': '#10b981', 'Elektronika Instrumentasi':'#3b82f6', 'Elektro Mekanika': '#ef4444', 'Lainnya': '#A9A9A9' };
    const ANGKATAN_COLORS = ['#8b5cf6', '#ec4899', '#f97316', '#06b6d4', '#65a30d'];

    return (
        // Gunakan class wrapper agar style terisolasi dengan baik
        <div className="summary-page ringkasan-page-wrapper">
            <header className="page-header">
                <div>
                    <h1 className="page-title">Ringkasan Event</h1>
                    <p className="page-subtitle">Pantau statistik dan hasil pemilihan secara langsung.</p>
                </div>
                <div className="header-actions">
                    <Link to={`/hasil/${eventId}`} className="button button-secondary">
                        <Eye size={16} /> Lihat Hasil Publik
                    </Link>
                    <button onClick={handleExportPDF} className="button button-primary">
                        <Download size={16} /> Unduh Berita Acara
                    </button>
                </div>
            </header>
            
            <div className="stats-grid">
                <StatCard icon={<Users size={24} />} title="Total Kandidat" value={stats.totalKandidat} color="#8b5cf6" />
                <StatCard icon={<UserCheck size={24} />} title="Total Pemilih" value={stats.totalPemilih} color="#3b82f6" />
                <StatCard icon={<Activity size={24} />} title="Suara Masuk" value={stats.sudahMemilih} color="#16a34a" />
                <StatCard icon={<Percent size={24} />} title="Partisipasi" value={stats.partisipasi} suffix="%" color="#f59e0b" />
            </div>

            <div className="charts-grid">
                <div className="card">
                    {/* Header Kartu dengan Tombol Toggle */}
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px'}}>
                        <h3 className="card-title" style={{margin: 0, padding: 0, border: 'none'}}>
                            <BarChart2 size={18} /> Perolehan Suara Langsung
                        </h3>
                        <button 
                            onClick={() => setShowResults(!showResults)} 
                            className="button button-secondary"
                            style={{
                                padding: '0', width: '36px', height: '36px', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                borderRadius: '8px', minWidth: 'unset'
                            }}
                            title={showResults ? "Sembunyikan Hasil" : "Tampilkan Hasil"}
                        >
                            {showResults ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    {/* Logika Tampilan */}
                    {showResults ? (
                        // TAMPILAN GRAFIK (Jika dibuka)
                        stats.kandidatChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={stats.kandidatChartData} margin={{ top: 25, right: 20, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="nama" />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip formatter={(value, name, props) => 
                                        [`${value} Suara (${props.payload.persentase.toFixed(1)}%)`, name]
                                    } />
                                    <Legend />
                                    <Bar dataKey="suara" fill="#1d4ed8" name="Jumlah Suara">
                                        <LabelList 
                                            dataKey="persentase" 
                                            position="top" 
                                            formatter={(value) => `${value.toFixed(1)}%`}
                                            style={{ fill: '#64748b', fontSize: '0.8rem', fontWeight: '600' }}
                                        />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <EmptyState icon={<BarChart2 size={48} />} message="Belum ada data suara masuk" />
                    ) : (
                        // TAMPILAN TERTUTUP (Placeholder)
                        <div style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', border: '2px dashed #e2e8f0' }}>
                            <div style={{ backgroundColor: '#e2e8f0', borderRadius: '50%', padding: '16px', marginBottom: '16px' }}>
                                <EyeOff size={32} color="#94a3b8" />
                            </div>
                            <h4 style={{color: '#64748b', margin: '0 0 8px 0'}}>Hasil Suara Disembunyikan</h4>
                            <p style={{color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 16px 0'}}>Klik tombol di atas untuk melihat hasil real-time.</p>
                            <button onClick={() => setShowResults(true)} className="button button-primary">
                                <Eye size={16} /> Buka Hasil
                            </button>
                        </div>
                    )}
                </div>

                <div className="card">
                    <h3 className="card-title"><PieChartIcon size={18} /> Demografi Partisipasi (Prodi)</h3>
                    {stats.prodiChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={stats.prodiChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                    {stats.prodiChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={PRODI_COLORS[entry.name] || '#A9A9A9'} />)}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <EmptyState icon={<PieChartIcon size={48} />} message="Belum ada data partisipasi" />}
                </div>

                <div className="card">
                    <h3 className="card-title"><UsersIcon size={18} /> Partisipasi per Angkatan</h3>
                    {stats.angkatanChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={stats.angkatanChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="jumlah" name="Jumlah Pemilih">
                                    {stats.angkatanChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={ANGKATAN_COLORS[index % ANGKATAN_COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <EmptyState icon={<UsersIcon size={48} />} message="Belum ada data partisipasi angkatan" />}
                </div>
            </div>
        </div>
    );
};

export default PanitiaRingkasan;