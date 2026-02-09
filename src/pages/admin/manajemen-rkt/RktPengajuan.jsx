// src/pages/admin/manajemen-rkt/RktPengajuan.jsx

import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase/firebaseConfig';
import { 
    collection, query, where, doc, setDoc, updateDoc, onSnapshot, arrayUnion, getDoc 
} from 'firebase/firestore';
import { uploadToGoogleDrive } from '../../../utils/driveUpload';
import { useAdmin } from '../../../layouts/AdminLayout';
import { 
    FileText, UploadCloud, CheckCircle, XCircle, Clock, 
    AlertTriangle, Loader2, ArrowRight, Lock, Calendar,
    History, ChevronDown, ChevronUp, ExternalLink,
    AlertCircle, MessageSquare, Info, DollarSign, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// --- COMPONENT TOAST (Notifikasi Cantik) ---
const Toast = ({ message, type, onClose }) => {
    useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
    const bg = type === 'error' ? '#ef4444' : '#10b981';
    return (
        <div style={{ position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)', backgroundColor: bg, color: 'white', padding: '12px 24px', borderRadius: 50, zIndex: 9999, boxShadow: '0 10px 30px rgba(0,0,0,0.2)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10, animation: 'slideUp 0.3s ease' }}>
            {type === 'error' ? <XCircle size={20}/> : <CheckCircle size={20}/>} {message}
        </div>
    );
};

