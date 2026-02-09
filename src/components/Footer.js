import React from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logo-bem.png"; // Pastikan path logo ini benar
import logoPoltek from "../assets/logo-poltek.png"; // Logo baru dari assets
import logoBrin from "../assets/logo-brin.png";   // Logo baru dari assets

const Footer = () => {
  // --- Styles ---
  const footerStyle = {
    backgroundColor: "#00092f",
    backgroundImage: "linear-gradient(to right, #00092f, #000)",
    color: "#c9caca",
    padding: "40px 20px 20px 20px", // <-- bawah diperkecil
    marginTop: "auto",
    marginMottom: "0px",
  };

  const containerStyle = {
    maxWidth: "1200px",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "0px",
  };

  const columnStyle = {
    display: "flex",
    flexDirection: "column",
  };

  const logoContainerStyle = {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    marginBottom: "15px",
  };

  const titleStyle = {
    color: "white",
    fontSize: "18px",
    fontWeight: "bold",
    marginBottom: "20px",
    borderBottom: "2px solid #ffd700",
    paddingBottom: "10px",
    display: "inline-block",
  };

  const linkStyle = {
    color: "#c9caca",
    textDecoration: "none",
    marginBottom: "10px",
    transition: "color 0.3s ease",
  };

  const socialLinksContainerStyle = {
    display: "flex",
    gap: "15px",
    marginTop: "10px",
  };

  const socialLinkStyle = {
    color: "#c9caca",
    transition: "color 0.3s ease",
  };
  
  const copyrightStyle = {
      textAlign: 'center',
      marginTop: '40px',
      paddingTop: '20px',
      borderTop: '1px solid rgba(255, 255, 255, 0.1)',
      fontSize: '14px',
      color: '#c9caca'
  };

  const supportContainerStyle = {
      textAlign: 'center',
      marginTop: '40px',
  };

  const supportLogosStyle = {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '30px',
      marginTop: '15px',
      flexWrap: 'wrap'
  };

  const supportLogoStyle = {
      height: '60px',
      filter: 'grayscale(100%) contrast(0%) brightness(2)',
  };

  return (
    <footer style={footerStyle}>
      <div style={containerStyle}>
        {/* Kolom 1: Logo dan Tagline */}
        <div style={columnStyle}>
          <div style={logoContainerStyle}>
            <img src={logo} alt="Logo BEM" style={{ height: "60px" }} />
            <h3 style={{ margin: 0, color: 'white', fontSize: '22px' }}>BEM KM<br/>Poltek Nuklir</h3>
          </div>
          <p style={{ lineHeight: 1.6 }}>
            Mengabdi dengan Aksi, Berkarya untuk Negeri. Bersama membangun KM Poltek Nuklir yang lebih baik.
          </p>
        </div>

        {/* Kolom 2: Navigasi Cepat */}
        <div style={columnStyle}>
          <h4 style={titleStyle}>Navigasi Cepat</h4>
          <Link to="/struktur" style={linkStyle} onMouseOver={(e) => e.target.style.color='#ffd700'} onMouseOut={(e) => e.target.style.color='#c9caca'}>Struktur Organisasi</Link>
          <Link to="/berita" style={linkStyle} onMouseOver={(e) => e.target.style.color='#ffd700'} onMouseOut={(e) => e.target.style.color='#c9caca'}>Berita & Kegiatan</Link>
          <Link to="/pemilihan" style={linkStyle} onMouseOver={(e) => e.target.style.color='#ffd700'} onMouseOut={(e) => e.target.style.color='#c9caca'}>E-Voting</Link>
          <Link to="/dokumen" style={linkStyle} onMouseOver={(e) => e.target.style.color='#ffd700'} onMouseOut={(e) => e.target.style.color='#c9caca'}>Bank Dokumen</Link>
        </div>

        {/* Kolom 3: Kontak & Media Sosial */}
        <div style={columnStyle}>
          <h4 style={titleStyle}>Hubungi Kami</h4>
          <p style={{ margin: 0 }}>
            Jl. Babarsari, Caturtunggal, Depok, Sleman, Daerah Istimewa Yogyakarta 55281
          </p>
          <div style={socialLinksContainerStyle}>
            <a href="https://instagram.com/bempolteknuklir" target="_blank" rel="noopener noreferrer" title="Instagram" style={socialLinkStyle} onMouseOver={(e) => e.currentTarget.style.color='#ffd700'} onMouseOut={(e) => e.currentTarget.style.color='#c9caca'}>
              <svg style={{width: "24px", height: "24px"}} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            </a>
            <a href="mailto:bempolteknuklir@gmail.com" title="Email" style={socialLinkStyle} onMouseOver={(e) => e.currentTarget.style.color='#ffd700'} onMouseOut={(e) => e.currentTarget.style.color='#c9caca'}>
               <svg style={{width: "24px", height: "24px"}} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            </a>
          </div>
        </div>
      </div>
      
      {/* --- BAGIAN LOGO PENDUKUNG --- */}
      <div style={supportContainerStyle}>
          <p style={{fontSize: '14px', color: '#c9caca'}}>Didukung Oleh:</p>
          <div style={supportLogosStyle}>
              <img src={logoPoltek} alt="Logo Poltek Nuklir" style={supportLogoStyle} />
              <img src={logoBrin} alt="Logo BRIN" style={supportLogoStyle} />
          </div>
      </div>

      <div style={copyrightStyle}>
        &copy; {new Date().getFullYear()} BEM Poltek Nuklir. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;