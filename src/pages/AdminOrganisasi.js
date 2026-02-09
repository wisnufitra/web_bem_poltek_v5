import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase/firebaseConfig';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy, updateDoc, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { logActivity } from '../utils/logActivity';

const AdminOrganisasi = () => {
    const navigate = useNavigate();
    const [organisasiList, setOrganisasiList] = useState([]);
    const [adminUsers, setAdminUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editData, setEditData] = useState(null);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, user => {
            if (!user) navigate('/login');
        });

        const qOrganisasi = query(collection(db, "organisasi"), orderBy("nama"));
        const unsubOrganisasi = onSnapshot(qOrganisasi, (snapshot) => {
            setOrganisasiList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });

        // Ambil semua user yang bisa menjadi admin (bukan panitia atau pemilih)
        const qUsers = query(collection(db, "users"), where("role", "in", ["admin", "master", "pending"]));
        const unsubUsers = onSnapshot(qUsers, (snapshot) => {
            setAdminUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => {
            unsubscribeAuth();
            unsubOrganisasi();
            unsubUsers();
        };
    }, [navigate]);

    const handleSimpan = async (data) => {
        if (data.id) {
            const { id, ...dataToUpdate } = data;
            const docRef = doc(db, "organisasi", id);
            await updateDoc(docRef, dataToUpdate);
            await logActivity(`Mengedit organisasi: "${data.nama}"`);
        } else {
            await addDoc(collection(db, "organisasi"), data);
            await logActivity(`Menambahkan organisasi: "${data.nama}"`);
        }
        setShowModal(false);
    };

    const handleHapus = async (id, nama) => {
        if (window.confirm(`Yakin ingin menghapus "${nama}"?`)) {
            await deleteDoc(doc(db, "organisasi", id));
            await logActivity(`Menghapus organisasi: "${nama}"`);
        }
    };

    const openModal = (item = null) => {
        setEditData(item || { nama: '', kategori: 'HIMA', deskripsi: '', logo: '', adminUID: '', kontak: '', sosmed: '' });
        setShowModal(true);
    };

    const containerStyle = { maxWidth: "1000px", margin: "40px auto", padding: "20px" };
    const buttonStyle = { padding: "10px 20px", backgroundColor: "#00092f", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 'bold' };
    const cardStyle = { backgroundColor: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', marginBottom: '10px' };
    
    return (
        <div style={containerStyle}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px'}}>
                <h1 style={{ color: "#00092f", margin: 0 }}>Kelola Organisasi</h1>
                <button onClick={() => openModal()} style={buttonStyle}>+ Tambah Organisasi</button>
            </div>
            
            {loading ? <p>Memuat...</p> : organisasiList.map(item => (
                <div key={item.id} style={cardStyle}>
                    <img src={item.logo || `https://placehold.co/60x60/00092f/FFFFFF?text=${item.nama.charAt(0)}`} alt={item.nama} style={{width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', marginRight: '15px'}} />
                    <div style={{flexGrow: 1}}>
                        <strong>{item.nama}</strong>
                        <small style={{display: 'block', color: '#666'}}>Kategori: {item.kategori}</small>
                    </div>
                    <div>
                        <button onClick={() => openModal(item)} style={{...buttonStyle, backgroundColor: '#1e88e5', marginRight: '10px'}}>Edit</button>
                        <button onClick={() => handleHapus(item.id, item.nama)} style={{...buttonStyle, backgroundColor: '#d32f2f'}}>Hapus</button>
                    </div>
                </div>
            ))}

            {showModal && <OrganisasiModal data={editData} setData={setEditData} onClose={() => setShowModal(false)} onSave={handleSimpan} adminUsers={adminUsers} />}
        </div>
    );
};

// Komponen Modal untuk Tambah/Edit Organisasi
const OrganisasiModal = ({ data, setData, onClose, onSave, adminUsers }) => {
    const modalOverlayStyle = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000 };
    const modalContentStyle = { backgroundColor: "white", padding: "30px", borderRadius: "10px", width: "90%", maxWidth: "600px", maxHeight: '90vh', overflowY: 'auto' };
    const inputStyle = { padding: "10px", border: "1px solid #ccc", borderRadius: "6px", width: "100%", boxSizing: "border-box", marginBottom: '15px' };
    const buttonStyle = { padding: "10px 20px", backgroundColor: "#00092f", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 'bold' };

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
                const compressedBase64 = canvas.toDataURL('image/png');
                setData(prev => ({ ...prev, logo: compressedBase64 }));
            };
        };
    };

    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <h2>{data.id ? 'Edit' : 'Tambah'} Organisasi</h2>
                <input style={inputStyle} value={data.nama} onChange={(e) => setData({...data, nama: e.target.value})} placeholder="Nama Organisasi" />
                <select style={inputStyle} value={data.kategori} onChange={(e) => setData({...data, kategori: e.target.value})}>
                    <option value="HIMA">Himpunan Mahasiswa (HIMA)</option>
                    <option value="UKM">Unit Kegiatan Mahasiswa (UKM)</option>
                </select>
                <textarea style={{...inputStyle, minHeight: '100px'}} value={data.deskripsi} onChange={(e) => setData({...data, deskripsi: e.target.value})} placeholder="Deskripsi singkat..."/>
                <input style={inputStyle} value={data.kontak} onChange={(e) => setData({...data, kontak: e.target.value})} placeholder="Kontak (Email atau No. WA)" />
                <input style={inputStyle} value={data.sosmed} onChange={(e) => setData({...data, sosmed: e.target.value})} placeholder="Link Instagram" />
                <div>
                    <label>Logo Organisasi:</label>
                    <input type="file" accept="image/*" onChange={handleFotoChange} style={{display: 'block', margin: '5px 0'}} />
                    {data.logo && <img src={data.logo} alt="Preview" style={{ width: "100px", height: "100px", borderRadius: "50%", objectFit: 'cover' }} />}
                </div>
                <div>
                    <label>Tunjuk Admin:</label>
                    <select style={inputStyle} value={data.adminUID} onChange={(e) => setData({...data, adminUID: e.target.value})}>
                        <option value="">-- Pilih Admin --</option>
                        {adminUsers.map(user => <option key={user.id} value={user.id}>{user.namaTampilan} ({user.email})</option>)}
                    </select>
                </div>
                <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                    <button onClick={() => onSave(data)} style={buttonStyle}>Simpan</button>
                    <button onClick={onClose} style={{ ...buttonStyle, backgroundColor: "#6c757d" }}>Batal</button>
                </div>
            </div>
        </div>
    );
};

export default AdminOrganisasi;