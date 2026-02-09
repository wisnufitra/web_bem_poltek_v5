import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase/firebaseConfig';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { ClipboardList, Search, Calendar, Users, CheckSquare, Paperclip, ChevronDown, Link as LinkIcon } from 'lucide-react';

// --- UI COMPONENTS ---
const EmptyState = ({ text, subtext }) => ( <div className="empty-state"><ClipboardList size={48} /><p className="empty-state-text">{text}</p><p className="empty-state-subtext">{subtext}</p></div> );

// --- MAIN COMPONENT ---
const PublicRisalahPage = () => {
    const [risalahList, setRisalahList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedId, setExpandedId] = useState(null);

    useEffect(() => {
        const styleTag = document.createElement('style'); styleTag.innerHTML = styleSheet; styleTag.id = 'public-risalah-style'; document.head.appendChild(styleTag);
        
        const qRisalah = query(collection(db, "risalah_rapat"), orderBy("tanggalRapat", "desc"));
        const unsubRisalah = onSnapshot(qRisalah, snapshot => {
            setRisalahList(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });

        return () => { 
            unsubRisalah();
            const styleElement = document.getElementById('public-risalah-style');
            if(styleElement) styleElement.parentNode.removeChild(styleElement);
        };
    }, []);

    const filteredRisalahList = useMemo(() => {
        return risalahList.filter(item => item.namaRapat.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [risalahList, searchTerm]);

    const toggleExpand = (id) => {
        setExpandedId(prevId => (prevId === id ? null : id));
    };
    
    return (
        <div className="public-page-wrapper">
            <header className="page-header">
                <div className="header-content-wrapper">
                    <ClipboardList size={40} />
                    <div>
                        <h1 className="page-title">Arsip Risalah Rapat</h1>
                        <p className="page-subtitle">Akses catatan dan hasil keputusan rapat-rapat penting BEM KM Poltek Nuklir.</p>
                    </div>
                </div>
            </header>

            <main className="public-page-content">
                <div className="card">
                    <h2 className="section-title">Cari Risalah Rapat</h2>
                    <div className="input-with-icon">
                        <Search size={18} />
                        <input 
                            type="text"
                            placeholder="Ketik nama atau agenda rapat..."
                            className="input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                
                <div className="risalah-list">
                    {loading ? <p style={{textAlign: 'center', fontSize: '1.2rem', color: '#64748b'}}>Memuat arsip rapat...</p> : (
                        filteredRisalahList.length > 0 ? filteredRisalahList.map(item => {
                            const isExpanded = expandedId === item.id;
                            const daftarHadirList = item.daftarHadir ? item.daftarHadir.split('\n').filter(Boolean) : [];
                            return (
                                <div key={item.id} className={`card risalah-card ${isExpanded ? 'expanded' : ''}`}>
                                    <button className="risalah-card-header" onClick={() => toggleExpand(item.id)}>
                                        <div className="item-main-info">
                                            <h3>{item.namaRapat}</h3>
                                            <small><Calendar size={12}/> {new Date(item.tanggalRapat + 'T00:00:00').toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</small>
                                        </div>
                                        <div className="item-meta-indicators">
                                            {daftarHadirList.length > 0 && <span><Users size={14} /> {daftarHadirList.length}</span>}
                                            {item.actionItems?.length > 0 && <span><CheckSquare size={14} /> {item.actionItems.length}</span>}
                                            {item.lampiran?.length > 0 && <span><Paperclip size={14} /> {item.lampiran.length}</span>}
                                        </div>
                                        <ChevronDown size={24} className="chevron-icon" />
                                    </button>
                                    
                                    {isExpanded && (
                                        <div className="risalah-card-body">
                                            {item.notulensi && <div className="risalah-section"><h4>Notulensi / Ringkasan</h4><p>{item.notulensi}</p></div>}
                                            {item.hasilKeputusan && <div className="risalah-section"><h4>Hasil Keputusan</h4><p>{item.hasilKeputusan}</p></div>}
                                            {daftarHadirList.length > 0 && <div className="risalah-section"><h4>Daftar Hadir</h4><ol>{daftarHadirList.map((nama, i) => <li key={i}>{nama}</li>)}</ol></div>}
                                            {item.actionItems?.length > 0 && <div className="risalah-section"><h4>Tugas & Tindak Lanjut</h4><div className="action-item-list">{item.actionItems.map(task => <div key={task.id} className={`action-item ${task.status === 'Selesai' ? 'done' : ''}`}><CheckSquare size={16}/><span><strong>{task.penanggungJawab}:</strong> {task.tugas}</span></div>)}</div></div>}
                                            {item.lampiran?.length > 0 && <div className="risalah-section"><h4>Lampiran</h4><div className="attachment-list">{item.lampiran.map(file => <a key={file.id} href={file.link} target="_blank" rel="noopener noreferrer" className="attachment-item"><LinkIcon size={14}/>{file.namaFile}</a>)}</div></div>}
                                        </div>
                                    )}
                                </div>
                            )
                        }) : <EmptyState text="Tidak Ada Risalah Rapat" subtext="Tidak ada data yang cocok dengan pencarian Anda."/>
                    )}
                </div>
            </main>
        </div>
    );
};

const styleSheet = `
    .public-page-wrapper{font-family:'Inter',sans-serif;background-color:#f8fafc}.page-header{padding:48px 0;background-color:#eff6ff;border-bottom:1px solid #dbeafe}.header-content-wrapper{max-width:1200px;margin:0 auto;padding:0 24px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:8px;color:#1e293b}.page-header svg{color:#1d4ed8;margin-bottom:8px}.page-title{font-size:2.5rem;font-weight:800;margin:0}.page-subtitle{color:#64748b;font-size:1.1rem;margin:8px auto 0;max-width:600px}.public-page-content{max-width:960px;margin:48px auto;padding:0 24px 48px;display:flex;flex-direction:column;gap:40px}.card{background-color:#fff;border:1px solid #e2e8f0;border-radius:16px;box-shadow:0 4px 6px -1px rgba(0,0,0,.04);padding:32px}.section-title{font-size:1.75rem;font-weight:700;color:#1e293b;margin:0 0 24px;padding-bottom:16px;border-bottom:1px solid #e2e8f0}.input-with-icon{position:relative;display:flex;align-items:center}.input-with-icon svg{position:absolute;left:14px;color:#9ca3af;pointer-events:none}.input{display:block;width:100%;padding:12px 16px 12px 44px;border-radius:8px;border:1px solid #cbd5e0;font-size:1rem;background-color:#fff}.empty-state{text-align:center;padding:40px;background-color:#f9fafb;border-radius:12px}.empty-state svg{color:#cbd5e1;margin-bottom:16px}.empty-state-text{font-size:1.2rem;color:#475569;margin:0}.empty-state-subtext{font-size:1rem;color:#9ca3af;margin:8px 0 0}
    .risalah-list{display:flex;flex-direction:column;gap:16px}
    .risalah-card{padding:0;overflow:hidden;transition:all .3s ease}
    .risalah-card.expanded{border-color:#3b82f6;box-shadow:0 10px 20px -5px rgba(0,0,0,0.08)}
    .risalah-card-header{width:100%;background:none;border:none;padding:20px 24px;display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:16px;cursor:pointer;text-align:left}
    .risalah-card-header:hover .item-main-info h3{color:#1d4ed8}
    .item-main-info h3{margin:0;font-size:1.2rem;color:#1e293b;transition:color .2s}.item-main-info small{margin-top:4px;color:#64748b;font-size:.8rem;display:flex;align-items:center;gap:6px}
    .item-meta-indicators{display:flex;gap:20px;align-items:center;color:#64748b;font-size:.9rem}.item-meta-indicators span{display:flex;align-items:center;gap:6px}
    .chevron-icon{color:#9ca3af;transition:transform .3s ease}.risalah-card.expanded .chevron-icon{transform:rotate(180deg)}
    .risalah-card-body{padding:0 24px 24px;display:flex;flex-direction:column;gap:24px;animation:fadeInBody .5s ease}
    @keyframes fadeInBody{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
    .risalah-section h4{font-size:1rem;font-weight:600;color:#1e293b;margin:0 0 12px;padding-bottom:8px;border-bottom:1px solid #f1f5f9}
    .risalah-section p,.risalah-section ol{margin:0;color:#334155;line-height:1.7;white-space:pre-wrap}.risalah-section ol{padding-left:20px}
    .action-item-list,.attachment-list{display:flex;flex-direction:column;gap:8px}
    .action-item,.attachment-item{display:flex;align-items:center;gap:12px;padding:10px;background-color:#f8fafc;border-radius:6px;border:1px solid #e2e8f0;font-size:.9rem}
    .action-item.done span{text-decoration:line-through;color:#9ca3af}.action-item.done svg{color:#16a34a}
    .attachment-item{text-decoration:none;color:#1d4ed8;font-weight:500}.attachment-item:hover{background-color:#f0f4ff}
    @media(max-width:767px){.page-header{padding:32px 0}.page-title{font-size:1.75rem}.public-page-content{margin-top:32px;padding:0 16px 32px}.card{padding:24px}.section-title{font-size:1.5rem}.filter-controls{flex-direction:column}
    .risalah-card-header{grid-template-columns:1fr auto;gap:12px}.item-main-info{grid-column:1/-1}.item-meta-indicators{justify-self:start}.chevron-icon{justify-self:end}}
`;

export default PublicRisalahPage;