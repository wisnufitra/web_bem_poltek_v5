// src/pages/admin/activity/VerifikasiInternal.jsx

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
    AlertCircle, Loader2, CheckCircle2, XCircle,
    ChevronRight, LayoutList, Archive, Check, UploadCloud,
    MessageSquare, Send, TrendingUp, ChevronDown, ChevronUp, FileClock,
    AlertTriangle, X, ExternalLink
} from 'lucide-react';

// --- COMPONENTS KECIL ---

const Toast = ({ message, type, onClose }) => {
    useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
    const theme = type === 'error' 
        ? { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA', icon: <AlertCircle size={20}/> }
        : { bg: '#F0FDF4', text: '#166534', border: '#BBF7D0', icon: <CheckCircle2 size={20}/> };
    return (
        <div style={{ 
            position: 'fixed', bottom: 32, right: 32, backgroundColor: theme.bg, color: theme.text, 
            padding: '16px 24px', borderRadius: 16, zIndex: 10005, border: `1px solid ${theme.border}`,
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: 12, fontWeight: 600,
            animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
            {theme.icon} {message}
        </div>
    );
};

const ChatBubble = ({ comment, isMe }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
        <div style={{ 
            maxWidth: '85%', padding: '10px 14px', borderRadius: 12, fontSize: '0.9rem', lineHeight: 1.4,
            background: isMe ? '#DCFCE7' : '#F1F5F9', color: isMe ? '#14532D' : '#334155',
            borderBottomRightRadius: isMe ? 2 : 12, borderBottomLeftRadius: isMe ? 12 : 2
        }}>
            <div style={{fontWeight: 700, fontSize: '0.7rem', marginBottom: 4, color: isMe ? '#16A34A' : '#64748B', textTransform:'uppercase'}}>
                {comment.role} • {comment.sender}
            </div>
            {comment.text}
        </div>
        <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: 4 }}>
            {new Date(comment.timestamp).toLocaleString('id-ID', {hour: '2-digit', minute:'2-digit', day:'numeric', month:'short'})}
        </div>
    </div>
);

const DocumentViewer = ({ doc }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    // Logic: Jika dokumen punya history, berarti yang tampil sekarang adalah revisi (Terbaru)
    const isRevision = doc.history && doc.history.length > 0;

    return (
        <div style={styles.docItem}>
            <div style={{display:'flex', alignItems:'center', gap:12, width:'100%'}}>
                <div style={styles.docIcon}>
                    {doc.type === 'LPJ' ? <Archive size={18} color="#DB2777"/> : <FileText size={18} color="#2563EB"/>}
                </div>
                <div style={{flex:1}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <div style={styles.docName}>{doc.label}</div>
                        <div style={{display:'flex', gap:6}}>
                            {/* BADGE "TERBARU" untuk Admin */}
                            {isRevision && (
                                <span style={{background:'#DCFCE7', color:'#166534', fontSize:'0.65rem', padding:'2px 6px', borderRadius:4, fontWeight:700, border:'1px solid #BBF7D0'}}>
                                    TERBARU (v{doc.history.length + 1})
                                </span>
                            )}
                            {!isRevision && doc.currentFile && (
                                <span style={{background:'#F1F5F9', color:'#64748B', fontSize:'0.65rem', padding:'2px 6px', borderRadius:4, fontWeight:600}}>
                                    v1
                                </span>
                            )}
                        </div>
                    </div>
                    <div style={styles.docType}>
                        {doc.type} • {doc.currentFile ? `Diupload ${new Date(doc.currentFile.uploadedAt).toLocaleDateString('id-ID')}` : 'Belum ada file'}
                    </div>
                </div>
                
                {/* Action: Lihat File */}
                {doc.currentFile && (
                    <a href={doc.currentFile.url} target="_blank" rel="noreferrer" style={styles.btnSmall}>
                        <Eye size={14}/> Buka
                    </a>
                )}

                {/* Toggle History */}
                {doc.history?.length > 0 && (
                    <button onClick={()=>setIsOpen(!isOpen)} style={styles.iconBtn}>
                        {isOpen ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                    </button>
                )}
            </div>

            {/* Dropdown Riwayat */}
            {isOpen && doc.history?.length > 0 && (
                <div style={styles.historyDropdown}>
                    <div style={styles.histHeaderTitle}>Riwayat Versi Sebelumnya (Arsip):</div>
                    {doc.history.map((h, idx) => (
                        <div key={idx} style={styles.histLink}>
                            <div style={{display:'flex', alignItems:'center', gap:6}}>
                                <FileClock size={12}/> 
                                <span>Versi {idx+1} ({new Date(h.uploadedAt).toLocaleDateString('id-ID')})</span>
                            </div>
                            <a href={h.url} target="_blank" rel="noreferrer" style={{color:'#2563EB', fontWeight:600}}>Lihat</a>
                        </div>
                    ))}
                </div>
            )}
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
    const [toast, setToast] = useState(null);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [modalTab, setModalTab] = useState('REVIEW'); 

    const [reviewNote, setReviewNote] = useState('');
    const [revisionFile, setRevisionFile] = useState(null); 
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [chatMsg, setChatMsg] = useState('');
    const chatEndRef = useRef(null);

    // --- METADATA ---
    const myOrgId = myAssignment.entity_id;
    const myOrgName = myAssignment.entity_name;
    const myPosition = (myAssignment.position || '').toLowerCase();
    const myDivision = (myAssignment.division || '').toLowerCase();

    const myInternalRole = useMemo(() => {
        if (myPosition.includes('ketua') || myPosition.includes('presiden') || myDivision === 'inti') return 'ketua';
        if (myPosition.includes('sekretaris') || myPosition.includes('sekjen')) return 'sekjen';
        if (myPosition.includes('bendahara') || myPosition.includes('keuangan')) return 'bendahara';
        return null; 
    }, [myPosition, myDivision]);

    const formatRp = (num) => "Rp " + new Intl.NumberFormat('id-ID').format(num || 0);
    const showToast = (message, type = 'success') => setToast({ message, type });

    useEffect(() => {
        if (!myOrgId) return;
        const q = query(collection(db, 'activity_proposals'), where('orgId', '==', myOrgId), where('periode', '==', periodeAktif));
        const unsub = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            list.sort((a, b) => new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0));
            setProposals(list);
            setLoading(false);
        });
        return () => unsub();
    }, [myOrgId, periodeAktif]);

    const filteredList = useMemo(() => {
        return proposals.filter(p => {
            const matchSearch = (p.activityName || "").toLowerCase().includes(searchTerm.toLowerCase());
            const matchDiv = filterDivisi === 'ALL' || p.divisionName === filterDivisi;
            
            const isLPJ = p.status === 'COMPLETED' || p.reporting?.status === 'WAITING_REVIEW';
            p.taskType = isLPJ ? 'LPJ' : 'PROPOSAL';

            const isWaitingInternal = p.status?.includes('WAITING_INTERNAL');
            const isRevisionInternal = p.status?.includes('REVISION_INTERNAL');
            const isWaitingLPJ = p.reporting?.status?.includes('WAITING');
            
            if (activeTab === 'WAITING') {
                return matchSearch && matchDiv && (isWaitingInternal || isRevisionInternal || isWaitingLPJ);
            }
            if (activeTab === 'HISTORY') {
                const isPassedInternal = !isWaitingInternal && !isRevisionInternal && !isWaitingLPJ;
                return matchSearch && matchDiv && isPassedInternal;
            }
            return false;
        });
    }, [proposals, searchTerm, filterDivisi, activeTab]);

    const uniqueDivisions = useMemo(() => [...new Set(proposals.map(p => p.divisionName))], [proposals]);

    const handleOpenReview = (item) => {
        setSelectedItem(item);
        setReviewNote('');
        setRevisionFile(null);
        setModalTab('REVIEW');
        setIsModalOpen(true);
    };

    // --- LOGIC PERBAIKAN: SYSTEM CHECK AGGREGATE ---
    const submitReviewAction = async (decision) => {
        if (!myInternalRole) return showToast("Akses Ditolak: Role tidak dikenali.", "error");
        if (decision === 'REJECTED' && !reviewNote) return showToast("Wajib memberikan catatan revisi!", "error");
        
        setIsProcessing(true);
        try {
            const docRef = doc(db, 'activity_proposals', selectedItem.id);
            const now = new Date().toISOString();
            let updates = {};
            let actionLabel = "";
            let attachmentUrl = null;

            if (revisionFile && decision === 'REJECTED') {
                const folder = [periodeAktif.replace('/','-'), myOrgName, "Admin_Review", selectedItem.activityName];
                attachmentUrl = await uploadToGoogleDrive(revisionFile, folder);
            }

            // 1. Verifikasi Proposal
            if (selectedItem.taskType === 'PROPOSAL') {
                // a. Simpan keputusan SAYA dulu
                updates[`approvals.internal.${myInternalRole}.status`] = decision;
                updates[`approvals.internal.${myInternalRole}.date`] = now;
                
                // b. Ambil snapshot keputusan TERBARU (gabungan yang lama + keputusan saya sekarang)
                const latestApprovals = { 
                    ...selectedItem.approvals?.internal, 
                    [myInternalRole]: { status: decision } // Ini yang baru saja diklik
                };

                const rolesToCheck = ['ketua', 'sekjen', 'bendahara'];
                
                // c. Cek Logika Agregat (Kolektif)
                const hasAnyRejection = rolesToCheck.some(r => latestApprovals[r]?.status === 'REJECTED');
                const isAllApproved = rolesToCheck.every(r => latestApprovals[r]?.status === 'APPROVED');

                // d. Tentukan Status Global berdasarkan Agregat
                if (hasAnyRejection) {
                    // Jika ADA SATU SAJA yang menolak (entah saya atau orang lain sebelumnya), status harus REVISION
                    updates.status = 'REVISION_INTERNAL';
                    
                    // Label aksi: Jika saya yang menolak -> REJECT, Jika saya setuju tapi status global tetap REJECT -> APPROVE_BUT_STILL_REVISION
                    if (decision === 'REJECTED') actionLabel = "REJECT_PROPOSAL";
                    else actionLabel = "APPROVE_PARTIAL_STILL_REVISION";

                } else if (isAllApproved) {
                    // Semua setuju -> Lanjut
                    updates.status = 'WAITING_KM'; 
                    actionLabel = "INTERNAL_APPROVED_WAITING_KM";
                } else {
                    // Belum lengkap dan tidak ada yang menolak
                    updates.status = 'WAITING_INTERNAL';
                    actionLabel = "APPROVE_PROPOSAL_PARTIAL";
                }
            } 
            // 2. Verifikasi LPJ (Logic serupa)
            else {
                if (decision === 'REJECTED') { 
                    updates['reporting.status'] = 'REVISION_LPJ'; 
                    updates['reporting.notesFromAdmin'] = reviewNote; 
                    actionLabel = "REJECT_LPJ";
                } else { 
                    // [PERBAIKAN LOGIKA]
                    // Jika Internal Setuju, JANGAN LANGSUNG DONE.
                    // Tapi lempar ke Eksternal (BEM/DPM).
                    
                    updates['reporting.status'] = 'APPROVED_INTERNAL'; // Internal Oke
                    updates.status = 'WAITING_KM_LPJ'; // Menunggu Eksternal
                    actionLabel = "APPROVE_LPJ_INTERNAL_FORWARD_TO_EXTERNAL";
                }
            }

            await updateDoc(docRef, {
                ...updates, 
                lastUpdated: now,
                history: arrayUnion({
                    action: actionLabel, 
                    actor: profil.namaTampilan, 
                    role: myInternalRole.toUpperCase(), 
                    timestamp: now, 
                    note: reviewNote, 
                    attachmentUrl: attachmentUrl
                })
            });

            showToast(`Keputusan berhasil disimpan.`);
            setIsModalOpen(false);
        } catch (e) { console.error(e); showToast("Terjadi kesalahan sistem.", "error"); } 
        finally { setIsProcessing(false); }
    };

    const sendComment = async () => {
        if (!chatMsg.trim()) return;
        try {
            await updateDoc(doc(db, 'activity_proposals', selectedItem.id), { 
                comments: arrayUnion({
                    id: Date.now().toString(), text: chatMsg, sender: profil.namaTampilan,
                    role: myInternalRole.toUpperCase(), timestamp: new Date().toISOString()
                }) 
            });
            setChatMsg('');
        } catch (e) { showToast("Gagal kirim pesan", "error"); }
    };

    const comments = selectedItem?.comments || [];
    useEffect(() => { if (modalTab === 'DISKUSI') chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [comments, modalTab]);

    const renderStatusDot = (status) => {
        const color = status === 'APPROVED' ? '#16A34A' : (status === 'REJECTED' ? '#DC2626' : '#E2E8F0');
        const icon = status === 'APPROVED' ? <Check size={10} color="white"/> : (status === 'REJECTED' ? <X size={10} color="white"/> : null);
        return <div style={{width:16, height:16, borderRadius:'50%', background:color, display:'flex', alignItems:'center', justifyContent:'center'}} title={status}>{icon}</div>;
    };

    if (loading) return <div style={styles.loadingContainer}><Loader2 className="spin" size={40} color="#2563EB"/></div>;

    return (
        <div style={styles.container}>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { 100% { transform: rotate(360deg); } }`}</style>

            <header style={styles.header}>
                <div>
                    <h1 style={styles.title}>Verifikasi Internal</h1>
                    <p style={styles.subtitle}>Portal Persetujuan Pengurus Inti • <strong>{myOrgName}</strong></p>
                </div>
                <div style={styles.roleBadge}>
                    <ShieldCheck size={16}/> <span>{myInternalRole?.toUpperCase() || 'OBSERVER'}</span>
                </div>
            </header>

            <div style={styles.controlBar}>
                <div style={styles.tabs}>
                    <button onClick={()=>setActiveTab('WAITING')} style={activeTab === 'WAITING' ? styles.tabActive : styles.tab}>
                        <LayoutList size={16}/> Tugas Masuk
                        {filteredList.length > 0 && activeTab === 'WAITING' && <span style={styles.badgeCount}>{filteredList.length}</span>}
                    </button>
                    <button onClick={()=>setActiveTab('HISTORY')} style={activeTab === 'HISTORY' ? styles.tabActive : styles.tab}>
                        <History size={16}/> Riwayat Arsip
                    </button>
                </div>
                <div style={styles.filters}>
                    <div style={styles.searchWrap}>
                        <Search size={16} color="#94A3B8"/>
                        <input placeholder="Cari kegiatan..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} style={styles.searchInput}/>
                    </div>
                    <select onChange={e=>setFilterDivisi(e.target.value)} style={styles.select}>
                        <option value="ALL">Semua Divisi</option>
                        {uniqueDivisions.map(d=><option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
            </div>

            <div style={styles.tableCard}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={{width:'35%'}}>Kegiatan</th>
                            <th style={{width:'20%'}}>Jadwal & Anggaran</th>
                            <th style={{width:'25%'}}>Status Verifikasi</th>
                            <th style={{textAlign:'center'}}>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredList.length === 0 ? (
                            <tr><td colSpan={4} style={styles.emptyRow}>Tidak ada data yang sesuai filter.</td></tr>
                        ) : filteredList.map(item => (
                            <tr key={item.id}>
                                <td>
                                    <div style={{display:'flex', gap:8, marginBottom:6}}>
                                        <span style={item.taskType === 'LPJ' ? styles.tagLPJ : styles.tagProp}>{item.taskType}</span>
                                        <span style={styles.tagDiv}>{item.divisionName}</span>
                                    </div>
                                    <div style={styles.rowTitle}>{item.activityName}</div>
                                </td>
                                <td>
                                    {/* PERBAIKAN: Jika dateDisplay kosong, tampilkan tanggal update terakhir sebagai info */}
                                    <div style={styles.metaInfo}>
                                        <Calendar size={14}/> 
                                        {item.dateDisplay || new Date(item.lastUpdated).toLocaleDateString('id-ID')}
                                    </div>
                                    <div style={styles.metaInfo}><DollarSign size={14}/> {formatRp(item.budgetRequested)}</div>
                                </td>
                                <td>
                                    <div style={styles.trackerGrid}>
                                        <div style={styles.trackerItem}><span>Ketua</span> {renderStatusDot(item.approvals?.internal?.ketua?.status)}</div>
                                        <div style={styles.trackerItem}><span>Sekjen</span> {renderStatusDot(item.approvals?.internal?.sekjen?.status)}</div>
                                        <div style={styles.trackerItem}><span>Bendum</span> {renderStatusDot(item.approvals?.internal?.bendahara?.status)}</div>
                                    </div>
                                    {item.status === 'WAITING_KM' && (
                                        <div style={styles.statusExternal}><ExternalLink size={10}/> Menunggu Eksternal</div>
                                    )}
                                </td>
                                <td style={{textAlign:'center'}}>
                                    <button onClick={() => handleOpenReview(item)} style={styles.btnAction}>
                                        {activeTab === 'WAITING' ? <PenTool size={14}/> : <Eye size={14}/>}
                                        {activeTab === 'WAITING' ? 'Periksa' : 'Detail'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && selectedItem && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <div style={styles.modalHeader}>
                            <div>
                                <h2 style={styles.modalTitle}>{selectedItem.activityName}</h2>
                                <p style={styles.modalSub}>{selectedItem.taskType === 'LPJ' ? 'Verifikasi Laporan Akhir' : 'Verifikasi Proposal Kegiatan'}</p>
                            </div>
                            <button onClick={()=>setIsModalOpen(false)} style={styles.closeBtn}><XCircle size={24}/></button>
                        </div>

                        <div style={styles.tabContainer}>
                            <button onClick={()=>setModalTab('REVIEW')} style={modalTab === 'REVIEW' ? styles.tabActive : styles.tab}>Tinjau Dokumen</button>
                            <button onClick={()=>setModalTab('DISKUSI')} style={modalTab === 'DISKUSI' ? styles.tabActive : styles.tab}>
                                Diskusi {comments.length > 0 && <span style={styles.badge}>{comments.length}</span>}
                            </button>
                            <button onClick={()=>setModalTab('HISTORY')} style={modalTab === 'HISTORY' ? styles.tabActive : styles.tab}>Audit Trail</button>
                        </div>

                        <div style={styles.modalGrid}>
                            <div style={styles.modalLeft}>
                                <h3 style={styles.sectionTitle}><FileText size={16}/> Dokumen Masuk</h3>
                                <div style={styles.docList}>
                                    {selectedItem.documents?.map((d, i) => (
                                        <DocumentViewer key={i} doc={d} />
                                    ))}
                                    {selectedItem.taskType === 'LPJ' && selectedItem.reporting && (
                                        <>
                                            {selectedItem.reporting.lpjFile && <DocumentViewer doc={{label:'LPJ Naratif', type:'LPJ', currentFile: selectedItem.reporting.lpjFile}}/>}
                                            {selectedItem.reporting.spjFile && <DocumentViewer doc={{label:'SPJ Keuangan', type:'LPJ', currentFile: selectedItem.reporting.spjFile}}/>}
                                        </>
                                    )}
                                </div>
                                {selectedItem.taskType === 'LPJ' && (
                                    <div style={styles.budgetCard}>
                                        <h4 style={styles.budgetTitle}><TrendingUp size={16}/> Audit Anggaran</h4>
                                        <div style={styles.budgetRow}><span>Rencana (Proposal):</span> <strong>{formatRp(selectedItem.budgetRequested)}</strong></div>
                                        <div style={styles.budgetRow}><span>Realisasi (Terpakai):</span> <strong style={{color:'#2563EB'}}>{formatRp(selectedItem.reporting?.realizedBudget)}</strong></div>
                                        <hr style={styles.dashLine}/>
                                        <div style={styles.budgetRow}>
                                            <span>Sisa Dana:</span> 
                                            <strong style={{color: (selectedItem.budgetRequested - selectedItem.reporting?.realizedBudget) < 0 ? '#DC2626' : '#166534'}}>
                                                {formatRp(selectedItem.budgetRequested - selectedItem.reporting?.realizedBudget)}
                                            </strong>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div style={styles.modalRight}>
                                {modalTab === 'REVIEW' && (
                                    <div style={styles.actionCard}>
                                        <h3 style={styles.sectionTitle}>Keputusan Verifikasi</h3>
                                        <p style={styles.infoText}>
                                            Sebagai <strong>{myInternalRole?.toUpperCase()}</strong>, keputusan Anda akan dicatat dalam sistem.
                                        </p>

                                        <div style={{marginBottom:16, fontSize:'0.9rem'}}>
                                            Status saat ini: 
                                            <span style={selectedItem.status.includes('REVISION') ? styles.statusBadgeRed : styles.statusBadgeBlue}>
                                                {selectedItem.status.replace(/_/g, ' ')}
                                            </span>
                                        </div>

                                        {selectedItem.status === 'WAITING_KM' || selectedItem.status === 'APPROVED' ? (
                                            <div style={styles.infoBoxSuccess}>
                                                <CheckCircle2 size={20}/>
                                                <span>Dokumen telah disetujui internal dan sedang diproses di tingkat Eksternal/KM.</span>
                                            </div>
                                        ) : (
                                            <>
                                                <label style={styles.label}>Catatan (Wajib jika menolak):</label>
                                                <textarea 
                                                    rows={4} style={styles.textarea} 
                                                    placeholder="Tulis alasan penolakan, revisi, atau catatan persetujuan..." 
                                                    value={reviewNote} onChange={e=>setReviewNote(e.target.value)}
                                                />
                                                <div style={styles.uploadArea}>
                                                    <div style={{display:'flex', alignItems:'center', gap:10}}>
                                                        <UploadCloud size={16} color="#64748B"/>
                                                        <label htmlFor="revFile" style={{cursor:'pointer', fontSize:'0.85rem', fontWeight:600, color:'#2563EB', flex:1}}>
                                                            {revisionFile ? revisionFile.name : 'Upload File Coretan / Revisi (Opsional)'}
                                                        </label>
                                                        <input type="file" id="revFile" hidden onChange={e=>setRevisionFile(e.target.files[0])}/>
                                                        {revisionFile && <button onClick={()=>setRevisionFile(null)} style={styles.iconBtn}><XCircle size={16}/></button>}
                                                    </div>
                                                </div>
                                                <div style={styles.btnGrid}>
                                                    <button onClick={()=>submitReviewAction('REJECTED')} disabled={isProcessing} style={styles.btnReject}>
                                                        {isProcessing ? '...' : 'Kembalikan (Revisi)'}
                                                    </button>
                                                    <button onClick={()=>submitReviewAction('APPROVED')} disabled={isProcessing} style={styles.btnApprove}>
                                                        {isProcessing ? '...' : 'Setujui Dokumen'}
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}

                                {modalTab === 'DISKUSI' && (
                                    <div style={styles.chatContainer}>
                                        <div style={styles.chatWindow}>
                                            {comments.length === 0 && <div style={styles.emptyState}>Belum ada diskusi.</div>}
                                            {comments.map((c, i) => <ChatBubble key={i} comment={c} isMe={c.role !== 'DIVISI'} />)}
                                            <div ref={chatEndRef} />
                                        </div>
                                        <div style={styles.chatInputArea}>
                                            <input style={styles.chatInput} placeholder="Tulis pesan..." value={chatMsg} onChange={e=>setChatMsg(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendComment()}/>
                                            <button onClick={sendComment} style={styles.chatSendBtn}><Send size={18}/></button>
                                        </div>
                                    </div>
                                )}

                                {modalTab === 'HISTORY' && (
                                    <div style={styles.timeline}>
                                        {selectedItem.history?.slice().reverse().map((log, i) => (
                                            <div key={i} style={styles.tlItem}>
                                                <div style={{...styles.tlDot, background: log.action.includes('REJECT') ? '#DC2626' : '#2563EB'}}></div>
                                                <div style={styles.tlContent}>
                                                    <div style={styles.tlHeader}><strong>{log.actor}</strong> ({log.role || 'User'}) • {new Date(log.timestamp).toLocaleString('id-ID')}</div>
                                                    <div style={styles.tlAction}>{log.action.replace(/_/g, ' ')}</div>
                                                    {log.note && <div style={styles.tlNote}>"{log.note}"</div>}
                                                    {log.attachmentUrl && <a href={log.attachmentUrl} target="_blank" rel="noreferrer" style={styles.linkSmall}>Lihat File Coretan</a>}
                                                </div>
                                            </div>
                                        ))}
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

// --- STYLES ---
const styles = {
    container: { fontFamily: '"Plus Jakarta Sans", sans-serif', padding: '32px', maxWidth: 1280, margin: '0 auto', color: '#0F172A' },
    loadingContainer: { height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
    title: { fontSize: '2rem', fontWeight: 800, margin: 0 },
    subtitle: { color: '#64748B', margin: '4px 0 0' },
    roleBadge: { display: 'flex', alignItems: 'center', gap: 8, background: '#1E293B', color: '#FFF', padding: '8px 16px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 700 },
    
    controlBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    tabs: { display: 'flex', gap: 4, background: '#F1F5F9', padding: 4, borderRadius: 12 },
    tab: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', border: 'none', background: 'transparent', color: '#64748B', fontWeight: 600, cursor: 'pointer', borderRadius: 8 },
    tabActive: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', border: 'none', background: '#FFF', color: '#2563EB', fontWeight: 700, cursor: 'pointer', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
    badgeCount: { background: '#EF4444', color: '#FFF', fontSize: '0.7rem', padding: '2px 6px', borderRadius: 10 },
    filters: { display: 'flex', gap: 12 },
    searchWrap: { display: 'flex', alignItems: 'center', gap: 8, background: '#FFF', border: '1px solid #E2E8F0', padding: '8px 12px', borderRadius: 10 },
    searchInput: { border: 'none', outline: 'none', fontSize: '0.9rem' },
    select: { padding: '8px 12px', borderRadius: 10, border: '1px solid #E2E8F0', background: '#FFF', outline: 'none' },
    
    tableCard: { background: '#FFF', borderRadius: 20, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 4px 6px -2px rgba(0,0,0,0.05)' },
    table: { width: '100%', borderCollapse: 'collapse' },
    emptyRow: { padding: 40, textAlign: 'center', color: '#94A3B8' },
    tagProp: { background: '#EFF6FF', color: '#2563EB', padding: '4px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700 },
    tagLPJ: { background: '#FDF2F8', color: '#DB2777', padding: '4px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700 },
    tagDiv: { background: '#F1F5F9', color: '#475569', padding: '4px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600 },
    rowTitle: { fontWeight: 700, color: '#0F172A', marginTop: 4 },
    metaInfo: { display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: '#64748B', marginTop: 4 },
    trackerGrid: { display: 'flex', gap: 12 },
    trackerItem: { display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 600, color: '#475569' },
    btnAction: { background: '#FFF', border: '1px solid #E2E8F0', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#0F172A', transition: 'background 0.2s' },
    statusExternal: { fontSize:'0.7rem', color:'#D97706', marginTop:4, display:'flex', alignItems:'center', gap:4, fontWeight:600 },

    // Modal
    modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modalContent: { background: '#FFF', width: '95%', maxWidth: 1100, height: '90vh', borderRadius: 24, display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' },
    modalHeader: { padding: '24px 32px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    modalTitle: { margin: 0, fontSize: '1.4rem', fontWeight: 800 },
    modalSub: { margin: '4px 0 0', color: '#64748B' },
    closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' },
    tabContainer: { display: 'flex', padding: '0 32px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' },
    modalGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1, overflow: 'hidden' }, // Split View 50:50
    modalLeft: { background: '#F8FAFC', padding: 24, borderRight: '1px solid #E2E8F0', overflowY: 'auto' },
    modalRight: { padding: 32, overflowY: 'auto' },
    sectionTitle: { display: 'flex', alignItems: 'center', gap: 8, fontSize: '1rem', fontWeight: 700, marginBottom: 16 },
    infoText: { fontSize: '0.85rem', color: '#64748B', marginBottom: 16, lineHeight: 1.5 },
    
    // Docs
    docList: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 },
    docItem: { display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 16px', background: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0' },
    docIcon: { background: '#EFF6FF', padding: 10, borderRadius: 10 },
    docName: { fontWeight: 600, fontSize: '0.9rem' },
    docType: { fontSize: '0.75rem', color: '#64748B' },
    versionBadge: { background: '#FEF3C7', color: '#D97706', fontSize: '0.7rem', padding: '2px 6px', borderRadius: 8, fontWeight: 700 },
    btnSmall: { fontSize: '0.75rem', color: '#2563EB', textDecoration: 'none', fontWeight: 600, border: '1px solid #BFDBFE', padding: '4px 8px', borderRadius: 6, display:'inline-flex', alignItems:'center', gap:4 },
    historyDropdown: { width: '100%', marginTop: 8, paddingTop: 8, borderTop: '1px dashed #E2E8F0', paddingLeft: 8 },
    histHeaderTitle: { fontSize:'0.7rem', fontWeight:700, color:'#94A3B8', marginBottom:6 },
    histLink: { fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#64748B', alignItems:'center' },
    
    // Budget
    budgetCard: { background: '#FFF', padding: 16, borderRadius: 12, border: '1px solid #E2E8F0', marginTop: 24 },
    budgetTitle: { margin: '0 0 12px', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: '#334155' },
    budgetRow: { display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 8 },
    dashLine: { margin: '8px 0', border: 'none', borderTop: '1px dashed #CBD5E1' },
    
    // Action Panel
    actionCard: { background: '#FFF', padding: 24, borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
    label: { display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 8 },
    textarea: { width: '100%', padding: 12, borderRadius: 12, border: '1px solid #CBD5E1', fontSize: '0.9rem', marginBottom: 16, outline: 'none' },
    uploadArea: { border: '1px dashed #CBD5E1', padding: 12, borderRadius: 12, background: '#F8FAFC', marginBottom: 16 },
    btnGrid: { display: 'flex', gap: 12 },
    btnApprove: { flex: 1, padding: 14, background: '#16A34A', color: '#FFF', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer' },
    btnReject: { flex: 1, padding: 14, background: '#FFF', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 12, fontWeight: 700, cursor: 'pointer' },
    statusBadgeBlue: { background: '#EFF6FF', color: '#2563EB', padding: '2px 8px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 700, marginLeft: 6 },
    statusBadgeRed: { background: '#FEF2F2', color: '#DC2626', padding: '2px 8px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 700, marginLeft: 6 },
    infoBoxSuccess: { background: '#F0FDF4', border: '1px solid #BBF7D0', padding: 16, borderRadius: 12, display: 'flex', gap: 12, alignItems: 'center', color: '#166534', fontSize: '0.85rem' },

    // Chat & Timeline (Same as User)
    chatContainer: { display: 'flex', flexDirection: 'column', height: '100%' },
    chatWindow: { flex: 1, overflowY: 'auto', padding: 16, background: '#F8FAFC', borderRadius: 12, marginBottom: 12, border: '1px solid #E2E8F0', minHeight: 300 },
    chatInputArea: { display: 'flex', gap: 8 },
    chatInput: { flex: 1, padding: '10px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: '0.9rem' },
    chatSendBtn: { background: '#2563EB', color: '#FFF', border: 'none', padding: '0 16px', borderRadius: 10, cursor: 'pointer' },
    emptyState: { textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem', marginTop: 100 },
    timeline: { paddingLeft: 8 },
    tlItem: { position: 'relative', paddingLeft: 24, paddingBottom: 24, borderLeft: '2px solid #E2E8F0' },
    tlDot: { width: 12, height: 12, borderRadius: '50%', position: 'absolute', left: -7, top: 0, border: '2px solid #FFF' },
    tlHeader: { fontSize: '0.8rem', color: '#64748B' },
    tlAction: { fontWeight: 700, color: '#0F172A', marginTop: 2 },
    tlNote: { marginTop: 6, background: '#F1F5F9', padding: 8, borderRadius: 8, fontSize: '0.8rem', fontStyle: 'italic' },
    linkSmall: { display: 'inline-block', marginTop: 4, color: '#2563EB', fontSize: '0.75rem', textDecoration: 'none', fontWeight: 600 }
};

export default VerifikasiInternal;