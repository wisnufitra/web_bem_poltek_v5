// src/pages/admin/activity/VerifikasiEksternal.jsx

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../../../firebase/firebaseConfig';
import { 
    collection, query, where, onSnapshot, doc, updateDoc, arrayUnion 
} from 'firebase/firestore';
import { uploadToGoogleDrive } from '../../../utils/driveUpload';
import { useAdmin } from '../../../layouts/AdminLayout';
import { 
    FileText, Search, Eye, FileOutput, Clock,
    DollarSign, PenTool, History, Calendar, ShieldCheck, 
    AlertCircle, Loader2, CheckCircle, XCircle,
    ChevronRight, LayoutList, Archive, Check, UploadCloud,
    MessageSquare, Send, TrendingUp, ChevronDown, ChevronUp, FileClock,
    AlertTriangle, X, Building2, Download, Paperclip, LockKeyhole
} from 'lucide-react';

// --- COMPONENTS KECIL ---

const Toast = ({ message, type, onClose }) => {
    useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
    const bg = type === 'error' ? '#ef4444' : '#10b981';
    return (
        <div style={{ position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)', backgroundColor: bg, color: 'white', padding: '12px 24px', borderRadius: 50, zIndex: 10005, boxShadow: '0 10px 30px rgba(0,0,0,0.2)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10, animation: 'slideUp 0.3s ease' }}>
            {type === 'error' ? <AlertTriangle size={20}/> : <CheckCircle size={20}/>} {message}
        </div>
    );
};

