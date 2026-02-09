// src/components/layanan-berkas/LacakStatus.js
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/firebaseConfig';
import { collection, query, where, getDocs, onSnapshot, orderBy } from "firebase/firestore";

/**
 * Komponen untuk halaman "SI-LAKAS" dengan tampilan timeline visual yang disempurnakan.
 */
const LacakStatus = () => {
    const [ticketId, setTicketId] = useState('');
    const [submission, setSubmission] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formFields, setFormFields] = useState([]);

    // Data untuk mempercantik timeline, termasuk ikon untuk setiap tahap.
    const verifierDetails = {
        sekjend: { name: 'Sekretaris Jenderal', icon: '🗃️' },
        kemendagri: { name: 'Kementerian Dalam Negeri', icon: '🏛️' },
        kemenkeu: { name: 'Kementerian Keuangan', icon: '💰' },
        banggar: { name: 'Badan Anggaran DPM', icon: '⚖️' },
        final: { name: 'Persetujuan Final', icon: '🎉' } // Tahap baru
    };

    // Mengambil konfigurasi form untuk mencocokkan fieldName dengan label
    useEffect(() => {
        const q = query(collection(db, "submissionFormFields"), orderBy("position", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setFormFields(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, []);

    // Fungsi untuk mencari data di Firestore berdasarkan nomor tiket
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!ticketId) return;

        setLoading(true);
        setError('');
        setSubmission(null);

        try {
            const q = query(collection(db, "submissions"), where("ticketId", "==", ticketId.trim()));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setError("Nomor tiket tidak ditemukan. Harap periksa kembali.");
            } else {
                setSubmission({ id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() });
            }
        } catch (err) {
            console.error("Error saat mencari tiket: ", err);
            setError("Terjadi kesalahan saat mencari tiket. Silakan coba lagi.");
        } finally {
            setLoading(false);
        }
    };

    // Fungsi untuk memformat timestamp dari Firestore
    const formatTimestamp = (timestamp) => {
        if (!timestamp?.seconds) return 'N/A';
        return new Date(timestamp.seconds * 1000).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
    };
    
    // --- Styles Baru untuk Tampilan yang Disempurnakan ---
    const containerStyle = { maxWidth: '800px', margin: '40px auto', padding: '20px' };
    const cardStyle = { backgroundColor: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.07)' };
    
    // Styles untuk timeline visual
    const timelineContainerStyle = { position: 'relative', paddingLeft: '40px', marginTop: '20px' };
    const timelineLineStyle = { position: 'absolute', left: '14px', top: 0, bottom: 0, width: '4px', backgroundColor: '#e0e0e0', borderRadius: '2px' };
    const timelineItemStyle = { position: 'relative', marginBottom: '20px' };
    const timelineIconStyle = (status) => {
        const colors = { menunggu: '#ccc', diverifikasi: '#4CAF50', revisi: '#ff9800', disetujui: '#1e88e5', selesai: '#607d8b' };
        return {
            position: 'absolute', left: '-48px', top: '50%', transform: 'translateY(-50%)',
            width: '32px', height: '32px', borderRadius: '50%',
            backgroundColor: colors[status] || '#ccc',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', color: 'white',
            border: '3px solid #f0f2f5' // Warna latar belakang utama
        };
    };
    const timelineContentStyle = { padding: '15px', borderRadius: '8px', backgroundColor: '#f9f9f9' };
    
    const statusLabelStyle = (status) => {
        const colors = { menunggu: { bg: '#e0e0e0', text: '#333' }, diverifikasi: { bg: '#4CAF50', text: 'white' }, revisi: { bg: '#ff9800', text: 'white' }, diajukan: { bg: '#2196F3', text: 'white' }, 'revisidiperlukan': {bg: '#ff9800', text: 'white'}, disetujui: {bg: '#4CAF50', text: 'white'}, selesai: {bg: '#607d8b', text: 'white'} };
        const s = status ? status.toLowerCase().replace(/\s/g, '') : 'menunggu';
        const color = colors[s] || colors.menunggu;
        return { backgroundColor: color.bg, color: color.text, padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' };
    };

    return (
        <div style={containerStyle}>
            <div style={cardStyle}>
                <h2 style={{ textAlign: 'center', color: '#00092f', marginTop: 0 }}>Lacak Status Pengajuan</h2>
                <p style={{textAlign: 'center', color: '#666', marginBottom: '30px'}}>Masukkan nomor tiket yang Anda dapatkan setelah melakukan pengajuan.</p>
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
                    <input type="text" value={ticketId} onChange={(e) => setTicketId(e.target.value)} placeholder="Contoh: BEM-2025-12345" style={{ flexGrow: 1, padding: '12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '15px' }} />
                    <button type="submit" style={{ padding: '12px 22px', backgroundColor: '#00092f', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }} disabled={loading}>{loading ? 'Mencari...' : 'Lacak'}</button>
                </form>
            </div>

            {error && <p style={{ color: 'red', textAlign: 'center', marginTop: '20px' }}>{error}</p>}

            {submission && (
                <div style={{ ...cardStyle, marginTop: '30px' }}>
                    <h3 style={{ color: '#00092f', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Detail Tiket: {submission.ticketId}</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px 25px', marginBottom: '25px', fontSize: '15px' }}>
                        <div><strong>Penyelenggara:</strong><p style={{ margin: '5px 0 0', color: '#555' }}>{submission.penyelenggara}</p></div>
                        <div><strong>Nama Kegiatan:</strong><p style={{ margin: '5px 0 0', color: '#555' }}>{submission.namaKegiatan}</p></div>
                        <div><strong>Tanggal Diajukan:</strong><p style={{ margin: '5px 0 0', color: '#555' }}>{formatTimestamp(submission.createdAt)}</p></div>
                        <div><strong>Status Saat Ini:</strong><p style={{ margin: '5px 0 0' }}><span style={{...statusLabelStyle(submission.currentStatus), padding: '6px 12px'}}>{submission.currentStatus}</span></p></div>
                    </div>
                    
                    <h4 style={{color: '#00092f', borderBottom: '1px solid #eee', paddingBottom: '10px', marginTop: '30px'}}>Progres Verifikasi</h4>
                    <div style={timelineContainerStyle}>
                        <div style={timelineLineStyle}></div>
                        {submission.verifiers && Object.entries(submission.verifiers).map(([key, value]) => (
                            <div key={key} style={timelineItemStyle}>
                                <div style={timelineIconStyle(value.status)}>{verifierDetails[key] ? verifierDetails[key].icon : '❓'}</div>
                                <div style={timelineContentStyle}>
                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                        <strong style={{ textTransform: 'capitalize' }}>{verifierDetails[key] ? verifierDetails[key].name : key}</strong>
                                        <span style={statusLabelStyle(value.status)}>{value.status}</span>
                                    </div>
                                    {value.catatan && <p style={{color: '#d32f2f', fontSize: '14px', margin: '10px 0 0', backgroundColor: '#fff3f3', padding: '8px', borderRadius: '4px'}}><strong>Catatan:</strong> {value.catatan}</p>}
                                </div>
                            </div>
                        ))}

                        {(submission.currentStatus === 'Disetujui' || submission.currentStatus === 'Selesai') && (
                            <div style={timelineItemStyle}>
                                <div style={timelineIconStyle(submission.currentStatus.toLowerCase())}>{verifierDetails.final.icon}</div>
                                <div style={timelineContentStyle}>
                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                        <strong>{verifierDetails.final.name}</strong>
                                        <span style={statusLabelStyle(submission.currentStatus)}>{submission.currentStatus}</span>
                                    </div>
                                    <p style={{margin: '10px 0 0', fontSize: '14px'}}>Berkas Anda telah disetujui dan sedang dalam proses tindak lanjut oleh admin.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {submission.currentStatus === 'Selesai' && submission.finalResponse && (
                        <>
                            <h4 style={{color: '#00092f', borderBottom: '1px solid #eee', paddingBottom: '10px', marginTop: '30px' }}>Tindak Lanjut Final</h4>
                            <div style={{backgroundColor: '#e8f5e9', padding: '20px', borderRadius: '8px'}}>
                                {submission.finalResponse.catatan && <p style={{marginTop: 0}}><strong>Catatan dari Admin:</strong><br/>{submission.finalResponse.catatan}</p>}
                                {submission.finalResponse.fileUrl && (
                                    <a href={submission.finalResponse.fileUrl} target="_blank" rel="noopener noreferrer" style={{
                                        display: 'inline-block', padding: '10px 20px', backgroundColor: '#00796b', color: 'white',
                                        textDecoration: 'none', borderRadius: '6px', fontWeight: 'bold', marginTop: '10px'
                                    }}>
                                        Unduh Surat Balasan
                                    </a>
                                )}
                            </div>
                        </>
                    )}

                    <h4 style={{color: '#00092f', borderBottom: '1px solid #eee', paddingBottom: '10px', marginTop: '30px' }}>Dokumen Terlampir</h4>
                    <div style={{fontSize: '14px', lineHeight: '1.8'}}>
                        {formFields.filter(field => field.type === 'file' && submission[field.fieldName]).map(field => {
                            const value = submission[field.fieldName];
                            return (
                                <div key={field.fieldName} style={{padding: '5px 0', display: 'flex'}}>
                                    <strong style={{width: '200px', flexShrink: 0}}>{field.label}:</strong> 
                                    <a href={value} target="_blank" rel="noopener noreferrer" style={{color: '#00092f', wordBreak: 'break-all'}}>{value}</a>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LacakStatus;