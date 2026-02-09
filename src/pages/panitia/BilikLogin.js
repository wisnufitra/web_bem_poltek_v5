import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../../firebase/firebaseConfig';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { signInAnonymously, signOut } from 'firebase/auth';
import { Monitor, AlertTriangle, Lock, Power, Loader2, CheckCircle2 } from 'lucide-react';

// --- HELPER LOGIN (Sama seperti sebelumnya) ---
const usePetugasBilikAuth = (eventId) => {
    const [petugas, setPetugas] = useState(null);
    const [loading, setLoading] = useState(true);

    const ensureFirestoreProfile = async (user, petugasData) => {
        if (!user || !petugasData) return;
        try {
            await setDoc(doc(db, 'users', user.uid), {
                role: 'petugas',
                eventId: eventId, 
                username: petugasData.username,
                createdAt: serverTimestamp(),
                isAnonymousInfo: true
            });
        } catch (error) { console.error(error); }
    };

    useEffect(() => {
        const initAuth = async () => {
            const session = localStorage.getItem(`petugas_bilik_session_${eventId}`);
            if (session) {
                const data = JSON.parse(session);
                if (data.role === 'bilik') {
                    setPetugas(data);
                    if (!auth.currentUser) {
                        try {
                            const cred = await signInAnonymously(auth);
                            await ensureFirestoreProfile(cred.user, data);
                        } catch (e) {}
                    } else {
                        await ensureFirestoreProfile(auth.currentUser, data);
                    }
                }
            }
            setLoading(false);
        };
        initAuth();
    }, [eventId]);

    const login = async (username, password) => {
        try {
            const eventRef = doc(db, 'pemilihan_events', eventId);
            const snap = await getDoc(eventRef);
            if (snap.exists()) {
                const data = snap.data();
                const validUser = data.petugas?.find(p => p.username === username && p.password === password && p.role === 'bilik');
                if (validUser) {
                    localStorage.setItem(`petugas_bilik_session_${eventId}`, JSON.stringify(validUser));
                    setPetugas(validUser);
                    const cred = await signInAnonymously(auth);
                    await ensureFirestoreProfile(cred.user, validUser);
                    return { success: true };
                }
            }
            return { success: false, message: 'Login gagal.' };
        } catch (error) {
            return { success: false, message: 'Error koneksi.' };
        }
    };

    const logout = async () => {
        localStorage.removeItem(`petugas_bilik_session_${eventId}`);
        setPetugas(null);
        await signOut(auth);
    };

    return { petugas, loading, login, logout };
};

