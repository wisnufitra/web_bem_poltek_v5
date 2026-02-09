// src/components/layanan-berkas/AdminBerkas.js
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth, storage } from '../../firebase/firebaseConfig';
import { collection, onSnapshot, query, doc, updateDoc, serverTimestamp, orderBy, getDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged } from 'firebase/auth';
import { logActivity } from '../../utils/logActivity';

// --- PERBAIKAN: Menambahkan kembali komponen yang hilang ---
// Komponen kecil untuk mengunggah file balasan oleh admin
const FinalResponseUploader = ({ onUploadComplete }) => {
    const [uploading, setUploading] = useState(false);
    const [fileName, setFileName] = useState('');

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setUploading(true);
            const storageRef = ref(storage, `final-responses/${Date.now()}_${selectedFile.name}`);
            const uploadTask = uploadBytesResumable(storageRef, selectedFile);
            uploadTask.on('state_changed', 
                () => {}, 
                (error) => { console.error("Upload error:", error); setUploading(false); }, 
                () => {
                    getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                        onUploadComplete(downloadURL, selectedFile.name);
                        setFileName(selectedFile.name);
                        setUploading(false);
                    });
                }
            );
        }
    };
    
    if (fileName) return <p style={{color: '#4CAF50', fontWeight: 'bold'}}>✅ Berkas balasan berhasil diunggah: {fileName}</p>;
    
    return (
        <input type="file" onChange={handleFileChange} disabled={uploading} style={{width: '100%'}}/>
    );
};


