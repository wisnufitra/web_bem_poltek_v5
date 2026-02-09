// src/pages/Terms.js
import React from 'react';
import { Link } from 'react-router-dom';

const Terms = () => {
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h2 style={styles.heading}>Syarat & Ketentuan</h2>
        <p style={styles.subHeading}>Terakhir diperbarui: 2 Oktober 2025</p>

        <div style={styles.content}>
          <h3 style={styles.sectionHeading}>1. Penerimaan Persyaratan</h3>
          <p style={styles.paragraph}>
            Dengan mendaftar dan menggunakan Portal BEM Politeknik Teknologi Nuklir Indonesia ("Layanan"), Anda setuju untuk terikat oleh Syarat & Ketentuan ini. Jika Anda tidak menyetujui bagian mana pun dari persyaratan ini, Anda tidak diizinkan untuk menggunakan Layanan.
          </p>

          <h3 style={styles.sectionHeading}>2. Deskripsi Layanan</h3>
          <p style={styles.paragraph}>
            Layanan ini disediakan untuk memfasilitasi manajemen internal, komunikasi, dan administrasi kegiatan Badan Eksekutif Mahasiswa (BEM). Fitur termasuk, namun tidak terbatas pada, manajemen pengguna, pengumuman, dan penjadwalan acara.
          </p>

          <h3 style={styles.sectionHeading}>3. Kewajiban Pengguna</h3>
          <p style={styles.paragraph}>
            Anda setuju untuk:
            <ul style={styles.list}>
              <li>Memberikan informasi yang akurat, terkini, dan lengkap saat pendaftaran.</li>
              <li>Menjaga kerahasiaan kata sandi Anda dan bertanggung jawab penuh atas semua aktivitas yang terjadi di bawah akun Anda.</li>
              <li>Menggunakan Layanan ini hanya untuk tujuan yang sah dan sesuai dengan fungsinya sebagai anggota BEM.</li>
              <li>Tidak menyalahgunakan Layanan untuk menyebarkan konten ilegal, kebencian, atau melanggar hak kekayaan intelektual.</li>
            </ul>
          </p>

          <h3 style={styles.sectionHeading}>4. Kebijakan Privasi</h3>
          <p style={styles.paragraph}>
            Data pribadi yang Anda berikan saat pendaftaran, seperti nama, email, dan kementerian, akan disimpan dan dikelola sesuai dengan kebijakan privasi kami. Kami berkomitmen untuk melindungi data Anda dan tidak akan membagikannya kepada pihak ketiga tanpa persetujuan Anda, kecuali diwajibkan oleh hukum.
          </p>
          
          <h3 style={styles.sectionHeading}>5. Pembatasan Tanggung Jawab</h3>
          <p style={styles.paragraph}>
            Administrator tidak bertanggung jawab atas kehilangan data atau kerusakan yang timbul dari penggunaan Layanan yang tidak semestinya. Layanan disediakan "sebagaimana adanya" tanpa jaminan apa pun.
          </p>

          <h3 style={styles.sectionHeading}>6. Perubahan Persyaratan</h3>
          <p style={styles.paragraph}>
            Kami berhak untuk mengubah Syarat & Ketentuan ini dari waktu ke waktu. Perubahan akan diinformasikan melalui email atau pengumuman di dalam Layanan. Dengan terus menggunakan Layanan setelah perubahan, Anda dianggap menyetujui persyaratan yang baru.
          </p>
        </div>

        <div style={styles.buttonContainer}>
            <Link to="/register" style={{...styles.button, textDecoration: 'none', textAlign: 'center'}}>
                Kembali ke Pendaftaran
            </Link>
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
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '40px 20px',
    },
    container: {
        maxWidth: '800px', // Lebih lebar untuk konten teks
        width: '100%',
        padding: '40px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
    },
    heading: {
        textAlign: 'center',
        color: '#1e293b',
        marginBottom: '8px',
        fontSize: '1.8rem',
        fontWeight: '700',
    },
    subHeading: {
        textAlign: 'center',
        color: '#64748b',
        marginBottom: '32px',
        fontSize: '1rem',
        fontWeight: '400',
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: '24px',
    },
    content: {
        color: '#334155',
        lineHeight: '1.7',
    },
    sectionHeading: {
        color: '#1e293b',
        fontSize: '1.2rem',
        fontWeight: '600',
        marginTop: '24px',
        marginBottom: '12px',
    },
    paragraph: {
        margin: '0 0 16px 0',
        fontSize: '1rem',
    },
    list: {
        paddingLeft: '20px',
        margin: '0 0 16px 0',
    },
    buttonContainer: {
        marginTop: '32px',
        paddingTop: '24px',
        borderTop: '1px solid #e2e8f0',
        textAlign: 'center',
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
        fontSize: '1rem',
        transition: 'background-color 0.2s ease-in-out',
    },
};

const styleSheet = document.createElement("style");
styleSheet.innerHTML = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  a[style*="backgroundColor: '#1d4ed8'"]:hover {
    background-color: #1e40af;
  }
`;
document.head.appendChild(styleSheet);

export default Terms;
