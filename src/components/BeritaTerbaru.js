import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { db } from "../firebase/firebaseConfig";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";

const BeritaTerbaru = () => {
  const [berita, setBerita] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const q = query(collection(db, "berita"), orderBy("dibuatPada", "desc"), limit(2));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const beritaData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setBerita(beritaData);
      setLoading(false);
    }, (error) => {
      console.error("Gagal mengambil data berita: ", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp.seconds * 1000).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  };

  const containerStyle = { marginTop: "0px", padding: "40px 20px", backgroundColor: "#f9f9f9" };
  const titleStyle = { fontSize: "28px", fontWeight: "bold", color: "#00092f", marginBottom: "24px", textAlign: "center" };
  const beritaListStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px", maxWidth: "900px", margin: "0 auto" };
  const cardStyle = { backgroundColor: "#ffffff", padding: "16px", borderRadius: "8px", boxShadow: "0 4px 10px rgba(0,0,0,0.06)", textAlign: "left" };
  const imgStyleMobile = { width: "100%", height: "400px", objectFit: "cover", borderRadius: "6px", marginBottom: "12px" };
  const imgStyleDesktop = { maxWidth: "100%", maxHeight: "320px", height: "auto", borderRadius: "15px", display: 'block', margin: '0 auto 15px' };
  const dateStyle = { fontSize: "14px", color: "#777", marginBottom: "8px" };
  const judulStyle = { fontSize: "18px", fontWeight: "bold", marginBottom: "8px", color: "#333" };
  const deskripsiStyle = { fontSize: "15px", color: "#444", lineHeight: "1.5", whiteSpace: 'pre-wrap', textAlign: 'justify' };
  const buttonContainerStyle = { marginTop: "30px", textAlign: "center" };
  const linkButtonStyle = { backgroundColor: "#00092f", color: "white", padding: "12px 24px", borderRadius: "6px", textDecoration: "none", fontWeight: "bold", border: "2px solid #ffd700" };

  return (
    <div style={containerStyle}>
      <h2 style={titleStyle}>Berita & Kegiatan Terbaru</h2>
      <div style={beritaListStyle}>
        {loading ? <p>Memuat berita...</p> : berita.map((item) => {
          const displayDate = item.tanggalKegiatan 
            ? new Date(item.tanggalKegiatan).toLocaleDateString('id-ID', {
                day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' // Tambahkan timeZone UTC
              })
            : formatTimestamp(item.dibuatPada);

          return (
            <div key={item.id} style={cardStyle}>
              {item.gambarList && item.gambarList.length > 0 && (
                <img 
                  src={item.gambarList[0]} 
                  alt={item.judul} 
                  style={isMobile ? imgStyleMobile : imgStyleDesktop} 
                />
              )}
              <div style={dateStyle}>{displayDate}</div>
              <div style={judulStyle}>{item.judul}</div>
              <div style={deskripsiStyle}>{item.deskripsi}</div>
            </div>
          );
        })}
      </div>
      <div style={buttonContainerStyle}>
        <Link to="/berita" style={linkButtonStyle}>Lihat Semua Berita</Link>
      </div>
    </div>
  );
};

export default BeritaTerbaru;