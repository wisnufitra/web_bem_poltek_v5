// src/pages/ForgotPassword.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { auth } from '../firebase/firebaseConfig';
import { sendPasswordResetEmail, fetchSignInMethodsForEmail } from 'firebase/auth';
import LogoBEM from '../assets/logo-bempoltek.png';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const methods = await fetchSignInMethodsForEmail(auth, email);
      
      if (methods.length === 0) {
        setError('Email ini belum terdaftar sebagai pengguna.');
        setLoading(false);
        return;
      }

      await sendPasswordResetEmail(auth, email);
      setMessage('Tautan reset password telah dikirim. Silakan cek email Anda (termasuk folder spam).');
    } catch (err) {
      console.error("Reset error:", err.code);
      setError('Gagal mengirim email. Silakan coba lagi nanti.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.logoWrapper}>
          <img src={LogoBEM} alt="Logo BEM" style={{ height: "70px" }} />
        </div>
        <h2 style={styles.heading}>Lupa Kata Sandi</h2>
        <p style={styles.subHeading}>
          Masukkan email Anda untuk menerima tautan pemulihan.
        </p>

        {message && <p style={styles.successText}>{message}</p>}
        {error && <p style={styles.errorText}>{error}</p>}

        <form onSubmit={handleReset} style={styles.form}>
          <label style={styles.label}>Email</label>
          <div style={styles.inputContainer}>
            <svg style={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            <input
              style={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="mahasiswa@polteknuklir.ac.id"
              required
            />
          </div>

          <button
            type="submit"
            style={loading ? styles.disabledButton : styles.button}
            disabled={loading}
            className="login-button"
          >
            {loading ? 'Mengirim...' : 'Kirim Tautan Reset'}
          </button>
        </form>

        <p style={styles.footerText}>
          <Link to="/login" style={styles.link}>Kembali ke Login</Link>
        </p>

        <p style={styles.copyrightText}>
          © 2025 BEM Politeknik Teknologi Nuklir Indonesia
        </p>
      </div>
    </div>
  );
};

// Styles diselaraskan dengan halaman Login
const styles = {
    page: {
        fontFamily: "'Inter', 'Segoe UI', Roboto, sans-serif",
        backgroundColor: '#f8fafc',
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
      },
      container: {
        maxWidth: '440px',
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
      },
      form: { display: 'flex', flexDirection: 'column' },
      label: { marginBottom: '8px', fontSize: '0.9rem', color: '#334155', fontWeight: '600' },
      inputContainer: { position: 'relative', marginBottom: '25px' },
      inputIcon: { position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' },
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
      footerText: { textAlign: 'center', marginTop: '32px', fontSize: '0.9rem' },
      link: { color: '#1d4ed8', fontWeight: '600', textDecoration: 'none' },
      successText: { color: '#166534', backgroundColor: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', padding: '12px', textAlign: 'center', marginBottom: '20px' },
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
  
  input:focus {
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

export default ForgotPassword;

