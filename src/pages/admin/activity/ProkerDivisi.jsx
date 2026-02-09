// src/pages/admin/activity/ProkerDivisi.jsx

import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../../firebase/firebaseConfig';
import { 
    collection, query, where, doc, setDoc, onSnapshot, updateDoc, arrayUnion 
} from 'firebase/firestore';
import { uploadToGoogleDrive } from '../../../utils/driveUpload';
import { useAdmin } from '../../../layouts/AdminLayout';
import { 
    Calendar, DollarSign, FileText, Loader2, AlertCircle, CheckCircle2, 
    Send, XCircle, Trash2, UploadCloud, FileOutput, AlertTriangle,
    LayoutDashboard, ChevronRight, Archive, Plus, Lock, 
    History, Clock, MessageSquare, ChevronDown, ChevronUp, RefreshCw, 
    TrendingUp, FileClock, ShieldCheck, Eye, Building2
} from 'lucide-react';

// --- UTILS ---
const cleanPayload = (obj) => {
    return Object.entries(obj).reduce((acc, [key, value]) => {
        if (value !== undefined) acc[key] = value;
        return acc;
    }, {});
};

const formatRp = (num) => "Rp " + new Intl.NumberFormat('id-ID').format(num || 0);
const parseRp = (str) => parseInt(str.replace(/\D/g, '')) || 0;

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
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', display: 'flex', alignItems: 'center', gap: 12, fontWeight: 600,
            animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
            {theme.icon} {message}
        </div>
    );
};

