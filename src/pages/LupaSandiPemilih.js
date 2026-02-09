// src/pages/LupaSandiPemilih.js
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";

// Assets
import evotingIllustration from '../assets/evoting-illustration.png';
import poltekLogo from '../assets/logo-poltek.png';

// ✅ 1. Impor semua ikon yang dibutuhkan
import { Mail, Send, Loader2, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';


const LupaSandiPemilih = () => {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // --- (Logika handleResetPassword tidak berubah) ---
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setMessage("");
        setError("");
        setLoading(true);
        try {
            const q = query(collection(db, "voters"), where("email", "==", email));
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                setError("Alamat email tidak terdaftar sebagai akun pemilih.");
                setLoading(false);
                return;
            }
            await sendPasswordResetEmail(auth, email);
            setMessage("Link reset password berhasil dikirim. Silakan cek inbox dan folder spam Anda.");
        } catch (err) {
            setError("Terjadi kesalahan. Silakan coba lagi nanti.");
        } finally {
            setLoading(false);
        }
    };

    // ✅ 2. Gunakan className untuk styling responsif
    return (
        <div className="reset-page">
            <div className="container">
                <div className="left-panel">
                    <img src={poltekLogo} alt="Logo Poltek" style={{ height: "60px" }} />
                    <h1 className="illustration-title">Atur Ulang Password</h1>
                    <p className="illustration-subtitle">Kami akan membantu Anda mendapatkan kembali akses ke akun Anda.</p>
                    <img src={evotingIllustration} alt="E-Voting Illustration" className="illustration-image" />
                </div>

                <div className="right-panel">
                    <h2 className="heading">Lupa Password?</h2>
                    <p className="sub-heading">Jangan khawatir. Masukkan email Anda untuk menerima tautan atur ulang password.</p>

                    {message && <p className="message success"><CheckCircle2 size={18} /> {message}</p>}
                    {error && <p className="message error"><AlertCircle size={18} /> {error}</p>}

                    <form onSubmit={handleResetPassword}>
                        <label className="label">Email Terdaftar</label>
                        <div className="input-with-icon">
                            <Mail size={18} />
                            <input 
                                className="input"
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Masukkan email Anda"
                                required
                            />
                        </div>
                        <button type="submit" className="button" disabled={loading}>
                            {loading ? <><Loader2 size={20} className="animate-spin"/> Mengirim...</> : <><Send size={18}/> Kirim Link Reset</>}
                        </button>
                    </form>

                    <p className="footer-text">
                        Ingat password Anda? <Link to="/login-pemilih" className="link"><ArrowLeft size={14}/> Kembali ke Login</Link>
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
    
    .reset-page { font-family: 'Inter', sans-serif; background-color: #f1f5f9; min-height: 100vh; display: flex; justify-content: center; align-items: center; padding: 20px; }
    .container { max-width: 960px; width: 100%; margin: 20px auto; display: flex; flex-direction: column; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); overflow: hidden; }
    
    .left-panel { background-color: #f8fafc; padding: 40px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; border-bottom: 1px solid #e2e8f0; }
    .right-panel { padding: 32px; display: flex; flex-direction: column; justify-content: center; }
    
    .illustration-title { font-size: 1.5rem; font-weight: 700; color: #1e293b; margin-top: 16px; margin-bottom: 8px; }
    .illustration-subtitle { font-size: 1rem; color: #64748b; max-width: 300px; margin-bottom: 24px; }
    .illustration-image { max-width: 280px; width: 100%; }
    
    .heading { color: #1e293b; font-weight: 700; font-size: 1.7rem; margin-bottom: 8px; }
    .sub-heading { color: #64748b; margin-bottom: 24px; font-size: 1rem; }
    
    .label { margin-bottom: 8px; font-size: 0.9rem; color: #334155; font-weight: 600; display: block; }
    .input-with-icon { position: relative; margin-bottom: 25px; }
    .input-with-icon svg { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: #9ca3af; }
    .input { width: 100%; box-sizing: border-box; padding: 12px 12px 12px 50px; border-radius: 8px; border: 1px solid #cbd5e0; font-size: 1rem; }
    .input:focus { outline: none; border-color: #1d4ed8; box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.2); }
    
    .button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 14px; background-color: #1d4ed8; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 1rem; width: 100%; transition: all 0.2s; }
    .button:disabled { background-color: #94a3b8; cursor: not-allowed; }
    .button:hover:not(:disabled) { background-color: #1e40af; }
    
    .footer-text { text-align: center; margin-top: 32px; font-size: 0.9rem; color: #64748b; }
    .link { color: #1d4ed8; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; }
    .link:hover { text-decoration: underline; }
    
    .message { display: flex; align-items: center; gap: 8px; border-radius: 8px; padding: 12px; text-align: left; margin-bottom: 20px; font-weight: 500; }
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


export default LupaSandiPemilih;