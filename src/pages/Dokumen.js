import React, { useState, useEffect, useMemo } from "react";
import { db } from "../firebase/firebaseConfig";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { FolderKanban, Search, ExternalLink, FileText, File, Book, FileArchive, FileSpreadsheet, FileImage, Download, Upload, ClipboardList, FolderIcon } from 'lucide-react';

// ICON MAPPING (hanya yang relevan untuk halaman ini)
const iconComponents = {
    FolderKanban, Search, ExternalLink, FileText, File, Book, FileArchive, 
    FileSpreadsheet, FileImage, Download, Upload, ClipboardList, FolderIcon
};

// HELPER COMPONENT
const IconComponent = ({ name, ...props }) => {
    const LucideIcon = iconComponents[name] || FileText; // Default ke FileText jika ikon tidak ditemukan
    return <LucideIcon {...props} />;
};

const Dokumen = () => {
    const [dokumen, setDokumen] = useState([]);
    const [kategoriList, setKategoriList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('Semua');
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const qDokumen = query(collection(db, "dokumen"), orderBy("urutan", "asc"));
        const unsubDokumen = onSnapshot(qDokumen, (snapshot) => {
            setDokumen(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });

        const qKategori = query(collection(db, "dokumen_kategori"), orderBy("nama", "asc"));
        const unsubKategori = onSnapshot(qKategori, (snapshot) => {
            setKategoriList(['Semua', ...snapshot.docs.map((doc) => doc.data().nama)]);
        });

        return () => { unsubDokumen(); unsubKategori(); };
    }, []);

    const groupedDokumen = useMemo(() => {
        const filtered = dokumen.filter(doc => 
            doc.judul.toLowerCase().includes(searchTerm.toLowerCase()) &&
            (activeCategory === 'Semua' || doc.kategori === activeCategory)
        );
        return filtered.reduce((acc, item) => {
            const category = item.kategori || 'Lainnya';
            if (!acc[category]) acc[category] = [];
            acc[category].push(item);
            return acc;
        }, {});
    }, [dokumen, searchTerm, activeCategory]);

    useEffect(() => {
        document.head.appendChild(styleSheet);
        return () => { document.head.removeChild(styleSheet); };
    }, []);

    return (
        <div className="dokumen-page-wrapper">
            <header className="page-header">
                <div className="header-content-wrapper">
                    <FolderKanban size={40} />
                    <div>
                        <h1 className="page-title">Pusat Dokumen</h1>
                        <p className="page-subtitle">Temukan berbagai dokumen penting, pedoman, dan arsip BEM Poltek Nuklir.</p>
                    </div>
                </div>
            </header>

            <main className="dokumen-page-content">
                <div className="card filter-card">
                    <div className="input-with-icon search-bar">
                        <Search size={18} />
                        <input 
                            type="text"
                            placeholder="Cari nama dokumen..."
                            className="input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="filter-buttons">
                        {kategoriList.map(cat => (
                            <button 
                                key={cat} 
                                onClick={() => setActiveCategory(cat)} 
                                className={`filter-button ${activeCategory === cat ? 'active' : ''}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? <p className="loading-text">Memuat dokumen...</p> : (
                    Object.keys(groupedDokumen).length > 0 ? (
                        Object.keys(groupedDokumen).map(category => (
                            <div key={category} className="category-section">
                                <h2 className="category-title">{category}</h2>
                                <div className="card document-list">
                                    {groupedDokumen[category].map((doc) => (
                                        <div key={doc.id} className="document-item">
                                            <div className="document-info">
                                                <IconComponent name={doc.iconName} className="document-icon" size={24} />
                                                <span className="document-title">{doc.judul}</span>
                                            </div>
                                            <a 
                                                href={doc.link} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="button-buka"
                                            >
                                                Buka <ExternalLink size={16} />
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="card empty-state">
                            <p>{searchTerm ? 'Dokumen tidak ditemukan.' : 'Belum ada dokumen yang dipublikasikan.'}</p>
                        </div>
                    )
                )}
            </main>
        </div>
    );
};

const styleSheet = document.createElement("style");
styleSheet.innerHTML = `
    .dokumen-page-wrapper { font-family: 'Inter', sans-serif; background-color: #f8fafc; }

    /* Header Styles */
    .page-header { padding: 48px 0; background-color: #eff6ff; border-bottom: 1px solid #dbeafe; }
    .header-content-wrapper { max-width: 1280px; margin: 0 auto; padding: 0 24px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; color: #1e293b; }
    .page-header svg { color: #1d4ed8; margin-bottom: 8px; }
    .page-title { font-size: 2.5rem; font-weight: 800; margin: 0; }
    .page-subtitle { color: #64748b; font-size: 1.1rem; margin: 8px auto 0; max-width: 600px; }

    /* Main Content */
    .dokumen-page-content { max-width: 960px; margin: 48px auto; padding: 0 24px 48px 24px; }
    
    .card { background-color: #fff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.04); }
    
    /* Filter & Search Styles */
    .filter-card { padding: 24px; margin-bottom: 40px; }
    .input-with-icon { position: relative; display: flex; align-items: center; margin-bottom: 20px; }
    .input-with-icon svg { position: absolute; left: 14px; color: #9ca3af; pointer-events: none; }
    .input { display: block; width: 100%; padding: 12px 16px 12px 44px; border-radius: 8px; border: 1px solid #cbd5e0; font-size: 1rem; background-color: #fff; }
    .input:focus { border-color: #3b82f6; outline: none; }
    .filter-buttons { display: flex; flex-wrap: wrap; gap: 12px; }
    .filter-button { padding: 8px 16px; border: 1px solid #d1d5db; border-radius: 9999px; background: white; cursor: pointer; font-weight: 500; color: #4b5563; transition: all 0.2s; }
    .filter-button:hover { border-color: #a5b4fc; color: #3b82f6; }
    .filter-button.active { background-color: #3b82f6; color: white; border-color: #3b82f6; }
    
    /* Document List Styles */
    .category-section { margin-bottom: 40px; }
    .category-title { font-size: 1.75rem; font-weight: 700; color: #1e293b; margin-bottom: 20px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
    .document-list { padding: 16px; }
    .document-item { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 16px; border-bottom: 1px solid #f1f5f9; }
    .document-list .document-item:last-child { border-bottom: none; }
    .document-info { display: flex; align-items: center; gap: 16px; min-width: 0; }
    .document-icon { color: #3b82f6; flex-shrink: 0; }
    .document-title { color: #1f2937; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .button-buka { display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; background-color: #f1f5f9; color: #334155; text-decoration: none; border-radius: 8px; font-weight: 600; white-space: nowrap; transition: all 0.2s; }
    .button-buka:hover { background-color: #e2e8f0; color: #1e293b; }
    .loading-text, .empty-state { text-align: center; color: #6b7280; font-size: 1rem; padding: 40px; }

    /* Media Queries */
    @media (max-width: 768px) {
        .page-header { padding: 32px 0; }
        .page-title { font-size: 1.75rem; }
        .dokumen-page-content { margin-top: 32px; padding: 0 16px 32px 16px; }
        .document-item { flex-direction: column; align-items: flex-start; }
        .button-buka { width: 100%; justify-content: center; margin-top: 12px; }
    }
`;

export default Dokumen;