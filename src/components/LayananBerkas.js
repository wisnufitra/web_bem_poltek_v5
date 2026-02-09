// src/components/LayananBerkas.js

import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { db, auth, storage } from '../firebase/firebaseConfig'; // 1. Import 'storage'
import { collection, addDoc, getDocs, onSnapshot, query, where, doc, updateDoc, serverTimestamp, orderBy, getDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage"; // 2. Import fungsi-fungsi storage
import { onAuthStateChanged } from 'firebase/auth';

// --- FUNGSI LOGGING ---
export const logActivity = async (action) => {
    try {
        const user = auth.currentUser;
        if (user) {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            const userName = userDoc.exists() ? userDoc.data().namaTampilan : user.email;
            await addDoc(collection(db, 'histori'), {
                timestamp: serverTimestamp(),
                oleh: userName,
                action: action
            });
        }
    } catch (error) {
        console.error("Gagal mencatat aktivitas: ", error);
    }
};

// ====================================================================
// Komponen Induk Layout
// ====================================================================
export const LayananBerkas = () => {
    return (
        <div style={{ backgroundColor: '#f0f2f5', minHeight: 'calc(100vh - 90px)' }}>
            <Outlet />
        </div>
    );
};


// ====================================================================
// Halaman Portal Utama (/layanan/berkaskm)
// ====================================================================
export const PortalLayanan = () => {
    // ... (Tidak ada perubahan di sini, sama seperti sebelumnya) ...
    const cardStyle = {
        backgroundColor: "white", padding: "24px 20px", borderRadius: "14px",
        boxShadow: "0 4px 14px rgba(0,0,0,0.08)", textAlign: "center",
        cursor: "pointer", transition: "transform 0.2s, box-shadow 0.2s",
        display: "flex", flexDirection: "column", height: "100%",
        textDecoration: "none", color: "inherit",
    };
    const featuredGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "28px" };

    return (
        <div style={{ maxWidth: '900px', margin: '50px auto', padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '50px' }}>
                <h1 style={{ color: "#00092f", fontSize: "34px", fontWeight: "bold" }}>Sistem Pelacakan Berkas (SI-LAKAS)</h1>
                <p style={{ color: '#555', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>Pusat layanan untuk mengajukan, melacak, dan mengelola semua pengajuan berkas Anda secara online. Transparan, cepat, dan efisien.</p>
            </div>
            <div style={featuredGridStyle}>
                <Link to="/layanan/berkaskm/ajukan" style={cardStyle}
                    onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.12)"; }}
                    onMouseOut={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.08)"; }}>
                    <span style={{ fontSize: "52px" }}>📄</span>
                    <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                        <h3 style={{ color: "#00092f", marginTop: "18px", fontSize: "20px" }}>SI-BERKAS</h3>
                    </div>
                    <p style={{ color: "#666", fontSize: "15px", marginTop: "12px" }}>Punya pengajuan baru? Mulai proses pengumpulan berkas Anda di sini.</p>
                </Link>

                <Link to="/layanan/berkaskm/lacak" style={cardStyle}
                    onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.12)"; }}
                    onMouseOut={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.08)"; }}>
                    <span style={{ fontSize: "52px" }}>🔍</span>
                    <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                        <h3 style={{ color: "#00092f", marginTop: "18px", fontSize: "20px" }}>SI-LAKAS</h3>
                    </div>
                    <p style={{ color: "#666", fontSize: "15px", marginTop: "12px" }}>Sudah mengajukan? Lacak status dan progres berkas Anda di sini.</p>
                </Link>
            </div>
            <div style={{ textAlign: 'center', marginTop: '40px' }}>
                <Link to="/admin/berkas" style={{ color: '#00092f', fontWeight: 'bold' }}>Login Staf/Admin</Link>
            </div>
        </div>
    );
};


// ====================================================================
// Halaman Formulir Pengajuan (/layanan/berkaskm/ajukan) - VERSI BARU
// ====================================================================

