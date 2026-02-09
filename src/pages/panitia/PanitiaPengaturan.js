// src/pages/panitia/PanitiaPengaturan.js
import React, { useState, useEffect, useMemo } from 'react';
import { useEvent } from '../../layouts/PanitiaLayout';
import { db } from '../../firebase/firebaseConfig';
import { doc, updateDoc, serverTimestamp, arrayUnion, arrayRemove } from 'firebase/firestore';
import { logActivity } from '../../utils/logActivity';

import { Clock, FileText, Bell, BarChart, AlertTriangle, X, Loader2, Save, Send, Trash2, Play, StopCircle, RefreshCcw, Monitor, Users, Plus, Key, Copy, Edit } from 'lucide-react';

const formatDateTimeForInput = (date) => {
    if (!date || !(date instanceof Date) || isNaN(date)) return '';
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
};

const Toast = ({ message, clear }) => { useEffect(() => { const timer = setTimeout(clear, 3000); return () => clearTimeout(timer); }, [clear]); return <div className="toast">{message}</div>; };

const ConfirmationModal = ({ modalState, setModalState }) => {
    const [confirmText, setConfirmText] = useState('');
    useEffect(() => { if (modalState.isOpen) setConfirmText(''); }, [modalState.isOpen]);
    if (!modalState.isOpen) return null;
    const isConfirmationMatched = !modalState.requireConfirmationText || confirmText === modalState.requireConfirmationText;
    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3 className="modal-title">{modalState.title}</h3>
                <p className="modal-message">{modalState.message}</p>
                {modalState.requireConfirmationText && (
                    <div style={{marginBottom: '20px'}}>
                        <label className="label">Untuk konfirmasi, ketik: <strong style={{color: '#b91c1c'}}>{modalState.requireConfirmationText}</strong></label>
                        <input className="input" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
                    </div>
                )}
                <div className="modal-actions">
                    <button className="button button-secondary" onClick={() => setModalState({ isOpen: false })}>Batal</button>
                    <button 
                        className={`button ${!isConfirmationMatched ? 'button-disabled' : 'button-danger'}`} 
                        onClick={() => { if (isConfirmationMatched) { modalState.onConfirm(); setModalState({ isOpen: false }); } }} 
                        disabled={!isConfirmationMatched}
                    >
                        {modalState.confirmText || 'Konfirmasi'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ToggleSwitch = ({ id, checked, onChange, label }) => ( <div className="toggle-container"><label htmlFor={id} className="toggle-label">{label}</label><label className="switch"><input type="checkbox" id={id} checked={checked} onChange={onChange} /><span className="slider round"></span></label></div> );

const PanitiaPengaturan = () => {
    const { event, eventId } = useEvent();
    
    // --- STATES ---
    const [namaEvent, setNamaEvent] = useState('');
    const [deskripsi, setDeskripsi] = useState('');
    const [allowAbstain, setAllowAbstain] = useState(false);
    const [publishResults, setPublishResults] = useState(false);
    const [jadwalMulai, setJadwalMulai] = useState('');
    const [jadwalSelesai, setJadwalSelesai] = useState('');
    const [pengumuman, setPengumuman] = useState('');
    
    const [loading, setLoading] = useState({});
    const [toastMessage, setToastMessage] = useState('');
    const [modalState, setModalState] = useState({ isOpen: false });
    const [now, setNow] = useState(new Date());

    const [isOfflineMode, setIsOfflineMode] = useState(false);
    const [jumlahBilik, setJumlahBilik] = useState(1);
    
    // State Petugas
    const [petugasList, setPetugasList] = useState([]);
    const [newPetugas, setNewPetugas] = useState({ username: '', password: '', role: 'registrasi', nama: '', penanggungJawab: '' });
    const [isCreatingPetugas, setIsCreatingPetugas] = useState(false);
    
    // State Modal Edit & Password
    const [editPetugasData, setEditPetugasData] = useState(null);
    const [changePassData, setChangePassData] = useState(null);
    const [newPasswordInput, setNewPasswordInput] = useState('');

    // --- EFFECTS ---
    useEffect(() => {
        if (event) {
            setNamaEvent(event.namaEvent || '');
            setDeskripsi(event.deskripsi || '');
            setAllowAbstain(event.allowAbstain || false);
            setPublishResults(event.publishResults || false);
            setJadwalMulai(formatDateTimeForInput(event.tanggalMulai?.toDate()));
            setJadwalSelesai(formatDateTimeForInput(event.tanggalSelesai?.toDate()));
            setIsOfflineMode(event.isOfflineMode || false);
            setJumlahBilik(event.jumlahBilik || 1);
            setPetugasList(event.petugas || []);
        }
    }, [event]);

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);
    
    // --- COMPUTED STATUS (DIPERBAIKI: Hanya return status string) ---
    const computedStatus = useMemo(() => {
        if (!event) return 'loading';
        if (event.status === 'berlangsung' || event.status === 'selesai') return event.status;
        
        const startTime = event.tanggalMulai?.toDate();
        const endTime = event.tanggalSelesai?.toDate();

        if (endTime && now > endTime) return 'selesai';
        if (startTime && now >= startTime) return 'berlangsung';
        return 'akan-datang';
    }, [event, now]);

    // --- HELPER FUNCTIONS (DIPERBAIKI: Dikeluarkan dari useMemo) ---
    const showToast = (message) => setToastMessage(message);

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        showToast('Link berhasil disalin!');
    };

    const handleUpdate = async (field, value, successMessage) => { 
        setLoading(prev => ({ ...prev, [field]: true })); 
        try { 
            await updateDoc(doc(db, 'pemilihan_events', eventId), { [field]: value }); 
            await logActivity(`Memperbarui "${field}" untuk event "${event.namaEvent}"`); 
            showToast(successMessage || 'Perubahan berhasil disimpan.'); 
        } catch (error) { 
            showToast('Gagal menyimpan perubahan.'); 
        } finally { 
            setLoading(prev => ({ ...prev, [field]: false })); 
        } 
    };

    const handleSimpanJadwal = async () => { 
        if (!jadwalMulai || !jadwalSelesai) return showToast("Jadwal mulai dan selesai harus diisi."); 
        
        const mulai = new Date(jadwalMulai); 
        const selesai = new Date(jadwalSelesai); 
        const kini = new Date(); // Ambil waktu sekarang saat tombol ditekan

        if (selesai <= mulai) return showToast("Jadwal selesai harus setelah jadwal mulai."); 
        
        setLoading(prev => ({...prev, jadwal: true})); 

        // LOGIKA BARU: Tentukan status berdasarkan waktu yang diinput
        let statusOtomatis = 'akan-datang';
        if (kini >= mulai && kini < selesai) {
            statusOtomatis = 'berlangsung';
        } else if (kini >= selesai) {
            statusOtomatis = 'selesai';
        }

        try { 
            await updateDoc(doc(db, 'pemilihan_events', eventId), { 
                tanggalMulai: mulai, 
                tanggalSelesai: selesai, 
                // Jangan hardcode 'akan-datang', tapi pakai variabel hasil hitungan di atas
                status: statusOtomatis 
            }); 
            await logActivity(`Memperbarui jadwal untuk event "${event.namaEvent}"`); 
            showToast("Jadwal berhasil disimpan! Status diperbarui."); 
        } catch (error) { 
            showToast("Gagal menyimpan jadwal."); 
        } finally { 
            setLoading(prev => ({...prev, jadwal: false})); 
        } 
    };

    const handleKirimPengumuman = () => { 
        if (!pengumuman.trim()) return showToast("Teks pengumuman tidak boleh kosong."); 
        handleUpdate('pengumuman', { teks: pengumuman, timestamp: serverTimestamp() }, 'Pengumuman berhasil dikirim.'); 
        setPengumuman(''); 
    };

    const confirmHapusPengumuman = () => setModalState({ isOpen: true, title: 'Hapus Pengumuman', message: 'Anda yakin ingin menghapus pengumuman yang sedang aktif?', onConfirm: () => handleUpdate('pengumuman', null, 'Pengumuman berhasil dihapus.'), confirmText: 'Ya, Hapus' });
    
    const confirmManualStatusChange = (newStatus, statusText) => setModalState({ isOpen: true, title: `Ubah Status ke "${statusText}"`, message: `Anda yakin ingin mengubah status pemilihan menjadi "${statusText}" secara manual?`, onConfirm: () => handleUpdate('status', newStatus, `Status berhasil diubah ke "${statusText}".`), confirmText: 'Ya, Ubah Status' });
    
    const confirmResetSuara = () => {
        setModalState({
            isOpen: true, title: 'Reset Semua Suara', message: 'PERINGATAN: Tindakan ini akan mengatur ulang SEMUA suara yang telah masuk menjadi 0. Ketik nama event untuk konfirmasi.',
            requireConfirmationText: event.namaEvent, onConfirm: async () => {
                setLoading(prev => ({...prev, reset: true}));
                try {
                    const updatedKandidat = event.kandidat.map(k => ({ ...k, suara: 0 }));
                    const pemilihUpdates = {};
                    if(event.pemilihInfo) { Object.keys(event.pemilihInfo).forEach(uid => { pemilihUpdates[`pemilihInfo.${uid}.telahMemilih`] = false; }); }
                    await updateDoc(doc(db, 'pemilihan_events', eventId), { kandidat: updatedKandidat, ...pemilihUpdates });
                    await logActivity(`MERESET SEMUA SUARA di event "${event.namaEvent}"`);
                    showToast("Semua suara berhasil direset.");
                } catch (error) { showToast("Gagal mereset suara."); } 
                finally { setLoading(prev => ({...prev, reset: false})); }
            }, confirmText: 'Ya, Reset Suara'
        });
    };

    // --- MANAJEMEN PETUGAS ---

    const handleAddPetugas = async () => {
        if (!newPetugas.username || !newPetugas.password || newPetugas.password.length < 4) {
            return showToast('Username wajib diisi & Password min. 4 karakter.');
        }

        setIsCreatingPetugas(true);
        try {
            const petugasData = {
                id: Date.now().toString(),
                username: newPetugas.username,
                password: newPetugas.password,
                role: newPetugas.role,
                nama: newPetugas.nama || newPetugas.username,
                penanggungJawab: newPetugas.penanggungJawab || '-'
            };

            const eventRef = doc(db, 'pemilihan_events', eventId);
            await updateDoc(eventRef, {
                petugas: arrayUnion(petugasData)
            });
            
            setPetugasList(prev => [...prev, petugasData]);
            setNewPetugas({ username: '', password: '', role: 'registrasi', nama: '', penanggungJawab: '' });
            showToast('Petugas berhasil ditambahkan!');
        } catch (error) {
            console.error(error);
            showToast('Gagal menambah petugas.');
        } finally {
            setIsCreatingPetugas(false);
        }
    };

    const handleDeletePetugas = async (petugas) => {
        if(!window.confirm(`Hapus petugas ${petugas.username}?`)) return;
        try {
            const eventRef = doc(db, 'pemilihan_events', eventId);
            await updateDoc(eventRef, { petugas: arrayRemove(petugas) });
            setPetugasList(prev => prev.filter(p => p.id !== petugas.id));
            showToast('Petugas dihapus.');
        } catch (error) {
            showToast('Gagal menghapus.');
        }
    };

    // ✅ FUNGSI BARU: SIMPAN EDIT DATA PETUGAS
    const handleSaveEditPetugas = async () => {
        if (!editPetugasData.username) return showToast("Data tidak boleh kosong.");
        
        // Ganti data di array lokal dulu
        const updatedList = petugasList.map(p => 
            p.id === editPetugasData.id ? editPetugasData : p
        );

        try {
            // Update seluruh array ke Firestore
            await updateDoc(doc(db, 'pemilihan_events', eventId), { petugas: updatedList });
            setPetugasList(updatedList);
            setEditPetugasData(null);
            showToast("Data petugas berhasil diperbarui.");
        } catch (error) {
            console.error(error);
            showToast("Gagal mengupdate data.");
        }
    };

    // ✅ FUNGSI BARU: SIMPAN PASSWORD BARU
    const handleSaveNewPassword = async () => {
        if (newPasswordInput.length < 4) return showToast("Password minimal 4 karakter.");
        
        const updatedList = petugasList.map(p => 
            p.id === changePassData.id ? { ...p, password: newPasswordInput } : p
        );

        try {
            await updateDoc(doc(db, 'pemilihan_events', eventId), { petugas: updatedList });
            setPetugasList(updatedList);
            setChangePassData(null);
            setNewPasswordInput('');
            showToast("Password berhasil diubah.");
        } catch (error) {
            showToast("Gagal mengubah password.");
        }
    };

    // Link Akses
    const baseUrl = window.location.origin; 
    const linkRegistrasi = `${baseUrl}/panitia/${eventId}/registrasi`;
    const linkBilik = `${baseUrl}/panitia/${eventId}/bilik-login`;

    if (!event) return <div style={{padding: '40px', textAlign: 'center'}}>Memuat pengaturan...</div>;

    return (
        <div className="settings-page">
            {toastMessage && <Toast message={toastMessage} clear={() => setToastMessage('')} />}
            <ConfirmationModal modalState={modalState} setModalState={setModalState} />

            <header className="page-header">
                <div>
                    <h1 className="page-title">Pengaturan Event</h1>
                    <p className="page-subtitle">Kelola semua aspek pemilihan Anda di sini.</p>
                </div>
            </header>

            <div className="settings-grid">
                {/* KARTU JADWAL */}
                <div className="card">
                    <h3 className="card-title"><Clock size={18} /> Jadwal & Status</h3>
                    <p className="card-subtitle">Atur jadwal mulai dan selesai. Status akan diperbarui secara otomatis.</p>
                    <div className="status-display">
                        <span>Status Saat Ini:</span> 
                        <span className={`status-badge status-${computedStatus}`}>
                            <span className="status-dot"></span>
                            {computedStatus.replace(/_/g, ' ')}
                        </span>
                    </div>
                    <label className="label">Jadwal Mulai</label>
                    <input type="datetime-local" className="input" value={jadwalMulai} onChange={(e) => setJadwalMulai(e.target.value)} />
                    <label className="label">Jadwal Selesai</label>
                    <input type="datetime-local" className="input" value={jadwalSelesai} onChange={(e) => setJadwalSelesai(e.target.value)} />
                    <button onClick={handleSimpanJadwal} className="button button-primary" disabled={loading.jadwal}>
                        {loading.jadwal ? <><Loader2 size={16} className="animate-spin" /> Menyimpan...</> : <><Save size={16} /> Simpan Jadwal</>}
                    </button>
                </div>

                {/* KARTU DETAIL EVENT */}
                <div className="card">
                    <h3 className="card-title"><FileText size={18} /> Detail Event</h3>
                    <p className="card-subtitle">Ubah informasi dasar dan opsi pemilihan.</p>
                    <label className="label">Nama Event</label>
                    <input className="input" value={namaEvent} onChange={(e) => setNamaEvent(e.target.value)} onBlur={() => handleUpdate('namaEvent', namaEvent)} />
                    <label className="label">Deskripsi</label>
                    <textarea className="input" rows="4" value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} onBlur={() => handleUpdate('deskripsi', deskripsi)} />
                    <div style={{marginTop: '16px'}}>
                        <ToggleSwitch id="abstainToggle" checked={allowAbstain} onChange={(e) => { setAllowAbstain(e.target.checked); handleUpdate('allowAbstain', e.target.checked); }} label="Aktifkan Opsi Abstain" />
                    </div>
                </div>

                {/* KARTU MODE PEMILIHAN & PETUGAS */}
                <div className="card mb-24" style={{borderLeft: '4px solid #f59e0b'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
                        <h3 className="card-title"><Monitor size={20}/> Mode Pemilihan</h3>
                        <div className="toggle-container">
                            <label className="switch">
                                <input type="checkbox" checked={isOfflineMode} onChange={(e) => {
                                    const val = e.target.checked;
                                    setIsOfflineMode(val);
                                    handleUpdate('isOfflineMode', val, val ? 'Mode Offline Aktif' : 'Mode Online Aktif');
                                }} />
                                <span className="slider round"></span>
                            </label>
                        </div>
                    </div>
                    <p style={{marginBottom: '16px', color: isOfflineMode ? '#1e293b' : '#94a3b8'}}>
                        {isOfflineMode ? <strong>MODE BILIK SUARA FISIK AKTIF (OFFLINE).</strong> : "Mode Online (Standar). Pemilih bisa login dari perangkat masing-masing."}
                    </p>
                    
                    {isOfflineMode && (
                        <div className="offline-settings animate-fade-in">
                            <div className="info-box">
                                <p>Dalam mode ini, pemilih <strong>tidak dapat login</strong> dari HP mereka. Pemilihan hanya dilakukan melalui Laptop Kiosk menggunakan Token.</p>
                            </div>
                            
                            <div className="form-group" style={{marginTop: '16px'}}>
                                <label className="label">Jumlah Bilik Suara Fisik (Laptop)</label>
                                <input type="number" value={jumlahBilik} onChange={(e) => setJumlahBilik(e.target.value)} onBlur={() => handleUpdate('jumlahBilik', Number(jumlahBilik))} className="input" min="1" style={{maxWidth: '100px'}} />
                                <small style={{color: '#64748b', display: 'block', marginTop: '4px'}}>Sistem akan membagi antrian secara otomatis ke {jumlahBilik} bilik.</small>
                            </div>

                            <hr style={{border: '0', borderTop: '1px solid #e2e8f0', margin: '24px 0'}} />
                            
                            {/* Link Copy */}
                            <div className="quick-links" style={{display: 'grid', gap: '16px'}}>
                                <div className="link-item">
                                    <label className="label">Link Meja Registrasi (Untuk Panitia)</label>
                                    <div style={{display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px'}}> 
                                        <input value={linkRegistrasi} readOnly className="input" style={{backgroundColor: '#f8fafc', width: '100%'}} />
                                        <button type="button" onClick={() => copyToClipboard(linkRegistrasi)} className="button button-secondary" style={{width: '42px', padding: 0, display: 'flex', justifyContent: 'center', alignItems: 'center'}}><Copy size={18}/></button>
                                    </div>
                                </div>
                                <div className="link-item">
                                    <label className="label">Link Laptop Bilik Suara (Mode Kiosk)</label>
                                    <div style={{display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px'}}> 
                                        <input value={linkBilik} readOnly className="input" style={{backgroundColor: '#f8fafc', width: '100%'}} />
                                        <button type="button" onClick={() => copyToClipboard(linkBilik)} className="button button-secondary" style={{width: '42px', padding: 0, display: 'flex', justifyContent: 'center', alignItems: 'center'}}><Copy size={18}/></button>
                                    </div>
                                </div>
                            </div>

                            <hr style={{border: '0', borderTop: '1px solid #e2e8f0', margin: '24px 0'}} />

                            {/* Manajemen Petugas */}
                            <h4 style={{fontSize: '1rem', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px'}}><Users size={18}/> Akun Petugas Lapangan</h4>
                            
                            <div className="petugas-form-row" style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '8px', marginBottom: '16px'}}>
                                <input placeholder="Username (ex: meja1)" value={newPetugas.username} onChange={e => setNewPetugas({...newPetugas, username: e.target.value})} className="input" />
                                <input placeholder="Nama Penanggung Jawab / NIM" value={newPetugas.penanggungJawab} onChange={e => setNewPetugas({...newPetugas, penanggungJawab: e.target.value})} className="input" />
                                <input placeholder="Password" value={newPetugas.password} onChange={e => setNewPetugas({...newPetugas, password: e.target.value})} className="input" />
                                <select value={newPetugas.role} onChange={e => setNewPetugas({...newPetugas, role: e.target.value})} className="input">
                                    <option value="registrasi">Meja Registrasi</option>
                                    <option value="bilik">Laptop Bilik</option>
                                </select>
                                <button type="button" onClick={handleAddPetugas} disabled={isCreatingPetugas} className="button button-primary" style={{marginTop: 0}}><Plus size={16}/></button>
                            </div>

                            <div className="petugas-list">
                                <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem'}}>
                                    <thead><tr>
                                        <th style={{textAlign: 'left', padding: '8px', borderBottom: '1px solid #e2e8f0', color: '#64748b'}}>Username</th>
                                        <th style={{textAlign: 'left', padding: '8px', borderBottom: '1px solid #e2e8f0', color: '#64748b'}}>Penanggung Jawab</th>
                                        <th style={{textAlign: 'left', padding: '8px', borderBottom: '1px solid #e2e8f0', color: '#64748b'}}>Role</th>
                                        <th style={{textAlign: 'left', padding: '8px', borderBottom: '1px solid #e2e8f0', color: '#64748b'}}>Password</th>
                                        <th style={{textAlign: 'left', padding: '8px', borderBottom: '1px solid #e2e8f0', color: '#64748b'}}>Aksi</th>
                                    </tr></thead>
                                    <tbody>
                                        {petugasList.map((p, idx) => (
                                            <tr key={idx}>
                                                <td style={{padding: '12px 8px', borderBottom: '1px solid #f1f5f9'}}>{p.username}</td>
                                                <td style={{padding: '12px 8px', borderBottom: '1px solid #f1f5f9'}}>{p.penanggungJawab || '-'}</td>
                                                <td style={{padding: '12px 8px', borderBottom: '1px solid #f1f5f9'}}>
                                                    <span style={{padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600', backgroundColor: p.role === 'registrasi' ? '#dbeafe' : '#fce7f3', color: p.role === 'registrasi' ? '#1e40af' : '#9d174d'}}>{p.role === 'registrasi' ? 'Registrasi' : 'Bilik Suara'}</span>
                                                </td>
                                                <td style={{padding: '12px 8px', borderBottom: '1px solid #f1f5f9', color: '#94a3b8', letterSpacing: '2px'}}>•••••••</td>
                                                <td style={{padding: '12px 8px', borderBottom: '1px solid #f1f5f9'}}>
                                                    <div style={{display: 'flex', gap: '8px'}}>
                                                        <button type="button" onClick={() => setEditPetugasData(p)} className="button-icon" title="Edit Data"><Edit size={16}/></button>
                                                        <button type="button" onClick={() => {setChangePassData(p); setNewPasswordInput('');}} className="button-icon" title="Ganti Password"><Key size={16}/></button>
                                                        <button type="button" onClick={() => handleDeletePetugas(p)} className="button-icon danger" title="Hapus"><Trash2 size={16}/></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {petugasList.length === 0 && <tr><td colSpan="5" style={{textAlign: 'center', padding: '16px', color: '#94a3b8'}}>Belum ada akun petugas.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                <div className="card card-span-2">
                    <h3 className="card-title"><Bell size={18} /> Kirim Pengumuman</h3>
                    <p className="card-subtitle">Pesan ini akan muncul di dasbor pemilih secara *real-time*.</p>
                    <textarea className="input" rows="3" value={pengumuman} onChange={(e) => setPengumuman(e.target.value)} placeholder="Tulis pengumuman baru..."></textarea>
                    <div className="announcement-actions">
                        {event?.pengumuman && (
                            <div className="current-announcement">
                                <p><strong>Aktif:</strong> {event.pengumuman.teks}</p>
                                <button onClick={confirmHapusPengumuman} className="button-text-danger"><Trash2 size={14} /> Hapus</button>
                            </div>
                        )}
                        <button onClick={handleKirimPengumuman} className="button button-primary" disabled={loading.pengumuman}>
                            {loading.pengumuman ? <><Loader2 size={16} className="animate-spin" /> Mengirim...</> : <><Send size={16} /> Kirim</>}
                        </button>
                    </div>
                </div>

                {computedStatus === 'selesai' && (
                    <div className="card">
                        <h3 className="card-title"><BarChart size={18} /> Publikasi Hasil</h3>
                        <p className="card-subtitle">Izinkan publik untuk melihat hasil akhir pemilihan ini.</p>
                        <ToggleSwitch id="publishToggle" checked={publishResults} onChange={(e) => { setPublishResults(e.target.checked); handleUpdate('publishResults', e.target.checked); }} label="Publikasikan Hasil" />
                    </div>
                )}

                <div className="card danger-zone card-span-2">
                    <h3 className="card-title danger-title"><AlertTriangle size={18} /> Zona Berbahaya</h3>
                    <p className="card-subtitle">Tindakan ini memiliki dampak besar dan hanya boleh digunakan dalam keadaan darurat.</p>
                    <div className="danger-actions">
                        <button onClick={() => confirmManualStatusChange('berlangsung', 'Berlangsung')} className="button button-warning"><Play size={16}/> Buka Voting Manual</button>
                        <button onClick={() => confirmManualStatusChange('selesai', 'Selesai')} className="button button-danger"><StopCircle size={16}/> Tutup Voting Manual</button>
                        <button onClick={confirmResetSuara} className="button button-danger-solid" disabled={loading.reset}>
                            {loading.reset ? <><Loader2 size={16} className="animate-spin" /> Mereset...</> : <><RefreshCcw size={16}/> Reset Semua Suara</>}
                        </button>
                    </div>
                </div>
            </div>

            {/* --- MODAL EDIT DATA PETUGAS --- */}
            {editPetugasData && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3 className="modal-title">Edit Data Petugas</h3>
                        <div style={{display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px'}}>
                            <div>
                                <label className="label">Username</label>
                                <input className="input" value={editPetugasData.username} onChange={(e) => setEditPetugasData({...editPetugasData, username: e.target.value})} />
                            </div>
                            <div>
                                <label className="label">Penanggung Jawab</label>
                                <input className="input" value={editPetugasData.penanggungJawab} onChange={(e) => setEditPetugasData({...editPetugasData, penanggungJawab: e.target.value})} />
                            </div>
                            <div>
                                <label className="label">Role</label>
                                <select className="input" value={editPetugasData.role} onChange={(e) => setEditPetugasData({...editPetugasData, role: e.target.value})}>
                                    <option value="registrasi">Meja Registrasi</option>
                                    <option value="bilik">Laptop Bilik</option>
                                </select>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button onClick={() => setEditPetugasData(null)} className="button button-secondary">Batal</button>
                            <button onClick={handleSaveEditPetugas} className="button button-primary">Simpan Perubahan</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL GANTI PASSWORD --- */}
            {changePassData && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3 className="modal-title">Ganti Password</h3>
                        <p className="modal-message">Masukkan password baru untuk petugas <strong>{changePassData.username}</strong>.</p>
                        
                        <div style={{marginBottom: '20px'}}>
                            <input type="text" className="input" placeholder="Password Baru..." value={newPasswordInput} onChange={(e) => setNewPasswordInput(e.target.value)} autoFocus />
                            <small style={{color: '#64748b', display: 'block', marginTop: '4px'}}>Minimal 4 karakter.</small>
                        </div>

                        <div className="modal-actions">
                            <button onClick={() => setChangePassData(null)} className="button button-secondary">Batal</button>
                            <button onClick={handleSaveNewPassword} className="button button-primary">Simpan Password</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = { modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }, modalContent: { backgroundColor: 'white', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '500px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }, modalTitle: { margin: '0 0 8px 0', color: '#1e293b', fontSize: '1.25rem' }, modalMessage: { margin: '0 0 20px 0', color: '#475569', lineHeight: '1.6' }, modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }, };

const styleSheet = document.createElement("style");
styleSheet.innerHTML = `
    .settings-page { font-family: 'Inter', sans-serif; }
    .page-header { margin-bottom: 24px; }
    .page-title { color: #1e293b; font-size: 1.75rem; font-weight: 700; margin: 0; }
    .page-subtitle { color: #64748b; font-size: 1rem; margin: 4px 0 0 0; }
    .settings-grid { display: grid; grid-template-columns: 1fr; gap: 24px; }
    .card { background-color: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .card-title { margin: 0 0 4px 0; color: #1e293b; font-size: 1.25rem; font-weight: 600; display: flex; align-items: center; gap: 8px; }
    .card-subtitle { margin: 0 0 24px 0; color: #64748b; font-size: 0.9rem; }
    .label { display: block; margin: 16px 0 8px 0; font-size: 0.9rem; color: #334155; font-weight: 600; }
    .input { width: 100%; box-sizing: border-box; padding: 10px 12px; border-radius: 8px; border: 1px solid #cbd5e0; font-size: 1rem; background-color: white; }
    .input:focus { border-color: #3b82f6; outline: none; }
    textarea.input { resize: vertical; }
    .button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.9rem; text-decoration: none; border: 1px solid transparent; transition: all 0.2s; }
    .button-primary { background-color: #1d4ed8; color: white; margin-top: 16px; width: 100%; }
    .button:disabled, .button-disabled { background-color: #94a3b8; color: #e2e8f0; cursor: not-allowed; border-color: transparent !important; }
    
    /* Button Icon Baru */
    .button-icon { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 6px; border: 1px solid #e2e8f0; background-color: white; color: #64748b; cursor: pointer; transition: all 0.2s; }
    .button-icon:hover { background-color: #f1f5f9; color: #1d4ed8; border-color: #cbd5e1; }
    .button-icon.danger:hover { background-color: #fef2f2; color: #ef4444; border-color: #fca5a5; }

    .status-display { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; margin-bottom: 16px; padding: 12px; background-color: #f1f5f9; border-radius: 8px; }
    .status-badge { padding: 6px 12px; border-radius: 9999px; color: white; font-weight: 600; font-size: 0.75rem; text-transform: capitalize; display: flex; align-items: center; gap: 6px; }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; background-color: white; }
    .status-berlangsung { background-color: #16a34a; } 
    .status-selesai { background-color: #dc2626; } 
    .status-akan-datang { background-color: #f59e0b; }
    
    .toggle-container { display: flex; justify-content: space-between; align-items: center; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; }
    .toggle-label { font-weight: 500; color: #334155; }
    .switch { position: relative; display: inline-block; width: 44px; height: 24px; }
    .switch input { opacity: 0; width: 0; height: 0; }
    .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; }
    .slider.round { border-radius: 24px; }
    .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
    input:checked + .slider { background-color: #1d4ed8; }
    input:checked + .slider:before { transform: translateX(20px); }
    
    .announcement-actions { margin-top: 16px; display: flex; flex-direction: column; gap: 16px; }
    .current-announcement { background-color: #f1f5f9; padding: 12px; border-radius: 8px; }
    .current-announcement p { margin: 0; color: #334155; }
    .button-text-danger { background: none; border: none; color: #dc2626; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; padding: 0; margin-top: 8px; }
    
    .danger-zone { border-left: 4px solid #ef4444; }
    .danger-title { color: #b91c1c; }
    .danger-actions { display: flex; flex-direction: column; gap: 12px; }
    .button-warning { background-color: #f59e0b; color: white; }
    .button-danger { background-color: #dc2626; color: white; }
    .button-danger-solid { background-color: #b91c1c; color: white; }
    
    .animate-spin { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    
    .toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background-color: #1e293b; color: white; padding: 12px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 1000; }
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
    .modal-content { background-color: white; padding: 24px; border-radius: 12px; width: 100%; max-width: 450px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
    .modal-title { margin: 0 0 8px 0; color: #1e293b; font-size: 1.25rem; }
    .modal-message { margin: 0 0 20px 0; color: #475569; line-height: 1.6; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 12px; }
    .button-secondary { background-color: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }

    @media (min-width: 768px) {
        .page-title { font-size: 2rem; }
        .settings-grid { grid-template-columns: repeat(2, 1fr); }
        .card-span-2 { grid-column: span 2; }
        .button-primary { width: auto; align-self: flex-end; }
        .announcement-actions { flex-direction: row-reverse; justify-content: space-between; align-items: center; }
        .danger-actions { flex-direction: row; }
    }
`;
document.head.appendChild(styleSheet);

export default PanitiaPengaturan;