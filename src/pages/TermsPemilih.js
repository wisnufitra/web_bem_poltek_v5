// src/pages/TermsPemilih.js
import React from 'react';
import { Link } from 'react-router-dom';
import LogoBEM from '../assets/logo-bempoltek.png';

const TermsPemilih = () => {
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.logoWrapper}>
          <img src={LogoBEM} alt="Logo BEM" style={{ height: "60px" }} />
        </div>
        <h1 style={styles.mainHeading}>Syarat & Ketentuan Pemilih</h1>
        <p style={styles.lastUpdated}>Terakhir diperbarui: 2 Oktober 2025</p>

        <p style={styles.paragraph}>
          Selamat datang di Sistem E-Voting BEM Politeknik Teknologi Nuklir Indonesia. Dengan mendaftar sebagai pemilih, Anda setuju untuk terikat oleh syarat dan ketentuan berikut. Harap baca dengan saksama.
        </p>

        <h2 style={styles.subHeading}>1. Kualifikasi Pemilih</h2>
        <ul style={styles.list}>
          <li>Anda harus terdaftar sebagai mahasiswa aktif di Politeknik Teknologi Nuklir Indonesia.</li>
          <li>Satu mahasiswa hanya berhak mendaftarkan satu akun pemilih menggunakan NIM dan email mahasiswa yang valid.</li>
          <li>Pendaftaran ganda dengan identitas yang sama atau berbeda tidak diperkenankan dan akan menyebabkan diskualifikasi.</li>
        </ul>

        <h2 style={styles.subHeading}>2. Kerahasiaan dan Keamanan Akun</h2>
        <ul style={styles.list}>
          <li>Anda bertanggung jawab penuh untuk menjaga kerahasiaan password dan keamanan akun Anda.</li>
          <li>Jangan pernah membagikan informasi login Anda kepada siapa pun, termasuk panitia pemilihan. Panitia tidak akan pernah meminta password Anda.</li>
          <li>Segala aktivitas pemilihan yang terjadi melalui akun Anda dianggap sah dan dilakukan oleh Anda.</li>
        </ul>

        <h2 style={styles.subHeading}>3. Penggunaan Hak Pilih</h2>
        <ul style={styles.list}>
          <li>Setiap pemilih yang telah disetujui hanya memiliki satu (1) hak suara untuk setiap pemilihan yang berlangsung.</li>
          <li>Pilihan yang telah dikirimkan bersifat final dan tidak dapat diubah kembali.</li>
          <li>Anda setuju untuk menggunakan hak pilih Anda secara jujur, adil, dan tanpa paksaan dari pihak mana pun.</li>
        </ul>

        <h2 style={styles.subHeading}>4. Perlindungan Data</h2>
        <ul style={styles.list}>
          <li>Data pribadi Anda (Nama, NIM, Prodi, Email) akan digunakan oleh sistem semata-mata untuk keperluan verifikasi dan validasi dalam proses pemilihan.</li>
          <li>Kami menjamin bahwa data pilihan suara Anda bersifat anonim dan rahasia. Data suara akan dihitung secara agregat tanpa mengaitkannya dengan identitas pemilih.</li>
          <li>Data pribadi Anda tidak akan dibagikan kepada pihak ketiga di luar kepentingan pemilihan yang sah.</li>
        </ul>

        <p style={styles.paragraph}>
          Dengan mencentang kotak "Saya menyetujui syarat & ketentuan pemilih" pada halaman pendaftaran, Anda mengonfirmasi bahwa Anda telah membaca, memahami, dan setuju untuk mematuhi semua poin yang tercantum di atas.
        </p>

        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <Link to="/register-pemilih" style={styles.button}>Kembali ke Pendaftaran</Link>
        </div>
      </div>
    </div>
  );
};

const styles = {
    page: {
        fontFamily: "'Inter', 'Segoe UI', Roboto, sans-serif",
        backgroundColor: '#f8fafc',
        minHeight: '100vh',
        padding: '40px 20px',
        color: '#334155'
    },
    container: {
        maxWidth: '800px',
        margin: '0 auto',
        padding: '40px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
    },
    logoWrapper: {
        textAlign: 'center',
        marginBottom: '24px'
    },
    mainHeading: {
        textAlign: 'center',
        color: '#1e293b',
        fontSize: '1.8rem',
        fontWeight: '700',
        marginBottom: '8px'
    },
    lastUpdated: {
        textAlign: 'center',
        color: '#9ca3af',
        fontSize: '0.9rem',
        marginBottom: '32px'
    },
    subHeading: {
        color: '#1e293b',
        fontSize: '1.2rem',
        fontWeight: '600',
        marginTop: '32px',
        marginBottom: '16px',
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: '8px'
    },
    paragraph: {
        fontSize: '1rem',
        lineHeight: '1.7',
        color: '#475569',
        marginBottom: '16px'
    },
    list: {
        fontSize: '1rem',
        lineHeight: '1.7',
        color: '#475569',
        paddingLeft: '20px'
    },
    button: {
        display: 'inline-block',
        padding: '12px 24px',
        backgroundColor: '#1d4ed8',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: '600',
        textDecoration: 'none',
        transition: 'background-color 0.2s ease-in-out',
    }
};

export default TermsPemilih;
