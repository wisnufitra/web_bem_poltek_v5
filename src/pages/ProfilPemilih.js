import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase/firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const prodiOptions = ["Teknokimia Nuklir", "Elektronika Instrumentasi", "Elektro Mekanika"];

const ProfilPemilih = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [profil, setProfil] = useState({ namaLengkap: '', nim: '', prodi: '', foto: '' });
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const fetchProfil = async () => {
                    const docRef = doc(db, 'voters', currentUser.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        setProfil(docSnap.data());
                    }
                    setLoading(false);
                };
                fetchProfil();
            } else {
                navigate('/login-pemilih');
            }
        });
        return () => unsubscribe();
    }, [navigate]);

    const handleInputChange = (field, value) => {
        setProfil(prev => ({ ...prev, [field]: value }));
    };

    const handleFotoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 300;
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
                setProfil(prev => ({ ...prev, foto: compressedBase64 }));
            };
        };
    };

    const handleHapusFoto = () => {
        setProfil(prev => ({ ...prev, foto: '' }));
    };

    const handleSimpan = async (e) => {
        e.preventDefault();
        setMessage('Menyimpan...');
        const docRef = doc(db, 'voters', user.uid);
        try {
            await updateDoc(docRef, profil);
            setMessage('Profil berhasil diperbarui!');
        } catch (error) {
            setMessage('Gagal memperbarui profil.');
        }
    };

    if (loading) return <p style={{textAlign: 'center', marginTop: '40px'}}>Memuat...</p>;

    const containerStyle = { maxWidth: '1000px', margin: '40px auto', padding: '20px' };
    const gridStyle = { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr', gap: '30px' };
    const cardStyle = { backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' };
    const inputStyle = { width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' };
    const buttonStyle = { padding: '10px 20px', backgroundColor: '#00092f', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' };

    return (
        <div style={containerStyle}>
            <h1 style={{ color: '#00092f', textAlign: 'center' }}>Edit Profil Pemilih</h1>
            {message && <p style={{ textAlign: 'center', fontWeight: 'bold', color: message.startsWith('Gagal') ? 'red' : 'green' }}>{message}</p>}
            
            <div style={gridStyle}>
                {/* Kolom Kiri */}
                <div style={{...cardStyle, textAlign: 'center'}}>
                    <img src={profil.foto || 'https://placehold.co/150x150/00092f/FFFFFF?text=Foto'} alt="Profil" style={{width: '150px', height: '150px', borderRadius: '50%', objectFit: 'cover', border: '4px solid #00092f'}} />
                    <h2 style={{marginTop: '15px', color: '#00092f'}}>{profil.namaLengkap || 'Nama Lengkap'}</h2>
                    <p style={{color: '#666', marginTop: '-10px'}}>{profil.nim || 'NIM'}</p>
                    <input type="file" id="foto-upload" accept="image/*" onChange={handleFotoChange} style={{display: 'none'}}/>
                    <label htmlFor="foto-upload" style={{...buttonStyle, backgroundColor: '#1e88e5', display: 'block', marginBottom: '10px'}}>Ganti Foto</label>
                    <button type="button" onClick={handleHapusFoto} style={{...buttonStyle, backgroundColor: '#f44336', fontSize: '12px', padding: '5px 10px'}}>Hapus Foto</button>
                </div>

                {/* Kolom Kanan */}
                <div style={cardStyle}>
                    <form onSubmit={handleSimpan}>
                        <div><label>Nama Lengkap:</label><input style={inputStyle} value={profil.namaLengkap} onChange={(e) => handleInputChange('namaLengkap', e.target.value)} /></div>
                        <div><label>NIM:</label><input style={inputStyle} value={profil.nim} onChange={(e) => handleInputChange('nim', e.target.value)} /></div>
                        <div>
                            <label>Program Studi:</label>
                            <select style={inputStyle} value={profil.prodi} onChange={(e) => handleInputChange('prodi', e.target.value)}>
                                {prodiOptions.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <button type="submit" style={buttonStyle}>Simpan Perubahan</button>
                    </form>
                </div>
            </div>
            <button onClick={() => navigate("/dashboard-pemilih")} style={{ ...buttonStyle, marginTop: "30px", backgroundColor: "#6c757d" }}>Kembali ke Dashboard</button>
        </div>
    );
};

export default ProfilPemilih;