// src/pages/admin/activity/ProkerDivisi.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../../firebase/firebaseConfig';
import { 
    collection, query, where, doc, setDoc, onSnapshot, updateDoc, arrayUnion 
} from 'firebase/firestore';
import { uploadToGoogleDrive } from '../../../utils/driveUpload';
import { useAdmin } from '../../../layouts/AdminLayout';
import { 
    Calendar, DollarSign, FileText, Loader2, AlertCircle, CheckCircle2, 
    Send, XCircle, Trash2, UploadCloud, FileOutput, 
    LayoutDashboard, PieChart, ChevronRight, Archive, Plus
} from 'lucide-react';

// --- UTILS & COMPONENTS ---

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

const StatusBadge = ({ status }) => {
    const map = {
        'DRAFT': { label: 'Draft', bg: '#f1f5f9', color: '#64748b' },
        'WAITING_INTERNAL': { label: 'Menunggu Verifikasi', bg: '#fff7ed', color: '#c2410c' },
        'REVISION_INTERNAL': { label: 'Revisi Diperlukan', bg: '#fef2f2', color: '#dc2626' },
        'WAITING_KM': { label: 'Verifikasi BEM', bg: '#eff6ff', color: '#2563eb' },
        'APPROVED': { label: 'Disetujui', bg: '#dcfce7', color: '#166534' },
        'COMPLETED': { label: 'Selesai', bg: '#dcfce7', color: '#166534' },
    };
    const s = map[status] || { label: status || 'Belum Mulai', bg: '#f8fafc', color: '#94a3b8' };
    return (
        <span style={{ 
            fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px', 
            borderRadius: 20, background: s.bg, color: s.color, 
            display:'inline-flex', alignItems:'center', gap:4 
        }}>
            {status?.includes('REVISION') && <AlertCircle size={12}/>}
            {s.label}
        </span>
    );
};