// --- MAIN COMPONENT ---
const BilikLogin = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const { petugas, loading, login, logout } = usePetugasBilikAuth(eventId);

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const [tokenInput, setTokenInput] = useState('');
    const [validating, setValidating] = useState(false);
    const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

    // --- VALIDASI TOKEN (Dipisah jadi fungsi mandiri) ---
    const validateToken = useCallback(async (code) => {
        setValidating(true);
        setStatusMessage({ type: 'loading', text: 'Memeriksa Token...' });

        try {
            // 1. Cek Token
            const kioskRef = doc(db, 'kiosk_tokens', code);
            const tokenSnap = await getDoc(kioskRef);

            if (!tokenSnap.exists()) throw new Error("Token tidak ditemukan.");

            const tokenData = tokenSnap.data();

            // 2. Validasi Rules
            if (tokenData.eventId !== eventId) throw new Error("Token salah event.");
            if (new Date() > new Date(tokenData.expiredAt)) throw new Error("Token kadaluarsa.");
            if (!tokenData.voterUid) throw new Error("Data korup.");

            // 3. Sukses
            setStatusMessage({ type: 'success', text: 'Token Valid. Mengalihkan...' });
            
            // Delay sedikit biar user lihat centang hijau sebelum pindah
            setTimeout(() => {
                navigate(`/voting/${eventId}`, { 
                    state: { 
                        kioskMode: true,
                        voterData: {
                            uid: tokenData.voterUid,
                            nama: tokenData.voterName,
                            prodi: tokenData.voterProdi,
                            tokenDocId: code
                        }
                    },
                    replace: true 
                });
            }, 800);

        } catch (error) {
            console.error(error);
            setStatusMessage({ type: 'error', text: error.message });
            setTokenInput(''); // Reset input
            
            // Efek getar UI
            const container = document.getElementById('slot-container');
            if(container) {
                container.classList.add('shake');
                setTimeout(() => container.classList.remove('shake'), 500);
            }
        } finally {
            setValidating(false);
        }
    }, [eventId, navigate]);

    // --- AUTO SUBMIT SAAT 6 DIGIT ---
    useEffect(() => {
        if (tokenInput.length === 6) {
            validateToken(tokenInput);
        }
    }, [tokenInput, validateToken]);

    // --- KEYBOARD LISTENER (Pengganti Tombol Layar) ---
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!petugas || validating) return;
            
            const key = e.key;
            
            // Hanya terima angka
            if (!isNaN(key) && key !== ' ') {
                if (tokenInput.length < 6) {
                    setTokenInput(prev => prev + key);
                    setStatusMessage({ type: '', text: '' }); // Clear error saat ngetik
                }
            } 
            // Hapus
            else if (key === 'Backspace') {
                setTokenInput(prev => prev.slice(0, -1));
                setStatusMessage({ type: '', text: '' });
            }
            // Reset total
            else if (key === 'Escape') {
                setTokenInput('');
                setStatusMessage({ type: '', text: '' });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [petugas, tokenInput, validating]);


    const handleLogin = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        const res = await login(username, password);
        if (!res.success) setErrorMsg(res.message);
    };

    if (loading) return <div className="kiosk-container center"><Loader2 className="spin" size={40}/></div>;

    // --- VIEW 1: LOGIN PETUGAS ---
    if (!petugas) {
        return (
            <div className="kiosk-container center login-bg">
                <div className="login-card">
                    <div className="icon-box"><Monitor size={32} /></div>
                    <h2>Aktivasi Kiosk</h2>
                    <p>Login Petugas Bilik</p>
                    {errorMsg && <div className="alert-box">{errorMsg}</div>}
                    <form onSubmit={handleLogin}>
                        <input className="kiosk-input" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} autoFocus />
                        <input className="kiosk-input" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
                        <button className="kiosk-btn">Aktifkan</button>
                    </form>
                </div>
                <style>{cssStyles}</style>
            </div>
        );
    }

    // --- VIEW 2: STANDBY MINIMALIS (Tanpa Tombol) ---
    return (
        <div className="kiosk-container standby-bg">
            <div className="top-bar">
                <div className="status-chip">
                    <div className="dot"></div> Standby
                </div>
                <button onClick={logout} className="logout-hidden" title="Matikan"><Power size={18}/></button>
            </div>

            <div className="content-center">
                <div className="lock-animation">
                    {validating ? <Loader2 size={64} className="spin icon-state" /> : 
                     statusMessage.type === 'success' ? <CheckCircle2 size={64} className="icon-state success" /> :
                     <Lock size={64} className="icon-state idle" />}
                </div>

                <h1 className="title-text">
                    {statusMessage.type === 'success' ? 'Berhasil!' : 'Masukkan Kode Token'}
                </h1>
                <p className="subtitle-text">
                    {statusMessage.type === 'error' ? 
                        <span className="text-error"><AlertTriangle size={14} style={{display:'inline'}}/> {statusMessage.text}</span> : 
                        (statusMessage.type === 'loading' ? 'Sedang memverifikasi data...' : 'Ketik 6 digit kode dari meja registrasi')
                    }
                </p>

                {/* SLOT TOKEN DISPLAY */}
                <div id="slot-container" className={`slot-container ${statusMessage.type}`}>
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className={`slot-box ${tokenInput[i] ? 'filled' : ''} ${validating ? 'processing' : ''}`}>
                            {tokenInput[i] || ''}
                        </div>
                    ))}
                </div>
            </div>

            <div className="footer-instruction">
                Gunakan Keyboard Fisik / Keypad untuk mengetik
            </div>

            <style>{cssStyles}</style>
        </div>
    );
};

