// src/pages/RequestPemilihan.js
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { db, auth } from '../firebase/firebaseConfig';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { logActivity } from '../utils/logActivity';
import poltekLogo from '../assets/logo-poltek.png';

// ✅ 1. Impor semua ikon yang dibutuhkan
import { Users, FileText, FileSignature, Link2, Send, Loader2, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';


const RequestPemilihan = () => {
    const navigate = useNavigate();
    const [ormawa, setOrmawa] = useState('');
    const [namaEvent, setNamaEvent] = useState('');
    const [deskripsi, setDeskripsi] = useState('');
    const [fileSuratUrl, setFileSuratUrl] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState(null);
    const [requestSubmitted, setRequestSubmitted] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const userDocRef = doc(db, 'users', currentUser.uid);
                const docSnap = await getDoc(userDocRef);
                if (docSnap.exists() && (docSnap.data().role === 'panitia_requestor' || docSnap.data().role === 'master')) {
                    setUserRole('authorized');
                    if (docSnap.data().ormawa) setOrmawa(docSnap.data().ormawa);
                } else {
                    setUserRole('unauthorized');
                }
            } else {
                navigate('/login', {state: {successMessage: 'Anda harus login untuk mengakses halaman ini.'}});
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!ormawa || !namaEvent || !fileSuratUrl) {
            setError('Nama Organisasi, Nama Pemilihan, dan Link Dokumen wajib diisi.');
            return;
        }
        setLoading(true);
        setError('');

        try {
            await addDoc(collection(db, 'pemilihan_requests'), {
                ormawa, namaEvent, deskripsi, fileSuratUrl, status: 'menunggu',
                diajukanPada: serverTimestamp(),
                diajukanOleh: auth.currentUser.email 
            });
            await logActivity(`Pengajuan pemilihan baru dari "${ormawa}"`);
            setRequestSubmitted(true);
        } catch (err) {
            console.error("Error submitting request:", err);
            setError('Terjadi kesalahan saat mengirim permintaan.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="page-center"><Loader2 className="animate-spin" size={48} /></div>;
    }

    // ✅ 2. Tampilan pesan disempurnakan dengan ikon dan layout baru
    if (userRole !== 'authorized') {
        return (
            <div className="page-center">
                <div className="message-card">
                    <AlertCircle size={48} className="icon-danger" />
                    <h1>Akses Ditolak</h1>
                    <p>Hanya panitia yang telah disetujui atau Master Admin yang dapat mengakses halaman ini.</p>
                    <Link to="/pemilihan" className="button button-primary"><ArrowLeft size={16} /> Kembali ke Portal</Link>
                </div>
            </div>
        );
    }

    if (requestSubmitted) {
        return (
            <div className="page-center">
                <div className="message-card">
                    <CheckCircle2 size={48} className="icon-success" />
                    <h1>Pengajuan Berhasil!</h1>
                    <p>Permintaan Anda telah berhasil diajukan dan akan segera ditinjau oleh Master Admin BEM.</p>
                    <Link to="/pemilihan" className="button button-primary"><ArrowLeft size={16} /> Kembali ke Portal</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="request-page">
            <div className="request-container">
                <div style={{textAlign: 'center', marginBottom: '24px'}}>
                    <img src={poltekLogo} alt="Logo Poltek" style={{height: '60px'}} />
                </div>
                <h1 className="page-title">Ajukan Permintaan Pemilihan</h1>
                <p className="page-subtitle">Isi formulir di bawah ini untuk memulai proses pembuatan event pemilihan baru.</p>

                {error && <div className="error-box"><AlertCircle size={18}/>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="label">Nama Organisasi (Ormawa)</label>
                        <div className="input-with-icon">
                            <Users size={18} />
                            <input className="input" value={ormawa} onChange={(e) => setOrmawa(e.target.value)} placeholder="Contoh: Himpunan Mahasiswa Teknokimia Nuklir" required />
                        </div>
                    </div>
                    
                    <div className="form-group">
                        <label className="label">Nama Pemilihan</label>
                        <div className="input-with-icon">
                            <FileText size={18} />
                            <input className="input" value={namaEvent} onChange={(e) => setNamaEvent(e.target.value)} placeholder="Contoh: Pemilihan Ketua Hima TN 2025" required />
                        </div>
                    </div>
                    
                    <div className="form-group">
                        <label className="label">Deskripsi Singkat (Opsional)</label>
                        <textarea className="input" rows="4" value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} placeholder="Jelaskan tujuan atau detail singkat dari pemilihan ini..." />
                    </div>
                    
                    <div className="form-group">
                        <label className="label">Link Dokumen Pengesahan (Google Drive)</label>
                        <div className="input-with-icon">
                            <Link2 size={18} />
                            <input type="url" className="input" value={fileSuratUrl} onChange={(e) => setFileSuratUrl(e.target.value)} placeholder="Pastikan link dapat diakses publik" required />
                        </div>
                    </div>
                    
                    <button type="submit" className="button button-primary" disabled={loading}>
                        {loading ? <><Loader2 size={18} className="animate-spin" /> Mengirim...</> : <><Send size={18}/> Ajukan Permintaan</>}
                    </button>
                </form>
            </div>
        </div>
    );
};

// ✅ 3. Stylesheet baru yang lebih rapi dan responsif
const styleSheet = document.createElement("style");
styleSheet.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    .request-page, .page-center { font-family: 'Inter', sans-serif; background-color: #f8fafc; min-height: calc(100vh - 70px); padding: 20px; }
    .page-center { display: flex; align-items: center; justify-content: center; }

    .request-container { 
        max-width: 700px; 
        width: 100%; 
        margin: 20px auto; 
        padding: 24px; 
        background-color: #ffffff; 
        border-radius: 12px; 
        border: 1px solid #e2e8f0; 
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); 
    }
    .page-title { color: #1e293b; font-size: 1.75rem; font-weight: 700; margin: 0 0 8px 0; text-align: center; }
    .page-subtitle { color: #64748b; font-size: 1rem; margin: 0 0 24px 0; text-align: center; }
    
    .form-group { margin-bottom: 20px; }
    .label { display: block; margin-bottom: 8px; font-size: 0.9rem; color: #334155; font-weight: 600; }
    .input-with-icon { position: relative; }
    .input-with-icon svg {
        position: absolute;
        left: 14px;
        top: 50%; /* ✅ PERBAIKAN: Posisikan 50% dari atas */
        transform: translateY(-50%); /* ✅ PERBAIKAN: Geser ke atas setengah dari tinggi ikon itu sendiri */
        color: #9ca3af;
        pointer-events: none; /* Tambahan agar ikon tidak bisa diklik */
    }
    .input { width: 100%; box-sizing: border-box; padding: 12px 12px 12px 44px; border-radius: 8px; border: 1px solid #cbd5e0; font-size: 1rem; background-color: #ffffff; color: #1e293b; }
    textarea.input { padding: 12px; height: 100px; resize: vertical; }
    .input:focus { outline: none; border-color: #1d4ed8; box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.2); }

    .button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 1rem; text-decoration: none; border: none; transition: all 0.2s; }
    .button-primary { background-color: #1d4ed8; color: #fff; margin-top: 16px; }
    .button:disabled { background-color: #94a3b8; color: #e2e8f0; cursor: not-allowed; }
    .button:hover:not(:disabled) { filter: brightness(0.9); }
    
    .error-box { color: #b91c1c; background-color: #fee2e2; border: 1px solid #fca5a5; border-radius: 8px; padding: 12px; text-align: center; margin-bottom: 20px; display: flex; align-items: center; justify-content: center; gap: 8px; }
    
    .message-card { max-width: 600px; padding: 40px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); display: flex; flex-direction: column; align-items: center; }
    .message-card h1 { font-size: 1.5rem; margin: 16px 0 8px 0; }
    .message-card p { color: #64748b; margin-bottom: 24px; max-width: 400px; }
    .message-card .button { width: auto; padding-left: 24px; padding-right: 24px; }
    .icon-success { color: #16a34a; }
    .icon-danger { color: #dc2626; }
    
    .animate-spin { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    
    @media (min-width: 640px) {
        .request-container { padding: 40px; }
        .page-title { font-size: 2rem; }
    }
`;
document.head.appendChild(styleSheet);


export default RequestPemilihan;