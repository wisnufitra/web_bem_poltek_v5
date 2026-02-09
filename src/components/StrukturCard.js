// src/components/StrukturCard.js
import React from "react";

const cardStyle = {
  border: "1px solid #e0e0e0",
  borderRadius: "12px",
  padding: "16px",
  textAlign: "center",
  backgroundColor: "#ffffff",
  boxShadow: "0 4px 8px rgba(0,0,0,0.05)",
  transition: "transform 0.2s, box-shadow 0.2s",
  cursor: "pointer",
};

const imgStyle = {
  width: "120px",
  height: "120px",
  borderRadius: "50%",
  objectFit: "cover",
  marginBottom: "12px",
  border: "3px solid #00092f", // <-- PERUBAHAN DI SINI
  transition: "border-color 0.2s", // Tambahan untuk transisi halus
};

const namaStyle = { margin: "0 0 4px", fontWeight: "bold", fontSize: "16px", color: "#00092f" };
const jabatanStyle = { margin: 0, color: "#555", fontSize: "14px" };

const StrukturCard = ({ anggota, onCardClick }) => {
  return (
    <div 
      style={cardStyle} 
      onClick={onCardClick}
      onMouseOver={(e) => { 
        e.currentTarget.style.transform = "translateY(-3px)"; 
        e.currentTarget.style.boxShadow = "0 6px 12px rgba(0,0,0,0.1)";
        // Bonus: Ubah warna border saat di-hover
        e.currentTarget.querySelector('img').style.borderColor = '#ffd700'; 
      }}
      onMouseOut={(e) => { 
        e.currentTarget.style.transform = "none"; 
        e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.05)";
        e.currentTarget.querySelector('img').style.borderColor = '#00092f';
      }}
    >
      <img src={anggota.foto} alt={`Foto ${anggota.nama}`} style={imgStyle} />
      <h3 style={namaStyle}>{anggota.nama}</h3>
      <p style={jabatanStyle}>{anggota.jabatan}</p>
    </div>
  );
};

export default StrukturCard;