const cssStyles = `
    /* --- PERBAIKAN UTAMA: FORCED FULLSCREEN --- */
    .kiosk-container {
        position: fixed; /* Memaksa elemen keluar dari flow normal */
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 99999; /* Pastikan nilainya sangat tinggi agar menutupi Navbar */
        
        background: radial-gradient(circle at center, #1e293b 0%, #020617 100%); /* Gradient Deep Dark */
        color: white;
        display: flex; 
        flex-direction: column;
        font-family: 'Inter', sans-serif;
        overflow: hidden;
        box-sizing: border-box; /* Penting agar padding tidak menambah lebar */
    }

    .center { align-items: center; justify-content: center; }
    .spin { animation: spin 1s linear infinite; }

    /* THEMES */
    .login-bg { background: radial-gradient(circle at center, #1e293b 0%, #0f172a 100%); }
    .standby-bg { background-color: #020617; }

    /* LOGIN CARD (Dibuat lebih tajam) */
    .login-card { 
        background: rgba(15, 23, 42, 0.95); /* Lebih solid */
        padding: 40px; 
        border-radius: 24px; 
        width: 100%; 
        max-width: 360px; 
        text-align: center; 
        border: 1px solid #334155; 
        box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
    }
    .icon-box { background: #3b82f6; width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); }
    .kiosk-input { width: 100%; padding: 14px; margin-bottom: 12px; background: #0f172a; border: 1px solid #334155; color: white; border-radius: 10px; text-align: center; font-size: 1.1rem; box-sizing: border-box; outline: none; }
    .kiosk-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2); }
    .kiosk-btn { width: 100%; padding: 14px; background: #3b82f6; color: white; border: none; border-radius: 10px; font-weight: 700; cursor: pointer; font-size: 1rem; transition: 0.2s; }
    .kiosk-btn:hover { background: #2563eb; }
    .alert-box { background: #7f1d1d; color: #fca5a5; padding: 10px; border-radius: 8px; margin-bottom: 16px; font-size: 0.9rem; }

    /* STANDBY UI (Layout diperbaiki) */
    .top-bar { 
        padding: 30px 40px; /* Jarak dari pinggir layar */
        width: 100%; 
        display: flex; 
        justify-content: space-between; 
        align-items: center; 
        position: absolute; 
        top: 0; left: 0; 
        z-index: 10; /* Pastikan di atas elemen lain */
        box-sizing: border-box; /* Agar padding tidak membuat scroll horizontal */
    }

    .status-chip { 
        background: rgba(255,255,255,0.08); 
        padding: 8px 16px; 
        border-radius: 30px; 
        font-size: 0.85rem; 
        display: flex; align-items: center; gap: 10px; 
        font-weight: 600; 
        backdrop-filter: blur(5px); 
        border: 1px solid rgba(255,255,255,0.1);
        color: #94a3b8; /* Warna teks abu terang */
    }

    .dot { 
        width: 8px; height: 8px; 
        background: #22c55e; 
        border-radius: 50%; 
        box-shadow: 0 0 10px #22c55e; /* Efek glowing hijau */
    }

    /* TOMBOL LOGOUT (PERBAIKAN) */
    .logout-hidden { 
        background: rgba(255, 255, 255, 0.05); /* Latar belakang transparan tipis */
        border: 1px solid rgba(255, 255, 255, 0.1); /* Garis tepi tipis */
        color: #64748b; /* Warna ikon abu terang (terlihat di background gelap) */
        cursor: pointer; 
        transition: all 0.3s ease; 
        width: 44px; height: 44px; /* Ukuran sentuh lebih besar */
        border-radius: 12px;
        display: flex; align-items: center; justify-content: center;
    }

    /* Efek saat diarahkan mouse (Hover) */
    .logout-hidden:hover { 
        color: #ef4444; /* Ikon jadi merah */
        background: rgba(239, 68, 68, 0.1); /* Background merah tipis */
        border-color: rgba(239, 68, 68, 0.3);
        box-shadow: 0 0 15px rgba(239, 68, 68, 0.2); /* Glowing merah */
        transform: scale(1.05);
    }

    /* CONTENT CENTER (Dibuat benar-benar tengah) */
    .content-center { 
        flex: 1; 
        display: flex; 
        flex-direction: column; 
        align-items: center; 
        justify-content: center; 
        width: 100%;
        max-width: 800px; /* Batasi lebar agar slot tidak terlalu menyebar */
        margin: 0 auto;
    }
    
    .lock-animation { margin-bottom: 30px; height: 80px; display: flex; align-items: center; }
    .icon-state { color: #475569; transition: 0.3s; }
    .icon-state.idle { color: #334155; }
    .icon-state.success { color: #22c55e; }

    .title-text { 
        font-size: 3rem; /* Diperbesar */
        font-weight: 800; margin: 0 0 16px; 
        letter-spacing: -1px; 
        background: linear-gradient(to bottom right, #fff, #94a3b8); 
        -webkit-background-clip: text; 
        -webkit-text-fill-color: transparent; 
        text-align: center;
    }
    .subtitle-text { font-size: 1.2rem; color: #64748b; margin: 0 0 50px; height: 24px; text-align: center; }
    .text-error { color: #ef4444; display: flex; align-items: center; gap: 6px; font-weight: 600; justify-content: center; }

    /* SLOT CONTAINER (Lebih Menarik) */
    .slot-container { display: flex; gap: 20px; perspective: 1000px; }
    .slot-box { 
        width: 70px; height: 90px; /* Lebih Besar */
        background: #0f172a; /* Lebih gelap dari background utama */
        border: 2px solid #334155; 
        border-radius: 18px;
        display: flex; align-items: center; justify-content: center;
        font-size: 3.5rem; font-weight: 700; color: white;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3); /* Shadow depth */
    }
    /* Efek saat terisi */
    .slot-box.filled { 
        background: #1e293b; 
        border-color: #3b82f6; 
        color: #60a5fa;
        transform: translateY(-10px); 
        box-shadow: 0 20px 25px -5px rgba(59, 130, 246, 0.3);
        text-shadow: 0 0 20px rgba(59, 130, 246, 0.5); /* Glowing text */
    }
    .slot-container.error .slot-box { border-color: #ef4444; color: #ef4444; background: rgba(239, 68, 68, 0.1); }
    .slot-box.processing { opacity: 0.5; transform: scale(0.9); }

    /* Footer Instruction */
    .footer-instruction { 
        position: absolute; 
        bottom: 30px; 
        width: 100%;
        text-align: center;
        color: #334155; 
        font-size: 0.85rem; 
        text-transform: uppercase; 
        letter-spacing: 3px; 
        font-weight: 700; 
    }

    @keyframes spin { 100% { transform: rotate(360deg); } }
    @keyframes popIn { 0% { transform: scale(0); } 80% { transform: scale(1.2); } 100% { transform: scale(1); } }
    .shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
    @keyframes shake { 10%, 90% { transform: translate3d(-1px, 0, 0); } 20%, 80% { transform: translate3d(2px, 0, 0); } 30%, 50%, 70% { transform: translate3d(-4px, 0, 0); } 40%, 60% { transform: translate3d(4px, 0, 0); } }
`;

export default BilikLogin;