const RktPengajuan = () => {
    const { profil, sysConfig, activeRole } = useAdmin(); 
    const navigate = useNavigate();
    
    // --- STATE UTAMA ---
    const [loading, setLoading] = useState(true);
    const [rktData, setRktData] = useState(null);
    const [toast, setToast] = useState(null); // State Notifikasi
    
    // --- FORM STATES ---
    const [isUploading, setIsUploading] = useState(false);
    const [file, setFile] = useState(null);
    const [changeLog, setChangeLog] = useState(""); 
    const [proposedBudget, setProposedBudget] = useState(""); // State Baru: Input Nominal
    
    const [isResubmitting, setIsResubmitting] = useState(false); 
    const [showHistory, setShowHistory] = useState(false); 

    // --- METADATA ---
    const myOrgId = activeRole?.entity_id || '';
    const myOrgName = activeRole?.entity_name || '';
    const periodeAktif = sysConfig?.activePeriod || "2025/2026";

    // Helper: Format
    const formatDate = (isoString) => {
        if (!isoString) return '-';
        return new Intl.DateTimeFormat('id-ID', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        }).format(new Date(isoString));
    };

    const formatRp = (num) => new Intl.NumberFormat('id-ID').format(num);

    const handleBudgetChange = (e) => {
        const raw = e.target.value.replace(/\D/g, '');
        setProposedBudget(raw ? formatRp(raw) : '');
    };

    const showToast = (msg, type = 'success') => setToast({ msg, type });

    // 1. FETCH DATA
    useEffect(() => {
        setRktData(null); 
        setLoading(true);

        if (!myOrgId || !sysConfig) return; 

        const q = query(
            collection(db, 'rkt_submissions'), 
            where('orgId', '==', myOrgId),
            where('periode', '==', periodeAktif)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const data = snapshot.docs[0].data();
                setRktData({ id: snapshot.docs[0].id, ...data });
                // Pre-fill budget jika revisi dan sudah ada sebelumnya
                if (data.proposedBudgetTotal) {
                    setProposedBudget(formatRp(data.proposedBudgetTotal));
                }
            } else {
                setRktData(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [myOrgId, sysConfig, periodeAktif]);

    // 2. CEK DEADLINE
    const isDeadlinePassed = () => {
        if (!sysConfig?.rktDeadline) return false;
        const today = new Date();
        const deadline = new Date(sysConfig.rktDeadline);
        return today > deadline;
    };

    // 3. HANDLER UPLOAD
    const handleUpload = async () => {
        // A. Validasi Config & Deadline
        if (sysConfig?.allowRktSubmission === false && !rktData) {
            return showToast("Maaf, pengajuan RKT baru sedang ditutup.", "error");
        }
        if (isDeadlinePassed() && !rktData) {
            return showToast("Batas waktu pengajuan RKT telah berakhir.", "error");
        }

        // B. Validasi Input
        if (!file) return showToast("Pilih file PDF dulu!", "error");
        
        // C. Validasi Ukuran File (Maks 10MB)
        const MAX_SIZE = 10 * 1024 * 1024; // 10MB
        if (file.size > MAX_SIZE) {
            return showToast("Ukuran file terlalu besar! Maksimal 10MB.", "error");
        }

        // D. Validasi Nominal
        const cleanBudget = parseInt(proposedBudget.replace(/\./g, '')) || 0;
        if (cleanBudget <= 0) {
            return showToast("Mohon isi total nominal anggaran yang diajukan.", "error");
        }

        const isRevision = !!rktData;
        if (isRevision && !changeLog.trim()) {
            return showToast("Wajib mengisi 'Catatan Perubahan' untuk revisi!", "error");
        }

        setIsUploading(true);
        try {
            const versionNumber = isRevision ? (rktData.versions?.length || 0) + 1 : 1;
            const folderStructure = [periodeAktif.replace('/', '-'), myOrgName, "Proposal Tahunan"];
            
            const extension = file.name.split('.').pop();
            const newFileName = `PROPOSAL_RKT_${myOrgName.replace(/\s/g, '_')}_V${versionNumber}.${extension}`;
            const renamedFile = new File([file], newFileName, { type: file.type });

            const driveLink = await uploadToGoogleDrive(renamedFile, folderStructure);

            const docId = `rkt_${myOrgId}_${periodeAktif.replace('/', '-')}`;
            const docRef = doc(db, 'rkt_submissions', docId);
            const now = new Date().toISOString();

            const newVersionObj = {
                versionNumber: versionNumber,
                fileName: newFileName,
                fileUrl: driveLink,
                uploadedAt: now,
                uploadedBy: profil.namaTampilan,
                proposedBudget: cleanBudget, // Simpan nominal per versi
                changeLog: isRevision ? changeLog : "Pengajuan Awal Proposal Tahunan"
            };

            const newHistoryLog = {
                action: isRevision ? 'REVISION' : 'UPLOAD',
                actor: profil.namaTampilan,
                role: myOrgName,
                timestamp: now,
                note: isRevision ? `Mengupload Versi ${versionNumber}: ${changeLog}` : "Mengupload dokumen awal",
                versionReference: versionNumber,
                nominal: cleanBudget
            };

            const resetApprovals = {
                bem_dagri: { status: 'WAITING', note: '', reviewedAt: null },
                bem_sekjen: { status: 'WAITING', note: '', reviewedAt: null },
                bem_bendahara: { status: 'WAITING', note: '', reviewedAt: null },
                dpm_banggar: { status: 'WAITING', note: '', reviewedAt: null }
            };

            const commonUpdates = {
                status: 'PENDING_REVIEW',
                currentVersion: versionNumber,
                currentFileUrl: driveLink,
                proposedBudgetTotal: cleanBudget, // Simpan nominal utama di root
                approvals: resetApprovals
            };

            if (isRevision) {
                await updateDoc(docRef, {
                    ...commonUpdates,
                    versions: arrayUnion(newVersionObj),
                    history: arrayUnion(newHistoryLog)
                });
            } else {
                await setDoc(docRef, {
                    orgId: myOrgId,
                    orgName: myOrgName,
                    periode: periodeAktif,
                    ...commonUpdates,
                    versions: [newVersionObj],
                    history: [newHistoryLog]
                });
            }

            showToast(`Berhasil! Proposal Versi ${versionNumber} terkirim.`);
            setFile(null);
            setChangeLog("");
            setIsResubmitting(false);

        } catch (error) {
            console.error(error);
            showToast("Gagal upload: " + error.message, "error");
        } finally {
            setIsUploading(false);
        }
    };

    // --- Helper Status Tile ---
    const StatusTile = ({ label, data }) => {
        let color = '#64748b'; let bg = '#f8fafc'; let icon = <Clock size={16}/>; let text = "Menunggu";
        if (data.status === 'APPROVED') { color = '#10b981'; bg = '#dcfce7'; icon = <CheckCircle size={16}/>; text="Disetujui"; }
        if (data.status === 'REJECTED') { color = '#ef4444'; bg = '#fee2e2'; icon = <XCircle size={16}/>; text="Ditolak"; }

        return (
            <div style={{padding: 12, borderRadius: 10, border: `1px solid ${bg === '#f8fafc' ? '#e2e8f0' : bg}`, background: 'white', display: 'flex', flexDirection: 'column', gap: 6}}>
                <span style={{fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase'}}>{label}</span>
                <div style={{display: 'flex', alignItems: 'center', gap: 6, color: color, fontWeight: 700, fontSize: '0.85rem'}}>
                    {icon} {text}
                </div>
                {data.status !== 'WAITING' && (
                    <div style={{fontSize: '0.7rem', color: '#64748b', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4}}>
                        <Info size={10}/> Oleh: {data.reviewerName || 'Admin'}
                    </div>
                )}
                {data.note && <div style={{fontSize: '0.75rem', color: '#b91c1c', background: '#fff1f2', padding: 4, borderRadius: 4, marginTop: 2}}>"{data.note}"</div>}
            </div>
        )
    };

    if (loading) return <div className="loading-state"><Loader2 className="spin" size={32}/> Memuat Data RKT...</div>;
    if (!activeRole) return <div className="error-state"><AlertTriangle size={32}/> Silakan pilih organisasi/jabatan terlebih dahulu di sidebar.</div>;

    const currentVersionNum = rktData?.currentVersion || 0;
    const isRejected = rktData && Object.values(rktData.approvals).some(a => a.status === 'REJECTED');
    const deadlinePassed = isDeadlinePassed();

    return (
        <div style={styles.container}>
            {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
            
            {/* --- HEADER --- */}
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>Proposal Tahunan (RKT)</h1>
                    <p style={styles.subtitle}>{myOrgName} • Periode {periodeAktif}</p> 
                    
                    {sysConfig?.rktDeadline && !rktData && (
                        <div style={{display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: '0.85rem', color: deadlinePassed ? '#ef4444' : '#f59e0b', fontWeight: 600}}>
                            <Clock size={14}/> 
                            Deadline: {new Date(sysConfig.rktDeadline).toLocaleDateString('id-ID', {weekday:'long', day:'numeric', month:'long', year:'numeric'})}
                            {deadlinePassed && " (BERAKHIR)"}
                        </div>
                    )}
                </div>
                {rktData && (
                    <div style={{
                        ...styles.globalBadge, 
                        background: rktData.status === 'APPROVED' ? '#dcfce7' : (isRejected ? '#fee2e2' : '#eff6ff'),
                        color: rktData.status === 'APPROVED' ? '#166534' : (isRejected ? '#991b1b' : '#1e40af')
                    }}>
                        {rktData.status === 'APPROVED' ? 'DISETUJUI SEPENUHNYA' : (isRejected ? 'PERLU REVISI' : 'MENUNGGU REVIEW')}
                    </div>
                )}
            </div>

            {/* --- FORM UPLOAD --- */}
            {(!rktData || isResubmitting) ? (
                (!rktData && deadlinePassed) ? (
                    <div style={styles.uploadCard}>
                        <div style={{padding: 40, textAlign: 'center'}}>
                            <div style={{...styles.iconCircle, background: '#fee2e2', color: '#ef4444'}}>
                                <Lock size={32}/>
                            </div>
                            <h3 style={{marginTop: 16, color: '#991b1b'}}>Pengajuan Ditutup</h3>
                            <p style={{color: '#7f1d1d'}}>Maaf, batas waktu pengajuan RKT untuk periode ini telah berakhir.</p>
                        </div>
                    </div>
                ) : (
                    <div style={styles.uploadCard}>
                        <div style={styles.uploadHeader}>
                            <div style={styles.iconCircle}>
                                {isResubmitting ? <ArrowRight size={32} color="#f59e0b"/> : <UploadCloud size={32} color="#3b82f6"/>}
                            </div>
                            <div style={{textAlign: 'center'}}>
                                <h3 style={{margin: '0 0 8px 0', fontSize: '1.2rem'}}>
                                    {isResubmitting ? `Upload Revisi (Versi ${currentVersionNum + 1})` : 'Upload Dokumen Proposal Tahunan'}
                                </h3>
                                <p style={{margin: 0, color: '#64748b', fontSize: '0.9rem'}}>
                                    {isResubmitting 
                                        ? 'Pastikan poin-poin penolakan reviewer sudah diperbaiki.' 
                                        : 'Upload file RKT & RAB lengkap dalam format PDF.'}
                                </p>
                            </div>
                        </div>

                        <div style={styles.formBody}>
                            {/* NEW: Input Nominal Anggaran */}
                            <div style={styles.inputGroup}>
                                <label>Total Anggaran Diajukan (Rp)</label>
                                <div style={styles.inputIconWrapper}>
                                    <DollarSign size={16} color="#64748b"/>
                                    <input 
                                        type="text" 
                                        value={proposedBudget}
                                        onChange={handleBudgetChange}
                                        placeholder="0"
                                        style={styles.inputNoBorder}
                                    />
                                </div>
                                <small style={{color:'#64748b', fontSize:'0.8rem'}}>Total nominal seluruh kegiatan dalam satu tahun periode.</small>
                            </div>

                            <div style={styles.inputGroup}>
                                <label>File Proposal (PDF, Maks 10MB)</label>
                                <div style={{display:'flex', gap: 10, alignItems:'center'}}>
                                    <label htmlFor="file-upload" style={styles.customFileBtn}>
                                        {file ? 'Ganti File' : 'Pilih File'}
                                    </label>
                                    <span style={{fontSize:'0.85rem', color:'#64748b', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                                        {file ? file.name : 'Belum ada file dipilih'}
                                    </span>
                                    <input 
                                        id="file-upload"
                                        type="file" 
                                        accept="application/pdf"
                                        onChange={(e) => setFile(e.target.files[0])}
                                        style={{display:'none'}}
                                    />
                                </div>
                            </div>

                            {isResubmitting && (
                                <div style={styles.inputGroup}>
                                    <label style={{color: '#b45309'}}>Catatan Perubahan (Wajib)</label>
                                    <textarea 
                                        value={changeLog}
                                        onChange={(e) => setChangeLog(e.target.value)}
                                        placeholder="Contoh: Memperbaiki kesalahan hitung pada RAB Divisi Humas."
                                        style={styles.textArea}
                                        rows={3}
                                    />
                                </div>
                            )}

                            <div style={styles.formActions}>
                                {isResubmitting && (
                                    <button onClick={() => {setIsResubmitting(false); setFile(null); setChangeLog("")}} style={styles.btnSecondary}>
                                        Batal
                                    </button>
                                )}
                                <button 
                                    onClick={handleUpload} 
                                    disabled={isUploading || !file}
                                    style={{...styles.btnPrimary, opacity: (isUploading || !file) ? 0.7 : 1}}
                                >
                                    {isUploading ? <Loader2 className="spin" size={18}/> : <UploadCloud size={18}/>}
                                    {isUploading ? 'Mengirim...' : 'Kirim Dokumen'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            ) : (
                // --- DASHBOARD VIEW ---
                <div style={styles.mainGrid}>
                    <div style={{display: 'flex', flexDirection: 'column', gap: 24}}>
                        <div style={styles.card}>
                            <div style={styles.cardHeader}>
                                <h3 style={styles.cardTitle}><FileText size={18}/> Dokumen Aktif (Versi {currentVersionNum})</h3>
                                <a href={rktData.currentFileUrl} target="_blank" rel="noreferrer" style={styles.linkBtn}>
                                    <ExternalLink size={14}/> Lihat PDF
                                </a>
                            </div>
                            <div style={{padding: 20}}>
                                <div style={styles.metaRow}>
                                    <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                                        <Calendar size={14}/> 
                                        {formatDate(rktData.versions[rktData.versions.length-1].uploadedAt)}
                                    </div>
                                    <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                                        <DollarSign size={14}/> 
                                        Ajuan: Rp {formatRp(rktData.proposedBudgetTotal || 0)}
                                    </div>
                                </div>
                                
                                <h4 style={styles.sectionTitle}>Status Validasi Reviewer</h4>
                                <div style={styles.statusGrid}>
                                    <StatusTile label="Kemendagri" data={rktData.approvals.bem_dagri} />
                                    <StatusTile label="Sekjen BEM" data={rktData.approvals.bem_sekjen} />
                                    <StatusTile label="Bendahara BEM" data={rktData.approvals.bem_bendahara} />
                                    <StatusTile label="Banggar DPM" data={rktData.approvals.dpm_banggar} />
                                </div>

                                {isRejected && (
                                    <div style={styles.revisiBox}>
                                        <div style={{display: 'flex', gap: 10}}>
                                            <AlertCircle size={20} color="#dc2626"/>
                                            <div>
                                                <strong style={{color: '#991b1b', fontSize: '0.95rem'}}>Revisi Diperlukan!</strong>
                                                <p style={{margin: '4px 0 12px', fontSize: '0.85rem', color: '#b91c1c'}}>
                                                    Silakan perbaiki dokumen sesuai catatan penolakan.
                                                </p>
                                                <button onClick={() => setIsResubmitting(true)} style={styles.btnDangerOutline}>
                                                    <ArrowRight size={16}/> Upload Revisi (V{currentVersionNum + 1})
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* HISTORY */}
                        <div style={styles.card}>
                            <button onClick={() => setShowHistory(!showHistory)} style={styles.accordionHeader}>
                                <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                                    <History size={18} color="#64748b"/>
                                    <span style={{fontWeight: 600, color: '#334155'}}>Riwayat Versi & Arsip</span>
                                    <span style={styles.badgeCount}>{rktData.versions.length} Versi</span>
                                </div>
                                {showHistory ? <ChevronUp size={18} color="#94a3b8"/> : <ChevronDown size={18} color="#94a3b8"/>}
                            </button>
                            
                            {showHistory && (
                                <div style={{padding: '0 20px 20px 20px'}}>
                                    <div style={styles.timelineContainer}>
                                        {[...rktData.versions].reverse().map((ver, idx) => (
                                            <div key={idx} style={styles.timelineItem}>
                                                <div style={styles.timelineLeft}>
                                                    <div style={styles.timelineDot}>V{ver.versionNumber}</div>
                                                    {idx !== rktData.versions.length - 1 && <div style={styles.timelineLine}></div>}
                                                </div>
                                                <div style={styles.timelineContent}>
                                                    <div style={{display: 'flex', justifyContent: 'space-between'}}>
                                                        <strong style={{fontSize: '0.95rem', color: '#1e293b'}}>{ver.fileName}</strong>
                                                        <a href={ver.fileUrl} target="_blank" rel="noreferrer" style={styles.smallLink}>Lihat File</a>
                                                    </div>
                                                    <div style={{fontSize: '0.8rem', color: '#64748b', marginTop: 4}}>
                                                        {formatDate(ver.uploadedAt)} • Rp {formatRp(ver.proposedBudget || 0)}
                                                    </div>
                                                    <div style={styles.versionNote}>
                                                        <span style={{fontWeight: 600}}>Catatan:</span> {ver.changeLog}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={styles.card}>
                        <div style={styles.cardHeader}>
                            <h3 style={styles.cardTitle}>Digitalisasi Proker</h3>
                        </div>
                        <div style={styles.gateContent}>
                            {rktData.status === 'APPROVED' ? (
                                <>
                                    <div style={{...styles.iconCircle, background: '#dcfce7', color: '#166534'}}>
                                        <CheckCircle size={40}/>
                                    </div>
                                    <h3 style={{margin: '16px 0 8px'}}>Akses Terbuka!</h3>
                                    <p style={{color: '#64748b', marginBottom: 24, fontSize: '0.9rem', textAlign: 'center'}}>
                                        Pagu Disetujui: <br/>
                                        <strong style={{fontSize:'1.2rem', color:'#166534'}}>Rp {new Intl.NumberFormat('id-ID').format(rktData.finalBudgetLimit || 0)}</strong>
                                    </p>
                                    <button onClick={() => navigate('input-program')} style={styles.btnPrimary}>
                                        Mulai Input Proker <ArrowRight size={18}/>
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div style={{...styles.iconCircle, background: '#f1f5f9', color: '#94a3b8'}}>
                                        <Lock size={40}/>
                                    </div>
                                    <h3 style={{margin: '16px 0 8px', color: '#94a3b8'}}>Fitur Terkunci</h3>
                                    <p style={{color: '#94a3b8', fontSize: '0.9rem', maxWidth: 300, textAlign: 'center'}}>
                                        Menunggu persetujuan penuh RKT.
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } @keyframes slideUp { from { transform: translate(-50%, 20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }`}</style>
        </div>
    );
};

// --- STYLES ---
const styles = {
    container: { fontFamily: 'Inter, sans-serif', padding: '32px', color: '#1e293b', maxWidth: 1200, margin: '0 auto' },
    header: { marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 },
    title: { fontSize: '1.8rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px', color: '#0f172a' },
    subtitle: { color: '#64748b', marginTop: 4, fontSize: '1rem', fontWeight: 500 },
    globalBadge: { padding: '8px 16px', borderRadius: 20, fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.5px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },

    mainGrid: { display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: 24 },
    card: { background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
    cardHeader: { padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 },
    
    metaRow: { display: 'flex', gap: 16, marginBottom: 20, fontSize: '0.9rem', color: '#475569' },
    sectionTitle: { fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', margin: '0 0 12px 0', fontWeight: 700 },
    statusGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
    revisiBox: { marginTop: 20, padding: 16, background: '#fff1f2', borderRadius: 8, border: '1px solid #fecaca' },

    uploadCard: { background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', maxWidth: 600, margin: '0 auto', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)', overflow: 'hidden' },
    uploadHeader: { padding: '32px 24px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center' },
    iconCircle: { width: 64, height: 64, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, border: '1px solid #e2e8f0', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' },
    formBody: { padding: 32 },
    inputGroup: { marginBottom: 20 },
    inputNoBorder: { border: 'none', padding: '10px 0', fontSize: '1rem', width: '100%', outline: 'none', fontWeight: 600, color: '#0f172a' },
    inputIconWrapper: { display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', border: `1px solid #e2e8f0`, borderRadius: 8, background: 'white' },
    customFileBtn: { padding: '8px 16px', background: '#f1f5f9', borderRadius: 6, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', color: '#475569', border: '1px solid #cbd5e0' },
    textArea: { width: '100%', padding: '12px', borderRadius: 8, border: '1px solid #cbd5e0', fontSize: '0.9rem', fontFamily: 'inherit', resize: 'vertical' },
    formActions: { display: 'flex', gap: 12, marginTop: 24 },

    accordionHeader: { width: '100%', padding: '16px 20px', background: 'none', border: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' },
    badgeCount: { background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: 10, fontSize: '0.75rem', fontWeight: 600 },
    timelineContainer: { marginTop: 12 },
    timelineItem: { display: 'flex', gap: 16, position: 'relative', marginBottom: 20 },
    timelineLeft: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: 30 },
    timelineDot: { width: 28, height: 28, borderRadius: '50%', background: '#3b82f6', color: 'white', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white', boxShadow: '0 0 0 1px #e2e8f0', zIndex: 2 },
    timelineLine: { width: 2, flex: 1, background: '#e2e8f0', minHeight: 20, margin: '4px 0' },
    timelineContent: { flex: 1, background: '#f8fafc', padding: '12px', borderRadius: 8, border: '1px solid #f1f5f9' },
    smallLink: { color: '#2563eb', fontSize: '0.8rem', textDecoration: 'none' },
    versionNote: { marginTop: 6, background: '#f1f5f9', padding: '6px 10px', borderRadius: 6, fontSize: '0.85rem', color: '#334155' },

    gateContent: { padding: 40, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300 },
    btnPrimary: { flex: 1, background: '#2563eb', color: 'white', border: 'none', padding: '12px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: '0.2s' },
    btnSecondary: { flex: 1, background: 'white', color: '#475569', border: '1px solid #cbd5e0', padding: '12px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' },
    btnDangerOutline: { width: '100%', background: 'white', color: '#dc2626', border: '1px solid #fecaca', padding: '10px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 },
    linkBtn: { display: 'flex', alignItems: 'center', gap: 6, color: '#2563eb', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600, background: '#eff6ff', padding: '6px 12px', borderRadius: 6 },
};

export default RktPengajuan;