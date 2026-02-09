// src/pages/RegisterPanitia.js
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../firebase/firebaseConfig';
import { createUserWithEmailAndPassword, signOut, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import LogoBEM from '../assets/logo-bempoltek.png';

// Komponen PasswordStrengthBar
const PasswordStrengthBar = ({ score }) => {
    const getBarColor = () => {
        if (score >= 80) return '#22c55e'; // green-500
        if (score >= 40) return '#f59e0b'; // amber-500
        return '#ef4444'; // red-500
    };

    const getStrengthText = () => {
        if (score >= 80) return 'Sangat Kuat';
        if (score >= 60) return 'Kuat';
        if (score >= 40) return 'Cukup';
        return 'Lemah';
    };

    return (
        <div style={{ marginTop: '-10px', marginBottom: '20px' }}>
            <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${score}%`, backgroundColor: getBarColor(), borderRadius: '3px', transition: 'width 0.3s ease' }} />
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: getBarColor(), textAlign: 'right', fontWeight: '500' }}>
                {getStrengthText()}
            </p>
        </div>
    );
};


const RegisterPanitia = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [nama, setNama] = useState('');
    const [ormawa, setOrmawa] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const [passwordStrength, setPasswordStrength] = useState(0);
    const [termsAccepted, setTermsAccepted] = useState(false);

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
        
        if (password !== confirmPassword) {
            setError('Password dan Konfirmasi Password tidak cocok.');
            return;
        }

        if (!ormawa) {
            setError('Silakan isi nama Ormawa Anda.');
            return;
        }

        if (!termsAccepted) {
            setError('Anda harus menyetujui syarat & ketentuan.');
            return;
        }
        
        setLoading(true);
        setError('');
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // ✅ PERBAIKAN: Menyimpan data ke koleksi 'users' dengan peran 'pending_panitia'
            await setDoc(doc(db, 'users', user.uid), {
                email: user.email,
                namaTampilan: nama,
                ormawa: ormawa,
                role: 'pending_panitia', // Peran spesifik untuk panitia yang menunggu persetujuan
                foto: ''
            });

            await sendEmailVerification(user);
            await signOut(auth);

            navigate('/login', {
                state: {
                    successMessage: 'Registrasi berhasil! Cek email untuk verifikasi dan tunggu persetujuan Admin.'
                }
            });

        } catch (error) {
            console.error("Registration error:", error);
            if (error.code === 'auth/email-already-in-use') {
                setError('Email sudah terdaftar. Silakan gunakan email lain atau login.');
            } else if (error.code === 'auth/weak-password') {
                setError('Password terlalu lemah. Password minimal 8 karakter dengan kombinasi.');
            } else {
                setError('Gagal mendaftar. Silakan coba lagi.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                <>
                    <div style={styles.logoWrapper}>
                        <img src={LogoBEM} alt="Logo BEM" style={{ height: "70px" }} />
                    </div>
                    <h2 style={styles.heading}>Daftar Akun Panitia</h2>
                    <p style={styles.subHeading}>Khusus untuk panitia kegiatan BEM.</p>

                    {error && <p style={styles.errorText}>{error}</p>}
                    
                    <form onSubmit={handleRegister} style={styles.form}>
                        <label style={styles.label}>Nama Lengkap</label>
                        <div style={styles.inputContainer}>
                            <svg style={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                            <input style={styles.input} type="text" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama Lengkap Anda" required />
                        </div>

                        <label style={styles.label}>Asal Ormawa/Kepanitiaan</label>
                        <div style={styles.inputContainer}>
                            <svg style={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                            <input style={styles.input} type="text" value={ormawa} onChange={(e) => setOrmawa(e.target.value)} placeholder="Contoh: Hima EK, Panitia Wisuda" required />
                        </div>
                        
                        <label style={styles.label}>Email</label>
                        <div style={styles.inputContainer}>
                            <svg style={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                            <input style={styles.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Masukkan email Anda" required />
                        </div>

                        <label style={styles.label}>Password</label>
                        <div style={styles.inputContainer}>
                            <svg style={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                            <input style={styles.passwordInput} type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 8 karakter" required />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} style={styles.eyeIcon} aria-label="Toggle Password Visibility">
                                {showPassword ? <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>}
                            </button>
                        </div>
                        <PasswordStrengthBar score={passwordStrength} />

                        <label style={styles.label}>Konfirmasi Password</label>
                        <div style={styles.inputContainer}>
                            <svg style={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                            <input style={styles.passwordInput} type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Ulangi password" required />
                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon} aria-label="Toggle Password Visibility">
                            {showConfirmPassword ? <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>}
                            </button>
                        </div>

                        <div style={styles.optionsRow}>
                            <label style={styles.rememberLabel}>
                                <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} style={styles.checkbox} />
                                <span>Saya menyetujui <a href="/terms" target="_blank" style={styles.link}>syarat & ketentuan</a>.</span>
                            </label>
                        </div>
                        
                        <button type="submit" style={!termsAccepted || loading ? styles.disabledButton : styles.button} disabled={!termsAccepted || loading} className="login-button">
                            {loading ? 'Memproses...' : 'Daftar'}
                        </button>
                    </form>

                    <p style={styles.footerText}>
                        Sudah punya akun? <Link to="/login" style={styles.link}>Login di sini</Link>
                    </p>

                    <p style={styles.copyrightText}>
                        © 2025 BEM Politeknik Teknologi Nuklir Indonesia
                    </p>
                </>
            </div>
        </div>
    );
};

const styles = {
    page: {
        fontFamily: "'Inter', 'Segoe UI', Roboto, sans-serif",
        backgroundColor: '#f8fafc',
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '40px 20px',
      },
      container: {
        maxWidth: '480px',
        width: '100%',
        padding: '40px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        textAlign: 'left'
      },
      logoWrapper: { textAlign: 'center', marginBottom: '16px' },
      heading: {
        textAlign: 'center',
        color: '#1e293b',
        marginBottom: '8px',
        fontSize: '1.7rem',
        fontWeight: '700',
      },
      subHeading: {
        textAlign: 'center',
        color: '#64748b',
        marginBottom: '32px',
        fontSize: '1rem',
        fontWeight: '400',
        lineHeight: '1.5'
      },
      form: { display: 'flex', flexDirection: 'column' },
      label: { marginBottom: '8px', fontSize: '0.9rem', color: '#334155', fontWeight: '600' },
      inputContainer: { position: 'relative', marginBottom: '20px' },
      inputIcon: { position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', zIndex: 1 },
      input: {
        width: '100%',
        boxSizing: 'border-box',
        padding: '12px 12px 12px 50px',
        borderRadius: '8px',
        border: '1px solid #cbd5e0',
        fontSize: '1rem',
        backgroundColor: '#ffffff',
        color: '#1e293b',
      },
      passwordInput: {
        width: '100%',
        boxSizing: 'border-box',
        padding: '12px 40px 12px 50px',
        borderRadius: '8px',
        border: '1px solid #cbd5e0',
        fontSize: '1rem',
        backgroundColor: '#ffffff',
        color: '#1e293b',
      },
      eyeIcon: {
        position: 'absolute',
        right: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: '#9ca3af',
      },
      optionsRow: {
        display: 'flex',
        alignItems: 'center',
        marginBottom: '25px',
        fontSize: '0.9rem',
      },
      rememberLabel: {
        display: 'flex',
        alignItems: 'center',
        color: '#334155',
        cursor: 'pointer',
      },
      checkbox: {
        marginRight: '8px',
        cursor: 'pointer',
        width: '16px',
        height: '16px',
        accentColor: '#1d4ed8'
      },
      button: {
        padding: '14px',
        backgroundColor: '#1d4ed8',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '1rem',
        width: '100%',
      },
      disabledButton: {
        padding: '14px',
        backgroundColor: '#a0aec0',
        color: '#e2e8f0',
        border: 'none',
        borderRadius: '8px',
        fontSize: '1rem',
        cursor: 'not-allowed',
      },
      footerText: { textAlign: 'center', marginTop: '32px', fontSize: '0.9rem', color: '#64748b' },
      link: { color: '#1d4ed8', fontWeight: '600', textDecoration: 'none' },
      errorText: { color: '#b91c1c', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '12px', textAlign: 'center', marginBottom: '20px' },
      copyrightText: {
        textAlign: 'center',
        marginTop: '24px',
        paddingTop: '24px',
        borderTop: '1px solid #e2e8f0',
        fontSize: '0.8rem',
        color: '#9ca3af',
      }
};

const styleSheet = document.createElement("style");
styleSheet.innerHTML = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  
  input:focus, select:focus {
    outline: none;
    border-color: #1d4ed8;
    box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.2);
  }
  .login-button {
      transition: background-color 0.2s ease-in-out, transform 0.1s ease-in-out;
  }
  .login-button:hover {
    background-color: #1e40af;
  }
  .login-button:active {
    transform: scale(0.98);
  }
  a[style*="color: '#1d4ed8'"]:hover {
    text-decoration: underline;
  }
`;
document.head.appendChild(styleSheet);


export default RegisterPanitia;

