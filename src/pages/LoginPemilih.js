// src/pages/LoginPemilih.js
import React, { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { signInWithEmailAndPassword, signOut, setPersistence, browserLocalPersistence, browserSessionPersistence, fetchSignInMethodsForEmail } from "firebase/auth";
import { auth, db } from "../firebase/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

// Assets
import evotingIllustration from '../assets/evoting-illustration.png';
import poltekLogo from '../assets/logo-poltek.png';

// ✅ 1. Impor ikon-ikon dari Lucide
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

const LoginPemilih = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const successMessage = location.state?.successMessage;

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // --- (Semua logika handleLogin tidak berubah) ---
    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const methods = await fetchSignInMethodsForEmail(auth, email);
            if (methods.length === 0) {
                setError("Email ini tidak terdaftar sebagai pemilih.");
                setLoading(false);
                return;
            }
            const persistenceType = rememberMe ? browserLocalPersistence : browserSessionPersistence;
            await setPersistence(auth, persistenceType);
            
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            if (!user.emailVerified) {
                await signOut(auth);
                setError("Harap verifikasi email Anda terlebih dahulu.");
                setLoading(false);
                return;
            }

            const voterDocRef = doc(db, "voters", user.uid);
            const docSnap = await getDoc(voterDocRef);

            if (docSnap.exists()) {
                const voterData = docSnap.data();
                if (voterData.status?.toLowerCase() === 'approved') {
                    navigate("/dashboard-pemilih");
                } else {
                    await signOut(auth);
                    setError("Akun Anda belum disetujui oleh panitia pemilihan.");
                }
            } else {
                await signOut(auth);
                setError("Akun ini tidak terdaftar sebagai pemilih di database.");
            }
        } catch (err) {
            setError("Password yang Anda masukkan salah.");
        } finally {
            setLoading(false);
        }
    };

    // ✅ 2. Gunakan className untuk styling responsif
    return (
        <div className="login-page">
            <div className="container">
                <div className="left-panel">
                    <img src={poltekLogo} alt="Logo Poltek" style={{ height: "60px" }} />
                    <h1 className="illustration-title">Sistem E-Voting BEM</h1>
                    <p className="illustration-subtitle">Gunakan hak pilih Anda secara aman, cepat, dan rahasia.</p>
                    <img src={evotingIllustration} alt="E-Voting Illustration" className="illustration-image" />
                </div>

                <div className="right-panel">
                    <h2 className="heading">Login Pemilih</h2>
                    <p className="sub-heading">Masuk untuk mengakses dasbor dan bilik suara.</p>

                    {successMessage && <p className="message success">{successMessage}</p>}
                    {error && <p className="message error">{error}</p>}
                    
                    <form onSubmit={handleLogin}>
                        <label className="label">Email</label>
                        <div className="input-with-icon">
                            <Mail size={18} />
                            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Masukkan email Anda" required />
                        </div>

                        <label className="label">Password</label>
                        <div className="input-with-icon">
                            <Lock size={18} />
                            <input className="input password-input" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Masukkan password" required />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="eye-icon" aria-label="Toggle Password Visibility">
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                        
                        <div className="options-row">
                            <label className="remember-label">
                                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                                Ingat sesi login
                            </label>
                            <Link to="/lupa-sandi-pemilih" className="link">Lupa Password?</Link>
                        </div>

                        <button type="submit" className="button" disabled={loading}>
                            {loading ? <><Loader2 size={20} className="animate-spin"/> Memproses...</> : "Login"}
                        </button>
                    </form>

                    <p className="footer-text">
                        Belum punya akun? <Link to="/register-pemilih" className="link">Daftar di sini</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

// ✅ 3. Stylesheet baru yang lebih rapi dan responsif
const styleSheet = document.createElement("style");
styleSheet.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    .login-page { font-family: 'Inter', sans-serif; background-color: #f1f5f9; min-height: 100vh; display: flex; justify-content: center; align-items: center; padding: 20px; }
    .container { max-width: 960px; width: 100%; margin: 20px auto; display: flex; flex-direction: column; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); overflow: hidden; }
    
    .left-panel { background-color: #f8fafc; padding: 40px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; border-bottom: 1px solid #e2e8f0; }
    .right-panel { padding: 32px; display: flex; flex-direction: column; justify-content: center; }
    
    .illustration-title { font-size: 1.5rem; font-weight: 700; color: #1e293b; margin-top: 16px; margin-bottom: 8px; }
    .illustration-subtitle { font-size: 1rem; color: #64748b; max-width: 300px; margin-bottom: 24px; }
    .illustration-image { max-width: 280px; width: 100%; }
    
    .heading { color: #1e293b; font-weight: 700; font-size: 1.7rem; margin-bottom: 8px; }
    .sub-heading { color: #64748b; margin-bottom: 24px; font-size: 1rem; }
    
    .label { margin-bottom: 8px; font-size: 0.9rem; color: #334155; font-weight: 600; display: block; }
    .input-with-icon { position: relative; margin-bottom: 20px; }
    .input-with-icon svg { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: #9ca3af; }
    .input { width: 100%; box-sizing: border-box; padding: 12px 12px 12px 50px; border-radius: 8px; border: 1px solid #cbd5e0; font-size: 1rem; }
    .password-input { padding-right: 50px; }
    .eye-icon { position: absolute; right: 35px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #9ca3af; padding: 4px; }
    
    .options-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; font-size: 0.9rem; }
    .remember-label { display: flex; align-items: center; color: #334155; cursor: pointer; }
    .remember-label input { margin-right: 8px; accent-color: #1d4ed8; }
    .link { color: #1d4ed8; font-weight: 600; text-decoration: none; }
    .link:hover { text-decoration: underline; }
    
    .button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 14px; background-color: #1d4ed8; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 1rem; width: 100%; transition: all 0.2s; }
    .button:disabled { background-color: #94a3b8; cursor: not-allowed; }
    .button:hover:not(:disabled) { background-color: #1e40af; }
    
    .footer-text { text-align: center; margin-top: 32px; font-size: 0.9rem; color: #64748b; }
    .message { border-radius: 8px; padding: 12px; text-align: center; margin-bottom: 20px; }
    .message.success { color: #15803d; background-color: #dcfce7; border: 1px solid #86efac; }
    .message.error { color: #b91c1c; background-color: #fee2e2; border: 1px solid #fca5a5; }
    .animate-spin { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    /* --- Tampilan Desktop --- */
    @media (min-width: 800px) {
        .container { flex-direction: row; }
        .left-panel { flex: 1; border-bottom: none; border-right: 1px solid #e2e8f0; }
        .right-panel { flex: 1; padding: 40px 50px; }
    }
`;
document.head.appendChild(styleSheet);


export default LoginPemilih;