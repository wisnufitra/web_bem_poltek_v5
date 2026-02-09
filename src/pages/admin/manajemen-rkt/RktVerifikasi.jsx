// src/pages/admin/manajemen-rkt/RktVerifikasi.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../../firebase/firebaseConfig';
import { 
    collection, query, where, onSnapshot, doc, updateDoc, arrayUnion 
} from 'firebase/firestore';
import { uploadToGoogleDrive } from '../../../utils/driveUpload';
import { useAdmin } from '../../../layouts/AdminLayout';
import { 
    FileText, CheckCircle, XCircle, Clock, AlertCircle, 
    Search, ExternalLink, Eye, UploadCloud,
    MessageSquare, History, FileOutput, DollarSign, Paperclip, 
    Tag, Download, ChevronRight, TrendingDown
} from 'lucide-react';

// --- COMPONENT TOAST (Sama seperti di Pengajuan) ---
const Toast = ({ message, type, onClose }) => {
    useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
    const bg = type === 'error' ? '#ef4444' : '#10b981';
    return (
        <div style={{ position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)', backgroundColor: bg, color: 'white', padding: '12px 24px', borderRadius: 50, zIndex: 10000, boxShadow: '0 10px 30px rgba(0,0,0,0.2)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10, animation: 'slideUp 0.3s ease' }}>
            {type === 'error' ? <XCircle size={20}/> : <CheckCircle size={20}/>} {message}
        </div>
    );
};

