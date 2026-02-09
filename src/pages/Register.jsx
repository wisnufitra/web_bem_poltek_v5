import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../firebase/firebaseConfig';
import { createUserWithEmailAndPassword, sendEmailVerification, signOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

// Import Icons dari Lucide React
import { 
    Eye, EyeOff, User, Hash, Mail, Lock, 
    FileText, AlertCircle, CheckCircle2, ChevronRight 
} from 'lucide-react'; 

import LogoBEM from '../assets/logo-bempoltek.png';

// --- Komponen Password Strength ---
const PasswordStrengthBar = ({ score }) => {
    const getBarColor = () => {
        if (score >= 80) return '#10b981'; // Emerald Green
        if (score >= 40) return '#f59e0b'; // Amber
        return '#ef4444'; // Red
    };

    return (
        <div className="password-strength-container">
            <div className="strength-track">
                <div 
                    className="strength-fill" 
                    style={{ 
                        width: `${score}%`, 
                        backgroundColor: getBarColor() 
                    }} 
                />
            </div>
            <span style={{ color: getBarColor() }} className="strength-text">
                {score >= 80 ? 'Sangat Kuat' : score >= 60 ? 'Kuat' : score >= 40 ? 'Cukup' : 'Lemah'}
            </span>
        </div>
    );
};

const Register = () => {
    const navigate = useNavigate();
    
    // State
    const [nama, setNama] = useState('');
    const [nim, setNim] = useState('');
    const [email, setEmail] = useState('');
    const [catatan, setCatatan] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);
    const [termsAccepted, setTermsAccepted] = useState(false);

    // Efek Samping: Hitung Kekuatan Password
    useEffect(() => {
        let score = 0;
        if (password.length > 7) score += 20;
        if (/\d/.test(password)) score += 20;
        if (/[a-z]/.test(password)) score += 20;
        if (/[A-Z]/.test(password)) score += 20;
        if (/[^A-Za-z0-9]/.test(password)) score += 20;
        setPasswordStrength(score > 100 ? 100 : score);
    }, [password]);

    // Efek Samping: Inject CSS (Agar file JSX tetap bersih dari object style panjang)
    useEffect(() => {
        const styleElement = document.createElement("style");
        styleElement.innerHTML = CSS_STYLES;
        document.head.appendChild(styleElement);
        return () => {
            document.head.removeChild(styleElement);
        };
    }, []);

    const handleRegister = async (e) => {
        e.preventDefault();
        
        if (password !== confirmPassword) return setError('Password konfirmasi tidak cocok.');
        if (!termsAccepted) return setError('Anda harus menyetujui syarat & ketentuan.');
        if (nim.length < 5) return setError('Format NIM tidak valid.');

        setLoading(true);
        setError('');

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Struktur Data Firestore Baru (Mendukung Dynamic Roles)
            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                namaTampilan: nama,
                email: user.email,
                nim: nim,
                role_global: 'mahasiswa', // Role dasar
                registration_note: catatan, // Catatan request jabatan
                assignments: [], // Array kosong (akan diisi Admin)
                foto: '',
                isVerifiedStudent: false, 
                createdAt: serverTimestamp()
            });
            
            await sendEmailVerification(user);
            await signOut(auth);

            navigate('/login', {
                state: {
                    successMessage: 'Registrasi Berhasil! Silakan cek email untuk verifikasi akun.'
                }
            });

        } catch (error) {
            console.error("Register Error:", error);
            if (error.code === 'auth/email-already-in-use') setError('Email ini sudah terdaftar.');
            else if (error.code === 'auth/weak-password') setError('Password terlalu lemah.');
            else setError('Gagal mendaftar. Silakan coba lagi.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="register-page">
            <div className="register-card">
                
                {/* Header Section */}
                <div className="card-header">
                    <img src={LogoBEM} alt="Logo BEM" className="logo" />
                    <h1>Bergabung dengan KM Poltek</h1>
                    <p>Satu akun untuk seluruh akses organisasi kemahasiswaan.</p>
                </div>

                {/* Error Alert */}
                {error && (
                    <div className="alert-box error">
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleRegister} className="register-form">
                    
                    {/* Section 1: Identitas */}
                    <div className="form-section">
                        <label className="section-label">Identitas Akademik</label>
                        <div className="input-grid">
                            <div className="input-group full-width-mobile">
                                <div className="input-wrapper">
                                    <User size={18} className="input-icon" />
                                    <input 
                                        type="text" 
                                        placeholder="Nama Lengkap" 
                                        value={nama} 
                                        onChange={(e) => setNama(e.target.value)} 
                                        required 
                                    />
                                </div>
                            </div>
                            <div className="input-group">
                                <div className="input-wrapper">
                                    <Hash size={18} className="input-icon" />
                                    <input 
                                        type="text" 
                                        placeholder="NIM" 
                                        value={nim} 
                                        onChange={(e) => setNim(e.target.value)} 
                                        required 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Kredensial */}
                    <div className="form-section">
                        <label className="section-label">Kredensial Akun</label>
                        <div className="input-group">
                            <div className="input-wrapper">
                                <Mail size={18} className="input-icon" />
                                <input 
                                    type="email" 
                                    placeholder="Email Mahasiswa (@polteknuklir.ac.id)" 
                                    value={email} 
                                    onChange={(e) => setEmail(e.target.value)} 
                                    required 
                                />
                            </div>
                        </div>
                        
                        <div className="input-grid password-grid">
                            <div className="input-group">
                                <div className="input-wrapper">
                                    <Lock size={18} className="input-icon" />
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        placeholder="Password" 
                                        value={password} 
                                        onChange={(e) => setPassword(e.target.value)} 
                                        required 
                                    />
                                    <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            <div className="input-group">
                                <div className="input-wrapper">
                                    <Lock size={18} className="input-icon" />
                                    <input 
                                        type={showConfirmPassword ? "text" : "password"} 
                                        placeholder="Ulangi Password" 
                                        value={confirmPassword} 
                                        onChange={(e) => setConfirmPassword(e.target.value)} 
                                        required 
                                    />
                                    <button type="button" className="toggle-password" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <PasswordStrengthBar score={passwordStrength} />
                    </div>

                    {/* Section 3: Request Role (Optional) */}
                    <div className="form-section">
                        <div className="label-with-badge">
                            <label className="section-label">Catatan Kepengurusan</label>
                            <span className="badge-optional">Opsional</span>
                        </div>
                        <div className="textarea-wrapper">
                            <FileText size={18} className="textarea-icon" />
                            <textarea 
                                placeholder="Jika Anda pengurus BEM/HIMA/UKM, tuliskan jabatan Anda di sini untuk diverifikasi Admin. Contoh: 'Saya Staf Kominfo BEM 2025'"
                                value={catatan}
                                onChange={(e) => setCatatan(e.target.value)}
                                rows="3"
                            ></textarea>
                        </div>
                    </div>

                    {/* Terms & Action */}
                    <div className="terms-wrapper">
                        <label className="checkbox-container">
                            <input 
                                type="checkbox" 
                                checked={termsAccepted} 
                                onChange={(e) => setTermsAccepted(e.target.checked)} 
                            />
                            <span className="checkmark">
                                {termsAccepted && <CheckCircle2 size={14} color="white" />}
                            </span>
                            <span className="terms-text">
                                Saya menyetujui <Link to="/terms">Syarat & Ketentuan</Link>.
                            </span>
                        </label>
                    </div>

                    <button 
                        type="submit" 
                        className={`submit-btn ${loading || !termsAccepted ? 'disabled' : ''}`}
                        disabled={loading || !termsAccepted}
                    >
                        {loading ? (
                            'Memproses Data...'
                        ) : (
                            <div className="btn-content">
                                Buat Akun Sekarang <ChevronRight size={18} />
                            </div>
                        )}
                    </button>

                </form>

                <div className="card-footer">
                    <p>Sudah memiliki akun? <Link to="/login">Login di sini</Link></p>
                    <div className="copyright">© 2025 BEM Politeknik Teknologi Nuklir Indonesia</div>
                </div>
            </div>
        </div>
    );
};

