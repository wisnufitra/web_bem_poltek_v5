import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase/firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';

const ProfilOrganisasi = () => {
    const { orgId } = useParams();
    const [organisasi, setOrganisasi] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const docRef = doc(db, 'organisasi', orgId);
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setOrganisasi({ id: docSnap.id, ...docSnap.data() });
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [orgId]);

    if (loading) return <p>Memuat...</p>;
    if (!organisasi) return <p>Organisasi tidak ditemukan.</p>;

    return (
        <div style={{maxWidth: '900px', margin: '40px auto', padding: '20px'}}>
            <div style={{textAlign: 'center', marginBottom: '30px'}}>
                <img src={organisasi.logo} alt={organisasi.nama} style={{width: '150px', height: '150px', borderRadius: '50%', objectFit: 'cover'}} />
                <h1 style={{color: '#00092f'}}>{organisasi.nama}</h1>
            </div>
            <div style={{backgroundColor: '#fff', padding: '20px', borderRadius: '12px'}}>
                <p>{organisasi.deskripsi}</p>
                {/* Di sini nanti kita akan menampilkan struktur dan galeri khusus organisasi ini */}
            </div>
        </div>
    );
};

export default ProfilOrganisasi;