import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { db } from "../firebase/firebaseConfig";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";

const DaftarOrganisasi = () => {
  const [organisasi, setOrganisasi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('HIMA');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(collection(db, "organisasi"), orderBy("nama", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrganisasi(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredList = useMemo(() => {
      return organisasi
        .filter(item => item.kategori === activeTab)
        .filter(item => item.nama.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [organisasi, activeTab, searchTerm]);

  const pageStyle = { padding: "40px 20px", maxWidth: "1200px", margin: "0 auto" };
  const titleStyle = { fontSize: "32px", fontWeight: "bold", marginBottom: "30px", textAlign: "center", color: "#00092f" };
  const cardStyle = { backgroundColor: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' };
  const tabContainerStyle = { display: 'flex', justifyContent: 'center', borderBottom: '1px solid #ddd', marginBottom: '30px' };
  
  // --- PERBAIKAN DI SINI ---
  const tabButtonStyle = { 
      padding: '10px 20px', 
      border: 'none', 
      borderBottom: '3px solid transparent', // Gunakan border transparan
      background: 'none', 
      cursor: 'pointer', 
      fontSize: '18px', 
      fontWeight: 'bold', 
      color: '#666' 
  };
  const activeTabButtonStyle = { 
      ...tabButtonStyle, 
      color: '#00092f', 
      borderBottom: '3px solid #00092f' 
  };
  
  const inputStyle = { width: '100%', padding: '12px', fontSize: '16px', borderRadius: '8px', border: '1px solid #ccc', marginBottom: '30px', boxSizing: 'border-box' };

  return (
    <div style={pageStyle}>
      <h1 style={titleStyle}>Direktori UKM & Ormawa</h1>
      <div style={tabContainerStyle}>
          <button onClick={() => setActiveTab('HIMA')} style={activeTab === 'HIMA' ? activeTabButtonStyle : tabButtonStyle}>Himpunan Mahasiswa</button>
          <button onClick={() => setActiveTab('UKM')} style={activeTab === 'UKM' ? activeTabButtonStyle : tabButtonStyle}>Unit Kegiatan Mahasiswa</button>
      </div>
      
      <input 
        type="text"
        placeholder={`🔍 Cari ${activeTab}...`}
        style={inputStyle}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {loading ? <p>Memuat...</p> : (
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px'}}>
              {filteredList.map(item => (
                  <div key={item.id} style={cardStyle}>
                      <img src={item.logo} alt={item.nama} style={{width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', marginBottom: '15px'}} />
                      <h3 style={{color: '#00092f'}}>{item.nama}</h3>
                      <p style={{color: '#666', flexGrow: 1}}>{item.deskripsi}</p>
                      <div style={{display: 'flex', gap: '10px', marginTop: '15px'}}>
                          <Link to={`/organisasi/${item.id}`} style={{padding: '8px 16px', backgroundColor: '#00092f', color: 'white', textDecoration: 'none', borderRadius: '6px'}}>Lihat Profil</Link>
                          {item.sosmed && <a href={item.sosmed} target="_blank" rel="noopener noreferrer" style={{padding: '8px 16px', backgroundColor: '#E1306C', color: 'white', textDecoration: 'none', borderRadius: '6px'}}>Instagram</a>}
                      </div>
                  </div>
              ))}
          </div>
      )}
    </div>
  );
};

export default DaftarOrganisasi;