const ProkerDivisi = () => {
    const { profil, sysConfig, activeRole } = useAdmin();
    
    const myOrgId = activeRole?.entity_id;
    const myDivision = activeRole?.division;
    const myOrgName = activeRole?.entity_name;
    const periodeAktif = sysConfig?.activePeriod || "2025/2026";

    // --- STATE ---
    const [loading, setLoading] = useState(true);
    const [programs, setPrograms] = useState([]);
    const [activeProposals, setActiveProposals] = useState({}); 
    const [toast, setToast] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('PROPOSAL'); 
    const [selectedItem, setSelectedItem] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- FORM DATA ---
    const [form, setForm] = useState({ description: '', budgetRequested: '' });
    
    // Unified Document List (Proposal + RAB + Surat-surat)
    const [docList, setDocList] = useState([]); 
    const [tempDoc, setTempDoc] = useState({ label: '', file: null });

    // LPJ Data
    const [lpjForm, setLpjForm] = useState({ lpj: null, spj: null });

    // --- FETCH DATA ---
    useEffect(() => {
        if (!myOrgId || !myDivision || !sysConfig) return;
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
    }, [myOrgId, myDivision, sysConfig, periodeAktif]);

    const showToast = (msg, type = 'success') => setToast({ msg, type });
    const formatRp = (num) => "Rp " + new Intl.NumberFormat('id-ID').format(num);

    // --- MODAL HANDLER ---
    const handleOpenModal = (program) => {
        const prop = activeProposals[program.id];
        setSelectedItem({ ...program, ...prop, programName: program.namaKegiatan });
        
        // Reset Form
        setForm({
            description: prop?.description || program.deskripsi || '',
            budgetRequested: prop?.budgetRequested ? formatRp(prop.budgetRequested) : formatRp(program.estimasiBiaya),
        });
        setDocList(prop?.documents || []);
        
        // Tentukan Tab Aktif
        if (prop?.status === 'COMPLETED' || prop?.status === 'WAITING_REVIEW') setActiveTab('REPORT');
        else setActiveTab('PROPOSAL');

        setIsModalOpen(true);
    };

    // --- LOGIC TAMBAH DOKUMEN ---
    const addDocument = () => {
        if (!tempDoc.file || !tempDoc.label) return showToast("Pilih file dan beri nama dokumen!", "error");
        setDocList([...docList, { ...tempDoc, isNew: true }]);
        setTempDoc({ label: '', file: null });
    };

    const removeDocument = (index) => {
        const newList = [...docList];
        newList.splice(index, 1);
        setDocList(newList);
    };

    // --- SUBMIT PROPOSAL (ALL IN ONE) ---
    const submitProposal = async (isDraft) => {
        if (!form.budgetRequested) return showToast("Anggaran wajib diisi!", "error");
        if (docList.length === 0) return showToast("Minimal upload 1 dokumen (Proposal)!", "error");

        setIsSubmitting(true);
        try {
            const proposalId = selectedItem.id || `act_${selectedItem.programId}`;
            const folder = [periodeAktif.replace('/','-'), myOrgName, myDivision, selectedItem.programName];
            
            // Upload New Files
            const processedDocs = await Promise.all(docList.map(async (d) => {
                if (d.isNew && d.file) {
                    const url = await uploadToGoogleDrive(d.file, folder);
                    return { label: d.label, url, type: 'DOC', uploadedAt: new Date().toISOString() };
                }
                return d; // File lama biarkan
            }));

            const status = isDraft ? 'DRAFT' : 'WAITING_INTERNAL';
            const payload = {
                id: proposalId,
                programId: selectedItem.programId,
                rktId: selectedItem.rktId,
                orgId: myOrgId, orgName: myOrgName, divisionName: myDivision, periode: periodeAktif,
                activityName: selectedItem.programName,
                description: form.description,
                budgetRequested: parseInt(form.budgetRequested.replace(/\D/g, '')),
                documents: processedDocs, // Semua dokumen masuk sini
                status: status,
                lastUpdated: new Date().toISOString(),
                ...(!selectedItem.id ? { history: [] } : {})
            };

            await setDoc(doc(db, 'activity_proposals', proposalId), payload, { merge: true });
            
            await updateDoc(doc(db, 'activity_proposals', proposalId), {
                history: arrayUnion({
                    action: isDraft ? 'DRAFT_SAVED' : 'PROPOSAL_SUBMITTED',
                    actor: profil.namaTampilan, timestamp: new Date().toISOString(),
                    note: isDraft ? 'Menyimpan draft.' : 'Mengajukan proposal & dokumen lengkap.'
                })
            });

            showToast(isDraft ? "Draft tersimpan" : "Pengajuan berhasil dikirim!");
            if (!isDraft) setIsModalOpen(false);
        } catch (e) { console.error(e); showToast("Gagal: " + e.message, "error"); }
        finally { setIsSubmitting(false); }
    };

    // --- SUBMIT LPJ ---
    const submitLPJ = async () => {
        if (!lpjForm.lpj && !selectedItem.reporting?.lpjFile) return showToast("File LPJ Wajib!", "error");
        setIsSubmitting(true);
        try {
            const folder = [periodeAktif.replace('/','-'), myOrgName, "LPJ", selectedItem.programName];
            let lpjUrl = selectedItem.reporting?.lpjFile?.url;
            let spjUrl = selectedItem.reporting?.spjFile?.url;

            if (lpjForm.lpj) lpjUrl = await uploadToGoogleDrive(lpjForm.lpj, folder);
            if (lpjForm.spj) spjUrl = await uploadToGoogleDrive(lpjForm.spj, folder);

            const reportingData = {
                status: 'WAITING_REVIEW',
                submittedAt: new Date().toISOString(),
                lpjFile: { url: lpjUrl, fileName: 'LPJ Naratif' },
                spjFile: spjUrl ? { url: spjUrl, fileName: 'SPJ Keuangan' } : null,
                approvals: { sekjen: { status: 'WAITING' } }
            };

            await updateDoc(doc(db, 'activity_proposals', selectedItem.id), { 
                reporting: reportingData,
                status: 'COMPLETED' // Mark as generally completed phase
            });
            showToast("Laporan berhasil dikirim!");
            setIsModalOpen(false);
        } catch(e) { showToast("Gagal: " + e.message, "error"); }
        finally { setIsSubmitting(false); }
    };

    // --- RENDER ---
    const isLocked = selectedItem?.status && !['DRAFT', 'REVISION_INTERNAL', 'REVISION_KM'].includes(selectedItem.status);

    if (loading) return <div style={styles.loadingContainer}><Loader2 className="spin" size={40} color="#2563eb"/></div>;

    return (
        <div style={styles.container}>
            {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
            <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { 100% { transform: rotate(360deg); } }`}</style>

            <header style={styles.header}>
                <div>
                    <h1 style={styles.title}>Program Kerja {myDivision}</h1>
                    <p style={styles.subtitle}>Kelola pengajuan proposal, surat-menyurat, dan laporan kegiatan.</p>
                </div>
                <div style={styles.statGroup}>
                    <div style={styles.statItem}><LayoutDashboard size={16}/> {programs.length} Total</div>
                    <div style={styles.statItem}><PieChart size={16}/> {Object.values(activeProposals).filter(p => p.status === 'COMPLETED').length} Selesai</div>
                </div>
            </header>

            <div style={styles.grid}>
                {programs.map(prog => {
                    const prop = activeProposals[prog.id];
                    const status = prop?.status;
                    return (
                        <div key={prog.id} style={styles.card}>
                            <div style={styles.cardHeader}>
                                <div style={styles.catBadge}>{prog.kategori}</div>
                                <StatusBadge status={status} />
                            </div>
                            <h3 style={styles.cardTitle}>{prog.namaKegiatan}</h3>
                            <div style={styles.cardInfo}>
                                <Calendar size={14}/> {prog.dateDisplay}
                                <span style={{margin:'0 6px'}}>•</span>
                                <DollarSign size={14}/> {formatRp(prog.estimasiBiaya)}
                            </div>
                            
                            <button onClick={() => handleOpenModal(prog)} style={styles.btnCard}>
                                {status ? 'Kelola Kegiatan' : 'Buat Pengajuan'} <ChevronRight size={16}/>
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* --- MODAL UTAMA --- */}
            {isModalOpen && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <div style={styles.modalHeader}>
                            <div>
                                <h2 style={styles.modalTitle}>{selectedItem.programName}</h2>
                                <p style={styles.modalSubtitle}>ID Kegiatan: {selectedItem.programId}</p>
                            </div>
                            <button onClick={()=>setIsModalOpen(false)} style={styles.closeBtn}><XCircle size={24}/></button>
                        </div>

                        {/* TAB NAV */}
                        <div style={styles.tabContainer}>
                            <button onClick={()=>setActiveTab('PROPOSAL')} style={activeTab === 'PROPOSAL' ? styles.tabActive : styles.tab}>
                                1. Pengajuan & Administrasi
                            </button>
                            <button 
                                onClick={()=>setActiveTab('REPORT')} 
                                disabled={!selectedItem.status || selectedItem.status === 'DRAFT'}
                                style={activeTab === 'REPORT' ? styles.tabActive : (selectedItem.status ? styles.tab : styles.tabDisabled)}
                            >
                                2. Laporan (LPJ)
                            </button>
                            <button onClick={()=>setActiveTab('HISTORY')} style={activeTab === 'HISTORY' ? styles.tabActive : styles.tab}>
                                Riwayat
                            </button>
                        </div>

                        <div style={styles.modalBody}>
                            
                            {/* TAB 1: PROPOSAL & ADMIN (GABUNGAN) */}
                            {activeTab === 'PROPOSAL' && (
                                <div style={styles.fadeIn}>
                                    {isLocked && (
                                        <div style={styles.lockedBox}>
                                            <CheckCircle2 size={18}/> 
                                            <div>
                                                <strong>Mode Lihat Saja.</strong>
                                                <div>Dokumen sedang diverifikasi atau kegiatan telah disetujui.</div>
                                            </div>
                                        </div>
                                    )}

                                    <div style={styles.formRow}>
                                        <div style={{flex:1}}>
                                            <label style={styles.label}>Deskripsi Singkat</label>
                                            <textarea 
                                                rows={3} style={styles.textarea} disabled={isLocked}
                                                value={form.description} onChange={e=>setForm({...form, description:e.target.value})}
                                            />
                                        </div>
                                        <div style={{width:'35%'}}>
                                            <label style={styles.label}>Total Anggaran</label>
                                            <input 
                                                style={styles.input} disabled={isLocked}
                                                value={form.budgetRequested} onChange={e=>setForm({...form, budgetRequested: formatRp(e.target.value.replace(/\D/g,''))})}
                                            />
                                        </div>
                                    </div>

                                    {/* SECTION DOKUMEN YANG DIPERBAIKI */}
                                    <div style={styles.docSection}>
                                        <div style={styles.docHeader}>
                                            <h4 style={{margin:0, fontSize:'0.95rem'}}>Kelengkapan Dokumen</h4>
                                            <p style={{margin:'4px 0 0', fontSize:'0.8rem', color:'#64748b'}}>
                                                Upload Proposal, RAB, Surat Peminjaman, Undangan, TOR, dll di sini.
                                            </p>
                                        </div>

                                        {/* List File */}
                                        <div style={styles.fileList}>
                                            {docList.map((doc, i) => (
                                                <div key={i} style={styles.fileItem}>
                                                    <FileText size={18} color="#2563eb" style={{minWidth:18}}/>
                                                    <div style={{flex:1, overflow:'hidden', textOverflow:'ellipsis'}}>
                                                        <div style={{fontWeight:600, fontSize:'0.9rem'}}>{doc.label}</div>
                                                        {doc.url ? (
                                                            <a href={doc.url} target="_blank" rel="noreferrer" style={{fontSize:'0.8rem', color:'#2563eb'}}>Lihat File</a>
                                                        ) : (
                                                            <span style={{fontSize:'0.8rem', color:'#64748b'}}>Siap Upload</span>
                                                        )}
                                                    </div>
                                                    {!isLocked && (
                                                        <button onClick={()=>removeDocument(i)} style={styles.iconBtn}><Trash2 size={16}/></button>
                                                    )}
                                                </div>
                                            ))}
                                            {docList.length === 0 && <div style={styles.emptyState}>Belum ada dokumen yang diupload.</div>}
                                        </div>

                                        {/* Input File Baru */}
                                        {!isLocked && (
                                            <div style={styles.uploadBox}>
                                                <div style={{display:'flex', gap:10, marginBottom:10}}>
                                                    <input 
                                                        style={styles.input} placeholder="Nama Dokumen (Contoh: Proposal Lengkap)" 
                                                        value={tempDoc.label} onChange={e=>setTempDoc({...tempDoc, label:e.target.value})}
                                                    />
                                                    <div style={{position:'relative', overflow:'hidden'}}>
                                                        <input 
                                                            type="file" id="fileInput" hidden 
                                                            onChange={e=>setTempDoc({...tempDoc, file:e.target.files[0]})}
                                                        />
                                                        <label htmlFor="fileInput" style={styles.btnFile}>
                                                            {tempDoc.file ? 'Ganti File' : 'Pilih File'}
                                                        </label>
                                                    </div>
                                                </div>
                                                {tempDoc.file && <div style={{fontSize:'0.8rem', color:'#166534', marginBottom:10}}>File terpilih: {tempDoc.file.name}</div>}
                                                <button onClick={addDocument} style={styles.btnAddDoc}><Plus size={16}/> Tambahkan ke List</button>
                                            </div>
                                        )}
                                    </div>

                                    {!isLocked && (
                                        <div style={styles.actionRow}>
                                            <button onClick={()=>submitProposal(true)} disabled={isSubmitting} style={styles.btnSec}>Simpan Draft</button>
                                            <button onClick={()=>submitProposal(false)} disabled={isSubmitting} style={styles.btnPri}>
                                                {isSubmitting ? <Loader2 className="spin" size={18}/> : <Send size={18}/>} Ajukan Sekarang
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB 2: LAPORAN (LPJ) */}
                            {activeTab === 'REPORT' && (
                                <div style={styles.fadeIn}>
                                    <div style={styles.infoBoxBlue}>
                                        <Archive size={18}/> Upload laporan pertanggungjawaban setelah kegiatan selesai.
                                    </div>
                                    <div style={styles.formRow}>
                                        <div style={{flex:1}}>
                                            <label style={styles.label}>File LPJ Naratif (Wajib)</label>
                                            <input type="file" style={styles.input} onChange={e=>setLpjForm({...lpjForm, lpj:e.target.files[0]})}/>
                                            {selectedItem.reporting?.lpjFile && (
                                                <a href={selectedItem.reporting.lpjFile.url} target="_blank" rel="noreferrer" style={styles.link}>
                                                    File Terakhir: {selectedItem.reporting.lpjFile.fileName}
                                                </a>
                                            )}
                                        </div>
                                        <div style={{flex:1}}>
                                            <label style={styles.label}>File SPJ Keuangan (Opsional)</label>
                                            <input type="file" style={styles.input} onChange={e=>setLpjForm({...lpjForm, spj:e.target.files[0]})}/>
                                        </div>
                                    </div>
                                    <button onClick={submitLPJ} disabled={isSubmitting} style={{...styles.btnPri, marginTop:20, width:'100%'}}>
                                        {isSubmitting ? <Loader2 className="spin"/> : <CheckCircle2/>} Kirim Laporan Akhir
                                    </button>
                                </div>
                            )}

                            {/* TAB 3: RIWAYAT */}
                            {activeTab === 'HISTORY' && (
                                <div style={styles.historyList}>
                                    {selectedItem.history?.slice().reverse().map((log, i) => (
                                        <div key={i} style={styles.historyItem}>
                                            <div style={styles.histTime}>{new Date(log.timestamp).toLocaleString()}</div>
                                            <div style={styles.histAction}>{log.action.replace(/_/g, ' ')}</div>
                                            <div style={styles.histActor}>{log.actor}</div>
                                            {log.note && <div style={styles.histNote}>"{log.note}"</div>}
                                        </div>
                                    ))}
                                    {!selectedItem.history?.length && <div style={styles.emptyState}>Belum ada riwayat.</div>}
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- STYLING ---
const styles = {
    container: { fontFamily: '"Plus Jakarta Sans", sans-serif', padding: '32px', maxWidth: 1200, margin: '0 auto', color: '#0f172a' },
    loadingContainer: { height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    
    // Header
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
    title: { fontSize: '1.8rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' },
    subtitle: { color: '#64748b', margin: '4px 0 0', fontWeight: 500 },
    statGroup: { display: 'flex', gap: 12 },
    statItem: { display: 'flex', alignItems: 'center', gap: 8, background: '#f1f5f9', padding: '8px 16px', borderRadius: 20, fontSize: '0.85rem', fontWeight: 600, color: '#475569' },

    // Grid
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 },
    card: { background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', padding: 20, transition: 'all 0.2s hover:shadow-md', display: 'flex', flexDirection: 'column' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    catBadge: { fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', background: '#f1f5f9', color: '#64748b', padding: '4px 8px', borderRadius: 6 },
    cardTitle: { fontSize: '1.1rem', fontWeight: 700, margin: '0 0 8px', lineHeight: 1.3 },
    cardInfo: { display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#64748b', marginBottom: 16 },
    btnCard: { marginTop: 'auto', width: '100%', background: 'white', border: '1px solid #cbd5e1', color: '#0f172a', fontWeight: 600, padding: '10px', borderRadius: 8, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 },

    // Modal
    modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modalContent: { background: 'white', width: '90%', maxWidth: 700, maxHeight: '90vh', borderRadius: 20, display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' },
    modalHeader: { padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    modalTitle: { margin: 0, fontSize: '1.2rem', fontWeight: 800 },
    modalSubtitle: { margin: 0, fontSize: '0.85rem', color: '#64748b' },
    closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' },
    
    // Tabs
    tabContainer: { display: 'flex', padding: '0 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' },
    tab: { padding: '14px 16px', background: 'none', border: 'none', borderBottom: '2px solid transparent', color: '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' },
    tabActive: { padding: '14px 16px', background: 'none', border: 'none', borderBottom: '2px solid #2563eb', color: '#2563eb', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' },
    tabDisabled: { padding: '14px 16px', background: 'none', border: 'none', color: '#cbd5e1', cursor: 'not-allowed' },

    modalBody: { padding: 24, overflowY: 'auto', flex: 1 },

    // Forms
    formRow: { display: 'flex', gap: 16, marginBottom: 16 },
    label: { display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: 6, color: '#334155' },
    input: { width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e0', fontSize: '0.9rem' },
    textarea: { width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e0', fontSize: '0.9rem', fontFamily: 'inherit' },
    
    // Doc Section
    docSection: { marginTop: 20, border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 },
    docHeader: { marginBottom: 12 },
    fileList: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 },
    fileItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' },
    iconBtn: { background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' },
    
    uploadBox: { background: '#eff6ff', padding: 12, borderRadius: 8, border: '1px dashed #bfdbfe' },
    btnFile: { background: 'white', border: '1px solid #cbd5e0', padding: '8px 12px', borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, display: 'inline-block' },
    btnAddDoc: { width: '100%', background: '#2563eb', color: 'white', border: 'none', padding: '8px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 },

    // States
    lockedBox: { background: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c', padding: 12, borderRadius: 8, display: 'flex', gap: 10, alignItems: 'center', fontSize: '0.85rem', marginBottom: 20 },
    infoBoxBlue: { background: '#eff6ff', border: '1px solid #dbeafe', color: '#1e40af', padding: 12, borderRadius: 8, display: 'flex', gap: 10, alignItems: 'center', fontSize: '0.85rem', marginBottom: 20 },
    emptyState: { textAlign: 'center', padding: 20, color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' },
    fadeIn: { animation: 'fadeIn 0.3s ease-in-out' },

    // Buttons
    actionRow: { display: 'flex', gap: 12, marginTop: 24, paddingTop: 16, borderTop: '1px solid #f1f5f9' },
    btnPri: { flex: 1, background: '#2563eb', color: 'white', border: 'none', padding: '12px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 },
    btnSec: { flex: 1, background: 'white', color: '#475569', border: '1px solid #cbd5e0', padding: '12px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' },
    link: { display: 'block', marginTop: 4, fontSize: '0.8rem', color: '#2563eb', textDecoration: 'none' },

    // History
    historyList: { display: 'flex', flexDirection: 'column', gap: 16 },
    historyItem: { paddingLeft: 12, borderLeft: '2px solid #e2e8f0' },
    histTime: { fontSize: '0.75rem', color: '#94a3b8' },
    histAction: { fontWeight: 700, color: '#1e293b', fontSize: '0.9rem' },
    histActor: { fontSize: '0.85rem', color: '#64748b' },
    histNote: { marginTop: 4, background: '#f8fafc', padding: 8, borderRadius: 6, fontSize: '0.85rem', color: '#475569', fontStyle: 'italic' }
};

export default ProkerDivisi;