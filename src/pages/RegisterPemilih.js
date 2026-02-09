// src/pages/RegisterPemilih.js
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../firebase/firebaseConfig';
import { createUserWithEmailAndPassword, sendEmailVerification, signOut } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import poltekLogo from '../assets/logo-poltek.png';
import evotingIllustration from '../assets/evoting-illustration.png';

// ✅ 1. Impor semua ikon yang dibutuhkan
import { User, Hash, University, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';


const prodiOptions = ["Teknokimia Nuklir", "Elektronika Instrumentasi", "Elektro Mekanika"];
const prodiPrefixMap = { "Teknokimia Nuklir": "01", "Elektronika Instrumentasi": "02", "Elektro Mekanika": "03" };

const PasswordStrengthBar = ({ score }) => {
    // ... (kode komponen tidak berubah)
};

const RegisterPemilih = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [namaLengkap, setNamaLengkap] = useState('');
    const [nim, setNim] = useState('');
    const [prodi, setProdi] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);
    const [termsAccepted, setTermsAccepted] = useState(false);

    // --- (Semua logika handleRegister & useEffect tidak berubah) ---
    useEffect(() => {
        let score = 0;
        if (password.length > 7) score += 20;
        if (/\d/.test(password)) score += 20;
        if (/[a-z]/.test(password)) score += 20;
        if (/[A-Z]/.test(password)) score += 20;
        if (/[^A-Za-z0-9]/.test(password)) score += 20;
        setPasswordStrength(score > 100 ? 100 : score);
    }, [password]);

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        if (password !== confirmPassword) return setError('Password dan Konfirmasi Password tidak cocok.');
        if (!prodi) return setError('Silakan pilih Program Studi Anda.');
        if (nim.length !== 9 || !/^\d+$/.test(nim)) return setError('NIM harus terdiri dari tepat 9 digit angka.');
        const expectedPrefix = prodiPrefixMap[prodi];
        const nimPrefix = nim.substring(0, 2);
        if (expectedPrefix !== nimPrefix) return setError(`NIM tidak sesuai dengan Program Studi. Awalan NIM untuk ${prodi} seharusnya ${expectedPrefix}.`);
        if (!termsAccepted) return setError('Anda harus menyetujui syarat & ketentuan pemilih.');
        setLoading(true);
        try {
            const votersRef = collection(db, 'voters');
            const q = query(votersRef, where("nim", "==", nim));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                setLoading(false);
                return setError('NIM ini sudah terdaftar. Hubungi panitia jika Anda merasa ini adalah kesalahan.');
            }
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            await setDoc(doc(db, 'voters', user.uid), { email: user.email, namaLengkap: namaLengkap, nim: nim, prodi: prodi, status: 'pending', foto: '', eventId: null, telahMemilih: false, dibuatPada: serverTimestamp() });
            await sendEmailVerification(user);
            await signOut(auth);
            navigate('/login-pemilih', { state: { successMessage: 'Registrasi berhasil! Cek email untuk verifikasi dan tunggu persetujuan panitia.' } });
        } catch (error) {
            if (error.code === 'auth/email-already-in-use') { setError('Alamat email ini sudah terdaftar di sistem.'); } 
            else if (error.code === 'auth/weak-password') { setError('Password terlalu lemah. Gunakan minimal 8 karakter kombinasi.'); } 
            else { setError('Gagal mendaftar. Silakan coba lagi.'); }
        } finally {
            setLoading(false);
        }
    };

    // ✅ 2. Gunakan className untuk styling responsif
    return (
        <div className="register-page">
            <div className="container">
                <div className="left-panel">
                    <img src={poltekLogo} alt="Logo Poltek" style={{ height: "60px" }} />
                    <h1 className="illustration-title">Registrasi Akun Pemilih</h1>
                    <p className="illustration-subtitle">Satu langkah lagi untuk dapat menggunakan hak pilih Anda dalam pemilihan BEM.</p>
                    <img src={evotingIllustration} alt="E-Voting Illustration" className="illustration-image" />
                </div>

                <div className="right-panel">
                    <h2 className="heading">Buat Akun Baru</h2>
                    <p className="sub-heading">Pastikan data yang Anda masukkan sudah benar sesuai identitas mahasiswa.</p>

                    {error && <p className="message error"><AlertCircle size={18}/>{error}</p>}
                    
                    <form onSubmit={handleRegister}>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="label">Nama Lengkap</label>
                                <div className="input-with-icon">
                                    <User size={18} />
                                    <input className="input" type="text" value={namaLengkap} onChange={(e) => setNamaLengkap(e.target.value)} placeholder="Sesuai KTM" required />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="label">NIM</label>
                                <div className="input-with-icon">
                                    <Hash size={18} />
                                    <input className="input" type="text" maxLength="9" value={nim} onChange={(e) => setNim(e.target.value)} placeholder="9 Digit" required />
                                </div>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="label">Program Studi</label>
                            <div className="input-with-icon">
                                <University size={18} />
                                <select className="input select" value={prodi} onChange={(e) => setProdi(e.target.value)} required>
                                    <option value="" disabled>-- Pilih Program Studi --</option>
                                    {prodiOptions.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                        </div>
                        
                        <div className="form-group">
                            <label className="label">Email Mahasiswa</label>
                            <div className="input-with-icon">
                                <Mail size={18} />
                                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Masukkan email Anda" required />
                            </div>
                        </div>
                        
                        <div className="form-group">
                            <label className="label">Password</label>
                            <div className="input-with-icon">
                                <Lock size={18} />
                                <input className="input password-input" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 karakter kombinasi" required />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="eye-icon">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                            </div>
                            <PasswordStrengthBar score={passwordStrength} />
                        </div>

                        <div className="form-group">
                            <label className="label">Konfirmasi Password</label>
                            <div className="input-with-icon">
                                <Lock size={18} />
                                <input className="input password-input" type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Ulangi password" required />
                                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="eye-icon">{showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                            </div>
                        </div>
                        
                        <div className="options-row">
                            <label className="remember-label">
                                <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} />
                                <span>Saya menyetujui <Link to="/terms-pemilih" target="_blank" className="link">syarat & ketentuan</Link>.</span>
                            </label>
                        </div>

                        <button type="submit" className="button" disabled={!termsAccepted || loading}>
                            {loading ? <><Loader2 size={20} className="animate-spin"/> Memproses...</> : "Buat Akun"}
                        </button>
                    </form>
                    <p className="footer-text">
                        Sudah punya akun? <Link to="/login-pemilih" className="link">Login di sini</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

// ✅ 3. Stylesheet baru yang lebih rapi dan responsif
const styleSheet = document.createElement("style");
styleSheet.innerHTML = `
    /* ... (CSS dari LoginPemilih.js, dengan sedikit penyesuaian) ... */
    .register-page { font-family: 'Inter', sans-serif; background-color: #f1f5f9; min-height: 100vh; display: flex; justify-content: center; align-items: center; padding: 20px; }
    .container { max-width: 1024px; width: 100%; margin: 20px auto; display: flex; flex-direction: column; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); overflow: hidden; }
    
    .left-panel { background-color: #f8fafc; padding: 40px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; border-bottom: 1px solid #e2e8f0; }
    .right-panel { padding: 32px; display: flex; flex-direction: column; justify-content: center; }
    
    .illustration-title { font-size: 1.5rem; font-weight: 700; color: #1e293b; margin-top: 16px; margin-bottom: 8px; }
    .illustration-subtitle { font-size: 1rem; color: #64748b; max-width: 300px; margin-bottom: 24px; }
    .illustration-image { max-width: 280px; width: 100%; }
    
    .heading { color: #1e293b; font-weight: 700; font-size: 1.7rem; margin-bottom: 8px; }
    .sub-heading { color: #64748b; margin-bottom: 24px; font-size: 1rem; }
    
    .form-row { display: flex; flex-direction: column; gap: 20px; }
    .form-group { margin-bottom: 20px; }
    .label { margin-bottom: 8px; font-size: 0.9rem; color: #334155; font-weight: 600; display: block; }
    .input-with-icon { position: relative; }
    .input-with-icon svg { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: #9ca3af; }
    .input { width: 100%; box-sizing: border-box; padding: 12px 12px 12px 50px; border-radius: 8px; border: 1px solid #cbd5e0; font-size: 1rem; }
    select.input { appearance: none; padding-right: 12px; }
    .password-input { padding-right: 50px; }
    .eye-icon { position: absolute; right: 35px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #9ca3af; padding: 4px; }
    
    .options-row { display: flex; align-items: center; margin-bottom: 25px; font-size: 0.9rem; }
    .remember-label { display: flex; align-items: center; color: #334155; cursor: pointer; }
    .remember-label input { margin-right: 8px; accent-color: #1d4ed8; }
    .link { color: #1d4ed8; font-weight: 600; text-decoration: none; }
    .link:hover { text-decoration: underline; }
    
    .button { /* ... (styling sama seperti Login) */ }
    .footer-text { text-align: center; margin-top: 32px; font-size: 0.9rem; color: #64748b; }
    .message.error { display: flex; align-items: center; gap: 8px; /* ... (styling sama seperti Login) */ }
    
    /* --- Tampilan Desktop --- */
    @media (min-width: 800px) {
        .container { flex-direction: row; }
        .left-panel { flex: 1; border-bottom: none; border-right: 1px solid #e2e8f0; }
        .right-panel { flex: 1.2; padding: 40px 50px; }
        .form-row { flex-direction: row; }
        .form-row .form-group:first-child { flex: 2; }
        .form-row .form-group:last-child { flex: 1; }
    }
`;
document.head.appendChild(styleSheet);


export default RegisterPemilih;