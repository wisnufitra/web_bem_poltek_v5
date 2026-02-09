// src/pages/admin/activity/VerifikasiInternal.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../../firebase/firebaseConfig';
import { 
    collection, query, where, onSnapshot, doc, updateDoc, arrayUnion 
} from 'firebase/firestore';
import { useAdmin } from '../../../layouts/AdminLayout';
import { 
    FileText, XCircle, Search, Eye, FileOutput, Clock,
    DollarSign, PenTool, History, Calendar, ShieldCheck, 
    AlertCircle, Loader2, CheckCircle2, XCircle as XIcon,
    ChevronRight, LayoutList, Archive, Check
} from 'lucide-react';

// --- COMPONENTS KECIL (Agar selaras dengan ProkerDivisi) ---

const Toast = ({ message, type, onClose }) => {
    useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
    const styleMap = type === 'error' 
        ? { bg: '#fee2e2', text: '#991b1b', border: '#fecaca', icon: <AlertCircle size={20}/> }
        : { bg: '#dcfce7', text: '#166534', border: '#bbf7d0', icon: <CheckCircle2 size={20}/> };
    
    return (
        <div style={{ 
            position: 'fixed', bottom: 30, right: 30, backgroundColor: styleMap.bg, color: styleMap.text, 
            padding: '14px 20px', borderRadius: 12, zIndex: 10005, 
            boxShadow: '0 10px 30px rgba(0,0,0,0.08)', fontWeight: 600, 
            display: 'flex', alignItems: 'center', gap: 12, border: `1px solid ${styleMap.border}`,
            animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
            {styleMap.icon} {message}
        </div>
    );
};

const VerifikasiInternal = () => {
    const { profil, sysConfig, activeRole } = useAdmin(); 
    const myAssignment = activeRole || {};
    const periodeAktif = sysConfig?.activePeriod || "2025/2026";
    
    // --- STATE ---
    const [proposals, setProposals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDivisi, setFilterDivisi] = useState('ALL'); 
    const [activeTab, setActiveTab] = useState('WAITING'); 
    
    // UI State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [reviewNote, setReviewNote] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [toast, setToast] = useState(null);

    // --- METADATA & ROLE ---
    const myOrgId = myAssignment.entity_id;
    const myOrgName = myAssignment.entity_name;
    const myPosition = myAssignment.position || ''; 
    const myDivision = myAssignment.division || '';

    const formatRp = (num) => "Rp " + new Intl.NumberFormat('id-ID').format(num);
    const formatDateTime = (iso) => {
        if (!iso) return '-';
        return new Date(iso).toLocaleString('id-ID', { 
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
        });
    };

    const showToast = (message, type = 'success') => setToast({ message, type });

    // Deteksi Role Internal
    const myInternalRole = useMemo(() => {
        const pos = (myPosition || '').toLowerCase();
        const div = (myDivision || '').toLowerCase();
        if (pos.includes('ketua') || pos.includes('presiden') || pos.includes('wakil') || div === 'inti') return 'ketua';
        if (pos.includes('sekretaris') || pos.includes('sekjen')) return 'sekjen';
        if (pos.includes('bendahara') || pos.includes('keuangan')) return 'bendahara';
        return null; 
    }, [myPosition, myDivision]);

    // --- FETCH DATA ---
    useEffect(() => {
        if (!myOrgId || !sysConfig) return;
        const q = query(
            collection(db, 'activity_proposals'), 
            where('orgId', '==', myOrgId), 
            where('periode', '==', periodeAktif)
        );
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            list.sort((a, b) => new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0));
            setProposals(list);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [myOrgId, sysConfig, periodeAktif]);

    // --- FILTER LOGIC ---
    const filteredList = useMemo(() => {
        return proposals.filter(p => {
            const matchSearch = (p.activityName || "").toLowerCase().includes(searchTerm.toLowerCase());
            const matchDiv = filterDivisi === 'ALL' || p.divisionName === filterDivisi;
            
            // Logic Status
            const isProposalTask = p.status === 'WAITING_INTERNAL' || p.status === 'REVISION_INTERNAL';
            const isLpjTask = p.status === 'COMPLETED' && p.reporting && (p.reporting.status === 'WAITING_REVIEW' || p.reporting.status === 'REVISION_INTERNAL');
            
            let matchTab = true;
            if (activeTab === 'WAITING') matchTab = isProposalTask || isLpjTask;
            if (activeTab === 'HISTORY') matchTab = !(isProposalTask || isLpjTask);
            
            p.taskType = isLpjTask ? 'LPJ' : 'PROPOSAL';
            return matchSearch && matchDiv && matchTab;
        });
    }, [proposals, searchTerm, filterDivisi, activeTab]);

    const uniqueDivisions = useMemo(() => [...new Set(proposals.map(p => p.divisionName))], [proposals]);

    // --- HANDLERS ---
    const handleOpenReview = (item) => {
        setSelectedItem(item);
        setReviewNote('');
        setIsModalOpen(true);
    };

    const submitReviewAction = async (decision) => {
        if (!myInternalRole) return showToast("Role Anda tidak dikenali.", "error");
        if (!reviewNote && decision === 'REJECTED') return showToast("Wajib memberikan catatan revisi!", "error");
        
        setIsProcessing(true);
        try {
            const docRef = doc(db, 'activity_proposals', selectedItem.id);
            const now = new Date().toISOString();
            let updates = {};
            let actionLabel = "";
            const type = selectedItem.taskType;

            if (type === 'PROPOSAL') {
                updates[`approvals.internal.${myInternalRole}.status`] = decision;
                updates[`approvals.internal.${myInternalRole}.date`] = now;
                
                const currentInternal = { 
                    ...selectedItem.approvals.internal, 
                    [myInternalRole]: { status: decision } 
                };
                
                // Cek apakah Ketua, Sekjen, Bendahara sudah approve semua
                const rolesToCheck = ['ketua', 'sekjen', 'bendahara'];
                const isAllApproved = rolesToCheck.every(r => currentInternal[r]?.status === 'APPROVED');
                
                if (decision === 'REJECTED') { 
                    updates.status = 'REVISION_INTERNAL'; 
                    actionLabel = "REJECT_PROPOSAL"; 
                } else if (isAllApproved) { 
                    updates.status = 'WAITING_KM'; 
                    actionLabel = "APPROVE_PROPOSAL_FINAL"; 
                } else { 
                    actionLabel = "APPROVE_PROPOSAL_PARTIAL"; 
                }
            } else {
                // LPJ Flow
                if (decision === 'REJECTED') { 
                    updates['reporting.status'] = 'REVISION_INTERNAL'; 
                    updates['reporting.notesFromAdmin'] = reviewNote; // Kirim note spesifik ke object reporting
                    actionLabel = "REJECT_LPJ";
                } else { 
                    updates['reporting.status'] = 'APPROVED'; // Bisa langsung APPROVED atau WAITING_KM tergantung flow kampus
                    actionLabel = "APPROVE_LPJ";
                }
            }

            await updateDoc(docRef, {
                ...updates,
                lastUpdated: now,
                history: arrayUnion({
                    action: actionLabel, actor: profil.namaTampilan, 
                    role: myInternalRole.toUpperCase(), timestamp: now, note: reviewNote
                })
            });

            showToast(`Berhasil ${decision === 'APPROVED' ? 'menyetujui' : 'mengembalikan'} ${type === 'LPJ' ? 'Laporan' : 'Proposal'}`);
            setIsModalOpen(false);
        } catch (e) {
            console.error(e);
            showToast("Gagal memproses data.", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    // --- RENDER HELPERS ---
    const renderStatusBadge = (status) => {
        const stylesMap = {
            'APPROVED': { bg: '#dcfce7', color: '#166534', icon: <Check size={12}/> },
            'REJECTED': { bg: '#fee2e2', color: '#991b1b', icon: <XIcon size={12}/> },
            'WAITING': { bg: '#f1f5f9', color: '#64748b', icon: <Clock size={12}/> },
            'PENDING': { bg: '#f1f5f9', color: '#cbd5e1', icon: <Clock size={12}/> }
        };
        const st = stylesMap[status] || stylesMap['PENDING'];
        return (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: '99px', fontSize: '0.65rem', fontWeight: 700, background: st.bg, color: st.color }}>
                {st.icon} {status || 'WAITING'}
            </span>
        );
    };

    if (loading) return (
        <div style={styles.loadingContainer}>
            <Loader2 className="spin" size={40} color="#2563eb"/> 
            <p>Memuat Verifikasi Internal...</p>
        </div>
    );

    return (
        <div style={styles.container}>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { 100% { transform: rotate(360deg); } } @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>

            <header style={styles.pageHeader}>
                <div>
                    <h1 style={styles.pageTitle}>Verifikasi Internal</h1>
                    <p style={styles.pageSub}>
                        Periode <strong>{periodeAktif}</strong> • {myOrgName}
                    </p>
                </div>
                <div style={styles.roleTag}>
                    <ShieldCheck size={18} color="#60a5fa"/> 
                    <div>
                        <span style={{display:'block', fontSize:'0.7rem', opacity:0.7}}>VERIFIKATOR</span>
                        <strong style={{letterSpacing:'0.5px'}}>{myInternalRole?.toUpperCase() || 'PENGAMAT'}</strong>
                    </div>
                </div>
            </header>

            {/* STATS SUMMARY */}
            <div style={styles.statsRow}>
                <div style={styles.statCard}>
                    <div style={styles.statLabel}>Menunggu Review</div>
                    <div style={styles.statValue}>{proposals.filter(p => p.status?.includes('WAITING_INTERNAL')).length}</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statLabel}>LPJ Masuk</div>
                    <div style={styles.statValue}>{proposals.filter(p => p.reporting?.status === 'WAITING_REVIEW').length}</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statLabel}>Arsip Selesai</div>
                    <div style={styles.statValue}>{proposals.filter(p => p.status === 'COMPLETED' || p.status === 'APPROVED').length}</div>
                </div>
            </div>

            {/* CONTROLS */}
            <div style={styles.topBar}>
                <div style={styles.tabContainer}>
                    <button onClick={()=>setActiveTab('WAITING')} style={activeTab === 'WAITING' ? styles.tabActive : styles.tab}>
                        <LayoutList size={16}/> Tugas Masuk
                        {filteredList.length > 0 && activeTab === 'WAITING' && <span style={styles.countBadge}>{filteredList.length}</span>}
                    </button>
                    <button onClick={()=>setActiveTab('HISTORY')} style={activeTab === 'HISTORY' ? styles.tabActive : styles.tab}>
                        <History size={16}/> Riwayat Arsip
                    </button>
                </div>
                <div style={styles.filterBar}>
                    <div style={styles.searchBox}>
                        <Search size={16} color="#94a3b8"/>
                        <input 
                            placeholder="Cari kegiatan..." 
                            value={searchTerm}
                            onChange={e=>setSearchTerm(e.target.value)}
                            style={styles.searchInput}
                        />
                    </div>
                    <select onChange={e=>setFilterDivisi(e.target.value)} style={styles.select}>
                        <option value="ALL">Semua Divisi</option>
                        {uniqueDivisions.map(d=><option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
            </div>

            {/* TABLE */}
            <div style={styles.cardMain}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={{width: '35%'}}>Kegiatan</th>
                            <th style={{width: '20%'}}>Jadwal & Dana</th>
                            <th style={{width: '30%'}}>Status Verifikator</th>
                            <th style={{width: '15%', textAlign:'center'}}>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredList.length === 0 ? (
                            <tr>
                                <td colSpan={4} style={styles.emptyState}>
                                    <FileText size={48} color="#e2e8f0" />
                                    <p>Tidak ada data tugas saat ini.</p>
                                </td>
                            </tr>
                        ) : filteredList.map(item => (
                            <tr key={item.id} style={styles.tr}>
                                <td>
                                    <div style={{display:'flex', gap:8, marginBottom:6}}>
                                        <span style={item.taskType === 'LPJ' ? styles.badgeLpj : styles.badgeProp}>
                                            {item.taskType}
                                        </span>
                                        <span style={styles.divisiTag}>{item.divisionName}</span>
                                    </div>
                                    <div style={styles.activityName}>{item.activityName}</div>
                                </td>
                                <td>
                                    <div style={styles.metaRow}><Calendar size={14}/> {item.dateDisplay || '-'}</div>
                                    <div style={styles.metaRow}><DollarSign size={14}/> {formatRp(item.budgetRequested)}</div>
                                </td>
                                <td>
                                    {item.taskType === 'PROPOSAL' ? (
                                        <div style={styles.verificatorGrid}>
                                            {['ketua', 'sekjen', 'bendahara'].map(role => (
                                                <div key={role} style={styles.verificatorItem}>
                                                    <span style={styles.roleLabel}>{role}</span>
                                                    {renderStatusBadge(item.approvals?.internal?.[role]?.status)}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div style={styles.lpjStatusBox}>
                                            Status LPJ: <strong>{item.reporting.status.replace(/_/g, ' ')}</strong>
                                        </div>
                                    )}
                                </td>
                                <td style={{textAlign:'center'}}>
                                    <button onClick={() => handleOpenReview(item)} style={styles.btnAction}>
                                        {activeTab === 'WAITING' ? <PenTool size={14}/> : <Eye size={14}/>}
                                        {activeTab === 'WAITING' ? 'Review' : 'Detail'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* MODAL OVERLAY */}
            {isModalOpen && selectedItem && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <div style={styles.modalHeader}>
                            <div>
                                <h2 style={styles.modalTitle}>{selectedItem.activityName}</h2>
                                <div style={{display:'flex', gap:8, alignItems:'center', marginTop:4}}>
                                    <span style={styles.modalSubtitle}>{selectedItem.divisionName}</span>
                                    <span style={{color:'#cbd5e1'}}>•</span>
                                    <span style={styles.modalSubtitle}>{selectedItem.taskType === 'LPJ' ? 'Verifikasi Laporan Akhir' : 'Verifikasi Proposal'}</span>
                                </div>
                            </div>
                            <button onClick={()=>setIsModalOpen(false)} style={styles.closeBtn}><XCircle size={24}/></button>
                        </div>

                        <div style={styles.modalGrid}>
                            {/* KIRI: TIMELINE */}
                            <div style={styles.modalLeft}>
                                <h3 style={styles.sectionHeader}><History size={16}/> Riwayat Proses</h3>
                                <div style={styles.timeline}>
                                    {[...(selectedItem.history || [])].reverse().map((log, i) => (
                                        <div key={i} style={styles.tlItem}>
                                            <div style={styles.tlDot}></div>
                                            <div style={styles.tlContent}>
                                                <div style={styles.tlMeta}>
                                                    <span>{formatDateTime(log.timestamp)}</span>
                                                    <strong>{log.actor}</strong>
                                                </div>
                                                <div style={styles.tlAction}>{log.action.replace(/_/g, ' ')}</div>
                                                {log.note && <div style={styles.tlNote}>{log.note}</div>}
                                            </div>
                                        </div>
                                    ))}
                                    {(!selectedItem.history || selectedItem.history.length === 0) && <div style={{color:'#94a3b8', fontSize:'0.85rem', fontStyle:'italic'}}>Belum ada riwayat.</div>}
                                </div>
                            </div>

                            {/* KANAN: DOKUMEN & AKSI */}
                            <div style={styles.modalRight}>
                                <div style={styles.section}>
                                    <h3 style={styles.sectionHeader}><FileText size={16}/> Dokumen Diajukan</h3>
                                    
                                    {/* JIKA PROPOSAL */}
                                    {selectedItem.taskType === 'PROPOSAL' && (
                                        <div style={styles.docGrid}>
                                            {selectedItem.documents?.map((d, i) => (
                                                <a key={i} href={d.url} target="_blank" rel="noreferrer" style={styles.docCard}>
                                                    <div style={styles.docIcon}><FileText size={20} color="#3b82f6"/></div>
                                                    <div>
                                                        <div style={styles.docTitle}>{d.label}</div>
                                                        <div style={styles.docTag}>Dokumen Pendukung</div>
                                                    </div>
                                                    <ChevronRight size={16} color="#cbd5e1" style={{marginLeft:'auto'}}/>
                                                </a>
                                            ))}
                                            {(!selectedItem.documents || selectedItem.documents.length === 0) && <div style={{color:'#94a3b8'}}>Tidak ada dokumen terlampir.</div>}
                                        </div>
                                    )}

                                    {/* JIKA LPJ */}
                                    {selectedItem.taskType === 'LPJ' && selectedItem.reporting && (
                                        <div style={styles.docGrid}>
                                            {selectedItem.reporting.lpjFile && (
                                                <a href={selectedItem.reporting.lpjFile.url} target="_blank" rel="noreferrer" style={{...styles.docCard, borderLeft:'3px solid #ec4899'}}>
                                                    <div style={styles.docIcon}><Archive size={20} color="#ec4899"/></div>
                                                    <div>
                                                        <div style={styles.docTitle}>LPJ Naratif</div>
                                                        <div style={styles.docTag}>Laporan Wajib</div>
                                                    </div>
                                                    <ChevronRight size={16} color="#cbd5e1" style={{marginLeft:'auto'}}/>
                                                </a>
                                            )}
                                            {selectedItem.reporting.spjFile && (
                                                <a href={selectedItem.reporting.spjFile.url} target="_blank" rel="noreferrer" style={{...styles.docCard, borderLeft:'3px solid #ec4899'}}>
                                                    <div style={styles.docIcon}><DollarSign size={20} color="#ec4899"/></div>
                                                    <div>
                                                        <div style={styles.docTitle}>SPJ Keuangan</div>
                                                        <div style={styles.docTag}>Laporan Keuangan</div>
                                                    </div>
                                                    <ChevronRight size={16} color="#cbd5e1" style={{marginLeft:'auto'}}/>
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* FORM VERIFIKASI */}
                                {activeTab === 'WAITING' && (
                                    <div style={styles.actionBox}>
                                        <h3 style={{...styles.sectionHeader, marginBottom:12}}>Keputusan Verifikasi</h3>
                                        <textarea 
                                            rows={3} 
                                            placeholder={`Tulis catatan untuk ${selectedItem.divisionName} (Wajib jika menolak/revisi)...`} 
                                            value={reviewNote} 
                                            onChange={e=>setReviewNote(e.target.value)} 
                                            style={styles.textarea}
                                        />
                                        <div style={styles.btnGroup}>
                                            <button 
                                                onClick={()=>submitReviewAction('REJECTED')} 
                                                disabled={isProcessing} 
                                                style={styles.btnReject}
                                            >
                                                {isProcessing ? '...' : 'Kembalikan (Revisi)'}
                                            </button>
                                            <button 
                                                onClick={()=>submitReviewAction('APPROVED')} 
                                                disabled={isProcessing} 
                                                style={styles.btnApprove}
                                            >
                                                {isProcessing ? 'Memproses...' : 'Setujui Dokumen'}
                                            </button>
                                        </div>
                                        <div style={styles.disclaimer}>
                                            <CheckCircle2 size={12}/> Anda bertindak sebagai <strong>{myInternalRole?.toUpperCase()}</strong>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- STYLES OBJECT ---
const styles = {
    container: { padding: '24px 32px', maxWidth: '1400px', margin: '0 auto', fontFamily: '"Plus Jakarta Sans", Inter, sans-serif', color: '#1e293b' },
    loadingContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#64748b', gap: '16px' },
    
    // Headers
    pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
    pageTitle: { fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.5px' },
    pageSub: { color: '#64748b', margin: '4px 0 0', fontSize: '0.95rem' },
    roleTag: { background: '#1e293b', padding: '8px 16px', borderRadius: '12px', display: 'flex', gap: 12, alignItems: 'center', color: '#fff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' },

    // Stats
    statsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' },
    statCard: { background: '#fff', padding: '16px 20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
    statLabel: { fontSize: '0.85rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },
    statValue: { fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' },

    // Filter Bar
    topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' },
    tabContainer: { background: '#f1f5f9', padding: '4px', borderRadius: '12px', display: 'flex', gap: '4px' },
    tab: { padding: '8px 16px', border: 'none', background: 'transparent', color: '#64748b', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', borderRadius: '8px', display: 'flex', gap: 8, alignItems: 'center' },
    tabActive: { padding: '8px 16px', border: 'none', background: '#fff', color: '#2563eb', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', gap: 8, alignItems: 'center' },
    countBadge: { background: '#ef4444', color: '#fff', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '99px' },

    filterBar: { display: 'flex', gap: '12px' },
    searchBox: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', display: 'flex', alignItems: 'center', padding: '0 12px', width: '280px', transition: 'border 0.2s' },
    searchInput: { border: 'none', padding: '10px 0', outline: 'none', fontSize: '0.9rem', width: '100%', marginLeft: '8px' },
    select: { border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0 16px', fontWeight: 600, color: '#475569', background: '#fff', outline: 'none', cursor: 'pointer' },

    // Table
    cardMain: { background: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
    table: { width: '100%', borderCollapse: 'collapse' },
    tr: { borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' },
    emptyState: { textAlign: 'center', padding: '60px', color: '#94a3b8' },
    
    // Cell Contents
    badgeProp: { fontSize: '0.65rem', fontWeight: 800, background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', letterSpacing: '0.5px' },
    badgeLpj: { fontSize: '0.65rem', fontWeight: 800, background: '#fdf2f8', color: '#ec4899', padding: '4px 8px', borderRadius: '6px', letterSpacing: '0.5px' },
    divisiTag: { fontSize: '0.7rem', fontWeight: 600, color: '#64748b' },
    activityName: { fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' },
    metaRow: { fontSize: '0.85rem', color: '#64748b', display: 'flex', gap: 8, alignItems: 'center', marginTop: '4px' },
    
    // Verificator Grid
    verificatorGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', background: '#f8fafc', padding: '8px', borderRadius: '8px' },
    verificatorItem: { display: 'flex', flexDirection: 'column', gap: '2px' },
    roleLabel: { fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' },
    lpjStatusBox: { background: '#f0f9ff', padding: '8px 12px', borderRadius: '8px', color: '#0369a1', fontSize: '0.85rem' },

    btnAction: { background: '#fff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: '0.85rem', transition: 'all 0.2s' },

    // Modal
    modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 },
    modalContent: { background: '#fff', width: '90%', maxWidth: '1100px', height: '85vh', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' },
    modalHeader: { padding: '20px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' },
    modalTitle: { margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' },
    modalSubtitle: { fontSize: '0.85rem', fontWeight: 600, color: '#64748b' },
    closeBtn: { background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 },
    
    modalGrid: { display: 'grid', gridTemplateColumns: '320px 1fr', flex: 1, overflow: 'hidden' },
    modalLeft: { background: '#f8fafc', padding: '24px', borderRight: '1px solid #e2e8f0', overflowY: 'auto' },
    modalRight: { padding: '32px', overflowY: 'auto', background: '#fff' },
    sectionHeader: { fontSize: '0.9rem', fontWeight: 800, color: '#334155', marginBottom: '16px', display: 'flex', gap: 8, alignItems: 'center', textTransform: 'uppercase', letterSpacing:'0.5px' },

    // Timeline UI
    timeline: { paddingLeft: '8px' },
    tlItem: { display: 'flex', gap: '16px', marginBottom: '24px', position: 'relative' },
    tlDot: { width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6', marginTop: '6px', flexShrink: 0, border: '2px solid #dbeafe' },
    tlContent: { flex: 1 },
    tlMeta: { display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' },
    tlAction: { fontSize: '0.9rem', color: '#1e293b', fontWeight: 600 },
    tlNote: { marginTop: '6px', fontSize: '0.8rem', background: '#fff', border: '1px solid #e2e8f0', padding: '8px', borderRadius: '8px', color: '#475569', fontStyle: 'italic' },

    // Doc Grid
    docGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px', marginBottom: '32px' },
    docCard: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '3px solid #3b82f6', textDecoration: 'none', background: '#fff', transition: 'transform 0.2s', cursor: 'pointer' },
    docIcon: { background: '#eff6ff', padding: '8px', borderRadius: '8px' },
    docTitle: { fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' },
    docTag: { fontSize: '0.7rem', color: '#64748b' },

    // Action Form
    actionBox: { background: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #cbd5e1' },
    textarea: { width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.95rem', marginBottom: '16px', fontFamily: 'inherit', outline: 'none', resize: 'vertical' },
    btnGroup: { display: 'flex', gap: '12px' },
    btnApprove: { flex: 2, background: '#166534', color: '#fff', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem', transition: 'background 0.2s' },
    btnReject: { flex: 1, background: '#fff', color: '#991b1b', border: '1px solid #fecaca', padding: '14px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem', transition: 'background 0.2s' },
    disclaimer: { marginTop: '12px', fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }
};

export default VerifikasiInternal;