const AdminBerkas = () => {
    const [userProfile, setUserProfile] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [catatanVerifikasi, setCatatanVerifikasi] = useState("");
    const navigate = useNavigate();
    const [formFields, setFormFields] = useState([]);
    const [masterVerifierRole, setMasterVerifierRole] = useState('sekjend');
    
    const [searchTerm, setSearchTerm] = useState("");
    const [displayLimit, setDisplayLimit] = useState(10);
    const [statusFilter, setStatusFilter] = useState("Semua");
    const [finalResponse, setFinalResponse] = useState({ catatan: '', fileUrl: '', fileName: '' });
    
    const roleMapping = { 'Sekretariat Jenderal': 'sekjend', 'Kementerian Dalam Negeri': 'kemendagri', 'Kementerian Keuangan': 'kemenkeu', 'Banggar DPM': 'banggar' };

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                const userDocRef = doc(db, 'users', currentUser.uid);
                const unsubProfile = onSnapshot(userDocRef, (docSnap) => {
                    if (docSnap.exists() && (docSnap.data().role === 'admin' || docSnap.data().role === 'master' || docSnap.data().role === 'banggar')) {
                        setUserProfile(docSnap.data());
                    } else {
                        navigate('/login');
                    }
                });
                return () => unsubProfile();
            } else { navigate('/login'); }
        });
        const qSubmissions = query(collection(db, "submissions"), orderBy('createdAt', 'desc'));
        const unsubscribeSubmissions = onSnapshot(qSubmissions, (snapshot) => {
            setSubmissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        const qFields = query(collection(db, "submissionFormFields"), orderBy("position", "asc"));
        const unsubscribeFields = onSnapshot(qFields, (snapshot) => {
            setFormFields(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => { unsubscribeAuth(); unsubscribeSubmissions(); unsubscribeFields(); };
    }, [navigate]);
    
    const filteredSubmissions = useMemo(() => {
        return submissions
            .filter(sub => {
                const matchesStatus = statusFilter === "Semua" || sub.currentStatus === statusFilter;
                const matchesSearch = (sub.namaKegiatan || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                                    (sub.penyelenggara || '').toLowerCase().includes(searchTerm.toLowerCase());
                return matchesStatus && matchesSearch;
            });
    }, [submissions, searchTerm, statusFilter]);

    const getVerifierKeyForUser = () => {
        if (!userProfile) return null;
        if (userProfile.role === 'master') return 'master';
        return roleMapping[userProfile.kementerian];
    };

    const handleUpdateVerification = async (submissionId, verifierKey, newStatus) => {
        if (!verifierKey) return alert("Peran Anda tidak terdefinisi.");
        const finalVerifierKey = userProfile.role === 'master' ? masterVerifierRole : verifierKey;
        if (newStatus === 'revisi' && !catatanVerifikasi) {
            alert("Catatan verifikasi wajib diisi saat meminta revisi.");
            return;
        }
        const docRef = doc(db, "submissions", submissionId);
        const updatePath = `verifiers.${finalVerifierKey}`;
        const newCurrentStatus = newStatus === 'revisi' ? 'Revisi Diperlukan' : 'Dalam Proses Verifikasi';
        const catatan = newStatus === 'menunggu' ? '' : catatanVerifikasi;

        await updateDoc(docRef, {
            [updatePath]: { status: newStatus, catatan: catatan, updatedAt: serverTimestamp() },
            currentStatus: newCurrentStatus, updatedAt: serverTimestamp()
        });
        await logActivity(`Memperbarui status tiket ${selectedSubmission.ticketId} oleh ${finalVerifierKey} menjadi ${newStatus}`);
        setCatatanVerifikasi("");
        setSelectedSubmission(prev => ({
            ...prev,
            currentStatus: newCurrentStatus,
            verifiers: { ...prev.verifiers, [finalVerifierKey]: { ...prev.verifiers[finalVerifierKey], status: newStatus, catatan: catatan } }
        }));
    };

    const handleFinalApproval = async (submissionId) => {
        const docRef = doc(db, "submissions", submissionId);
        await updateDoc(docRef, { currentStatus: 'Disetujui', updatedAt: serverTimestamp() });
        await logActivity(`Menyetujui (ACC) tiket ${selectedSubmission.ticketId}`);
        setSelectedSubmission(prev => ({...prev, currentStatus: 'Disetujui'}));
    };
    
    const handleFinalResponse = async (submissionId) => {
        if (!finalResponse.catatan && !finalResponse.fileUrl) {
            alert("Harap isi catatan atau berikan tautan surat balasan.");
            return;
        }
        const docRef = doc(db, "submissions", submissionId);
        await updateDoc(docRef, {
            finalResponse: finalResponse,
            currentStatus: 'Selesai'
        });
        await logActivity(`Memberikan tindak lanjut final untuk tiket ${selectedSubmission.ticketId}`);
        setSelectedSubmission(prev => ({...prev, currentStatus: 'Selesai', finalResponse: finalResponse}));
        setFinalResponse({ catatan: '', fileUrl: '', fileName: '' });
    };
    
    const formatTimestamp = (timestamp) => {
        if (!timestamp?.seconds) return 'N/A';
        return new Date(timestamp.seconds * 1000).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
    };

    // --- Styles ---
    const containerStyle = { maxWidth: '1200px', margin: '40px auto', padding: '20px' };
    const cardStyle = (status) => ({ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', marginBottom: '15px', cursor: 'pointer', borderLeft: `5px solid ${{ 'Revisi Diperlukan': '#ff9800', 'Disetujui': '#4CAF50', 'Selesai': '#607d8b', 'Diajukan': '#2196F3' }[status] || '#00092f'}` });
    const modalOverlayStyle = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000, padding: "20px" };
    const modalContentStyle = { backgroundColor: "white", padding: "30px", borderRadius: "12px", width: "100%", maxWidth: "800px", maxHeight: '90vh', overflowY: 'auto' };
    const buttonStyle = { padding: "10px 20px", backgroundColor: "#00092f", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" };
    const verifierStatusBoxStyle = (status) => ({ ...statusLabelStyle(status), padding: '6px 12px', width: '100px', textAlign: 'center' });
    const statusLabelStyle = (status) => {
        const colors = { menunggu: { bg: '#e0e0e0', text: '#333' }, diverifikasi: { bg: '#4CAF50', text: 'white' }, revisi: { bg: '#ff9800', text: 'white' }, diajukan: { bg: '#2196F3', text: 'white' }, revisidiperlukan: { bg: '#ff9800', text: 'white' }, disetujui: { bg: '#4CAF50', text: 'white' }, selesai: {bg: '#607d8b', text: 'white'} };
        const s = status ? status.toLowerCase().replace(/\s/g, '') : 'menunggu';
        const color = colors[s] || colors.menunggu;
        return { backgroundColor: color.bg, color: color.text, padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' };
    };
    const verifierKey = getVerifierKeyForUser();
    
    return (
        <div style={containerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' }}>
                <h1 style={{ color: "#00092f", margin: 0 }}>Panel Admin Berkas</h1>
                <input 
                    type="text"
                    placeholder="Cari kegiatan atau penyelenggara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', minWidth: '300px' }}
                />
            </div>
            
            <div style={{display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap'}}>
                {["Semua", "Dalam Proses Verifikasi", "Revisi Diperlukan", "Disetujui", "Selesai"].map(status => (
                    <button key={status} onClick={() => setStatusFilter(status)} style={{...buttonStyle, backgroundColor: statusFilter === status ? '#00092f' : '#e0e0e0', color: statusFilter === status ? 'white' : '#333'}}>
                        {status}
                    </button>
                ))}
            </div>

            {loading ? <p style={{ textAlign: 'center' }}>Memuat data pengajuan...</p> : filteredSubmissions.length === 0 ? <p style={{ textAlign: 'center' }}>Tidak ada pengajuan berkas yang cocok.</p> : (
                <>
                    {filteredSubmissions.slice(0, displayLimit).map(sub => (
                        <div key={sub.id} style={cardStyle(sub.currentStatus)} onClick={() => setSelectedSubmission(sub)}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h4 style={{ margin: 0, color: '#00092f' }}>{sub.namaKegiatan}</h4>
                                    <p style={{ margin: '5px 0 0', color: '#666', fontSize: '14px' }}>Oleh: {sub.penyelenggara} - Tiket: {sub.ticketId}</p>
                                </div>
                                <div style={{textAlign: 'right'}}>
                                    <span style={statusLabelStyle(sub.currentStatus)}>{sub.currentStatus}</span>
                                    <p style={{ margin: '5px 0 0', color: '#aaa', fontSize: '12px' }}>{formatTimestamp(sub.createdAt)}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredSubmissions.length > displayLimit && (
                        <div style={{textAlign: 'center', marginTop: '30px'}}>
                            <button onClick={() => setDisplayLimit(prev => prev + 10)} style={buttonStyle}>Muat Lebih Banyak</button>
                        </div>
                    )}
                </>
            )}
            
            {selectedSubmission && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                           <h2 style={{ color: '#00092f', margin: 0, fontSize: '24px' }}>Detail Tiket: {selectedSubmission.ticketId}</h2>
                           <button onClick={() => setSelectedSubmission(null)} style={{ ...buttonStyle, backgroundColor: '#6c757d' }}>Tutup</button>
                        </div>
                        <h4 style={{ color: '#00092f', marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Informasi Pengajuan</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px 25px', marginBottom: '25px', fontSize: '15px' }}>
                            <div><strong>Nama Kegiatan:</strong><p style={{ margin: '5px 0 0', color: '#555' }}>{selectedSubmission.namaKegiatan}</p></div>
                            <div><strong>Penyelenggara:</strong><p style={{ margin: '5px 0 0', color: '#555' }}>{selectedSubmission.penyelenggara}</p></div>
                            <div><strong>Kontak:</strong><p style={{ margin: '5px 0 0', color: '#555' }}>{selectedSubmission.kontak}</p></div>
                            <div><strong>Tanggal Diajukan:</strong><p style={{ margin: '5px 0 0', color: '#555' }}>{formatTimestamp(selectedSubmission.createdAt)}</p></div>
                        </div>
                        <h4 style={{ color: '#00092f', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Dokumen Terlampir</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '25px', fontSize: '15px' }}>
                           {formFields.filter(field => field.type === 'file' && selectedSubmission[field.fieldName]).map(field => {
                                const value = selectedSubmission[field.fieldName];
                                return (
                                    <div key={field.fieldName}>
                                        <strong>{field.label}:</strong>
                                        <a href={value} target="_blank" rel="noopener noreferrer" style={{color: '#00092f', fontWeight: 'bold', wordBreak: 'break-all', display: 'block', marginTop: '5px'}}>
                                            {value}
                                        </a>
                                    </div>
                                )
                           })}
                        </div>
                        <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #eee' }} />
                        <h4 style={{ color: '#00092f' }}>Status Verifikasi:</h4>
                        {selectedSubmission.verifiers && Object.entries(selectedSubmission.verifiers).map(([key, value]) => (
                            <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                                <div><strong style={{ textTransform: 'capitalize' }}>{key}</strong>{value.catatan && <p style={{ color: '#d32f2f', fontSize: '13px', margin: '5px 0 0' }}>Catatan: {value.catatan}</p>}</div>
                                <span style={verifierStatusBoxStyle(value.status)}>{value.status}</span>
                            </div>
                        ))}
                        {(verifierKey && !['Disetujui', 'Selesai'].includes(selectedSubmission.currentStatus)) && (
                            <>
                                <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #eee' }} />
                                <h4 style={{ color: '#00092f' }}>Tindakan Anda</h4>
                                <div style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '8px' }}>
                                    {verifierKey === 'master' && (<div style={{marginBottom: '15px'}}><label>Verifikasi sebagai:</label><select value={masterVerifierRole} onChange={(e) => setMasterVerifierRole(e.target.value)} style={{width: '100%', padding: '8px', marginTop: '5px', borderRadius: '6px', border: '1px solid #ccc'}}><option value="sekjend">Sekretaris Jenderal</option><option value="kemendagri">Kementerian Dalam Negeri</option><option value="kemenkeu">Kementerian Keuangan</option><option value="banggar">Badan Anggaran DPM</option></select></div>)}
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        {selectedSubmission.verifiers[verifierKey === 'master' ? masterVerifierRole : verifierKey]?.status !== 'diverifikasi' ? (
                                            <>
                                                <button onClick={() => handleUpdateVerification(selectedSubmission.id, verifierKey, 'diverifikasi')} style={{ ...buttonStyle, backgroundColor: '#4CAF50' }}>✅ Verifikasi</button>
                                                <button onClick={() => handleUpdateVerification(selectedSubmission.id, verifierKey, 'revisi')} style={{ ...buttonStyle, backgroundColor: '#ff9800' }}>⚠️ Minta Revisi</button>
                                                <textarea value={catatanVerifikasi} onChange={(e) => setCatatanVerifikasi(e.target.value)} placeholder="Tulis catatan di sini (wajib jika revisi)..." style={{ flexGrow: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ccc', minHeight: '40px' }} />
                                            </>
                                        ) : (
                                            <button onClick={() => handleUpdateVerification(selectedSubmission.id, verifierKey, 'menunggu')} style={{ ...buttonStyle, backgroundColor: '#757575' }}>❌ Batal Verifikasi</button>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                        {userProfile && (userProfile.role === 'master' || userProfile.kementerian === 'Sekretariat Jenderal') && selectedSubmission.verifiers && Object.values(selectedSubmission.verifiers).every(v => v.status === 'diverifikasi') && selectedSubmission.currentStatus !== 'Disetujui' && selectedSubmission.currentStatus !== 'Selesai' && (
                            <>
                                <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #eee' }} />
                                <h4 style={{ color: '#00092f' }}>Persetujuan Final</h4>
                                <button onClick={() => handleFinalApproval(selectedSubmission.id)} style={{ ...buttonStyle, width: '100%', backgroundColor: '#1e88e5', fontSize: '16px' }}>👍 ACC BERKAS INI</button>
                            </>
                        )}
                        {userProfile && (userProfile.role === 'master' || userProfile.kementerian === 'Sekretariat Jenderal') && selectedSubmission.currentStatus === 'Disetujui' && (
                             <>
                                <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #eee' }} />
                                <h4 style={{ color: '#00092f' }}>Tindak Lanjut Final</h4>
                                <div style={{ backgroundColor: '#e8f5e9', padding: '15px', borderRadius: '8px' }}>
                                    <div>
                                        <label>Unggah Surat Balasan (Opsional):</label>
                                        <FinalResponseUploader onUploadComplete={(url, name) => setFinalResponse(prev => ({...prev, fileUrl: url, fileName: name}))} />
                                    </div>
                                    <div style={{marginTop: '15px'}}><label>Catatan Final (Opsional):</label><textarea value={finalResponse.catatan} onChange={(e) => setFinalResponse(prev => ({...prev, catatan: e.target.value}))} placeholder="Contoh: Surat fisik dapat diambil di sekretariat BEM." style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', minHeight: '60px', marginTop: '5px' }} /></div>
                                    <button onClick={() => handleFinalResponse(selectedSubmission.id)} style={{ ...buttonStyle, backgroundColor: '#00796b', marginTop: '15px' }}>Tandai Selesai & Kirim</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
export default AdminBerkas;