// --- Komponen baru untuk menangani upload file ---
const FileUploader = ({ label, onUploadComplete, fieldName }) => {
    const [file, setFile] = useState(null);
    const [progress, setProgress] = useState(0);
    const [uploading, setUploading] = useState(false);
    const inputRef = useRef(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            handleUpload(selectedFile);
        }
    };

    const handleUpload = (fileToUpload) => {
        if (!fileToUpload) return;
        setUploading(true);
        const storageRef = ref(storage, `submissions/${Date.now()}_${fileToUpload.name}`);
        const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

        uploadTask.on('state_changed',
            (snapshot) => {
                const prog = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                setProgress(prog);
            },
            (error) => {
                console.error("Upload error:", error);
                setUploading(false);
            },
            () => {
                getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                    onUploadComplete(fieldName, downloadURL);
                    setUploading(false);
                });
            }
        );
    };

    const formatBytes = (bytes, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    // Styles
    const uploadButtonStyle = { padding: '8px 16px', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#f9f9f9' };
    const fileInfoStyle = { display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', backgroundColor: '#f0f2f5', padding: '10px', borderRadius: '6px' };
    const progressBarStyle = { width: '100%', height: '4px', backgroundColor: '#e0e0e0', borderRadius: '2px', marginTop: '5px' };

    return (
        <div>
            <input type="file" ref={inputRef} style={{ display: 'none' }} onChange={handleFileChange} />
            <button type="button" onClick={() => inputRef.current.click()} style={uploadButtonStyle} disabled={uploading}>
                {uploading ? `Mengunggah... ${progress}%` : 'Add file'}
            </button>
            {file && !uploading && (
                <div style={fileInfoStyle}>
                    <span>📄</span>
                    <span>{file.name} ({formatBytes(file.size)})</span>
                    <button type="button" onClick={() => { setFile(null); onUploadComplete(fieldName, ''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto' }}>✖</button>
                </div>
            )}
             {uploading && (
                <div style={progressBarStyle}>
                    <div style={{ width: `${progress}%`, height: '100%', backgroundColor: '#00092f', borderRadius: '2px', transition: 'width 0.3s' }}></div>
                </div>
            )}
        </div>
    );
};

export const FormPengajuan = () => {
    const daftarOrganisasi = [ "BEM", "DPM", "MM", "HIMA TKN", "HIMA EINSTEIN.COM", "HIMA EMC", "UKM Kalam", "UKM Robotika", "UKM Pers Beta", "UKM Walang", "UKM Voli", "UKM Futsal", "UKM Basket", "UKM Badminton", "UKM Beladiri", "UKM Seni", "UKM PMK", "UKM Riset" ];
    
    // State sekarang menyimpan URL file, bukan object file
    const [formData, setFormData] = useState({
        penyelenggara: '', namaKegiatan: '', kontak: '',
        proposal: '', suratIzin: '', lpj: '', spj: '', 
        kategoriSuratLainnya: '', suratLainnya: ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [submittedTicket, setSubmittedTicket] = useState(null);
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleUploadComplete = (fieldName, url) => {
        setFormData(prev => ({ ...prev, [fieldName]: url }));
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.penyelenggara || !formData.namaKegiatan || !formData.kontak) {
            setError("Harap lengkapi semua informasi dasar.");
            return;
        }
        setError('');
        setLoading(true);

        try {
            const ticketId = `BEM-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
            
            const submissionData = {
                ticketId,
                penyelenggara: formData.penyelenggara,
                namaKegiatan: formData.namaKegiatan,
                kontak: formData.kontak,
                dokumen: {
                    proposal: formData.proposal,
                    suratIzin: formData.suratIzin,
                    lpj: formData.lpj,
                    spj: formData.spj,
                    kategoriSuratLainnya: formData.kategoriSuratLainnya,
                    suratLainnya: formData.suratLainnya
                },
                currentStatus: 'Diajukan',
                verifiers: { sekjend: { status: "menunggu", updatedAt: null, catatan: "" }, kemendagri: { status: "menunggu", updatedAt: null, catatan: "" }, kemenkeu: { status: "menunggu", updatedAt: null, catatan: "" }, banggar: { status: "menunggu", updatedAt: null, catatan: "" } },
                createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
            };

            await addDoc(collection(db, "submissions"), submissionData);
            await logActivity(`Mengajukan berkas baru: "${formData.namaKegiatan}" (Tiket: ${ticketId})`);
            setSubmittedTicket(ticketId);

        } catch (err) {
            console.error("Error submitting document: ", err);
            setError("Terjadi kesalahan saat mengirimkan berkas. Silakan coba lagi.");
        } finally {
            setLoading(false);
        }
    };
    
    // Styles
    const formContainerStyle = { maxWidth: '750px', margin: '40px auto' };
    const formHeaderStyle = { backgroundColor: 'white', padding: '20px', borderTopLeftRadius: '12px', borderTopRightRadius: '12px', borderTop: '10px solid #00092f' };
    const questionCardStyle = { backgroundColor: 'white', padding: '20px', borderRadius: '12px', marginBottom: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' };
    const inputStyle = { width: '100%', padding: '12px', marginTop: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '15px' };
    const buttonStyle = { padding: '12px 22px', backgroundColor: '#00092f', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' };

    if (submittedTicket) {
        return (
            <div style={{ ...formContainerStyle, textAlign: 'center', padding: '40px', backgroundColor: 'white', borderRadius: '12px' }}>
                <span style={{ fontSize: '64px' }}>✅</span>
                <h2 style={{ color: '#00092f' }}>Pengajuan Berhasil!</h2>
                <p>Terima kasih, berkas Anda telah berhasil kami terima. Silakan simpan nomor tiket Anda untuk melakukan pelacakan.</p>
                <div style={{ backgroundColor: '#e3f2fd', padding: '20px', borderRadius: '8px', margin: '20px 0', border: '1px solid #bde0fe' }}>
                    <p style={{ margin: 0 }}>Nomor Tiket Anda:</p>
                    <h3 style={{ margin: '5px 0', fontSize: '24px', color: '#00092f' }}>{submittedTicket}</h3>
                </div>
                <button onClick={() => navigate('/layanan/berkaskm/lacak')} style={buttonStyle}>Lacak Tiket Sekarang</button>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} style={formContainerStyle}>
            <div style={formHeaderStyle}>
                <h2 style={{ margin: 0 }}>Pengumpulan Berkas Administrasi</h2>
            </div>
            
            <div style={{...questionCardStyle, marginTop: '15px'}}>
                <label>Penyelenggara/Pengirim *</label>
                <select name="penyelenggara" value={formData.penyelenggara} onChange={handleChange} style={inputStyle} required>
                    <option value="" disabled>-- Pilih Penyelenggara --</option>
                    {daftarOrganisasi.map(org => <option key={org} value={org}>{org}</option>)}
                </select>
            </div>
            <div style={questionCardStyle}>
                <label>Nama Kegiatan *</label>
                <input name="namaKegiatan" value={formData.namaKegiatan} onChange={handleChange} placeholder="Jawaban Anda" style={inputStyle} required />
            </div>
            <div style={questionCardStyle}>
                <label>Email Organisasi/No.WhatsApp yang dapat dihubungi *</label>
                <input name="kontak" value={formData.kontak} onChange={handleChange} placeholder="Jawaban Anda" style={inputStyle} required />
            </div>
            <div style={questionCardStyle}>
                <label>Proposal Kegiatan</label>
                <FileUploader label="Proposal" fieldName="proposal" onUploadComplete={handleUploadComplete} />
            </div>
            <div style={questionCardStyle}>
                <label>Surat Izin Kegiatan</label>
                <FileUploader label="Surat Izin" fieldName="suratIzin" onUploadComplete={handleUploadComplete} />
            </div>
            <div style={questionCardStyle}>
                <label>LPJ Kegiatan</label>
                <FileUploader label="LPJ" fieldName="lpj" onUploadComplete={handleUploadComplete} />
            </div>
            <div style={questionCardStyle}>
                <label>SPJ Kegiatan</label>
                <FileUploader label="SPJ" fieldName="spj" onUploadComplete={handleUploadComplete} />
            </div>
            <div style={questionCardStyle}>
                <label>Kategori Surat Lainnya</label>
                 <select name="kategoriSuratLainnya" value={formData.kategoriSuratLainnya} onChange={handleChange} style={inputStyle}>
                    <option value="" disabled>Pilih Kategori</option>
                    <option value="Perubahan Tanggal/Pembatalan Kegiatan">Perubahan Tanggal/Pembatalan Kegiatan</option>
                    <option value="Surat Izin Peminjaman Ruang/Alat">Surat Izin Peminjaman Ruang/Alat</option>
                    <option value="Lainnya">Lainnya</option>
                </select>
            </div>
             <div style={questionCardStyle}>
                <label>Surat Lainnya</label>
                <FileUploader label="Surat Lainnya" fieldName="suratLainnya" onUploadComplete={handleUploadComplete} />
            </div>

            {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
            <div style={{ marginTop: '20px' }}>
                <button type="submit" style={buttonStyle} disabled={loading}>
                    {loading ? 'Mengirim...' : 'Kirim'}
                </button>
            </div>
        </form>
    );
};


// ====================================================================
// Halaman Lacak Status (/layanan/berkaskm/lacak)
// ====================================================================
export const LacakStatus = () => {
    // ... (Tidak ada perubahan di sini, sama seperti sebelumnya) ...
    const [ticketId, setTicketId] = useState('');
    const [submission, setSubmission] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!ticketId) return;

        setLoading(true);
        setError('');
        setSubmission(null);

        try {
            const q = query(collection(db, "submissions"), where("ticketId", "==", ticketId.trim()));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setError("Nomor tiket tidak ditemukan. Harap periksa kembali.");
            } else {
                setSubmission({ id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() });
            }
        } catch (err) {
            console.error("Error searching ticket: ", err);
            setError("Terjadi kesalahan saat mencari tiket.");
        } finally {
            setLoading(false);
        }
    };
    
    const containerStyle = { maxWidth: '800px', margin: '40px auto', padding: '20px' };
    const timelineStepStyle = (status) => {
        const colors = {
            menunggu: { bg: '#e0e0e0' },
            diverifikasi: { bg: '#c8e6c9' },
            revisi: { bg: '#ffecb3' }
        };
        const color = colors[status] || colors.menunggu;
        return {
            display: 'flex', alignItems: 'center', marginBottom: '20px',
            padding: '15px', borderRadius: '8px', backgroundColor: '#f9f9f9',
            borderLeft: `5px solid ${color.bg.replace('#e0e0e0', '#bdbdbd').replace('#c8e6c9', '#4CAF50').replace('#ffecb3', '#ff9800')}`
        };
    };
    const statusLabelStyle = (status) => {
         const colors = {
            menunggu: { bg: '#e0e0e0', text: '#333' },
            diverifikasi: { bg: '#4CAF50', text: 'white' },
            revisi: { bg: '#ff9800', text: 'white' },
            diajukan: { bg: '#2196F3', text: 'white' },
            'revisidiperlukan': {bg: '#ff9800', text: 'white'},
            disetujui: {bg: '#4CAF50', text: 'white'}
        };
        const s = status ? status.toLowerCase().replace(/\s/g, '') : 'menunggu';
        const color = colors[s] || colors.menunggu;
        return {
             backgroundColor: color.bg, color: color.text,
             padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold'
        };
    };

    return (
        <div style={containerStyle}>
            <h2 style={{ textAlign: 'center', color: '#00092f' }}>Lacak Status Pengajuan</h2>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
                <input
                    type="text"
                    value={ticketId}
                    onChange={(e) => setTicketId(e.target.value)}
                    placeholder="Masukkan Nomor Tiket Anda..."
                    style={{ flexGrow: 1, padding: '12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '15px' }}
                />
                <button type="submit" style={{ padding: '12px 22px', backgroundColor: '#00092f', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }} disabled={loading}>
                    {loading ? 'Mencari...' : 'Lacak'}
                </button>
            </form>

            {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

            {submission && (
                <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ color: '#00092f' }}>Detail Tiket: {submission.ticketId}</h3>
                    <p><strong>Penyelenggara:</strong> {submission.penyelenggara}</p>
                    <p><strong>Nama Kegiatan:</strong> {submission.namaKegiatan}</p>
                    <p><strong>Status Saat Ini:</strong> <span style={{...statusLabelStyle(submission.currentStatus), padding: '6px 10px'}}>{submission.currentStatus}</span></p>
                    <hr style={{margin: '20px 0', border: 'none', borderTop: '1px solid #eee'}} />
                    
                    <h4>Progres Verifikasi:</h4>
                    {Object.entries(submission.verifiers).map(([key, value]) => (
                        <div key={key} style={timelineStepStyle(value.status)}>
                            <div style={{flexGrow: 1}}>
                                <strong style={{ textTransform: 'capitalize' }}>{key.replace('_', ' ')}</strong>
                                {value.catatan && <p style={{color: '#d32f2f', fontSize: '14px', margin: '5px 0 0'}}>Catatan: {value.catatan}</p>}
                            </div>
                            <span style={statusLabelStyle(value.status)}>{value.status}</span>
                        </div>
                    ))}

                    {submission.finalResponse && (
                        <>
                         <hr style={{margin: '20px 0', border: 'none', borderTop: '1px solid #eee'}} />
                         <h4>Tindak Lanjut Final:</h4>
                         {submission.finalResponse.fileUrl && <a href={submission.finalResponse.fileUrl} target="_blank" rel="noopener noreferrer">Unduh Surat Balasan</a>}
                         {submission.finalResponse.catatan && <p>{submission.finalResponse.catatan}</p>}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};


// ====================================================================
// Panel Admin (/admin/berkas)
// ====================================================================
export const AdminBerkas = () => {
    // ... (Tidak ada perubahan di sini, sama seperti sebelumnya) ...
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [catatanRevisi, setCatatanRevisi] = useState("");
    const navigate = useNavigate();

    const roleMapping = {
        'Sekretariat Jenderal': 'sekjend',
        'Kementerian Dalam Negeri': 'kemendagri',
        'Kementerian Keuangan': 'kemenkeu',
        'Banggar DPM': 'banggar'
    };

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const userDocRef = doc(db, 'users', currentUser.uid);
                const unsubProfile = onSnapshot(userDocRef, (docSnap) => {
                    if (docSnap.exists()) {
                        setUserProfile(docSnap.data());
                    } else {
                        console.log("Profil user tidak ditemukan, mengarahkan ke login.");
                        navigate('/login');
                    }
                });
                return () => unsubProfile();
            } else {
                navigate('/login');
            }
        });

        const q = query(collection(db, "submissions"), orderBy('createdAt', 'desc'));
        const unsubscribeSubmissions = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSubmissions(data);
            setLoading(false);
        }, (error) => {
            console.error("Gagal mengambil data submissions:", error);
            setLoading(false);
        });

        return () => {
            unsubscribeAuth();
            unsubscribeSubmissions();
        };
    }, [navigate]);
    
    const getVerifierKeyForUser = () => {
        if (!userProfile) return null;
        if (userProfile.role === 'master') return 'master';
        return roleMapping[userProfile.kementerian];
    };

    const handleUpdateVerification = async (submissionId, verifierKey, newStatus) => {
        if (!verifierKey) {
            alert("Peran Anda tidak terdefinisi untuk verifikasi.");
            return;
        }
        const docRef = doc(db, "submissions", submissionId);
        const updatePath = `verifiers.${verifierKey}`;
        let catatan = newStatus === 'revisi' ? catatanRevisi : "";

        await updateDoc(docRef, {
            [updatePath]: { status: newStatus, catatan: catatan, updatedAt: serverTimestamp() },
            currentStatus: newStatus === 'revisi' ? 'Revisi Diperlukan' : 'Dalam Proses Verifikasi',
            updatedAt: serverTimestamp()
        });
        await logActivity(`Memperbarui status verifikasi untuk tiket ${selectedSubmission.ticketId} menjadi ${newStatus}`);
        setCatatanRevisi("");
    };

    const handleFinalApproval = async (submissionId) => {
         const docRef = doc(db, "submissions", submissionId);
         await updateDoc(docRef, {
            currentStatus: 'Disetujui',
            isReadyForFinalApproval: false, 
            updatedAt: serverTimestamp(),
            'finalResponse.approvedAt': serverTimestamp()
         });
         await logActivity(`Menyetujui (ACC) tiket ${selectedSubmission.ticketId}`);
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp?.seconds) return 'N/A';
        return new Date(timestamp.seconds * 1000).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
    };

    const containerStyle = { maxWidth: '1200px', margin: '40px auto', padding: '20px' };
    const cardStyle = { backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', marginBottom: '15px', cursor: 'pointer', borderLeft: '5px solid #00092f' };
    const modalOverlayStyle = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000, padding: "20px" };
    const modalContentStyle = { backgroundColor: "white", padding: "30px", borderRadius: "12px", width: "100%", maxWidth: "800px", maxHeight: '90vh', overflowY: 'auto', boxShadow: "0 6px 16px rgba(0,0,0,0.15)" };
    const buttonStyle = { padding: "10px 20px", backgroundColor: "#00092f", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" };
    const verifierStatusBoxStyle = (status) => ({ ...statusLabelStyle(status), padding: '6px 12px', width: '100px', textAlign: 'center' });
    const statusLabelStyle = (status) => {
        const colors = {
            menunggu: { bg: '#e0e0e0', text: '#333' },
            diverifikasi: { bg: '#4CAF50', text: 'white' },
            revisi: { bg: '#ff9800', text: 'white' },
            diajukan: { bg: '#2196F3', text: 'white'},
            revisidiperlukan: {bg: '#ff9800', text: 'white'},
            disetujui: {bg: '#4CAF50', text: 'white'}
        };
        const s = status ? status.toLowerCase().replace(/\s/g, '') : 'menunggu';
        const color = colors[s] || colors.menunggu;
        return {
             backgroundColor: color.bg, color: color.text,
             padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold'
        };
    };

    const verifierKey = getVerifierKeyForUser();
    
    return (
        <div style={containerStyle}>
             <h1 style={{ color: "#00092f", textAlign: "center", marginBottom: "30px" }}>Panel Admin - Pengelolaan Berkas</h1>
             {loading ? <p style={{textAlign: 'center'}}>Memuat data...</p> : submissions.length === 0 ? <p style={{textAlign: 'center'}}>Belum ada pengajuan berkas.</p> : (
                submissions.map(sub => (
                    <div key={sub.id} style={{...cardStyle, borderLeftColor: sub.currentStatus === 'Revisi Diperlukan' ? '#ff9800' : (sub.currentStatus === 'Disetujui' ? '#4CAF50' : '#00092f')}} onClick={() => setSelectedSubmission(sub)}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                            <div>
                                <h4 style={{margin: 0, color: '#00092f'}}>{sub.namaKegiatan}</h4>
                                <p style={{margin: '5px 0 0', color: '#666', fontSize: '14px'}}>Oleh: {sub.penyelenggara} - Tiket: {sub.ticketId}</p>
                            </div>
                            <span style={statusLabelStyle(sub.currentStatus)}>{sub.currentStatus}</span>
                        </div>
                    </div>
                ))
             )}

            {selectedSubmission && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                           <h2 style={{color: '#00092f', margin: 0}}>Detail Tiket: {selectedSubmission.ticketId}</h2>
                           <button onClick={() => setSelectedSubmission(null)} style={{...buttonStyle, backgroundColor: '#6c757d'}}>Tutup</button>
                        </div>

                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px'}}>
                            <div><strong>Nama Kegiatan:</strong><p style={{margin: '5px 0 0'}}>{selectedSubmission.namaKegiatan}</p></div>
                            <div><strong>Penyelenggara:</strong><p style={{margin: '5px 0 0'}}>{selectedSubmission.penyelenggara}</p></div>
                            <div><strong>Kontak:</strong><p style={{margin: '5px 0 0'}}>{selectedSubmission.kontak}</p></div>
                            <div><strong>Tanggal Diajukan:</strong><p style={{margin: '5px 0 0'}}>{formatTimestamp(selectedSubmission.createdAt)}</p></div>
                        </div>

                        <h4>Dokumen Terlampir:</h4>
                        <ul style={{listStyle: 'none', padding: 0, margin: 0, marginBottom: '20px'}}>
                            {Object.entries(selectedSubmission.dokumen).map(([key, value]) => (
                                value && <li key={key} style={{padding: '5px 0'}}><a href={value} target="_blank" rel="noopener noreferrer" style={{color: '#00092f', fontWeight: 'bold'}}>{key}</a></li>
                            ))}
                        </ul>
                        
                        <hr style={{margin: '20px 0', border: 'none', borderTop: '1px solid #eee'}} />

                        <h4>Status Verifikasi:</h4>
                        {Object.entries(selectedSubmission.verifiers).map(([key, value]) => (
                            <div key={key} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f0f0'}}>
                                <div>
                                    <strong style={{ textTransform: 'capitalize' }}>{key}</strong>
                                    {value.catatan && <p style={{color: '#d32f2f', fontSize: '13px', margin: '5px 0 0'}}>Catatan: {value.catatan}</p>}
                                </div>
                                <span style={verifierStatusBoxStyle(value.status)}>{value.status}</span>
                            </div>
                        ))}

                        {(verifierKey && verifierKey !== 'master' && selectedSubmission.verifiers[verifierKey]) && (
                            <>
                            <hr style={{margin: '20px 0', border: 'none', borderTop: '1px solid #eee'}} />
                            <h4>Tindakan Anda sebagai <span style={{textTransform: 'capitalize'}}>{verifierKey}</span>:</h4>
                            <div style={{backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '8px'}}>
                                <div style={{display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap'}}>
                                    <button onClick={() => handleUpdateVerification(selectedSubmission.id, verifierKey, 'diverifikasi')} style={{...buttonStyle, backgroundColor: '#4CAF50'}}>✅ Verifikasi</button>
                                    <button onClick={() => handleUpdateVerification(selectedSubmission.id, verifierKey, 'revisi')} style={{...buttonStyle, backgroundColor: '#ff9800'}}>⚠️ Minta Revisi</button>
                                    <textarea 
                                        value={catatanRevisi}
                                        onChange={(e) => setCatatanRevisi(e.target.value)}
                                        placeholder="Tulis catatan revisi di sini..." 
                                        style={{flexGrow: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ccc', minHeight: '40px'}}
                                    />
                                </div>
                            </div>
                            </>
                        )}
                        
                        {userProfile && (userProfile.role === 'master' || userProfile.kementerian === 'Sekretariat Jenderal') && Object.values(selectedSubmission.verifiers).every(v => v.status === 'diverifikasi') && (
                            <>
                            <hr style={{margin: '20px 0', border: 'none', borderTop: '1px solid #eee'}} />
                            <h4>Persetujuan Final</h4>
                             <button onClick={() => handleFinalApproval(selectedSubmission.id)} style={{...buttonStyle, width: '100%', backgroundColor: '#1e88e5'}}>👍 ACC Berkas Ini</button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