// --- CSS STYLES (Modern & Professional) ---
const CSS_STYLES = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    /* Global Reset */
    .register-page {
        min-height: 100vh;
        background-color: #f8fafc;
        background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
        background-size: 24px 24px;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 20px;
        font-family: 'Inter', sans-serif;
        color: #1e293b;
    }

    /* Card */
    .register-card {
        background: #ffffff;
        width: 100%;
        max-width: 520px;
        border-radius: 16px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.05);
        border: 1px solid #e2e8f0;
        padding: 40px;
        box-sizing: border-box;
        margin-top: 20px;
    }

    /* Header */
    .card-header { text-align: center; margin-bottom: 32px; }
    .card-header .logo { height: 70px; margin-bottom: 5px; }
    .card-header h1 { font-size: 1.5rem; font-weight: 700; margin: 0 0 8px 0; color: #0f172a; }
    .card-header p { font-size: 0.95rem; color: #64748b; margin: 0; line-height: 1.5; }

    /* Forms */
    .form-section { margin-bottom: 24px; }
    .section-label { display: block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.025em; }
    
    .input-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
    .password-grid { grid-template-columns: 1fr 1fr; margin-top: 16px; }

    .input-group { position: relative; }
    .input-wrapper, .textarea-wrapper { position: relative; display: flex; align-items: center; }
    
    .input-icon, .textarea-icon { position: absolute; left: 14px; color: #94a3b8; pointer-events: none; }
    .textarea-icon { top: 14px; }
    
    input, textarea {
        width: 100%;
        padding: 12px 16px 12px 44px;
        border-radius: 8px;
        border: 1px solid #cbd5e0;
        font-size: 0.95rem;
        font-family: inherit;
        color: #1e293b;
        background-color: #f8fafc;
        transition: all 0.2s ease;
        box-sizing: border-box;
    }
    textarea { resize: vertical; min-height: 80px; }

    input:focus, textarea:focus {
        outline: none; border-color: #2563eb; background-color: #ffffff;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }
    input::placeholder, textarea::placeholder { color: #94a3b8; }

    .toggle-password {
        position: absolute; right: 12px; background: none; border: none;
        color: #64748b; cursor: pointer; padding: 4px; display: flex; align-items: center;
    }
    .toggle-password:hover { color: #1e293b; }

    /* Badge & Terms */
    .label-with-badge { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .badge-optional { font-size: 0.7rem; background-color: #f1f5f9; color: #64748b; padding: 2px 8px; border-radius: 12px; font-weight: 500; border: 1px solid #e2e8f0; }
    
    .checkbox-container { display: flex; align-items: center; cursor: pointer; font-size: 0.9rem; color: #475569; user-select: none; gap: 10px; margin-bottom: 13px; }
    .checkbox-container input { position: absolute; opacity: 0; cursor: pointer; height: 0; width: 0; }
    .checkmark {
        height: 18px; width: 18px; background-color: #fff; border: 1px solid #cbd5e0; border-radius: 4px;
        flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: all 0.2s;
    }
    .checkbox-container input:checked ~ .checkmark { background-color: #2563eb; border-color: #2563eb; }
    .terms-text a { color: #2563eb; text-decoration: none; font-weight: 600; }
    .terms-text a:hover { text-decoration: underline; }

    /* Password Strength */
    .password-strength-container { margin-top: 8px; display: flex; align-items: center; justify-content: space-between; }
    .strength-track { flex-grow: 1; height: 4px; background-color: #e2e8f0; border-radius: 2px; overflow: hidden; margin-right: 12px; }
    .strength-fill { height: 100%; border-radius: 2px; transition: width 0.3s ease, background-color 0.3s ease; }
    .strength-text { font-size: 0.75rem; font-weight: 600; min-width: 70px; text-align: right; }

    /* Alert */
    .alert-box { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 8px; margin-bottom: 24px; font-size: 0.9rem; }
    .alert-box.error { background-color: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; }

    /* Button */
    .submit-btn {
        width: 100%; padding: 14px; background-color: #2563eb; color: white; border: none; border-radius: 8px;
        font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
        box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);
    }
    .submit-btn:hover:not(.disabled) { background-color: #1d4ed8; transform: translateY(-1px); box-shadow: 0 6px 8px -1px rgba(37, 99, 235, 0.3); }
    .submit-btn:active:not(.disabled) { transform: translateY(0); }
    .submit-btn.disabled { background-color: #94a3b8; cursor: not-allowed; box-shadow: none; }
    .btn-content { display: flex; align-items: center; justify-content: center; gap: 8px; }

    /* Footer */
    .card-footer { text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0; }
    .card-footer p { color: #64748b; font-size: 0.95rem; }
    .card-footer a { color: #2563eb; font-weight: 600; text-decoration: none; }
    .copyright { margin-top: 16px; font-size: 0.75rem; color: #94a3b8; }

    /* Mobile Responsive */
    @media (max-width: 640px) {
        .register-card { padding: 24px; }
        .input-grid, .password-grid { grid-template-columns: 1fr; gap: 16px; }
        .full-width-mobile { grid-column: span 1; }
        .card-header h1 { font-size: 1.25rem; }
        .logo { height: 50px; }
        .strength-text { display: none; }
        .strength-track { margin-right: 0; }
    }
`;

export default Register;