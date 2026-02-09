// src/pages/Login.js
import React, { useState, useEffect } from 'react'; // Tambah useEffect
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  signOut
} from 'firebase/auth';
import { auth, db } from '../firebase/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import LogoBEM from '../assets/logo-bempoltek.png';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = location.state?.successMessage;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);

  // 1. CEK LOCAL STORAGE SAAT HALAMAN DIMUAT
  useEffect(() => {
    const savedEmail = localStorage.getItem('savedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRemember(true); // Otomatis centang "Ingat Saya" jika email ada
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 2. SIMPAN/HAPUS EMAIL DI LOCAL STORAGE BERDASARKAN CHECKBOX
      if (remember) {
        localStorage.setItem('savedEmail', email);
      } else {
        localStorage.removeItem('savedEmail');
      }

      // Set persistensi Firebase (Sesi Login)
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const { role, eventId } = userData;

        if (role === 'pending' || role === 'pending_panitia') {
            if (!user.emailVerified) {
                setError('Email Anda belum diverifikasi. Silakan cek inbox (dan folder spam).');
                await signOut(auth);
            } else {
                setError('Akun Anda masih menunggu persetujuan dari Administrator.');
                await signOut(auth);
            }
        } else if (role === 'admin' || role === 'master') {
            navigate('/admin');
        } else if (role === 'panitia_requestor') {
            navigate('/request-pemilihan');
        } else if (role === 'panitia') {
            if (eventId) {
              navigate(`/panitia/${eventId}`);
            } else {
              setError('Akun panitia Anda belum ditugaskan ke event manapun.');
              await signOut(auth);
            }
        } else {
            setError('Peran akun Anda tidak dikenali. Hubungi Administrator.');
            await signOut(auth);
        }
      } else {
        setError('Akun ini tidak terdaftar di portal administrasi BEM.');
        await signOut(auth);
      }

    } catch (error) {
      console.error("Login error:", error.code);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setError('Email atau password salah.');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Terlalu banyak percobaan gagal. Coba lagi nanti.');
      } else {
        setError('Login gagal. Silakan coba lagi nanti.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* Inject Style Hover secara manual */}
      <style>{`
        input:focus { outline: none; border-color: #1d4ed8 !important; box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.2); }
        .login-button { transition: background-color 0.2s ease-in-out, transform 0.1s ease-in-out; }
        .login-button:hover { background-color: #1e40af !important; }
        .login-button:active { transform: scale(0.98); }
        a:hover { text-decoration: underline; }
      `}</style>

      <div style={styles.container}>
        <div style={styles.logoWrapper}>
          <img src={LogoBEM} alt="Logo BEM" style={{ height: "70px" }} />
        </div>
        <h2 style={styles.heading}>Selamat Datang</h2>
        <p style={styles.subHeading}>Masuk untuk melanjutkan ke Portal BEM Poltek Nuklir</p>

        {successMessage && <p style={styles.successText}>{successMessage}</p>}
        {error && <p style={styles.errorText}>{error}</p>}

        <form onSubmit={handleLogin} style={styles.form}>
          <label htmlFor="email" style={styles.label}>Email</label>
          <div style={styles.inputContainer}>
            <svg style={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            
            {/* 3. ATRIBUT PENTING UNTUK AUTOFILL BROWSER */}
            <input
              id="email" 
              name="email"
              autoComplete="username"
              style={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Masukkan email Anda"
              required
            />
          </div>

          <label htmlFor="password" style={styles.label}>Password</label>
          <div style={styles.inputContainer}>
            <svg style={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            
            {/* 3. ATRIBUT PENTING UNTUK AUTOFILL BROWSER */}
            <input
              id="password"
              name="password"
              autoComplete="current-password"
              style={styles.passwordInput}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
              aria-label="Toggle Password Visibility"
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              )}
            </button>
          </div>

          <div style={styles.optionsRow}>
            <label style={styles.rememberLabel}>
              <input
                type="checkbox"
                checked={remember}
                onChange={() => setRemember(!remember)}
                style={styles.checkbox}
              />
              Ingat saya
            </label>
            <Link to="/forgot-password" style={styles.link}>
              Lupa kata sandi?
            </Link>
          </div>

          <button
            type="submit"
            style={loading ? styles.disabledButton : styles.button}
            disabled={loading}
            className="login-button"
          >
            {loading ? 'Memproses...' : 'Login'}
          </button>
        </form>

        <p style={styles.footerText}>
          Belum punya akun?{" "}
          <Link to="/register" style={styles.link}>Daftar Admin</Link> |{" "}
          <Link to="/register-panitia" style={styles.link}>Daftar Panitia</Link>
        </p>

        <p style={styles.copyrightText}>
          © 2025 BEM Politeknik Teknologi Nuklir Indonesia
        </p>
      </div>
    </div>
  );
};

const styles = {
    page: { fontFamily: "'Inter', sans-serif", backgroundColor: '#f8fafc', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' },
    container: { maxWidth: '440px', width: '100%', padding: '40px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', textAlign: 'left' },
    logoWrapper: { textAlign: 'center', marginBottom: '16px' },
    heading: { textAlign: 'center', color: '#1e293b', marginBottom: '8px', fontSize: '1.7rem', fontWeight: '700' },
    subHeading: { textAlign: 'center', color: '#64748b', marginBottom: '32px', fontSize: '1rem', fontWeight: '400' },
    form: { display: 'flex', flexDirection: 'column' },
    label: { marginBottom: '8px', fontSize: '0.9rem', color: '#334155', fontWeight: '600' },
    inputContainer: { position: 'relative', marginBottom: '20px' },
    inputIcon: { position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' },
    input: { width: '100%', boxSizing: 'border-box', padding: '12px 12px 12px 50px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '1rem', backgroundColor: '#ffffff', color: '#1e293b' },
    passwordInput: { width: '100%', boxSizing: 'border-box', padding: '12px 40px 12px 50px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '1rem', backgroundColor: '#ffffff', color: '#1e293b' },
    eyeIcon: { position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' },
    optionsRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', fontSize: '0.9rem' },
    rememberLabel: { display: 'flex', alignItems: 'center', color: '#334155', cursor: 'pointer' },
    checkbox: { marginRight: '8px', cursor: 'pointer', width: '16px', height: '16px', accentColor: '#1d4ed8' },
    button: { padding: '14px', backgroundColor: '#1d4ed8', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '1rem', width: '100%' },
    disabledButton: { padding: '14px', backgroundColor: '#94a3b8', color: '#e2e8f0', border: 'none', borderRadius: '8px', cursor: 'not-allowed', fontWeight: '600', fontSize: '1rem', width: '100%' },
    footerText: { textAlign: 'center', marginTop: '32px', fontSize: '0.9rem', color: '#64748b' },
    link: { color: '#1d4ed8', fontWeight: '600', textDecoration: 'none' },
    successText: { color: '#15803d', backgroundColor: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', padding: '12px', textAlign: 'center', marginBottom: '20px' },
    errorText: { color: '#b91c1c', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '12px', textAlign: 'center', marginBottom: '20px' },
    copyrightText: { textAlign: 'center', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#9ca3af' }
};

export default Login;