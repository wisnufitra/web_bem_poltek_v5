// src/pages/admin/activity/VerifikasiEksternal.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../../firebase/firebaseConfig';
import { 
    collection, query, where, onSnapshot, doc, updateDoc, arrayUnion 
} from 'firebase/firestore';
import { uploadToGoogleDrive } from '../../../utils/driveUpload';
import { useAdmin } from '../../../layouts/AdminLayout';
import { 
    FileText, CheckCircle, XCircle, Clock, Search, 
    ExternalLink, AlertCircle, UploadCloud, FileOutput, Loader2,
    DollarSign, PenTool, Paperclip, Download, AlertTriangle, Filter, Building2,
    Plus, Trash2, Edit, Eye 
} from 'lucide-react';

// --- TOAST COMPONENT ---
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
    const [filterOrg, setFilterOrg] = useState('ALL'); 
    const [toast, setToast] = useState(null);
    
    // Modal Review
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [reviewingRole, setReviewingRole] = useState(null); // KEY FIX: Harus di-set saat open
    const [reviewNote, setReviewNote] = useState('');
    const [feedbackFile, setFeedbackFile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Modal Disposisi (Multi-File)
    const [isDispositionOpen, setIsDispositionOpen] = useState(false);
    const [isViewDispositionOpen, setIsViewDispositionOpen] = useState(false); 
    const [dispDocList, setDispDocList] = useState([]); 
    const [tempDispNote, setTempDispNote] = useState(''); 

    const showToast = (msg, type = 'success') => setToast({ msg, type });
    const formatRp = (num) => "Rp " + new Intl.NumberFormat('id-ID').format(num);
    const formatDateTime = (iso) => !iso ? '-' : new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

    // --- 1. DETEKSI PERAN EKSTERNAL ---
    const myRole = useMemo(() => {
        if (profil.role_global === 'master') return 'master';

        const roles = profil.assignments || [];
        const isBemInti = roles.some(r => r.entity_id === 'bem_pusat' && ['Inti', 'Pengurus Harian'].includes(r.division));
        const isDpmInti = roles.some(r => r.entity_id === 'dpm_pusat' && ['Inti', 'Pimpinan'].includes(r.division));

        if (roles.some(r => r.division === 'Kementerian Dalam Negeri') || isBemInti) return 'bem_dagri';
        if (roles.some(r => r.division === 'Sekretariat Jenderal') || isBemInti) return 'bem_sekjen';
        if (roles.some(r => r.division === 'Kementerian Keuangan') || isBemInti) return 'bem_keu';
        if (roles.some(r => r.division === 'Badan Anggaran') || isDpmInti) return 'dpm_banggar';

        return null; 
    }, [profil]);

    // --- 2. FETCH DATA ---
    useEffect(() => {
        if (!sysConfig) return;

        const q = query(
            collection(db, 'activity_proposals'),
            where('periode', '==', periodeAktif),
            where('status', 'in', ['WAITING_KM', 'REVISION_KM', 'SUBMITTED_TO_CAMPUS', 'COMPLETED'])
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            list.sort((a, b) => {
                const order = { 'WAITING_KM': 1, 'REVISION_KM': 2, 'SUBMITTED_TO_CAMPUS': 3, 'COMPLETED': 4 };
                return (order[a.status] || 99) - (order[b.status] || 99) || new Date(b.lastUpdated) - new Date(a.lastUpdated);
            });
            setProposals(list);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [sysConfig, periodeAktif]);

    // --- 3. FILTER LOGIC ---
    const uniqueOrgs = useMemo(() => [...new Set(proposals.map(p => p.orgName))], [proposals]);

    const filteredList = useMemo(() => {
        return proposals.filter(p => {
            const matchSearch = p.activityName.toLowerCase().includes(searchTerm.toLowerCase());
            const matchOrg = filterOrg === 'ALL' || p.orgName === filterOrg;
            return matchSearch && matchOrg;
        });
    }, [proposals, searchTerm, filterOrg]);

    // --- 4. HANDLERS (Disposisi Multi-File) ---

    const handleAddDispFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!tempDispNote.trim()) return showToast("Wajib isi catatan/keterangan file!", "error");

        setDispDocList(prev => [...prev, {
            file: file, // Raw file
            note: tempDispNote,
            fileName: file.name
        }]);
        setTempDispNote(''); 
    };

    const handleRemoveDispFile = (index) => {
        const newList = [...dispDocList];
        newList.splice(index, 1);
        setDispDocList(newList);
    };

    const openDispositionModal = (item) => {
        setSelectedItem(item);
        setTempDispNote('');
        
        if (item.dispositionDocuments && item.dispositionDocuments.length > 0) {
            setDispDocList(item.dispositionDocuments.map(doc => ({
                ...doc,
                file: null 
            })));
        } else {
            setDispDocList([]); 
        }
        
        setIsDispositionOpen(true);
    };

    const submitDisposition = async () => {
        if (dispDocList.length === 0) return showToast("Minimal upload 1 file disposisi!", "error");
        
        setIsProcessing(true);
        try {
            const folder = ["Arsip Disposisi", selectedItem.orgName, periodeAktif.replace('/','-')];
            
            const uploadedDocs = await Promise.all(dispDocList.map(async (item) => {
                if (item.file) {
                    const url = await uploadToGoogleDrive(item.file, folder);
                    return {
                        note: item.note,
                        fileName: item.fileName,
                        url: url,
                        uploadedAt: new Date().toISOString()
                    };
                } else {
                    return {
                        note: item.note,
                        fileName: item.fileName,
                        url: item.url,
                        uploadedAt: item.uploadedAt || new Date().toISOString()
                    };
                }
            }));

            const docRef = doc(db, 'activity_proposals', selectedItem.id);
            const now = new Date().toISOString();
            
            const isUpdate = selectedItem.status === 'COMPLETED';

            await updateDoc(docRef, {
                status: 'COMPLETED',
                dispositionDocuments: uploadedDocs,
                history: arrayUnion({
                    action: isUpdate ? 'DISPOSITION_UPDATE' : 'DISPOSITION_UPLOAD',
                    actor: profil.namaTampilan,
                    role: 'SEKJEN BEM',
                    timestamp: now,
                    note: isUpdate 
                        ? `Memperbarui dokumen disposisi (${uploadedDocs.length} file).`
                        : `Mengupload ${uploadedDocs.length} dokumen disposisi/pencairan.`
                })
            });

            setIsDispositionOpen(false);
            showToast(isUpdate ? "Data disposisi diperbarui!" : "Selesai! Disposisi terkirim.");
        } catch (error) {
            console.error(error);
            showToast("Upload gagal: " + error.message, "error");
        } finally {
            setIsProcessing(false);
        }
    };

    // --- 5. REVIEW ACTIONS ---

    const handleOpenReview = (item, roleKey) => {
        setSelectedItem(item);
        
        // FIX MASTER ROLE LOGIC
        // Jika Master, gunakan roleKey dari tombol yg diklik
        const targetRole = myRole === 'master' ? roleKey : myRole;
        setReviewingRole(targetRole);
        
        setReviewNote('');
        setFeedbackFile(null);
        setIsModalOpen(true);
    };

    const submitReview = async (decision) => {
        // FIX VALIDATION: Cek reviewingRole, bukan myRole (karena Master punya myRole='master' yg ga valid di DB key)
        if (!reviewingRole) return showToast("Role tidak valid. Silakan refresh.", "error");
        if (decision === 'REJECTED' && !reviewNote) return showToast("Wajib isi catatan penolakan!", "error");

        setIsProcessing(true);
        try {
            let feedbackUrl = null;
            if (feedbackFile) {
                const folder = [periodeAktif.replace('/','-'), "BEM Pusat", "Feedback KM", selectedItem.activityName];
                feedbackUrl = await uploadToGoogleDrive(feedbackFile, folder);
            }

            const docRef = doc(db, 'activity_proposals', selectedItem.id);
            const now = new Date().toISOString();
            
            const targetKey = reviewingRole; 

            const updates = {
                [`approvalsKM.${targetKey}.status`]: decision,
                [`approvalsKM.${targetKey}.date`]: now,
                [`approvalsKM.${targetKey}.approver`]: profil.namaTampilan,
                [`approvalsKM.${targetKey}.note`]: reviewNote,
                [`approvalsKM.${targetKey}.feedbackUrl`]: feedbackUrl
            };

            const currentKM = { ...selectedItem.approvalsKM };
            currentKM[targetKey] = { status: decision };

            const requiredRoles = ['bem_dagri', 'bem_sekjen', 'bem_keu', 'dpm_banggar'];
            const isAllApproved = requiredRoles.every(r => currentKM[r]?.status === 'APPROVED');
            
            let logNote = reviewNote || `Keputusan: ${decision}`;

            if (decision === 'REJECTED') {
                updates.status = 'REVISION_KM'; 
                logNote = `Ditolak oleh ${targetKey.toUpperCase()}: ${reviewNote}`;
            } else if (isAllApproved) {
                updates.status = 'SUBMITTED_TO_CAMPUS'; 
                logNote = 'Disetujui KM (Full). Melanjutkan ke Birokrasi Kampus.';
            }

            updates.history = arrayUnion({
                action: decision === 'APPROVED' ? 'KM_APPROVE' : 'KM_REJECT',
                actor: profil.namaTampilan,
                role: `KM ${targetKey.toUpperCase()}`,
                timestamp: now,
                note: logNote,
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

    // --- HELPER COMPONENT ---
    const ApprovalCell = ({ item, data, label, roleKey }) => {
        const canEdit = myRole === roleKey || myRole === 'master';
        let bg = '#f1f5f9'; let color = '#64748b'; let icon = <Clock size={14}/>;
        
        if (data?.status === 'APPROVED') { bg='#dcfce7'; color='#166534'; icon=<CheckCircle size={14}/>; }
        if (data?.status === 'REJECTED') { bg='#fee2e2'; color='#991b1b'; icon=<XCircle size={14}/>; }

        return (
            <div style={{textAlign:'center', padding: '0 4px'}}>
                <div style={{fontSize:'0.65rem', fontWeight:700, color:'#64748b', marginBottom:4}}>{label}</div>
                {canEdit && data?.status !== 'APPROVED' ? (
                    <button 
                        onClick={() => handleOpenReview(item, roleKey)} 
                        style={styles.btnActionSmall}
                    >
                        Review
                    </button>
                ) : (
                    <div style={{...styles.badgeSmall, background:bg, color:color, justifyContent:'center'}}>
                        {icon}
                    </div>
                )}
            </div>
        )
    };

    return (
        <div style={styles.container}>
            {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
            
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>Verifikasi KM & Kampus</h1>
                    <p style={styles.subtitle}>Dashboard Birokrasi Pusat</p>
                </div>
                <div style={styles.roleBox}>
                    Login: <strong>{myRole ? myRole.toUpperCase().replace('_',' ') : 'VIEW ONLY'}</strong>
                </div>
            </div>

            <div style={styles.controls}>
                <div style={styles.searchWrapper}>
                    <Search size={18} color="#94a3b8"/>
                    <input 
                        placeholder="Cari kegiatan..." 
                        value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}
                        style={styles.searchInput}
                    />
                </div>
                <div style={styles.filterWrapper}>
                    <Building2 size={16} color="#64748b"/>
                    <select value={filterOrg} onChange={e=>setFilterOrg(e.target.value)} style={styles.selectInput}>
                        <option value="ALL">Semua Organisasi</option>
                        {uniqueOrgs.map(org => <option key={org} value={org}>{org}</option>)}
                    </select>
                </div>
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
                            <th width="15%" className="text-center">AKSI AKHIR</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredList.length > 0 ? filteredList.map(item => (
                            <tr key={item.id}>
                                <td>
                                    <div style={{fontWeight:700, color:'#0f172a'}}>{item.activityName}</div>
                                    <div style={{fontSize:'0.8rem', color:'#64748b', display:'flex', alignItems:'center', gap:6}}>
                                        <Building2 size={12}/> {item.orgName} ({item.divisionName})
                                    </div>
                                    <div style={styles.moneyBadge}>{formatRp(item.budgetRequested)}</div>
                                </td>
                                
                                <td><ApprovalCell item={item} data={item.approvalsKM?.bem_dagri} label="DAGRI" roleKey="bem_dagri" /></td>
                                <td><ApprovalCell item={item} data={item.approvalsKM?.bem_sekjen} label="SEKJEN" roleKey="bem_sekjen" /></td>
                                <td><ApprovalCell item={item} data={item.approvalsKM?.bem_keu} label="KEUANGAN" roleKey="bem_keu" /></td>
                                <td><ApprovalCell item={item} data={item.approvalsKM?.dpm_banggar} label="BANGGAR" roleKey="dpm_banggar" /></td>

                                <td className="text-center">
                                    {item.status === 'SUBMITTED_TO_CAMPUS' ? (
                                        (myRole === 'bem_sekjen' || myRole === 'master') ? (
                                            <button onClick={()=>openDispositionModal(item)} style={styles.btnUpload}>
                                                <UploadCloud size={14}/> Upload Disposisi
                                            </button>
                                        ) : (
                                            <span style={{fontSize:'0.75rem', color:'#f59e0b', background:'#fff7ed', padding:'4px 8px', borderRadius:4}}>Menunggu Sekjen</span>
                                        )
                                    ) : item.status === 'COMPLETED' ? (
                                        <div style={{display:'flex', gap:6, justifyContent:'center'}}>
                                            <button onClick={()=>{setSelectedItem(item); setIsViewDispositionOpen(true)}} style={styles.btnSuccess}>
                                                <Eye size={14}/>
                                            </button>
                                            
                                            {(myRole === 'bem_sekjen' || myRole === 'master') && (
                                                <button onClick={()=>openDispositionModal(item)} style={styles.btnEditDisp} title="Edit Disposisi">
                                                    <Edit size={14}/>
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <span style={{fontSize:'0.75rem', color:'#cbd5e0'}}>Proses Review</span>
                                    )}
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan="6" style={{textAlign:'center', padding:40, color:'#94a3b8'}}>Belum ada proposal masuk.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL REVIEW KM */}
            {isModalOpen && selectedItem && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <div style={styles.modalHeader}>
                            <div>
                                <h3 style={{margin:0}}>Verifikasi KM: {selectedItem.activityName}</h3>
                                <span style={{fontSize:'0.75rem', background:'#e0f2fe', color:'#0369a1', padding:'2px 6px', borderRadius:4}}>
                                    Bertindak sebagai: <strong>{reviewingRole?.toUpperCase().replace('_', ' ')}</strong>
                                </span>
                            </div>
                            <button onClick={()=>setIsModalOpen(false)} style={styles.closeBtn}><XCircle size={20}/></button>
                        </div>
                        <div style={styles.modalBody}>
                            
                            <div style={styles.infoBox}>
                                <div style={{display:'flex', justifyContent:'space-between', marginBottom: 12}}>
                                    <span><strong>Organisasi:</strong> {selectedItem.orgName}</span>
                                    <span><strong>Dana:</strong> {formatRp(selectedItem.budgetRequested)}</span>
                                </div>
                                <div style={{borderTop:'1px solid #bae6fd', paddingTop: 12}}>
                                    <label style={{fontSize:'0.8rem', fontWeight:700, color:'#0369a1', marginBottom:8, display:'block'}}>Dokumen:</label>
                                    <div style={{display:'flex', flexWrap:'wrap', gap: 8}}>
                                        {selectedItem.documents?.map((doc, idx) => (
                                            <a key={idx} href={doc.url} target="_blank" rel="noreferrer" style={styles.fileChip}>
                                                <FileText size={14}/> {doc.label}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Form Approval */}
                            {reviewingRole && selectedItem.status.includes('WAITING') && (
                                <div style={styles.reviewForm}>
                                    <label style={styles.label}>Catatan Review ({reviewingRole.toUpperCase()}):</label>
                                    <textarea 
                                        rows={3} style={styles.textarea}
                                        value={reviewNote} onChange={e=>setReviewNote(e.target.value)}
                                        placeholder="Tulis koreksi jika ada..."
                                    />
                                    <div style={styles.fileUploadBox}>
                                        <input type="file" id="feedbackFile" style={{display:'none'}} onChange={e=>setFeedbackFile(e.target.files[0])}/>
                                        <label htmlFor="feedbackFile" style={{cursor:'pointer', display:'flex', alignItems:'center', gap:8, fontSize:'0.85rem', color:'#475569'}}>
                                            <Paperclip size={16}/> {feedbackFile ? feedbackFile.name : 'Lampirkan file coretan (Opsional)'}
                                        </label>
                                    </div>

                                    <div style={{display:'flex', gap:12, marginTop:12}}>
                                        <button onClick={()=>submitReview('REJECTED')} disabled={isProcessing} style={styles.btnReject}>
                                            Tolak / Revisi
                                        </button>
                                        <button onClick={()=>submitReview('APPROVED')} disabled={isProcessing} style={styles.btnApprove}>
                                            Setujui (ACC)
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* History Log */}
                            <div style={{marginTop: 24}}>
                                <label style={styles.label}>Riwayat Aktivitas:</label>
                                <div style={styles.logBox}>
                                    {selectedItem.history?.slice().reverse().map((log, i) => (
                                        <div key={i} style={styles.logItem}>
                                            <div style={{display:'flex', justifyContent:'space-between', marginBottom: 4}}>
                                                <div style={{fontWeight: 700, fontSize: '0.85rem', color: '#1e293b'}}>
                                                    {log.actor} <span style={{fontWeight: 400, color: '#64748b'}}>({log.role})</span>
                                                </div>
                                                <div style={{fontSize: '0.75rem', color: '#94a3b8', display:'flex', alignItems:'center', gap:4}}>
                                                    <Clock size={12}/> {formatDateTime(log.timestamp)}
                                                </div>
                                            </div>
                                            <div style={{fontSize:'0.85rem'}}>
                                                <span style={{fontWeight:700, color: log.action.includes('REJECT') ? '#dc2626' : (log.action.includes('APPROVE') ? '#166534' : '#2563eb'), marginRight: 6}}>{log.action}</span>
                                                {log.note && <span style={{color:'#475569'}}>"{log.note}"</span>}
                                            </div>
                                            {log.attachmentUrl && (
                                                <a href={log.attachmentUrl} target="_blank" rel="noreferrer" style={styles.linkSmall}><Download size={12}/> Lihat File Revisi</a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL UPLOAD/EDIT DISPOSISI */}
            {isDispositionOpen && selectedItem && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <div style={styles.modalHeader}>
                            <h3>{selectedItem.status === 'COMPLETED' ? 'Edit Dokumen Disposisi' : 'Upload Disposisi & Pencairan'}</h3>
                            <button onClick={()=>setIsDispositionOpen(false)} style={styles.closeBtn}><XCircle size={20}/></button>
                        </div>
                        <div style={{padding:24}}>
                            <p style={{fontSize:'0.9rem', color:'#64748b', marginBottom:16}}>
                                Upload surat SK, Bukti Transfer, atau dokumen tanda pencairan dana.
                            </p>

                            {/* List File */}
                            <div style={{marginBottom:16, display:'flex', flexDirection:'column', gap:8}}>
                                {dispDocList.map((item, i) => (
                                    <div key={i} style={styles.docItem}>
                                        <div style={{flex:1}}>
                                            <div style={{fontWeight:600, fontSize:'0.85rem'}}>{item.note}</div>
                                            <div style={{fontSize:'0.75rem', color:'#64748b'}}>{item.fileName} {item.url && '(Tersimpan)'}</div>
                                        </div>
                                        <button onClick={()=>handleRemoveDispFile(i)} style={styles.btnRemove}><XCircle size={16}/></button>
                                    </div>
                                ))}
                            </div>

                            {/* Input Form */}
                            <div style={styles.uploadRow}>
                                <input 
                                    placeholder="Nama Dokumen (cth: Bukti Transfer)" 
                                    value={tempDispNote} 
                                    onChange={e=>setTempDispNote(e.target.value)}
                                    style={styles.inputSmall}
                                />
                                <input type="file" id="dispFile" hidden onChange={handleAddDispFile} />
                                <label htmlFor="dispFile" style={styles.btnChoose}>Pilih File</label>
                            </div>

                            <button 
                                onClick={submitDisposition} 
                                disabled={isProcessing || dispDocList.length === 0}
                                style={{...styles.btnApprove, marginTop:24, width:'100%'}}
                            >
                                {isProcessing ? 'Menyimpan Perubahan...' : 'Simpan & Update Status'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL VIEW DISPOSISI (LIHAT HASIL) */}
            {isViewDispositionOpen && selectedItem && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <div style={styles.modalHeader}>
                            <h3>Dokumen Disposisi / Pencairan</h3>
                            <button onClick={()=>setIsViewDispositionOpen(false)} style={styles.closeBtn}><XCircle size={20}/></button>
                        </div>
                        <div style={{padding:24}}>
                            <div style={{display:'flex', flexWrap:'wrap', gap: 12}}>
                                {selectedItem.dispositionDocuments?.map((doc, idx) => (
                                    <div key={idx} style={styles.dispCard}>
                                        <FileText size={24} color="#059669"/>
                                        <div style={{margin:'8px 0'}}>
                                            <div style={{fontWeight:700, fontSize:'0.85rem'}}>{doc.note}</div>
                                            <div style={{fontSize:'0.75rem', color:'#64748b'}}>{doc.fileName}</div>
                                        </div>
                                        <a href={doc.url} target="_blank" rel="noreferrer" style={styles.linkSmall}>Download</a>
                                    </div>
                                ))}
                                {!selectedItem.dispositionDocuments && selectedItem.dispositionUrl && (
                                    <div style={styles.dispCard}>
                                        <FileText size={24} color="#059669"/>
                                        <div style={{margin:'8px 0', fontWeight:700, fontSize:'0.85rem'}}>Surat Disposisi</div>
                                        <a href={selectedItem.dispositionUrl} target="_blank" rel="noreferrer" style={styles.linkSmall}>Download</a>
                                    </div>
                                )}
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
    container: { padding: 32, fontFamily: 'Inter, sans-serif', maxWidth: 1400, margin: '0 auto' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    title: { fontSize: '1.8rem', fontWeight: 800, margin: 0, color: '#0f172a' },
    subtitle: { color: '#64748b', margin: 0 },
    roleBox: { background: '#e0e7ff', color: '#3730a3', padding: '8px 16px', borderRadius: 8, fontSize: '0.9rem' },
    
    controls: { marginBottom: 20, display: 'flex', gap: 12 },
    searchWrapper: { flex: 1, display: 'flex', alignItems: 'center', background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0 12px' },
    searchInput: { border: 'none', padding: '10px', outline: 'none', width: '100%', fontSize: '0.9rem' },
    filterWrapper: { display: 'flex', alignItems: 'center', gap: 8, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0 12px' },
    selectInput: { border: 'none', outline: 'none', padding: '10px', background: 'transparent', fontWeight: 600, color: '#475569', cursor: 'pointer' },

    tableCard: { background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' },
    table: { width: '100%', borderCollapse: 'collapse' },
    moneyBadge: { display: 'inline-block', fontSize: '0.75rem', background: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: 4, marginTop: 4, fontWeight: 700 },
    
    btnActionSmall: { background: '#2563eb', color: 'white', border: 'none', padding: '4px 8px', borderRadius: 6, cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600 },
    badgeSmall: { display: 'inline-flex', padding: '4px', borderRadius: 6, fontSize: '0.7rem' },
    
    btnUpload: { background: '#f59e0b', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 },
    btnSuccess: { background: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' },
    btnEditDisp: { background: 'white', border: '1px solid #d1d5db', color: '#4b5563', padding: '6px 8px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },

    // Modal
    modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' },
    modalContent: { background: 'white', width: '90%', maxWidth: 600, borderRadius: 16, overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' },
    modalHeader: { padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' },
    closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' },
    modalBody: { padding: 24, overflowY: 'auto' },
    
    infoBox: { background: '#f0f9ff', border: '1px solid #bae6fd', padding: 16, borderRadius: 12, marginBottom: 20, fontSize: '0.9rem' },
    fileChip: { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'white', padding: '6px 12px', borderRadius: 20, border: '1px solid #bae6fd', fontSize: '0.8rem', color: '#0284c7', textDecoration: 'none', fontWeight: 600 },
    
    reviewForm: { background: '#fff', border: '1px solid #e2e8f0', padding: 16, borderRadius: 12, boxShadow: '0 4px 6px -2px rgba(0,0,0,0.05)' },
    fileUploadBox: { marginTop: 12, border: '1px dashed #cbd5e0', padding: 10, borderRadius: 8, background: '#f8fafc' },

    logBox: { maxHeight: 250, overflowY: 'auto', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 },
    logItem: { fontSize: '0.8rem', borderBottom: '1px dashed #cbd5e1', paddingBottom: 10, marginBottom: 10 },
    linkSmall: { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#2563eb', marginTop: 4, textDecoration: 'none', fontWeight: 600, background:'#eff6ff', padding:'2px 8px', borderRadius:4 },
    
    label: { display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: 6, color: '#334155' },
    textarea: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e0', boxSizing: 'border-box', fontFamily: 'inherit' },
    fileInput: { width: '100%', padding: 10, border: '1px dashed #cbd5e0', borderRadius: 8, background: '#f8fafc' },
    
    btnApprove: { flex: 1, background: '#10b981', color: 'white', border: 'none', padding: 12, borderRadius: 8, fontWeight: 700, cursor: 'pointer' },
    btnReject: { flex: 1, background: '#fee2e2', color: '#991b1b', border: 'none', padding: 12, borderRadius: 8, fontWeight: 700, cursor: 'pointer' },

    // Disposition Styles
    docItem: { display:'flex', alignItems:'center', justifyContent:'space-between', background:'#f8fafc', padding:10, borderRadius:8, border:'1px solid #e2e8f0' },
    btnRemove: { background:'none', border:'none', color:'#ef4444', cursor:'pointer' },
    uploadRow: { display:'flex', gap:8, alignItems:'center', background:'#f8fafc', padding:10, borderRadius:8 },
    inputSmall: { flex:1, padding:8, borderRadius:6, border:'1px solid #cbd5e0', fontSize:'0.85rem' },
    btnChoose: { background:'#2563eb', color:'white', padding:'8px 12px', borderRadius:6, fontSize:'0.8rem', cursor:'pointer' },
    dispCard: { width: 140, padding: 16, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, textAlign: 'center' }
};

// Inject CSS
const styleSheet = document.createElement("style");
styleSheet.innerHTML = `
    .table th { text-align: left; padding: 14px 20px; background: #f8fafc; color: #64748b; font-size: 0.75rem; font-weight: 700; border-bottom: 1px solid #e2e8f0; }
    .table td { padding: 12px 20px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    .table tr:last-child td { border-bottom: none; }
    @keyframes slideUp { from { transform: translate(-50%, 20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
`;
document.head.appendChild(styleSheet);

export default VerifikasiEksternal;