const VerifikasiEksternal = () => {
    const { profil, sysConfig, activeRole } = useAdmin(); 
    const periodeAktif = sysConfig?.activePeriod || "2025/2026";
    
    // State Data
    const [proposals, setProposals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('PROPOSAL_IN'); 
    const [toast, setToast] = useState(null);
    
    // Modal Review
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [reviewingRole, setReviewingRole] = useState(null); // State penting untuk Master
    const [reviewNote, setReviewNote] = useState('');
    const [feedbackFile, setFeedbackFile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [modalTab, setModalTab] = useState('REVIEW'); // <-- INI YANG KURANG

    // Modal Disposisi
    const [isDispModalOpen, setIsDispModalOpen] = useState(false);
    const [isViewDispositionOpen, setIsViewDispositionOpen] = useState(false); 
    const [dispFiles, setDispFiles] = useState([]); 
    const [tempDispNote, setTempDispNote] = useState(''); 

    const showToast = (msg, type = 'success') => setToast({ msg, type });
    const formatRp = (num) => "Rp " + new Intl.NumberFormat('id-ID').format(num || 0);
    
    // [PERBAIKAN TANGGAL] Format tanggal aman (anti-error)
    const formatDateTime = (iso) => {
        if (!iso) return '-';
        try {
            return new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        } catch (e) { return '-'; }
    };

    // --- 1. DETEKSI PERAN (Role Detection) ---
    const myRole = useMemo(() => {
        if (profil.role === 'master' || profil.role_global === 'master') return 'master';

        const division = (activeRole?.division || '').toLowerCase();
        const entity = (activeRole?.entity_id || '').toLowerCase();

        if (division.includes('dalam negeri') || division.includes('dagri')) return 'bem_dagri';
        if (division.includes('keuangan') || division.includes('bendahara')) return 'bem_keu';
        if (division.includes('sekretaris') || division.includes('sekjen')) return 'bem_sekjen';
        if (entity.includes('dpm') || division.includes('anggaran') || division.includes('banggar')) return 'dpm_banggar';

        return null; 
    }, [profil, activeRole]);

    // --- 2. FETCH DATA ---
    useEffect(() => {
        if (!sysConfig) return;

        const q = query(
            collection(db, 'activity_proposals'),
            where('periode', '==', periodeAktif),
            where('status', 'in', ['WAITING_KM', 'REVISION_KM', 'APPROVED', 'SUBMITTED_TO_CAMPUS', 'WAITING_KM_LPJ', 'REVISION_LPJ_EXTERNAL', 'DONE', 'COMPLETED'])
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Sort by latest update
            list.sort((a, b) => new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0));
            setProposals(list);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [sysConfig, periodeAktif]);

    // --- 3. FILTER LOGIC ---
    const filteredList = useMemo(() => {
        return proposals.filter(p => {
            const matchSearch = (p.activityName || "").toLowerCase().includes(searchTerm.toLowerCase());
            
            // Tab Proposal: Menunggu persetujuan KM (tahap awal)
            if (activeTab === 'PROPOSAL_IN') {
                return matchSearch && (p.status === 'WAITING_KM' || p.status === 'REVISION_KM');
            }
            // Tab LPJ: Menunggu persetujuan KM (tahap akhir)
            if (activeTab === 'LPJ_IN') {
                return matchSearch && (p.status === 'WAITING_KM_LPJ' || p.status === 'REVISION_LPJ_EXTERNAL');
            }
            // Tab History: Sudah disetujui (APPROVED) atau Selesai total (DONE)
            if (activeTab === 'HISTORY') {
                return matchSearch && (p.status === 'APPROVED' || p.status === 'DONE' || p.status === 'SUBMITTED_TO_CAMPUS');
            }
            return false;
        });
    }, [proposals, searchTerm, activeTab]);

    // --- 4. HANDLERS ---

    // Membuka modal review dengan Role Spesifik
    const handleOpenReview = (item, roleKey) => {
        setSelectedItem({
            ...item,
            taskType: (item.status.includes('LPJ') || item.status === 'DONE') ? 'LPJ' : 'PROPOSAL'
        });
        
        // [LOGIKA MASTER]: Jika Master, dia 'menjelma' menjadi role tombol yang diklik
        const roleToAct = myRole === 'master' ? roleKey : myRole;
        setReviewingRole(roleToAct);
        
        setReviewNote('');
        setFeedbackFile(null);
        setModalTab('REVIEW');
        setIsModalOpen(true);
    };

    const submitReviewAction = async (decision) => {
        // Gunakan role yang sedang aktif (bisa Master acting as X, atau User X asli)
        const currentActingRole = reviewingRole; 
        
        if (!currentActingRole) return showToast("Role tidak terdeteksi.", "error");
        if (decision === 'REJECTED' && !reviewNote) return showToast("Wajib isi catatan penolakan!", "error");

        setIsProcessing(true);
        try {
            const docRef = doc(db, 'activity_proposals', selectedItem.id);
            const now = new Date().toISOString();
            let attachmentUrl = null;

            if (feedbackFile) {
                const folder = [periodeAktif, "External_Feedback", selectedItem.activityName];
                attachmentUrl = await uploadToGoogleDrive(feedbackFile, folder);
            }

            // --- 1. Update Keputusan (Single Approval) ---
            const updates = {
                [`approvalsKM.${currentActingRole}.status`]: decision,
                [`approvalsKM.${currentActingRole}.date`]: now,
                [`approvalsKM.${currentActingRole}.approver`]: profil.namaTampilan + (myRole === 'master' ? ' (Master Override)' : ''), // Tandai jika Master
                [`approvalsKM.${currentActingRole}.note`]: reviewNote,
                [`approvalsKM.${currentActingRole}.attachment`]: attachmentUrl
            };

            // --- 2. Cek Status Kolektif (Paralel) ---
            const currentKM = { ...selectedItem.approvalsKM, [currentActingRole]: { status: decision } };
            const requiredRoles = ['bem_dagri', 'bem_sekjen', 'bem_keu', 'dpm_banggar'];
            
            const isAllApproved = requiredRoles.every(r => currentKM[r]?.status === 'APPROVED');
            const hasRejection = requiredRoles.some(r => currentKM[r]?.status === 'REJECTED');

            let actionLog = "";

            if (selectedItem.taskType === 'PROPOSAL') {
                if (hasRejection) {
                    updates.status = 'REVISION_KM';
                    actionLog = `KM_REJECT_PROPOSAL [${currentActingRole.toUpperCase()}]`;
                } else if (isAllApproved) {
                    updates.status = 'APPROVED'; // Lolos ke Disposisi
                    actionLog = "KM_APPROVE_PROPOSAL_FINAL";
                } else {
                    updates.status = 'WAITING_KM';
                    actionLog = `KM_APPROVE_PARTIAL [${currentActingRole.toUpperCase()}]`;
                }
            } else {
                // Logic LPJ
                if (hasRejection) {
                    updates.status = 'REVISION_LPJ_EXTERNAL';
                    actionLog = `KM_REJECT_LPJ [${currentActingRole.toUpperCase()}]`;
                } else if (isAllApproved) {
                    updates.status = 'DONE'; // Selesai Total
                    actionLog = "KM_APPROVE_LPJ_FINAL_DONE";
                } else {
                    updates.status = 'WAITING_KM_LPJ';
                    actionLog = `KM_APPROVE_LPJ_PARTIAL [${currentActingRole.toUpperCase()}]`;
                }
            }

            updates.lastUpdated = now;
            updates.history = arrayUnion({
                action: actionLog,
                actor: profil.namaTampilan,
                role: currentActingRole.toUpperCase(), // Log role yang 'dimainkan'
                timestamp: now,
                note: reviewNote,
                attachmentUrl: attachmentUrl
            });

            await updateDoc(docRef, updates);
            showToast(`Berhasil menyimpan keputusan.`);
            setIsModalOpen(false);

        } catch (error) {
            console.error(error);
            showToast("Gagal menyimpan.", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    // --- DISPOSISI HANDLERS ---
    const handleAddDispFile = (e) => {
        const file = e.target.files[0];
        if(!file) return;
        setDispFiles(prev => [...prev, { file, name: file.name, note: tempDispNote }]);
        setTempDispNote('');
    };

    const submitDisposition = async () => {
        if(dispFiles.length === 0) return showToast("Pilih file dulu!", "error");
        setIsProcessing(true);
        try {
            const folder = [periodeAktif, "Disposisi_Final", selectedItem.activityName];
            const uploaded = await Promise.all(dispFiles.map(async f => {
                const url = await uploadToGoogleDrive(f.file, folder);
                return { url, note: f.note || 'Dokumen Disposisi', fileName: f.name, uploadedAt: new Date().toISOString() };
            }));

            await updateDoc(doc(db, 'activity_proposals', selectedItem.id), {
                dispositionDocuments: arrayUnion(...uploaded),
                history: arrayUnion({ action: 'UPLOAD_DISPOSITION', actor: profil.namaTampilan, timestamp: new Date().toISOString() })
            });
            showToast("Disposisi diupload!");
            setIsDispModalOpen(false);
        } catch(e) { showToast("Gagal upload.", "error"); }
        finally { setIsProcessing(false); }
    };

    // --- HELPER COMPONENT: CELL APPROVAL ---
    const ApprovalCell = ({ item, data, label, roleKey }) => {
        // [LOGIKA MASTER]: Master bisa edit semua, User biasa cuma roleKey miliknya
        const canEdit = myRole === 'master' || myRole === roleKey;
        
        let bg = '#f1f5f9'; let color = '#64748b'; let icon = <Clock size={14}/>;
        if (data?.status === 'APPROVED') { bg='#dcfce7'; color='#166534'; icon=<CheckCircle size={14}/>; }
        if (data?.status === 'REJECTED') { bg='#fee2e2'; color='#991b1b'; icon=<XCircle size={14}/>; }

        return (
            <div style={{textAlign:'center', padding: '0 4px'}}>
                <div style={{fontSize:'0.65rem', fontWeight:700, color:'#64748b', marginBottom:4}}>{label}</div>
                {canEdit && data?.status !== 'APPROVED' ? (
                    <button 
                        onClick={() => handleOpenReview(item, roleKey)} // Pass roleKey agar Master bisa 'menjelma'
                        style={styles.btnActionSmall}
                    >
                        {myRole === 'master' ? <LockKeyhole size={10}/> : <PenTool size={10}/>} Review
                    </button>
                ) : (
                    <div style={{...styles.badgeSmall, background:bg, color:color, justifyContent:'center', gap:4}}>
                        {icon} {data?.status === 'APPROVED' ? 'OK' : (data?.status === 'REJECTED' ? 'NO' : 'Wait')}
                    </div>
                )}
            </div>
        )
    };

    if (loading) return <div style={styles.loadingContainer}><Loader2 className="spin" size={40} color="#2563EB"/></div>;

    return (
        <div style={styles.container}>
            {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
            <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { 100% { transform: rotate(360deg); } }`}</style>

            <header style={styles.header}>
                <div>
                    <h1 style={styles.title}>Verifikasi Eksternal</h1>
                    <p style={styles.subtitle}>Dashboard Kontrol BEM & DPM • <strong>{periodeAktif}</strong></p>
                </div>
                <div style={styles.roleBadge}>
                    <Building2 size={16}/> <span>{myRole ? myRole.toUpperCase().replace('_', ' ') : 'VIEWER'}</span>
                </div>
            </header>

            <div style={styles.tabs}>
                <button onClick={()=>setActiveTab('PROPOSAL_IN')} style={activeTab === 'PROPOSAL_IN' ? styles.tabActive : styles.tab}>
                    <FileText size={16}/> Proposal Masuk
                    {proposals.filter(p => p.status === 'WAITING_KM').length > 0 && 
                        <span style={styles.badgeCount}>{proposals.filter(p => p.status === 'WAITING_KM').length}</span>
                    }
                </button>
                <button onClick={()=>setActiveTab('LPJ_IN')} style={activeTab === 'LPJ_IN' ? styles.tabActive : styles.tab}>
                    <Archive size={16}/> LPJ Masuk
                    {proposals.filter(p => p.status === 'WAITING_KM_LPJ').length > 0 && 
                        <span style={styles.badgeCount}>{proposals.filter(p => p.status === 'WAITING_KM_LPJ').length}</span>
                    }
                </button>
                <button onClick={()=>setActiveTab('HISTORY')} style={activeTab === 'HISTORY' ? styles.tabActive : styles.tab}>
                    <History size={16}/> Arsip Selesai
                </button>
            </div>

            <div style={styles.searchBar}>
                <Search size={16} color="#94A3B8"/>
                <input placeholder="Cari nama kegiatan..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} style={styles.searchInput}/>
            </div>

            <div style={styles.tableCard}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th width="25%">KEGIATAN</th>
                            <th width="15%" className="text-center">DAGRI</th>
                            <th width="15%" className="text-center">SEKJEN</th>
                            <th width="15%" className="text-center">KEUANGAN</th>
                            <th width="15%" className="text-center">BANGGAR</th>
                            <th width="15%" className="text-center">DISPOSISI</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredList.length > 0 ? filteredList.map(item => (
                            <tr key={item.id}>
                                <td>
                                    <div style={styles.rowTitle}>{item.activityName}</div>
                                    <div style={{fontSize:'0.75rem', color:'#64748B'}}>{item.divisionName}</div>
                                    <div style={styles.moneyBadge}>{formatRp(item.budgetRequested)}</div>
                                    
                                    {/* [PERBAIKAN TANGGAL] Tampilkan Tanggal dengan Fallback */}
                                    <div style={{fontSize:'0.7rem', color:'#64748b', marginTop:4, display:'flex', alignItems:'center', gap:4}}>
                                        <Calendar size={10}/> 
                                        {/* Cek dateDisplay, jika kosong pakai lastUpdated */}
                                        {item.dateDisplay || formatDateTime(item.lastUpdated)}
                                    </div>
                                </td>
                                
                                <td><ApprovalCell item={item} data={item.approvalsKM?.bem_dagri} label="DAGRI" roleKey="bem_dagri" /></td>
                                <td><ApprovalCell item={item} data={item.approvalsKM?.bem_sekjen} label="SEKJEN" roleKey="bem_sekjen" /></td>
                                <td><ApprovalCell item={item} data={item.approvalsKM?.bem_keu} label="KEUANGAN" roleKey="bem_keu" /></td>
                                <td><ApprovalCell item={item} data={item.approvalsKM?.dpm_banggar} label="BANGGAR" roleKey="dpm_banggar" /></td>

                                <td className="text-center">
                                    {(myRole === 'bem_sekjen' || myRole === 'master') && item.status === 'APPROVED' ? (
                                        <button onClick={()=>{setSelectedItem(item); setIsDispModalOpen(true)}} style={styles.btnUpload}>
                                            <UploadCloud size={14}/> Upload SK
                                        </button>
                                    ) : item.status === 'APPROVED' || item.status === 'DONE' ? (
                                        <button onClick={()=>{setSelectedItem(item); setIsViewDispositionOpen(true)}} style={styles.btnSuccess}>
                                            <Eye size={14}/> Lihat SK
                                        </button>
                                    ) : (
                                        <span style={{fontSize:'0.7rem', color:'#cbd5e0'}}>Menunggu</span>
                                    )}
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan="6" style={{textAlign:'center', padding:40, color:'#94a3b8'}}>Belum ada data.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL REVIEW */}
            {isModalOpen && selectedItem && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>{selectedItem.activityName}</h2>
                            <div style={{display:'flex', alignItems:'center', gap:8}}>
                                <span style={{fontSize:'0.75rem', background:'#EFF6FF', color:'#1E40AF', padding:'4px 8px', borderRadius:6, fontWeight:600}}>
                                    Acting As: {reviewingRole?.toUpperCase().replace('_',' ')}
                                </span>
                                <button onClick={()=>setIsModalOpen(false)} style={styles.closeBtn}><XCircle size={24}/></button>
                            </div>
                        </div>

                        {/* SPLIT VIEW (Khusus LPJ) */}
                        {selectedItem.taskType === 'LPJ' ? (
                            <div style={styles.splitView}>
                                <div style={styles.splitLeft}>
                                    <h3 style={styles.sectionTitle}>Data Proposal (Acuan)</h3>
                                    <div style={styles.infoRow}><span>Pagu:</span> <strong>{formatRp(selectedItem.budgetRequested)}</strong></div>
                                    <div style={{marginTop:16}}>
                                        <div style={styles.labelMini}>FILE PROPOSAL</div>
                                        {selectedItem.documents?.filter(d => d.type !== 'LPJ').map((d, i) => (
                                            <a key={i} href={d.currentFile?.url || d.url} target="_blank" rel="noreferrer" style={styles.fileLink}><FileText size={14}/> {d.label}</a>
                                        ))}
                                    </div>
                                </div>
                                <div style={styles.splitRight}>
                                    <h3 style={styles.sectionTitle}>Audit Realisasi</h3>
                                    <div style={styles.auditBox}>
                                        <div style={styles.auditRow}>
                                            <span>Terpakai:</span> <span style={{color:'#2563EB'}}>{formatRp(selectedItem.reporting?.realizedBudget)}</span>
                                        </div>
                                        <div style={styles.auditRow}>
                                            <span>Sisa:</span> <span style={{fontWeight:800}}>{formatRp(selectedItem.budgetRequested - selectedItem.reporting?.realizedBudget)}</span>
                                        </div>
                                    </div>
                                    <div style={{marginTop:16}}>
                                        <div style={styles.labelMini}>FILE LPJ</div>
                                        {selectedItem.reporting?.lpjFile && <a href={selectedItem.reporting.lpjFile.url} target="_blank" rel="noreferrer" style={styles.fileLink}><Archive size={14}/> LPJ</a>}
                                        {selectedItem.reporting?.spjFile && <a href={selectedItem.reporting.spjFile.url} target="_blank" rel="noreferrer" style={styles.fileLink}><DollarSign size={14}/> SPJ</a>}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // VIEW PROPOSAL BIASA
                            <div style={{padding:24}}>
                                <h3 style={styles.sectionTitle}>Detail Pengajuan</h3>
                                <p style={styles.descText}>{selectedItem.description}</p>
                                <div style={{marginTop:16}}>
                                    <div style={styles.labelMini}>DOKUMEN</div>
                                    {selectedItem.documents?.map((d, i) => (
                                        <a key={i} href={d.currentFile?.url || d.url} target="_blank" rel="noreferrer" style={styles.fileLink}><FileText size={14}/> {d.label}</a>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div style={styles.modalFooter}>
                            <div style={{flex:1}}>
                                <label style={styles.label}>Catatan {reviewingRole?.toUpperCase().replace('_',' ')}:</label>
                                <textarea rows={2} style={styles.textarea} value={reviewNote} onChange={e=>setReviewNote(e.target.value)} placeholder="Tulis catatan..."/>
                                <div style={{marginTop:8}}>
                                    <label htmlFor="feedFile" style={{cursor:'pointer', fontSize:'0.8rem', color:'#2563EB', display:'flex', gap:4}}>
                                        <Paperclip size={14}/> {feedbackFile ? feedbackFile.name : 'Upload Coretan'}
                                    </label>
                                    <input type="file" id="feedFile" hidden onChange={e=>setFeedbackFile(e.target.files[0])}/>
                                </div>
                            </div>
                            <div style={{display:'flex', gap:12, alignItems:'flex-end'}}>
                                <button onClick={()=>submitReviewAction('REJECTED')} disabled={isProcessing} style={styles.btnReject}>Tolak</button>
                                <button onClick={()=>submitReviewAction('APPROVED')} disabled={isProcessing} style={styles.btnApprove}>Setujui</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL UPLOAD DISPOSISI */}
            {isDispModalOpen && selectedItem && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContentSmall}>
                        <div style={styles.modalHeader}><h3>Upload SK / Disposisi</h3><button onClick={()=>setIsDispModalOpen(false)} style={styles.closeBtn}><XCircle/></button></div>
                        <div style={{padding:20}}>
                            <input placeholder="Nama Dokumen" value={tempDispNote} onChange={e=>setTempDispNote(e.target.value)} style={styles.input}/>
                            <input type="file" onChange={handleAddDispFile} style={{marginTop:8}}/>
                            <div style={{marginTop:12}}>
                                {dispFiles.map((f, i) => <div key={i} style={{fontSize:'0.8rem'}}>• {f.name}</div>)}
                            </div>
                            <button onClick={submitDisposition} disabled={isProcessing} style={{...styles.btnApprove, width:'100%', marginTop:16}}>Simpan</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL VIEW DISPOSISI */}
            {isViewDispositionOpen && selectedItem && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContentSmall}>
                        <div style={styles.modalHeader}><h3>File Disposisi</h3><button onClick={()=>setIsViewDispositionOpen(false)} style={styles.closeBtn}><XCircle/></button></div>
                        <div style={{padding:20, display:'flex', flexDirection:'column', gap:8}}>
                            {selectedItem.dispositionDocuments?.map((d, i) => (
                                <a key={i} href={d.url} target="_blank" rel="noreferrer" style={styles.fileLink}><FileText size={14}/> {d.note}</a>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            
            <style>{`.text-center{text-align:center}`}</style>
        </div>
    );
};

// --- STYLES ---
const styles = {
    container: { padding: 32, fontFamily: 'Inter, sans-serif', maxWidth: 1400, margin: '0 auto' },
    loadingContainer: { height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    title: { fontSize: '1.8rem', fontWeight: 800, margin: 0, color: '#0f172a' },
    subtitle: { color: '#64748b', margin: 0 },
    roleBadge: { display: 'flex', alignItems: 'center', gap: 8, background: '#e0e7ff', color: '#3730a3', padding: '8px 16px', borderRadius: 8, fontSize: '0.9rem', fontWeight: 700 },
    
    tabs: { display: 'flex', gap: 12, marginBottom: 24 },
    tab: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', border: '1px solid #E2E8F0', background: 'white', color: '#64748B', fontWeight: 600, cursor: 'pointer', borderRadius: 10 },
    tabActive: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', border: '1px solid #2563EB', background: '#EFF6FF', color: '#2563EB', fontWeight: 700, cursor: 'pointer', borderRadius: 10 },
    badgeCount: { background: '#EF4444', color: '#FFF', fontSize: '0.7rem', padding: '2px 6px', borderRadius: 10 },

    searchBar: { display: 'flex', alignItems: 'center', gap: 10, background: 'white', border: '1px solid #E2E8F0', padding: '12px 16px', borderRadius: 12, marginBottom: 20 },
    searchInput: { border: 'none', outline: 'none', width: '100%', fontSize: '0.9rem' },

    tableCard: { background: '#FFF', borderRadius: 20, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 4px 6px -2px rgba(0,0,0,0.05)' },
    table: { width: '100%', borderCollapse: 'collapse' },
    emptyRow: { padding: 40, textAlign: 'center', color: '#94A3B8' },
    rowTitle: { fontWeight: 700, color: '#0F172A', fontSize: '0.95rem' },
    moneyBadge: { display: 'inline-block', fontSize: '0.75rem', background: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: 4, marginTop: 4, fontWeight: 700 },
    
    btnActionSmall: { background: '#2563eb', color: 'white', border: 'none', padding: '4px 8px', borderRadius: 6, cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600, display:'flex', alignItems:'center', gap:4, margin:'0 auto' },
    badgeSmall: { display: 'inline-flex', padding: '4px', borderRadius: 6, fontSize: '0.7rem', alignItems:'center' },
    
    btnUpload: { background: '#f59e0b', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 },
    btnSuccess: { background: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' },
    btnAction: { background: '#FFF', border: '1px solid #E2E8F0', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#0F172A' },

    // Modal
    modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modalContent: { background: 'white', width: '90%', maxWidth: 1000, height: '85vh', borderRadius: 24, display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' },
    modalContentSmall: { background: 'white', width: '400px', borderRadius: 16 },
    modalHeader: { padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom:'1px solid #E2E8F0' },
    modalTitle: { margin: 0, fontSize: '1.2rem', fontWeight: 800 },
    closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' },
    
    splitView: { display: 'flex', flex:1, overflow:'hidden' },
    splitLeft: { flex: 1, padding: 24, borderRight: '1px solid #E2E8F0', overflowY:'auto', background:'#F8FAFC' },
    splitRight: { flex: 1, padding: 24, overflowY:'auto' },
    sectionTitle: { fontSize: '1rem', fontWeight: 700, marginBottom: 16, color:'#334155' },
    
    labelMini: { fontSize:'0.75rem', fontWeight:700, color:'#64748B', marginBottom:8 },
    fileLink: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px', background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: '0.85rem', textDecoration: 'none', color: '#2563EB', fontWeight: 600, marginBottom:8 },
    descText: { fontSize:'0.9rem', color:'#475569', lineHeight:1.6 },
    
    auditBox: { background:'#FFF', border:'1px solid #E2E8F0', padding:16, borderRadius:12 },
    auditRow: { display:'flex', justifyContent:'space-between', alignItems:'center', fontWeight:600, marginBottom:8 },

    modalFooter: { padding: 24, borderTop: '1px solid #E2E8F0', background: '#F8FAFC', display:'flex', gap:24 },
    label: { display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 6, color: '#334155' },
    textarea: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.9rem' },
    input: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.9rem' },
    
    btnApprove: { padding: '12px 24px', background: '#16A34A', color: '#FFF', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' },
    btnReject: { padding: '12px 24px', background: '#FFF', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 10, fontWeight: 700, cursor: 'pointer' },
};

// Inject CSS for table
const styleSheet = document.createElement("style");
styleSheet.innerHTML = `
    .table th { text-align: left; padding: 14px 20px; background: #f8fafc; color: #64748b; font-size: 0.75rem; font-weight: 700; border-bottom: 1px solid #e2e8f0; }
    .table td { padding: 12px 20px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    .table tr:last-child td { border-bottom: none; }
`;
document.head.appendChild(styleSheet);

export default VerifikasiEksternal;