const RktVerifikasi = () => {
    const { profil, sysConfig, activeRole } = useAdmin();
    const periodeAktif = sysConfig?.activePeriod || "2025/2026";
    
    // --- STATE ---
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [toast, setToast] = useState(null); // State Notifikasi

    // Modal & Form
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState(1);
    const [selectedItem, setSelectedItem] = useState(null);
    const [reviewingRole, setReviewingRole] = useState(null);
    
    const [reviewNote, setReviewNote] = useState('');
    const [quickTags, setQuickTags] = useState([]);
    const [feedbackFile, setFeedbackFile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [budgetInput, setBudgetInput] = useState('');

    // --- HELPERS ---
    const showToast = (msg, type = 'success') => setToast({ msg, type });

    const formatDate = (dateVal) => {
        if (!dateVal) return '-';
        try {
            let date;
            if (dateVal?.seconds) date = new Date(dateVal.seconds * 1000);
            else date = new Date(dateVal);
            if (isNaN(date.getTime())) return '-';
            return date.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
        } catch (e) { return '-'; }
    };

    const formatRp = (num) => new Intl.NumberFormat('id-ID').format(num);

    const handleBudgetChange = (e) => {
        const raw = e.target.value.replace(/\D/g, '');
        setBudgetInput(raw ? formatRp(raw) : '');
    };

    // --- 1. SMART PERMISSION ENGINE ---
    const myPermissions = useMemo(() => {
        const roles = profil?.assignments || [];
        const perms = { bem_dagri: false, bem_sekjen: false, bem_bendahara: false, dpm_banggar: false };
        if (profil.role_global === 'master') return { bem_dagri: true, bem_sekjen: true, bem_bendahara: true, dpm_banggar: true };
        roles.forEach(r => {
            if (r.entity_id === 'bem_pusat') {
                if (['Inti', 'Pengurus Harian'].includes(r.division)) { perms.bem_dagri = true; perms.bem_sekjen = true; perms.bem_bendahara = true; }
                if (r.division === 'Kementerian Dalam Negeri') perms.bem_dagri = true;
                if (r.division === 'Sekretariat Jenderal') perms.bem_sekjen = true;
                if (r.division === 'Kementerian Keuangan') perms.bem_bendahara = true;
            }
            if (r.entity_id === 'dpm_pusat') {
                if (['Inti', 'Pimpinan', 'Badan Anggaran'].includes(r.division)) perms.dpm_banggar = true;
            }
        });
        return perms;
    }, [profil]);

    // --- 2. FETCH DATA ---
    useEffect(() => {
        const q = query(collection(db, 'rkt_submissions'), where('periode', '==', periodeAktif));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            list.sort((a, b) => {
                if (a.status === 'PENDING_REVIEW' && b.status !== 'PENDING_REVIEW') return -1;
                if (a.status !== 'PENDING_REVIEW' && b.status === 'PENDING_REVIEW') return 1;
                const dateA = a.uploadedAt?.seconds || new Date(a.uploadedAt).getTime();
                const dateB = b.uploadedAt?.seconds || new Date(b.uploadedAt).getTime();
                return dateB - dateA;
            });
            setSubmissions(list);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [periodeAktif]);

    const filteredList = useMemo(() => {
        return submissions.filter(item => {
            const matchSearch = item.orgName.toLowerCase().includes(searchTerm.toLowerCase());
            const matchFilter = filterStatus === 'ALL' || item.status === filterStatus;
            return matchSearch && matchFilter;
        });
    }, [submissions, searchTerm, filterStatus]);

    // --- ACTIONS ---
    const openReviewModal = (item, roleKey) => {
        setSelectedItem(item);
        setReviewingRole(roleKey);
        setReviewNote(item.approvals[roleKey]?.note || '');
        
        // Load budget existing & format
        const existingBudget = item.approvals[roleKey]?.nominal;
        setBudgetInput(existingBudget ? formatRp(existingBudget) : '');
        
        setQuickTags([]);
        setFeedbackFile(null);
        setActiveTab(1);
        setIsModalOpen(true);
    };

    const handleTagClick = (tag) => {
        if (quickTags.includes(tag)) setQuickTags(quickTags.filter(t => t !== tag));
        else setQuickTags([...quickTags, tag]);
    };

    const handleSubmitReview = async (decision) => {
        if (decision === 'REJECTED' && !reviewNote.trim() && quickTags.length === 0) {
            return showToast("Wajib memberikan catatan atau tag alasan jika menolak!", "error");
        }

        const isFinanceRole = reviewingRole === 'bem_bendahara' || reviewingRole === 'dpm_banggar';
        const nominalValue = parseInt(budgetInput.replace(/\./g, '')) || 0;

        if (decision === 'APPROVED' && isFinanceRole && nominalValue <= 0) {
            return showToast("Wajib memasukkan Nominal Anggaran yang disetujui!", "error");
        }

        setIsProcessing(true);
        try {
            let feedbackUrl = null;
            if (feedbackFile) {
                const folder = [periodeAktif.replace('/', '-'), selectedItem.orgName, "Feedback Reviewer"];
                const newFileName = `FEEDBACK_${getRoleLabel(reviewingRole)}_${selectedItem.orgName}_${Date.now()}.pdf`;
                const renamedFile = new File([feedbackFile], newFileName, { type: feedbackFile.type });
                feedbackUrl = await uploadToGoogleDrive(renamedFile, folder);
            }

            const docRef = doc(db, 'rkt_submissions', selectedItem.id);
            const now = new Date().toISOString();
            
            const finalNote = [
                quickTags.length > 0 ? `[TAGS: ${quickTags.join(', ')}]` : '',
                reviewNote
            ].filter(Boolean).join('\n');

            const updates = {
                [`approvals.${reviewingRole}.status`]: decision,
                [`approvals.${reviewingRole}.note`]: finalNote,
                [`approvals.${reviewingRole}.reviewedAt`]: now,
                [`approvals.${reviewingRole}.reviewerName`]: profil.namaTampilan,
                [`approvals.${reviewingRole}.feedbackUrl`]: feedbackUrl,
                [`approvals.${reviewingRole}.nominal`]: isFinanceRole ? nominalValue : null
            };

            if (decision === 'APPROVED' && reviewingRole === 'dpm_banggar') {
                updates.finalBudgetLimit = nominalValue;
            }

            const currentApprovals = { ...selectedItem.approvals };
            currentApprovals[reviewingRole] = { status: decision };

            const allRoles = ['bem_dagri', 'bem_sekjen', 'bem_bendahara', 'dpm_banggar'];
            const isAllApproved = allRoles.every(r => currentApprovals[r]?.status === 'APPROVED');

            if (isAllApproved) {
                updates.status = 'APPROVED';
                updates.history = arrayUnion({
                    action: 'SYSTEM_FULL_APPROVAL', actor: 'SISTEM', role: 'Automatic',
                    timestamp: now, note: 'Seluruh reviewer telah menyetujui. RKT Disahkan.',
                    version: selectedItem.currentVersion
                });
            } else if (decision === 'REJECTED') {
                updates.status = 'PENDING_REVIEW';
            }

            updates.history = arrayUnion({
                action: decision === 'APPROVED' ? 'REVIEW_APPROVE' : 'REVIEW_REJECT',
                actor: profil.namaTampilan,
                role: getRoleLabel(reviewingRole),
                timestamp: now,
                note: finalNote,
                version: selectedItem.currentVersion,
                nominal: nominalValue,
                attachmentUrl: feedbackUrl
            });

            await updateDoc(docRef, updates);
            showToast("Review berhasil disimpan!");
            setIsModalOpen(false);
            
        } catch (error) {
            console.error(error);
            showToast("Error: " + error.message, "error");
        } finally {
            setIsProcessing(false);
        }
    };

    const getRoleLabel = (key) => {
        const labels = {
            'bem_dagri': 'Kemendagri',
            'bem_sekjen': 'Sekjen BEM',
            'bem_bendahara': 'Bendahara BEM',
            'dpm_banggar': 'Banggar DPM'
        };
        return labels[key] || key;
    };

    // --- UI COMPONENTS ---
    const StatusCell = ({ item, roleKey }) => {
        const statusData = item.approvals[roleKey];
        const canEdit = myPermissions[roleKey];
        const status = statusData?.status || 'WAITING';
        
        let style = { bg: '#f1f5f9', color: '#64748b', icon: <Clock size={14}/> };
        if (status === 'APPROVED') style = { bg: '#dcfce7', color: '#166534', icon: <CheckCircle size={14}/> };
        if (status === 'REJECTED') style = { bg: '#fee2e2', color: '#991b1b', icon: <XCircle size={14}/> };

        return (
            <div style={{display: 'flex', justifyContent: 'center'}}>
                {status === 'WAITING' && canEdit ? (
                    <button onClick={() => openReviewModal(item, roleKey)} style={styles.actionBtn}>Review</button>
                ) : (
                    <div onClick={() => canEdit && openReviewModal(item, roleKey)} 
                         style={{...styles.statusBadge, background: style.bg, color: style.color, cursor: canEdit ? 'pointer' : 'default'}}>
                        {style.icon} <span style={{fontSize: '0.75rem'}}>{status === 'WAITING' ? 'Waiting' : status}</span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={styles.container}>
            {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
            
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>Verifikasi Proposal</h1>
                    <p style={styles.subtitle}>Periode {periodeAktif}</p>
                </div>
                <div style={styles.legendBox}>
                    <small>Akses Anda:</small>
                    <div style={{display: 'flex', gap: 8, marginTop: 4}}>
                        {Object.entries(myPermissions).map(([key, has]) => has && <span key={key} style={styles.permBadge}>{getRoleLabel(key)}</span>)}
                    </div>
                </div>
            </div>

            <div style={styles.controls}>
                <div style={styles.searchBox}>
                    <Search size={18} color="#94a3b8"/>
                    <input placeholder="Cari Organisasi..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={styles.searchInput}/>
                </div>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={styles.filterSelect}>
                    <option value="ALL">Semua Status</option>
                    <option value="PENDING_REVIEW">Menunggu Review</option>
                    <option value="APPROVED">Disetujui</option>
                </select>
            </div>

            <div style={styles.tableCard}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={{width:'25%'}}>ORGANISASI & FILE</th>
                            <th className="text-center" width="8%">VERSI</th>
                            <th className="text-center" width="15%">DAGRI</th>
                            <th className="text-center" width="15%">SEKJEN</th>
                            <th className="text-center" width="15%">BENDAHARA</th>
                            <th className="text-center" width="15%">BANGGAR</th>
                            <th className="text-center" width="7%">STATUS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredList.map(item => {
                            const latestVersion = item.versions?.[item.versions.length - 1];
                            const displayDate = item.uploadedAt || latestVersion?.uploadedAt;
                            return (
                                <tr key={item.id}>
                                    <td>
                                        <div style={{fontWeight: 700}}>{item.orgName}</div>
                                        <div style={styles.dateMeta}>
                                            <Clock size={12}/> {formatDate(displayDate)}
                                        </div>
                                        {/* Tampilkan Anggaran Diajukan di Tabel */}
                                        {item.proposedBudgetTotal && (
                                            <div style={styles.moneyMeta}>
                                                <DollarSign size={12}/> Ajuan: Rp {formatRp(item.proposedBudgetTotal)}
                                            </div>
                                        )}
                                        <a href={item.currentFileUrl} target="_blank" rel="noreferrer" style={styles.linkFile}><FileText size={12}/> Lihat File</a>
                                    </td>
                                    <td className="text-center"><span style={styles.versionBadge}>V{item.currentVersion || 1}</span></td>
                                    <td><StatusCell item={item} roleKey="bem_dagri"/></td>
                                    <td><StatusCell item={item} roleKey="bem_sekjen"/></td>
                                    <td><StatusCell item={item} roleKey="bem_bendahara"/></td>
                                    <td><StatusCell item={item} roleKey="dpm_banggar"/></td>
                                    <td className="text-center">
                                        {item.status === 'APPROVED' ? <CheckCircle size={20} color="#10b981"/> : 
                                         Object.values(item.approvals).some(x => x.status === 'REJECTED') ? <AlertCircle size={20} color="#ef4444"/> : 
                                         <div style={styles.dotPending}></div>}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* MODAL COCKPIT */}
            {isModalOpen && selectedItem && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalBox}>
                        <div style={styles.modalHeader}>
                            <div>
                                <h3 style={{margin: 0}}>Review Proposal: {selectedItem.orgName}</h3>
                                <span style={styles.versionTag}>Versi Aktif: V{selectedItem.currentVersion || 1}</span>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} style={styles.closeBtn}><XCircle size={24}/></button>
                        </div>

                        <div style={styles.modalGrid}>
                            {/* KIRI: FILE HISTORY & INFO ANGGARAN */}
                            <div style={styles.leftPanel}>
                                
                                {/* 1. Highlight Anggaran */}
                                <div style={styles.budgetHighlightCard}>
                                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                                        <div>
                                            <div style={styles.budgetLabel}>Diajukan (Proposal)</div>
                                            <div style={styles.budgetValue}>{selectedItem.proposedBudgetTotal ? `Rp ${formatRp(selectedItem.proposedBudgetTotal)}` : '-'}</div>
                                        </div>
                                        {selectedItem.finalBudgetLimit && (
                                            <div style={{textAlign:'right'}}>
                                                <div style={styles.budgetLabel}>Disetujui (Banggar)</div>
                                                <div style={{...styles.budgetValue, color: '#166534'}}>Rp {formatRp(selectedItem.finalBudgetLimit)}</div>
                                            </div>
                                        )}
                                    </div>
                                    {selectedItem.proposedBudgetTotal && selectedItem.finalBudgetLimit && selectedItem.finalBudgetLimit < selectedItem.proposedBudgetTotal && (
                                        <div style={styles.budgetDiff}>
                                            <TrendingDown size={14}/> Selisih: - Rp {formatRp(selectedItem.proposedBudgetTotal - selectedItem.finalBudgetLimit)}
                                        </div>
                                    )}
                                </div>

                                <div style={styles.pdfCard}>
                                    <FileText size={40} color="#3b82f6"/>
                                    <p>File Dokumen Aktif (V{selectedItem.currentVersion})</p>
                                    <a href={selectedItem.currentFileUrl} target="_blank" rel="noreferrer" style={styles.bigFileBtn}>
                                        <Eye size={18}/> Buka Dokumen Utama
                                    </a>
                                </div>

                                {/* FITUR BARU: RIWAYAT FILE REVISI */}
                                <div style={{marginTop: 24}}>
                                    <label style={styles.label}><History size={14}/> Riwayat File Revisi</label>
                                    <div style={styles.versionList}>
                                        {[...selectedItem.versions].reverse().map((ver, idx) => (
                                            <div key={idx} style={styles.versionItem}>
                                                <div style={styles.verIcon}>V{ver.versionNumber}</div>
                                                <div style={{flex: 1}}>
                                                    <div style={{fontSize:'0.8rem', fontWeight:600}}>{ver.fileName}</div>
                                                    <div style={{fontSize:'0.7rem', color:'#64748b'}}>
                                                        {formatDate(ver.uploadedAt)} • {ver.uploadedBy}
                                                    </div>
                                                </div>
                                                <a href={ver.fileUrl} target="_blank" rel="noreferrer" style={styles.smallIconBtn} title="Download">
                                                    <Download size={14}/>
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div style={styles.changeLogBox}>
                                    <strong>Catatan Perubahan User (V{selectedItem.currentVersion}):</strong>
                                    <p>"{selectedItem.versions?.[(selectedItem.versions?.length || 1) - 1]?.changeLog || 'Pengajuan Awal'}"</p>
                                </div>
                            </div>

                            {/* KANAN: ACTION & LOGS */}
                            <div style={styles.rightPanel}>
                                <div style={styles.tabs}>
                                    <button onClick={() => setActiveTab(1)} style={activeTab === 1 ? styles.tabActive : styles.tab}>Keputusan</button>
                                    <button onClick={() => setActiveTab(2)} style={activeTab === 2 ? styles.tabActive : styles.tab}>Status Rekan</button>
                                    <button onClick={() => setActiveTab(3)} style={activeTab === 3 ? styles.tabActive : styles.tab}>Log Detail</button>
                                </div>

                                <div style={styles.tabContent}>
                                    {activeTab === 1 && (
                                        <>
                                            <div style={styles.roleBanner}>
                                                Anda login sebagai: <strong>{getRoleLabel(reviewingRole)}</strong>
                                            </div>
                                            
                                            <div style={{marginBottom: 16}}>
                                                <label style={styles.label}>1. Quick Tags</label>
                                                <div style={{display:'flex', flexWrap:'wrap', gap: 8, marginTop: 8}}>
                                                    {['Format Salah', 'RAB Tidak Wajar', 'Typo/Ejaan', 'Tanda Tangan Kurang', 'Konten Tidak Sesuai'].map(tag => (
                                                        <button key={tag} onClick={() => handleTagClick(tag)} style={quickTags.includes(tag) ? styles.tagActive : styles.tag}>{tag}</button>
                                                    ))}
                                                </div>
                                            </div>
                                            
                                            {(reviewingRole === 'bem_bendahara' || reviewingRole === 'dpm_banggar') && (
                                                <div style={{marginBottom: 16, background: '#f0fdf4', padding: 12, borderRadius: 8, border: '1px solid #bbf7d0'}}>
                                                    <label style={{...styles.label, color: '#166534'}}>
                                                        {reviewingRole === 'dpm_banggar' ? 'Penetapan Pagu Anggaran (Final)' : 'Rekomendasi Anggaran'}
                                                    </label>
                                                    {reviewingRole === 'dpm_banggar' && selectedItem.approvals.bem_bendahara?.nominal && (
                                                        <div style={{fontSize: '0.8rem', color: '#166534', marginBottom: 8}}>
                                                            💡 Saran Kemenkeu: <strong>Rp {formatRp(selectedItem.approvals.bem_bendahara.nominal)}</strong>
                                                        </div>
                                                    )}
                                                    <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                                                        <span style={{fontWeight: 700, color: '#166534'}}>Rp</span>
                                                        <input 
                                                            type="text" 
                                                            style={{...styles.input, fontWeight: 700}} 
                                                            placeholder="0"
                                                            value={budgetInput}
                                                            onChange={handleBudgetChange}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            <div style={{marginBottom: 16}}>
                                                <label style={styles.label}>2. Catatan Detail</label>
                                                <textarea rows={3} style={styles.textArea} placeholder="Tulis masukan spesifik..." value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} />
                                            </div>

                                            <div style={{marginBottom: 24}}>
                                                <label style={styles.label}>3. Upload Coretan (Opsional)</label>
                                                <div style={styles.fileUploadBox}>
                                                    <input type="file" accept="application/pdf,image/*" onChange={(e) => setFeedbackFile(e.target.files[0])} style={{display:'none'}} id="feedbackFile"/>
                                                    <label htmlFor="feedbackFile" style={{cursor:'pointer', display:'flex', alignItems:'center', gap: 8, fontSize: '0.9rem'}}>
                                                        <UploadCloud size={18} color="#2563eb"/> 
                                                        {feedbackFile ? feedbackFile.name : 'Klik untuk upload file balikan'}
                                                    </label>
                                                </div>
                                            </div>

                                            <div style={{display:'flex', gap: 12}}>
                                                <button onClick={() => handleSubmitReview('REJECTED')} disabled={isProcessing} style={styles.btnReject}>{isProcessing ? '...' : '❌ Tolak / Revisi'}</button>
                                                <button onClick={() => handleSubmitReview('APPROVED')} disabled={isProcessing} style={styles.btnApprove}>{isProcessing ? '...' : '✅ Setujui (Approve)'}</button>
                                            </div>
                                        </>
                                    )}

                                    {activeTab === 2 && (
                                        <div style={{display:'flex', flexDirection:'column', gap: 12}}>
                                            {['bem_dagri', 'bem_sekjen', 'bem_bendahara', 'dpm_banggar'].map(role => {
                                                const data = selectedItem.approvals[role];
                                                return (
                                                    <div key={role} style={styles.peerCard}>
                                                        <div style={{display:'flex', justifyContent:'space-between'}}>
                                                            <strong>{getRoleLabel(role)}</strong>
                                                            <span style={{color: data.status === 'APPROVED' ? '#166534' : data.status === 'REJECTED' ? '#991b1b' : '#94a3b8', fontWeight: 700, fontSize: '0.8rem'}}>{data.status}</span>
                                                        </div>
                                                        {data.note && <div style={styles.peerNote}>"{data.note}"</div>}
                                                        {data.feedbackUrl && <a href={data.feedbackUrl} target="_blank" rel="noreferrer" style={styles.peerFileLink}><FileOutput size={12}/> File Balikan</a>}
                                                        <div style={{fontSize:'0.75rem', color: '#94a3b8', marginTop: 4}}>Oleh: {data.reviewerName || '-'} • {formatDate(data.reviewedAt)}</div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}

                                    {activeTab === 3 && (
                                        <div style={styles.logList}>
                                            {selectedItem.history?.slice().reverse().map((log, i) => (
                                                <div key={i} style={styles.logItem}>
                                                    <div style={{display:'flex', justifyContent:'space-between', marginBottom: 2}}>
                                                        <div style={{display:'flex', gap:6, alignItems:'center'}}>
                                                            <span style={{fontSize:'0.7rem', fontWeight:700, padding:'2px 6px', borderRadius:4, background: log.action.includes('APPROVE') ? '#dcfce7' : log.action.includes('REJECT') ? '#fee2e2' : '#e0f2fe', color: log.action.includes('APPROVE') ? '#166534' : log.action.includes('REJECT') ? '#991b1b' : '#0369a1'}}>{log.action}</span>
                                                            {log.version && <span style={{fontSize:'0.7rem', color:'#64748b', background:'#f1f5f9', padding:'2px 4px', borderRadius:4}}>V{log.version}</span>}
                                                        </div>
                                                        <span style={{fontSize:'0.7rem', color:'#94a3b8'}}>{formatDate(log.timestamp)}</span>
                                                    </div>
                                                    <div style={{fontSize:'0.8rem', color:'#64748b', fontWeight:600}}>{log.actor} <span style={{fontWeight:400}}>({log.role})</span></div>
                                                    {log.note && <div style={{fontSize:'0.8rem', marginTop: 4, fontStyle:'italic', background:'#f8fafc', padding:6, borderRadius:4}}>"{log.note}"</div>}
                                                    <div style={{display:'flex', gap:8, marginTop:6}}>
                                                        {log.nominal && <div style={styles.logTag}><DollarSign size={10}/> {formatRp(log.nominal)}</div>}
                                                        {log.attachmentUrl && <a href={log.attachmentUrl} target="_blank" rel="noreferrer" style={styles.logLink}><Paperclip size={10}/> Coretan</a>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
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
    container: { fontFamily: 'Inter, sans-serif', padding: '32px', color: '#1e293b', maxWidth: 1400, margin: '0 auto' },
    header: { marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    title: { fontSize: '1.8rem', fontWeight: 800, margin: 0, color: '#0f172a' },
    subtitle: { color: '#64748b', margin: 0 },
    legendBox: { textAlign: 'right' },
    permBadge: { background: '#dbeafe', color: '#1e40af', fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px', borderRadius: 20, border: '1px solid #bfdbfe' },
    
    controls: { display: 'flex', gap: 16, marginBottom: 20 },
    searchBox: { flex: 1, display: 'flex', alignItems: 'center', background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0 12px', maxWidth: 400 },
    searchInput: { border: 'none', padding: '10px', outline: 'none', width: '100%', fontSize: '0.9rem' },
    filterSelect: { padding: '0 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' },

    tableCard: { background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
    table: { width: '100%', borderCollapse: 'collapse' },
    dateMeta: { fontSize: '0.8rem', color: '#64748b', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 },
    moneyMeta: { fontSize: '0.75rem', color: '#059669', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, background: '#ecfdf5', width: 'fit-content', padding: '2px 6px', borderRadius: 4 },
    linkFile: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#2563eb', textDecoration: 'none', marginTop: 4, fontWeight: 500 },
    versionBadge: { background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700 },
    actionBtn: { background: '#2563eb', color: 'white', border: 'none', padding: '6px 16px', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)' },
    statusBadge: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600 },
    dotPending: { width: 8, height: 8, background: '#3b82f6', borderRadius: '50%', margin: '0 auto' },

    // MODAL STYLES
    modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' },
    modalBox: { background: 'white', width: '90%', maxWidth: 1100, height: '85vh', borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' },
    modalHeader: { padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' },
    versionTag: { background: '#e2e8f0', color: '#475569', fontSize: '0.75rem', padding: '2px 8px', borderRadius: 4, marginLeft: 8 },
    closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' },
    
    modalGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1, overflow: 'hidden' },
    leftPanel: { padding: 32, background: '#f1f5f9', borderRight: '1px solid #e2e8f0', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 },
    rightPanel: { display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    
    // Budget Card Highlight
    budgetHighlightCard: { background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, marginBottom: 20, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
    budgetLabel: { fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 },
    budgetValue: { fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginTop: 4 },
    budgetDiff: { marginTop: 10, paddingTop: 10, borderTop: '1px dashed #e2e8f0', fontSize: '0.8rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 },

    pdfCard: { background: 'white', padding: 24, borderRadius: 12, textAlign: 'center', border: '1px solid #e2e8f0' },
    bigFileBtn: { display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', background: '#2563eb', color: 'white', padding: '10px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, marginTop: 12, fontSize: '0.9rem' },
    changeLogBox: { background: '#fffbeb', border: '1px solid #fcd34d', padding: 12, borderRadius: 8, fontSize: '0.85rem', color: '#b45309' },

    versionList: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 },
    versionItem: { background: 'white', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 10 },
    verIcon: { width: 30, height: 30, background: '#e0e7ff', color: '#3730a3', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 },
    smallIconBtn: { padding: 6, borderRadius: 6, background: '#f1f5f9', color: '#64748b', cursor: 'pointer', display: 'flex' },

    tabs: { display: 'flex', borderBottom: '1px solid #f1f5f9' },
    tab: { flex: 1, padding: '16px', border: 'none', background: 'white', cursor: 'pointer', color: '#64748b', fontWeight: 600, borderBottom: '2px solid transparent' },
    tabActive: { flex: 1, padding: '16px', border: 'none', background: 'white', cursor: 'pointer', color: '#2563eb', fontWeight: 700, borderBottom: '2px solid #2563eb' },
    tabContent: { padding: 24, overflowY: 'auto', flex: 1 },

    roleBanner: { background: '#eff6ff', padding: '10px', borderRadius: 6, fontSize: '0.9rem', color: '#1e40af', marginBottom: 20, border: '1px solid #bfdbfe' },
    label: { display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: 8 },
    input: { padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e0', fontSize: '0.9rem', width: '100%' },
    tag: { padding: '6px 12px', borderRadius: 20, border: '1px solid #cbd5e0', background: 'white', color: '#475569', cursor: 'pointer', fontSize: '0.8rem' },
    tagActive: { padding: '6px 12px', borderRadius: 20, border: '1px solid #2563eb', background: '#eff6ff', color: '#2563eb', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 },
    textArea: { width: '100%', padding: '12px', borderRadius: 8, border: '1px solid #cbd5e0', boxSizing: 'border-box', fontFamily: 'inherit' },
    fileUploadBox: { border: '2px dashed #cbd5e0', padding: 16, borderRadius: 8, textAlign: 'center', background: '#f8fafc' },

    btnApprove: { background: '#10b981', color: 'white', border: 'none', padding: '12px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', flex: 1 },
    btnReject: { background: '#fff', color: '#ef4444', border: '1px solid #fecaca', padding: '12px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', flex: 1 },

    // Peer & Log
    peerCard: { padding: 12, border: '1px solid #e2e8f0', borderRadius: 8, background: '#fcfcfc' },
    peerNote: { fontSize: '0.85rem', color: '#334155', marginTop: 6, fontStyle: 'italic', background: '#f1f5f9', padding: 6, borderRadius: 4 },
    peerFileLink: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#2563eb', textDecoration: 'none', marginTop: 6, background: '#eff6ff', padding: '4px 8px', borderRadius: 4 },
    logList: { display: 'flex', flexDirection: 'column', gap: 12 },
    logItem: { borderLeft: '2px solid #e2e8f0', paddingLeft: 12, paddingBottom: 12 },
    logTag: { fontSize: '0.7rem', background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 },
    logLink: { fontSize: '0.7rem', background: '#eff6ff', color: '#2563eb', padding: '2px 6px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }
};

export default RktVerifikasi;