// 1. Visual Progress Stepper
const StatusStepper = ({ status }) => {
    const steps = [
        { label: 'Draft', keys: ['DRAFT'] },
        { label: 'Verifikasi Awal', keys: ['WAITING_INTERNAL', 'REVISION_INTERNAL', 'WAITING_EXTERNAL', 'WAITING_KM', 'REVISION_KM', 'SUBMITTED_TO_CAMPUS'] },
        { label: 'Pelaksanaan', keys: ['APPROVED', 'COMPLETED'] }, 
        { label: 'Audit Internal', keys: ['WAITING_REVIEW', 'REVISION_LPJ'] },
        { label: 'Audit Eksternal', keys: ['WAITING_KM_LPJ', 'REVISION_LPJ_EXTERNAL'] },
        { label: 'Selesai', keys: ['DONE'] }
    ];

    let activeIndex = 0;
    if (status) {
        const foundIndex = steps.findIndex(step => step.keys.includes(status));
        if (foundIndex !== -1) activeIndex = foundIndex;
        if (status === 'DONE') activeIndex = 5; 
    }

    return (
        <div style={styles.stepperContainer}>
             <div style={styles.stepperLine}></div>
            {steps.map((s, i) => {
                const isActive = i <= activeIndex;
                const isCurrent = i === activeIndex;
                const isError = status?.includes('REVISION') && isCurrent;
                
                return (
                    <div key={i} style={{...styles.stepItem, width: '16%'}}>
                        <div style={{
                            ...styles.stepDot,
                            background: isActive ? (isError ? '#EF4444' : (isCurrent ? '#2563EB' : '#10B981')) : '#F1F5F9',
                            borderColor: isActive ? (isError ? '#EF4444' : (isCurrent ? '#2563EB' : '#10B981')) : '#CBD5E1',
                            color: isActive ? '#FFF' : '#94A3B8'
                        }}>
                            {isActive && !isCurrent && !isError ? <CheckCircle2 size={14}/> : i + 1}
                        </div>
                        <div style={{
                            ...styles.stepLabel, 
                            color: isCurrent ? (isError ? '#DC2626' : '#1E293B') : '#94A3B8',
                            fontWeight: isCurrent ? 700 : 500
                        }}>
                            {s.label}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// 2. Chat Bubble & DocumentItem
const ChatBubble = ({ comment, isMe }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
        <div style={{ maxWidth: '85%', padding: '10px 14px', borderRadius: 12, fontSize: '0.9rem', lineHeight: 1.4, background: isMe ? '#EFF6FF' : '#F1F5F9', color: isMe ? '#1E3A8A' : '#334155', borderBottomRightRadius: isMe ? 2 : 12, borderBottomLeftRadius: isMe ? 12 : 2 }}>
            <div style={{fontWeight: 700, fontSize: '0.7rem', marginBottom: 4, color: isMe ? '#2563EB' : '#64748B', textTransform:'uppercase'}}>{comment.role} • {comment.sender}</div>
            {comment.text}
        </div>
        <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: 4 }}>{new Date(comment.timestamp).toLocaleString('id-ID', {hour: '2-digit', minute:'2-digit', day:'numeric', month:'short'})}</div>
    </div>
);

const DocumentItem = ({ doc, index, isEditable, onReplace, onDelete, onCancelReplace }) => {
    const [isOpen, setIsOpen] = useState(false);
    const isPending = !!doc.pendingFile;
    return (
        <div style={{ ...styles.docCard, border: isPending ? '1px dashed #D97706' : styles.docCard.border, background: isPending ? '#FFFBEB' : styles.docCard.background }}>
            <div style={{display:'flex', alignItems:'flex-start', gap:14}}>
                <div style={styles.docIcon}>{doc.type === 'LPJ_DOC' || doc.type === 'SPJ_DOC' ? <Archive size={20} color="#DB2777"/> : <FileText size={20} color="#2563EB"/>}</div>
                <div style={{flex:1}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <div style={styles.docName}>{doc.label}</div>
                        <div style={{display:'flex', gap:6}}>
                            {isPending && <span style={{background:'#D97706', color:'white', fontSize:'0.65rem', padding:'2px 8px', borderRadius:10, fontWeight:700}}>AKAN DI-UPDATE</span>}
                            {doc.history?.length > 0 && <span style={styles.versionBadge}>v{doc.history.length + 1}</span>}
                        </div>
                    </div>
                    <div style={styles.docMeta}>
                        <span style={{fontWeight:600}}>{doc.type}</span> • {isPending ? <span style={{color:'#D97706', fontWeight:700}}> File Baru: {doc.pendingFile.name}</span> : (doc.currentFile ? ` Diupload ${new Date(doc.currentFile.uploadedAt).toLocaleDateString('id-ID')}` : ' Belum ada file')}
                    </div>
                    <div style={{display:'flex', gap:8, marginTop:10, flexWrap:'wrap'}}>
                        {doc.currentFile && !isPending && <a href={doc.currentFile.url} target="_blank" rel="noreferrer" style={styles.btnSmall}><Eye size={14}/> Lihat File</a>}
                        {isEditable && (
                            <>
                                {isPending ? <button onClick={() => onCancelReplace(index)} style={styles.btnSmallRed}><XCircle size={14}/> Batal Ganti</button> : <label style={styles.btnSmallAction}><RefreshCw size={14}/> {doc.currentFile ? 'Upload Revisi' : 'Upload File'}<input type="file" hidden onChange={(e) => onReplace(index, e.target.files[0])} accept=".pdf"/></label>}
                                {!doc.currentFile && !doc.history?.length && <button onClick={() => onDelete(index)} style={styles.iconBtnDelete}><Trash2 size={16}/></button>}
                            </>
                        )}
                    </div>
                </div>
                {doc.history?.length > 0 && <button onClick={() => setIsOpen(!isOpen)} style={styles.iconBtn}>{isOpen ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}</button>}
            </div>
            {isOpen && doc.history?.length > 0 && (
                <div style={styles.historyDropdown}>
                    <div style={styles.histTitle}>Riwayat Versi Sebelumnya:</div>
                    {doc.history.map((h, idx) => (
                        <div key={idx} style={styles.histItem}>
                            <div style={{display:'flex', alignItems:'center', gap:6}}><FileClock size={14}/> <span>Versi {idx + 1}</span> <span style={{fontSize:'0.75rem', color:'#94A3B8'}}>({new Date(h.uploadedAt).toLocaleDateString()})</span></div>
                            <a href={h.url} target="_blank" rel="noreferrer" style={{color:'#2563EB', textDecoration:'none', fontWeight:600}}>Buka</a>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- MAIN COMPONENT ---

const ProkerDivisi = () => {
    const { profil, sysConfig, activeRole } = useAdmin();
    const myOrgId = activeRole?.entity_id;
    const myDivision = activeRole?.division;
    const myOrgName = activeRole?.entity_name;
    const periodeAktif = sysConfig?.activePeriod || "2025/2026";

    // State
    const [loading, setLoading] = useState(true);
    const [programs, setPrograms] = useState([]);
    const [activeProposals, setActiveProposals] = useState({});
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('PROPOSAL');
    const [selectedItem, setSelectedItem] = useState(null);
    const [toast, setToast] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [form, setForm] = useState({ description: '', budgetRequested: '' });
    const [docList, setDocList] = useState([]); // Dokumen Proposal
    const [lpjDocList, setLpjDocList] = useState([]); // [BARU] Dokumen LPJ
    const [lpjForm, setLpjForm] = useState({ realizedBudget: '' });
    const [chatMsg, setChatMsg] = useState('');
    const chatEndRef = useRef(null);

    // --- FETCH DATA ---
    useEffect(() => {
        if (!myOrgId || !myDivision) return;
        
        const qPrograms = query(collection(db, 'programs'), where('orgId', '==', myOrgId), where('periode', '==', periodeAktif), where('penanggungJawab', '==', myDivision));
        const qProposals = query(collection(db, 'activity_proposals'), where('orgId', '==', myOrgId), where('divisionName', '==', myDivision), where('periode', '==', periodeAktif));

        const unsub = onSnapshot(qPrograms, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            onSnapshot(qProposals, (snapP) => {
                const map = {};
                snapP.docs.forEach(d => map[d.data().programId] = { id: d.id, ...d.data() });
                setActiveProposals(map);
                setPrograms(list);
                setLoading(false);
            });
        });
        return () => unsub();
    }, [myOrgId, myDivision, periodeAktif]);

    const showToast = (msg, type = 'success') => setToast({ msg, type });

    const handleOpenModal = (program) => {
        const prop = activeProposals[program.id];
        
        const combinedData = { 
            ...program, ...prop, 
            programName: program.namaKegiatan,
            programId: prop?.programId || program.id, 
            rktId: prop?.rktId || program.rktId || null, 
            status: prop?.status || 'DRAFT' 
        };
        
        setSelectedItem(combinedData);

        // Setup Form Proposal
        setForm({
            description: prop?.description || program.deskripsi || '',
            budgetRequested: prop?.budgetRequested ? formatRp(prop.budgetRequested) : formatRp(program.estimasiBiaya),
        });

        // Setup Docs Proposal
        const rawDocs = prop?.documents || [];
        const normalizedDocs = rawDocs.map(d => ({
            label: d.label, type: d.type || 'Pendukung',
            currentFile: d.currentFile || (d.url ? { url: d.url, uploadedAt: d.uploadedAt, fileName: d.fileName } : null),
            history: d.history || [], pendingFile: null 
        }));
        if (normalizedDocs.length === 0) {
            normalizedDocs.push({ label: 'Proposal Kegiatan', type: 'PROPOSAL', history: [], currentFile: null });
            normalizedDocs.push({ label: 'RAB (Rencana Anggaran)', type: 'RAB', history: [], currentFile: null });
        }
        setDocList(normalizedDocs);

        // [BARU] Setup Docs LPJ (Ambil dari reporting.documents)
        // Kita gunakan struktur dokumen yang seragam
        const rawLpjDocs = prop?.reporting?.documents || [];
        let normalizedLpjDocs = rawLpjDocs.map(d => ({
            label: d.label, type: d.type,
            currentFile: d.currentFile, history: d.history || [], pendingFile: null
        }));

        // Jika belum ada dokumen LPJ (baru masuk fase LPJ), buat template
        if (normalizedLpjDocs.length === 0) {
            normalizedLpjDocs = [
                { label: 'LPJ Naratif (Laporan Kegiatan)', type: 'LPJ_DOC', history: [], currentFile: null },
                { label: 'SPJ Keuangan (Bukti Transaksi)', type: 'SPJ_DOC', history: [], currentFile: null }
            ];
        }
        setLpjDocList(normalizedLpjDocs);

        setLpjForm({ realizedBudget: prop?.reporting?.realizedBudget ? formatRp(prop.reporting.realizedBudget) : '' });

        // Smart Tab Logic
        if (prop?.status === 'COMPLETED' || prop?.status === 'WAITING_REVIEW' || prop?.status === 'REVISION_LPJ' || prop?.status === 'WAITING_KM_LPJ' || prop?.status === 'REVISION_LPJ_EXTERNAL' || prop?.status === 'DONE') {
            setActiveTab('LPJ');
        } else if (prop?.status === 'APPROVED' || prop?.status === 'SUBMITTED_TO_CAMPUS') {
            setActiveTab('DISPOSISI');
        } else {
            setActiveTab('PROPOSAL');
        }

        setIsModalOpen(true);
    };

    // --- LOGIC SUBMIT PROPOSAL ---
    const submitProposal = async (isDraft) => {
        if (!form.budgetRequested) return showToast("Anggaran wajib diisi!", "error");
        
        setIsSubmitting(true);
        try {
            const validProgramId = selectedItem.programId || selectedItem.id;
            const proposalId = selectedItem.id && selectedItem.id.startsWith('act_') ? selectedItem.id : `act_${validProgramId}`;
            const folder = [periodeAktif.replace('/','-'), myOrgName, myDivision, selectedItem.programName, "Pengajuan"];
            
            const processedDocs = await Promise.all(docList.map(async (docItem) => {
                if (docItem.pendingFile) {
                    const url = await uploadToGoogleDrive(docItem.pendingFile, folder);
                    const newFileObj = { url, uploadedAt: new Date().toISOString(), fileName: docItem.pendingFile.name, uploadedBy: profil.namaTampilan };
                    let newHistory = docItem.history || [];
                    if (docItem.currentFile) newHistory.push({ ...docItem.currentFile, archivedAt: new Date().toISOString() });
                    return { label: docItem.label, type: docItem.type, currentFile: newFileObj, history: newHistory, pendingFile: null };
                }
                return { label: docItem.label, type: docItem.type, currentFile: docItem.currentFile, history: docItem.history || [] };
            }));

            let newStatus = isDraft ? 'DRAFT' : 'WAITING_INTERNAL';
            if (!isDraft) {
                if (selectedItem.status === 'REVISION_INTERNAL') newStatus = 'WAITING_INTERNAL';
                else if (selectedItem.status === 'REVISION_KM') newStatus = 'WAITING_KM'; 
            }

            const isResubmit = !isDraft && selectedItem.status?.includes('REVISION');
            let resetData = {};
            if (!isDraft) {
                if (selectedItem.status === 'REVISION_INTERNAL') {
                    resetData = { 'approvals.internal.ketua.status': 'WAITING', 'approvals.internal.sekjen.status': 'WAITING', 'approvals.internal.bendahara.status': 'WAITING' };
                } else if (selectedItem.status === 'REVISION_KM') {
                    resetData = { 'approvalsKM.bem_dagri.status': 'WAITING', 'approvalsKM.bem_sekjen.status': 'WAITING', 'approvalsKM.bem_keu.status': 'WAITING', 'approvalsKM.dpm_banggar.status': 'WAITING' };
                }
            }

            const rawPayload = {
                id: proposalId, programId: validProgramId, rktId: selectedItem.rktId || null, 
                orgId: myOrgId, orgName: myOrgName, divisionName: myDivision, periode: periodeAktif,
                activityName: selectedItem.programName,
                dateDisplay: selectedItem.dateDisplay || selectedItem.tanggal || "-", 
                description: form.description || "", 
                budgetRequested: parseRp(form.budgetRequested),
                documents: processedDocs,
                status: newStatus,
                lastUpdated: new Date().toISOString(),
                ...resetData
            };

            const finalPayload = cleanPayload(rawPayload);
            await setDoc(doc(db, 'activity_proposals', proposalId), finalPayload, { merge: true });
            
            await updateDoc(doc(db, 'activity_proposals', proposalId), {
                history: arrayUnion({
                    action: isDraft ? 'DRAFT_SAVED' : 'SUBMIT_PROPOSAL',
                    actor: profil.namaTampilan, timestamp: new Date().toISOString(),
                    note: selectedItem.status === 'REVISION_KM' ? 'Mengirim perbaikan ke BEM/DPM.' : 'Mengirim pengajuan.'
                })
            });

            showToast(isDraft ? "Draft tersimpan" : "Pengajuan terkirim!");
            if (!isDraft) setIsModalOpen(false);

        } catch (e) { 
            console.error("Submit Error:", e);
            showToast("Gagal: " + e.message, "error"); 
        } finally { setIsSubmitting(false); }
    };

    // --- LOGIC SUBMIT LPJ (LENGKAP DENGAN UPLOAD) ---
    const submitLPJ = async () => {
        if (!lpjForm.realizedBudget) return showToast("Isi Realisasi Anggaran!", "error");
        
        // Cek minimal 1 file terupload
        const hasFile = lpjDocList.some(d => d.currentFile || d.pendingFile);
        if (!hasFile) return showToast("Wajib upload dokumen LPJ/SPJ!", "error");

        setIsSubmitting(true);
        try {
             const proposalId = selectedItem.id;
             const folder = [periodeAktif.replace('/','-'), myOrgName, "LPJ_Final", selectedItem.programName];

             // 1. Upload File LPJ (Sama logic dengan proposal)
             const processedLpjDocs = await Promise.all(lpjDocList.map(async (docItem) => {
                if (docItem.pendingFile) {
                    const url = await uploadToGoogleDrive(docItem.pendingFile, folder);
                    const newFileObj = { 
                        url, uploadedAt: new Date().toISOString(), 
                        fileName: docItem.pendingFile.name, uploadedBy: profil.namaTampilan 
                    };
                    let newHistory = docItem.history || [];
                    if (docItem.currentFile) newHistory.push({ ...docItem.currentFile, archivedAt: new Date().toISOString() });
                    
                    return { label: docItem.label, type: docItem.type, currentFile: newFileObj, history: newHistory, pendingFile: null };
                }
                return { label: docItem.label, type: docItem.type, currentFile: docItem.currentFile, history: docItem.history || [] };
             }));

             // 2. Logic Status
             const isExternalRevision = selectedItem.status === 'REVISION_LPJ_EXTERNAL';
             const nextStatus = isExternalRevision ? 'WAITING_KM_LPJ' : 'COMPLETED'; // COMPLETED disini = WAITING_INTERNAL untuk LPJ

             let resetData = {};
             if (isExternalRevision) {
                 resetData = { 
                     // Reset Approval Eksternal
                     'approvalsKM.bem_dagri.status': 'WAITING', 
                     'approvalsKM.bem_sekjen.status': 'WAITING',
                     'approvalsKM.bem_keu.status': 'WAITING',
                     'approvalsKM.dpm_banggar.status': 'WAITING'
                 };
             } else {
                 resetData = { 'reporting.status': 'WAITING_REVIEW' };
             }

             // 3. Simpan ke Firestore
             await updateDoc(doc(db, 'activity_proposals', proposalId), {
                 'reporting.realizedBudget': parseRp(lpjForm.realizedBudget),
                 'reporting.documents': processedLpjDocs, // Simpan array dokumen LPJ
                 ...resetData,
                 status: nextStatus,
                 history: arrayUnion({
                     action: 'LPJ_SUBMITTED',
                     actor: profil.namaTampilan,
                     timestamp: new Date().toISOString(),
                     note: isExternalRevision ? 'Mengirim perbaikan LPJ ke BEM/DPM' : 'Mengirim Laporan Akhir'
                 })
             });

             showToast("Laporan berhasil dikirim!");
             setIsModalOpen(false);
        } catch(e) { 
            console.error(e);
            showToast("Gagal upload LPJ: " + e.message, "error"); 
        } finally { setIsSubmitting(false); }
    };

    const sendComment = async () => {
        if (!chatMsg.trim()) return;
        try {
            await updateDoc(doc(db, 'activity_proposals', selectedItem.id), { 
                comments: arrayUnion({
                    id: Date.now().toString(), text: chatMsg, sender: profil.namaTampilan,
                    role: 'DIVISI', timestamp: new Date().toISOString()
                }) 
            });
            setChatMsg('');
        } catch (e) { showToast("Gagal kirim", "error"); }
    };

    const isEditable = !selectedItem?.status || [
        'DRAFT', 'REVISION_INTERNAL', 'REVISION_KM', 'REVISION_LPJ_EXTERNAL'
    ].includes(selectedItem.status);
    
    // Status di mana user bisa masuk ke tab LPJ, meskipun mungkin read-only
    const hasDisposition = ['APPROVED', 'COMPLETED', 'WAITING_KM_LPJ', 'REVISION_LPJ_EXTERNAL', 'DONE', 'SUBMITTED_TO_CAMPUS'].includes(selectedItem?.status);
    
    // Logic khusus: Apakah Form LPJ boleh diedit?
    // Boleh jika: Status == COMPLETED (awal upload) atau REVISION_LPJ (revisi internal) atau REVISION_LPJ_EXTERNAL (revisi eksternal)
    // Tidak boleh jika: WAITING_REVIEW (sedang dicek internal) atau WAITING_KM_LPJ (sedang dicek eksternal) atau DONE
    const isLpjEditable = ['COMPLETED', 'REVISION_LPJ', 'REVISION_LPJ_EXTERNAL'].includes(selectedItem?.status) || (selectedItem?.status === 'COMPLETED' && (!selectedItem.reporting?.status || selectedItem.reporting?.status === 'REVISION_LPJ'));
    
    const comments = selectedItem?.comments || [];
    
    useEffect(() => { if (activeTab === 'DISKUSI') chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [comments, activeTab]);

    if (loading) return <div style={styles.loadingContainer}><Loader2 className="spin" size={40} color="#2563EB"/></div>;

    return (
        <div style={styles.container}>
            {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
            <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { 100% { transform: rotate(360deg); } }`}</style>

            <header style={styles.header}>
                <div>
                    <h1 style={styles.title}>Program Kerja Divisi</h1>
                    <p style={styles.subtitle}>Kelola pengajuan dan laporan kegiatan • {periodeAktif}</p>
                </div>
            </header>

            <div style={styles.grid}>
                {programs.map(prog => {
                    const prop = activeProposals[prog.id];
                    const status = prop?.status || 'BELUM MULAI';
                    return (
                        <div key={prog.id} style={styles.card}>
                            <div style={styles.cardHeader}>
                                <span style={styles.catBadge}>{prog.kategori}</span>
                                <span style={{fontSize:'0.7rem', fontWeight:700, color: status.includes('REVISION') ? '#DC2626' : (status === 'APPROVED' || status === 'DONE' ? '#16A34A' : '#64748B')}}>
                                    {status.replace(/_/g, ' ')}
                                </span>
                            </div>
                            <h3 style={styles.cardTitle}>{prog.namaKegiatan}</h3>
                            <div style={styles.cardInfo}><Calendar size={14}/> {prog.dateDisplay}</div>
                            <button onClick={() => handleOpenModal(prog)} style={styles.btnCard}>
                                {status.includes('REVISION') ? 'Perbaiki Revisi' : (status !== 'BELUM MULAI' ? 'Lihat Detail' : 'Mulai Pengajuan')} <ChevronRight size={16}/>
                            </button>
                        </div>
                    );
                })}
            </div>

            {isModalOpen && selectedItem && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <div style={styles.modalHeader}>
                            <div><h2 style={styles.modalTitle}>{selectedItem.programName}</h2></div>
                            <button onClick={()=>setIsModalOpen(false)} style={styles.closeBtn}><XCircle size={24}/></button>
                        </div>
                        <div style={{padding:'0 24px'}}><StatusStepper status={selectedItem.status} /></div>
                        
                        <div style={styles.tabContainer}>
                            <button onClick={()=>setActiveTab('PROPOSAL')} style={activeTab === 'PROPOSAL' ? styles.tabActive : styles.tab}>1. Dokumen Pengajuan</button>
                            <button onClick={()=>setActiveTab('DISPOSISI')} disabled={!hasDisposition} style={activeTab === 'DISPOSISI' ? styles.tabActive : (!hasDisposition ? styles.tabDisabled : styles.tab)}>
                                2. Disposisi {!hasDisposition && <Lock size={12}/>}
                            </button>
                            <button onClick={()=>setActiveTab('DISKUSI')} style={activeTab === 'DISKUSI' ? styles.tabActive : styles.tab}>
                                Diskusi {comments.length > 0 && <span style={styles.badge}>{comments.length}</span>}
                            </button>
                            <button onClick={()=>setActiveTab('LPJ')} disabled={!hasDisposition} style={activeTab === 'LPJ' ? styles.tabActive : (!hasDisposition ? styles.tabDisabled : styles.tab)}>
                                3. LPJ Akhir {!hasDisposition && <Lock size={12}/>}
                            </button>
                            <button onClick={()=>setActiveTab('HISTORY')} style={activeTab === 'HISTORY' ? styles.tabActive : styles.tab}>Riwayat</button>
                        </div>

                        <div style={styles.modalBody}>
                            {activeTab === 'PROPOSAL' && (
                                <div style={styles.fadeIn}>
                                    {(selectedItem.status?.includes('REVISION') && !selectedItem.status.includes('LPJ')) && (
                                        <div style={styles.revisionBox}>
                                            <div style={{display:'flex', gap:12}}>
                                                <AlertTriangle size={24} color="#DC2626"/>
                                                <div>
                                                    <h4 style={{margin:0, color:'#991B1B'}}>
                                                        {selectedItem.status === 'REVISION_KM' ? 'Ditolak oleh BEM/DPM (Eksternal)' : 'Perbaikan Internal Diperlukan'}
                                                    </h4>
                                                    <p style={{fontSize:'0.9rem', color:'#7F1D1D', margin:'4px 0'}}>
                                                        {selectedItem.status === 'REVISION_KM' ? 'Proposal Anda dikembalikan oleh BEM/DPM.' : 'Proposal dikembalikan oleh verifikator internal.'} Cek detail di tab Riwayat.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div style={styles.formSection}>
                                        <label style={styles.label}>Deskripsi Kegiatan</label>
                                        <textarea rows={3} style={styles.textarea} disabled={!isEditable} value={form.description} onChange={e=>setForm({...form, description:e.target.value})}/>
                                        <label style={{...styles.label, marginTop:16}}>Estimasi Anggaran (RAB)</label>
                                        <input style={styles.input} disabled={!isEditable} value={form.budgetRequested} onChange={e=>setForm({...form, budgetRequested: formatRp(e.target.value.replace(/\D/g,''))})}/>
                                    </div>

                                    <div style={styles.section}>
                                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
                                            <h3 style={styles.sectionTitle}>Berkas Dokumen</h3>
                                            {isEditable && (
                                                <button onClick={() => setDocList([...docList, { label: 'Dokumen Tambahan', type: 'Pendukung', history: [] }])} style={styles.btnAdd}><Plus size={14}/> Tambah</button>
                                            )}
                                        </div>
                                        {docList.map((doc, i) => (
                                            <DocumentItem key={i} doc={doc} index={i} isEditable={isEditable}
                                                onReplace={(idx, file) => {const newDocs = [...docList]; newDocs[idx].pendingFile = file; setDocList(newDocs);}}
                                                onCancelReplace={(idx) => {const newDocs = [...docList]; newDocs[idx].pendingFile = null; setDocList(newDocs);}}
                                                onDelete={(idx) => {const newDocs = [...docList]; newDocs.splice(idx, 1); setDocList(newDocs);}}
                                            />
                                        ))}
                                    </div>

                                    {isEditable && (
                                        <div style={styles.actionRow}>
                                            <button onClick={()=>submitProposal(true)} disabled={isSubmitting} style={styles.btnSec}>Simpan Draft</button>
                                            <button onClick={()=>submitProposal(false)} disabled={isSubmitting} style={styles.btnPri}>
                                                {isSubmitting ? <Loader2 className="spin"/> : <Send size={16}/>} 
                                                {selectedItem.status?.includes('REVISION') ? 'Kirim Perbaikan' : 'Ajukan Sekarang'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'DISPOSISI' && (
                                <div style={styles.fadeIn}>
                                    <div style={styles.successBox}>
                                        <CheckCircle2 size={32} color="#166534"/>
                                        <div>
                                            <h3 style={{margin:0, color:'#14532D'}}>Pengajuan Disetujui</h3>
                                            <p style={{margin:'4px 0', fontSize:'0.9rem', color:'#166534'}}>Selamat! Kegiatan Anda telah disetujui. Silakan unduh dokumen legalitas.</p>
                                        </div>
                                    </div>
                                    <div style={styles.docList}>
                                        {selectedItem.dispositionDocuments?.map((doc, i) => (
                                            <a key={i} href={doc.url} target="_blank" rel="noreferrer" style={styles.dispCard}>
                                                <FileOutput size={24} color="#15803D"/>
                                                <div style={{flex:1}}><div style={{fontWeight:700, color:'#14532D'}}>{doc.note}</div><div style={{fontSize:'0.75rem', color:'#15803D'}}>Download</div></div>
                                                <ChevronRight size={16} color="#15803D"/>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'LPJ' && (
                                <div style={styles.splitView}>
                                    <div style={styles.splitLeft}>
                                        <div style={styles.splitHeader}><ShieldCheck size={16}/> Data Acuan (Disetujui)</div>
                                        <div style={{marginBottom:16}}><label style={styles.labelMini}>Total Anggaran Cair</label><div style={styles.valueBig}>{formatRp(selectedItem.budgetRequested)}</div></div>
                                        <label style={styles.labelMini}>Dokumen Proposal Final</label>
                                        <div style={{display:'flex', flexDirection:'column', gap:8}}>
                                            {docList.map((d, i) => d.currentFile && <a key={i} href={d.currentFile.url} target="_blank" style={styles.miniDocLink}><FileText size={14}/> {d.label}</a>)}
                                        </div>
                                    </div>
                                    <div style={styles.splitRight}>
                                        <div style={styles.splitHeader}><Archive size={16}/> Upload Laporan</div>
                                        
                                        {/* ALERT STATUS LPJ */}
                                        {selectedItem.status === 'REVISION_LPJ_EXTERNAL' && (
                                            <div style={{background:'#FEF2F2', border:'1px solid #FECACA', padding:16, borderRadius:12, marginBottom:16}}>
                                                <div style={{display:'flex', gap:10, alignItems:'center', color:'#991B1B', fontWeight:700, marginBottom:4}}><AlertTriangle size={18}/> Ditolak Eksternal</div>
                                                <p style={{fontSize:'0.85rem', color:'#7F1D1D', margin:0}}>LPJ dikembalikan oleh BEM/DPM. Silakan perbaiki data di bawah ini.</p>
                                            </div>
                                        )}
                                        {selectedItem.status === 'WAITING_KM_LPJ' ? (
                                            <div style={{background:'#FFF7ED', border:'1px solid #FDBA74', padding:16, borderRadius:12, marginBottom:16}}>
                                                <div style={{display:'flex', gap:10, alignItems:'center', color:'#9A3412', fontWeight:700, marginBottom:4}}><Clock size={18}/> Menunggu Verifikasi Eksternal</div>
                                                <p style={{fontSize:'0.85rem', color:'#C2410C', margin:0}}>Sedang dalam antrean verifikasi BEM/DPM.</p>
                                            </div>
                                        ) : selectedItem.status === 'DONE' ? (
                                            <div style={{background:'#F0FDF4', border:'1px solid #BBF7D0', padding:16, borderRadius:12, marginBottom:16}}>
                                                <div style={{display:'flex', gap:10, alignItems:'center', color:'#15803D', fontWeight:700}}><CheckCircle2 size={18}/> Laporan Selesai</div>
                                                <p style={{fontSize:'0.85rem', color:'#166534', margin:'4px 0 0'}}>Seluruh proses administrasi tuntas.</p>
                                            </div>
                                        ) : (
                                            <div style={{background:'#FFF', padding:16, borderRadius:12, border:'1px solid #E2E8F0'}}>
                                                <label style={styles.label}>Total Realisasi Dana (Terpakai)</label>
                                                <input style={styles.input} value={lpjForm.realizedBudget} onChange={e=>setLpjForm({...lpjForm, realizedBudget:formatRp(e.target.value.replace(/\D/g,''))})}
                                                    disabled={!isLpjEditable}
                                                />
                                                
                                                {/* [BARU] AREA UPLOAD FILE LPJ */}
                                                <div style={{marginTop:16}}>
                                                    <label style={styles.label}>Dokumen Laporan</label>
                                                    <div style={{marginBottom:16}}>
                                                        {lpjDocList.map((doc, i) => (
                                                            <DocumentItem key={i} doc={doc} index={i} isEditable={isLpjEditable}
                                                                onReplace={(idx, file) => {const newDocs = [...lpjDocList]; newDocs[idx].pendingFile = file; setLpjDocList(newDocs);}}
                                                                onCancelReplace={(idx) => {const newDocs = [...lpjDocList]; newDocs[idx].pendingFile = null; setLpjDocList(newDocs);}}
                                                                onDelete={(idx) => {const newDocs = [...lpjDocList]; newDocs.splice(idx, 1); setLpjDocList(newDocs);}}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>

                                                <div style={{marginTop:16}}>
                                                    {!isLpjEditable ? (
                                                        <div style={{textAlign:'center', color:'#64748B', fontSize:'0.9rem', fontStyle:'italic'}}>Sedang dalam proses verifikasi...</div>
                                                    ) : (
                                                        <button onClick={submitLPJ} disabled={isSubmitting} style={styles.btnFull}>{isSubmitting ? 'Mengirim...' : 'Kirim Laporan Akhir'}</button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'DISKUSI' && (
                                <div style={styles.chatContainer}>
                                    <div style={styles.chatWindow}>
                                        {comments.length === 0 && <div style={styles.emptyState}>Belum ada diskusi.</div>}
                                        {comments.map((c, i) => <ChatBubble key={i} comment={c} isMe={c.role === 'DIVISI'} />)}
                                        <div ref={chatEndRef} />
                                    </div>
                                    <div style={styles.chatInputArea}>
                                        <input style={styles.chatInput} placeholder="Tulis pesan..." value={chatMsg} onChange={e=>setChatMsg(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendComment()}/>
                                        <button onClick={sendComment} style={styles.chatSendBtn}><Send size={18}/></button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'HISTORY' && (
                                <div style={styles.historyList}>
                                    {selectedItem.history?.slice().reverse().map((log, i) => (
                                        <div key={i} style={styles.histLogItem}>
                                            <div style={styles.histLogHeader}><strong>{log.actor}</strong> • {new Date(log.timestamp).toLocaleString('id-ID')}</div>
                                            <div style={{fontWeight:600, color:'#334155'}}>{log.action.replace(/_/g, ' ')}</div>
                                            {log.note && <div style={styles.histLogNote}>"{log.note}"</div>}
                                            {log.attachmentUrl && <a href={log.attachmentUrl} target="_blank" rel="noreferrer" style={styles.btnSmallRed}><FileText size={12}/> Unduh File Coretan</a>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- STYLES (Clean & Consistent) ---
const styles = {
    container: { fontFamily: '"Plus Jakarta Sans", sans-serif', padding: '32px', maxWidth: 1280, margin: '0 auto', color: '#0F172A' },
    loadingContainer: { height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    header: { marginBottom: 32 },
    title: { fontSize: '1.8rem', fontWeight: 800, margin: 0 },
    subtitle: { color: '#64748B', margin: '4px 0 0' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 },
    card: { background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', padding: 20, display: 'flex', flexDirection: 'column', transition:'transform 0.2s', ':hover':{transform:'translateY(-2px)'} },
    cardHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: 12 },
    catBadge: { fontSize: '0.7rem', fontWeight: 700, background: '#F1F5F9', padding: '4px 8px', borderRadius: 6 },
    cardTitle: { fontSize: '1.1rem', fontWeight: 700, margin: '0 0 8px' },
    cardInfo: { fontSize: '0.85rem', color: '#64748B', marginBottom: 16 },
    btnCard: { marginTop: 'auto', width: '100%', background: 'white', border: '1px solid #CBD5E1', padding: '10px', borderRadius: 8, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 },
    
    // Modal Styles
    modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modalContent: { background: 'white', width: '90%', maxWidth: 900, maxHeight: '90vh', borderRadius: 20, display: 'flex', flexDirection: 'column', boxShadow:'0 20px 25px -5px rgba(0,0,0,0.1)' },
    modalHeader: { padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    modalTitle: { margin: 0, fontSize: '1.3rem', fontWeight: 800 },
    closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' },
    modalBody: { padding: 24, overflowY: 'auto', flex: 1 },
    
    // Stepper
    stepperContainer: { display: 'flex', justifyContent: 'space-between', position: 'relative', marginBottom: 20 },
    stepperLine: { position: 'absolute', top: 12, left: 0, right: 0, height: 2, background: '#E2E8F0', zIndex: 0 },
    stepItem: { position: 'relative', zIndex: 1, textAlign: 'center', width: '20%' },
    stepDot: { width: 24, height: 24, borderRadius: '50%', margin: '0 auto 8px', border: '2px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 },
    stepLabel: { fontSize: '0.75rem' },

    // Tabs
    tabContainer: { display: 'flex', padding: '0 24px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' },
    tab: { padding: '14px 16px', background: 'none', border: 'none', color: '#64748B', fontWeight: 600, cursor: 'pointer' },
    tabActive: { padding: '14px 16px', background: 'none', border: 'none', borderBottom: '2px solid #2563EB', color: '#2563EB', fontWeight: 700, cursor: 'pointer' },
    tabDisabled: { padding: '14px 16px', background: 'none', border: 'none', color: '#CBD5E1', cursor: 'not-allowed', display: 'flex', alignItems: 'center', gap:4 },
    badge: { background: '#EF4444', color: '#FFF', fontSize: '0.65rem', padding: '2px 6px', borderRadius: 10, marginLeft: 6 },
    
    // Forms & Inputs
    formSection: { marginBottom: 24 },
    label: { display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: 6, color: '#334155' },
    input: { width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.9rem' },
    textarea: { width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.9rem', fontFamily: 'inherit' },
    
    // Doc Items
    docCard: { background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 16, marginBottom: 12 },
    docIcon: { background: '#F1F5F9', padding: 12, borderRadius: 12, height:'fit-content' },
    docName: { fontWeight: 700, fontSize: '0.95rem', color: '#1E293B' },
    docMeta: { fontSize: '0.8rem', color: '#64748B', marginTop: 4 },
    versionBadge: { background: '#FEF3C7', color: '#D97706', fontSize: '0.7rem', padding: '2px 8px', borderRadius: 10, fontWeight: 700, marginLeft: 8 },
    
    // Buttons Small
    btnSmall: { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#EFF6FF', color: '#2563EB', padding: '6px 12px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' },
    btnSmallAction: { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#F1F5F9', color: '#0F172A', padding: '6px 12px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', border: '1px solid #CBD5E1' },
    btnSmallRed: { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FEF2F2', color: '#DC2626', padding: '6px 12px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, border: 'none', cursor: 'pointer', textDecoration: 'none' },
    iconBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' },
    iconBtnDelete: { background: '#FEF2F2', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#DC2626' },
    btnAdd: { display: 'flex', alignItems: 'center', gap: 6, background: '#EFF6FF', color: '#2563EB', border: 'none', padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' },

    // History Dropdown
    historyDropdown: { marginTop: 12, paddingTop: 12, borderTop: '1px dashed #E2E8F0', paddingLeft: 12 },
    histTitle: { fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', marginBottom: 8 },
    histItem: { display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 8, color: '#475569' },
    
    // Actions
    actionRow: { display: 'flex', gap: 12, marginTop: 24, paddingTop: 16, borderTop: '1px solid #F1F5F9' },
    btnPri: { flex: 1, background: '#2563EB', color: 'white', border: 'none', padding: '12px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 },
    btnSec: { flex: 1, background: 'white', color: '#475569', border: '1px solid #CBD5E1', padding: '12px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' },

    // LPJ Split View
    splitView: { display: 'flex', gap: 24, height: '100%' },
    splitLeft: { flex: 1, background: '#F8FAFC', padding: 20, borderRadius: 16, border: '1px solid #E2E8F0' },
    splitRight: { flex: 1.5 },
    splitHeader: { display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, marginBottom: 16, color: '#334155', borderBottom: '1px solid #E2E8F0', paddingBottom: 12 },
    labelMini: { fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 4 },
    valueBig: { fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' },
    miniDocLink: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px', background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: '0.85rem', textDecoration: 'none', color: '#2563EB', fontWeight: 600 },
    btnFull: { width: '100%', padding: '14px', background: '#2563EB', color: '#FFF', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer', marginTop: 16 },

    // Chat
    chatContainer: { display: 'flex', flexDirection: 'column', height: '100%' },
    chatWindow: { flex: 1, overflowY: 'auto', padding: 16, background: '#F8FAFC', borderRadius: 12, marginBottom: 12, border: '1px solid #E2E8F0', minHeight: 300 },
    chatInputArea: { display: 'flex', gap: 8 },
    chatInput: { flex: 1, padding: '10px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: '0.9rem' },
    chatSendBtn: { background: '#2563EB', color: '#FFF', border: 'none', padding: '0 16px', borderRadius: 10, cursor: 'pointer' },
    emptyState: { textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem', marginTop: 100 },

    // History Log
    historyList: { display: 'flex', flexDirection: 'column', gap: 16 },
    histLogItem: { paddingLeft: 16, borderLeft: '2px solid #E2E8F0' },
    histLogHeader: { fontSize: '0.8rem', color: '#64748B', marginBottom: 4 },
    histLogNote: { marginTop: 6, background: '#F8FAFC', padding: 8, borderRadius: 8, fontSize: '0.85rem', color: '#475569', fontStyle: 'italic', border: '1px solid #E2E8F0' },

    // Alerts
    revisionBox: { background: '#FEF2F2', border: '1px solid #FECACA', padding: 16, borderRadius: 12, marginBottom: 24 },
    successBox: { background: '#F0FDF4', border: '1px solid #BBF7D0', padding: 20, borderRadius: 12, marginBottom: 24, display: 'flex', gap: 16, alignItems: 'center' },
    infoBox: { background: '#EFF6FF', padding: 12, borderRadius: 8, fontSize: '0.85rem', color: '#1E40AF', border: '1px dashed #BFDBFE' },
    dispCard: { display: 'flex', gap: 16, alignItems: 'center', padding: 16, background: '#FFF', border: '1px solid #BBF7D0', borderRadius: 12, textDecoration: 'none', marginBottom: 12 },
    
    fadeIn: { animation: 'fadeIn 0.3s ease-out' }
};

export default ProkerDivisi;