// src/pages/AdminProfil.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase/firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { logActivity } from '../utils/logActivity';
// ✅ 1. Impor semua ikon yang dibutuhkan dari Lucide
import { Camera, UserRound, Landmark, Instagram, Linkedin, LockKeyhole, Eye, EyeOff, Save, KeyRound, Trash2 } from 'lucide-react';


// --- Komponen UI Modern ---
const Toast = ({ message, type, clear }) => {
    useEffect(() => {
        const timer = setTimeout(clear, 3000);
        return () => clearTimeout(timer);
    }, [clear]);
    
    const style = {
        ...styles.toast,
        backgroundColor: type === 'success' ? '#16a34a' : type === 'error' ? '#dc2626' : '#1e293b'
    };

    return <div style={style}>{message}</div>;
};

const ConfirmationModal = ({ modalState, setModalState }) => {
    if (!modalState.isOpen) return null;
    return (
        <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
                <h3 style={styles.modalTitle}>{modalState.title}</h3>
                <p style={styles.modalMessage}>{modalState.message}</p>
                <div style={styles.modalActions}>
                    <button style={styles.modalCancelButton} onClick={() => setModalState({ isOpen: false })}>Batal</button>
                    <button style={styles.modalConfirmButton} onClick={() => { modalState.onConfirm(); setModalState({ isOpen: false }); }}>
                        {modalState.confirmText || 'Konfirmasi'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const PasswordStrengthBar = ({ score }) => {
    const getBarColor = () => {
        if (score >= 80) return '#22c55e';
        if (score >= 40) return '#f59e0b';
        return '#ef4444';
    };
    const getStrengthText = () => {
        if (score >= 80) return 'Sangat Kuat';
        if (score >= 60) return 'Kuat';
        if (score >= 40) return 'Cukup';
        return 'Lemah';
    };
    return (
        <div style={{ marginTop: '-10px', marginBottom: '16px' }}>
            <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${score}%`, backgroundColor: getBarColor(), borderRadius: '3px', transition: 'width 0.3s ease' }} />
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: getBarColor(), textAlign: 'right', fontWeight: '500' }}>
                {getStrengthText()}
            </p>
        </div>
    );
};

const AdminProfil = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState({ profile: false, password: false, initial: true });
    const [notification, setNotification] = useState(null);
    
    const [profilData, setProfilData] = useState({
        namaTampilan: '', kementerian: '', foto: '', instagram: '', linkedin: ''
    });
    const [passwordData, setPasswordData] = useState({
        oldPassword: '', newPassword: '', confirmNewPassword: ''
    });
    const [passwordStrength, setPasswordStrength] = useState(0);
    const [modalState, setModalState] = useState({ isOpen: false });

    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);


    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const fetchProfil = async () => {
                    const docRef = doc(db, 'users', currentUser.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        setProfilData(docSnap.data());
                    }
                    setLoading(prev => ({...prev, initial: false}));
                };
                fetchProfil();
            } else {
                navigate('/login');
            }
        });
        return () => unsubscribe();
    }, [navigate]);

    useEffect(() => {
        const pass = passwordData.newPassword;
        let score = 0;
        if (pass.length > 7) score += 20;
        if (/\d/.test(pass)) score += 20;
        if (/[a-z]/.test(pass)) score += 20;
        if (/[A-Z]/.test(pass)) score += 20;
        if (/[^A-Za-z0-9]/.test(pass)) score += 20;
        setPasswordStrength(score > 100 ? 100 : score);
    }, [passwordData.newPassword]);

    const showNotification = (message, type = 'info') => {
        setNotification({ message, type });
    };

    const handleProfilChange = (e) => {
        const { name, value } = e.target;
        setProfilData(prev => ({ ...prev, [name]: value }));
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({ ...prev, [name]: value }));
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
                const MAX_WIDTH = 400;
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
                setProfilData(prev => ({ ...prev, foto: compressedBase64 }));
            };
        };
    };

    const confirmHapusFoto = () => {
        setModalState({
            isOpen: true, title: 'Hapus Foto Profil?',
            message: 'Anda yakin ingin menghapus foto profil Anda? Ini akan kembali ke avatar default.',
            onConfirm: handleHapusFoto, confirmText: 'Ya, Hapus'
        });
    };

    const handleHapusFoto = async () => {
        try {
            await updateDoc(doc(db, 'users', user.uid), { foto: '' });
            await logActivity('Menghapus foto profil pribadi');
            setProfilData(prev => ({ ...prev, foto: '' }));
            showNotification('Foto berhasil dihapus!', 'success');
        } catch (error) {
            showNotification('Gagal menghapus foto.', 'error');
        }
    };

    const handleSimpanProfil = async (e) => {
        e.preventDefault();
        if (!user) return;
        setLoading(prev => ({...prev, profile: true}));
        const docRef = doc(db, 'users', user.uid);
        try {
            await updateDoc(docRef, profilData);
            await logActivity('Memperbarui profil pribadi');
            showNotification('Profil berhasil diperbarui!', 'success');
        } catch (error) {
            showNotification('Gagal memperbarui profil.', 'error');
        } finally {
            setLoading(prev => ({...prev, profile: false}));
        }
    };

    const handleSimpanPassword = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmNewPassword) {
            return showNotification('Password baru tidak cocok.', 'error');
        }
        if (passwordData.newPassword.length < 6) {
            return showNotification('Password baru minimal 6 karakter.', 'error');
        }
        setLoading(prev => ({...prev, password: true}));
        try {
            const credential = EmailAuthProvider.credential(user.email, passwordData.oldPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, passwordData.newPassword);
            await logActivity('Mengubah password pribadi');
            showNotification('Password berhasil diubah!', 'success');
            setPasswordData({ oldPassword: '', newPassword: '', confirmNewPassword: '' });
        } catch (error) {
            showNotification('Gagal mengubah password. Pastikan password lama Anda benar.', 'error');
        } finally {
            setLoading(prev => ({...prev, password: false}));
        }
    };

    if (loading.initial) {
        return <div style={styles.page}><p>Memuat profil...</p></div>;
    }

    return (
        <div style={styles.page}>
            {notification && <Toast message={notification.message} type={notification.type} clear={() => setNotification(null)} />}
            <ConfirmationModal modalState={modalState} setModalState={setModalState} />

            <div style={styles.container}>
                <div style={styles.header}>
                    <div>
                        <h1 className="page-title" style={styles.pageTitle}>Profil Saya</h1>
                        <p style={styles.pageSubtitle}>Kelola informasi profil dan pengaturan keamanan akun Anda.</p>
                    </div>
                </div>

                {/* ✅ 2. Memberi className untuk tata letak responsif */}
                <div className="profile-grid">
                    <div className="profile-card-sticky" style={styles.profileCard}>
                        <div style={styles.profileImageContainer}>
                            <img src={profilData.foto || `https://ui-avatars.com/api/?name=${(profilData.namaTampilan || 'A').replace(/\s/g, '+')}&background=1d4ed8&color=fff&font-size=0.5`} alt="Profil" style={styles.profileImage} />
                            <label htmlFor="foto-upload" style={styles.imageOverlayButton}>
                                {/* ✅ Ganti ikon SVG dengan Lucide */}
                                <Camera size={16} />
                            </label>
                            <input type="file" id="foto-upload" accept="image/*" onChange={handleFotoChange} style={{display: 'none'}} />
                        </div>
                        <h2 style={styles.profileName}>{profilData.namaTampilan || 'Nama Tampilan'}</h2>
                        <p style={styles.profileDetail}>{profilData.kementerian || 'Kementerian/Divisi'}</p>
                        <p style={styles.profileDetail}>{user?.email}</p>
                        {profilData.foto && <button onClick={confirmHapusFoto} style={styles.deletePhotoButton}><Trash2 size={14} /> Hapus Foto</button>}
                    </div>

                    <div style={styles.formContainer}>
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>Informasi Dasar</h3>
                            <form onSubmit={handleSimpanProfil}>
                                <label style={styles.label}>Nama Tampilan</label>
                                <div style={styles.inputContainer}><UserRound style={styles.inputIcon} size={18} /><input style={styles.inputWithIcon} name="namaTampilan" value={profilData.namaTampilan} onChange={handleProfilChange} /></div>
                                
                                <label style={styles.label}>Kementerian/Divisi</label>
                                <div style={styles.inputContainer}><Landmark style={styles.inputIcon} size={18} /><input style={styles.inputWithIcon} name="kementerian" value={profilData.kementerian} onChange={handleProfilChange} /></div>
                                
                                <label style={styles.label}>Instagram (Username)</label>
                                <div style={styles.inputContainer}><Instagram style={styles.inputIcon} size={18} /><input style={styles.inputWithIcon} name="instagram" value={profilData.instagram || ''} onChange={handleProfilChange} placeholder="bem_polteknuklir" /></div>
                                
                                <label style={styles.label}>LinkedIn (Username)</label>
                                <div style={styles.inputContainer}><Linkedin style={styles.inputIcon} size={18} /><input style={styles.inputWithIcon} name="linkedin" value={profilData.linkedin || ''} onChange={handleProfilChange} placeholder="nama-anda-123" /></div>
                                
                                <button type="submit" style={styles.button} disabled={loading.profile}><Save size={18} /> {loading.profile ? 'Menyimpan...' : 'Simpan Profil'}</button>
                            </form>
                        </div>
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>Keamanan Akun</h3>
                            <form onSubmit={handleSimpanPassword}>
                                <label style={styles.label}>Password Lama</label>
                                <div style={styles.inputContainer}>
                                    <LockKeyhole style={styles.inputIcon} size={18} />
                                    <input style={styles.inputWithIcon} type={showOldPassword ? "text" : "password"} name="oldPassword" value={passwordData.oldPassword} onChange={handlePasswordChange} required />
                                    <button type="button" onClick={() => setShowOldPassword(!showOldPassword)} style={styles.eyeIcon}>{showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                                </div>
                                <label style={styles.label}>Password Baru</label>
                                <div style={styles.inputContainer}>
                                    <LockKeyhole style={styles.inputIcon} size={18} />
                                    <input style={styles.inputWithIcon} type={showNewPassword ? "text" : "password"} name="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} required />
                                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} style={styles.eyeIcon}>{showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                                </div>
                                <PasswordStrengthBar score={passwordStrength} />
                                <label style={styles.label}>Konfirmasi Password Baru</label>
                                <div style={styles.inputContainer}>
                                    <LockKeyhole style={styles.inputIcon} size={18} />
                                    <input style={styles.inputWithIcon} type={showConfirmNewPassword ? "text" : "password"} name="confirmNewPassword" value={passwordData.confirmNewPassword} onChange={handlePasswordChange} required />
                                    <button type="button" onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)} style={styles.eyeIcon}>{showConfirmNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                                </div>
                                <button type="submit" style={{...styles.button, backgroundColor: '#16a34a'}} disabled={loading.password}><KeyRound size={18} />{loading.password ? 'Menyimpan...' : 'Ganti Password'}</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ... (Komponen Toast, Modal, PasswordBar tidak berubah)

const styles = {
    page: { fontFamily: "'Inter', sans-serif", backgroundColor: '#f8fafc', minHeight: '100vh', padding: '20px' },
    container: { maxWidth: '1000px', margin: '0 auto' },
    header: { marginBottom: '32px' },
    pageTitle: { color: '#1e293b', fontWeight: '700', margin: 0 }, // Font size dipindah ke CSS class
    pageSubtitle: { color: '#64748b', fontSize: '1rem', margin: '8px 0 0 0' },
    // grid styling dipindah ke CSS class
    profileCard: { backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', textAlign: 'center' },
    profileImageContainer: { position: 'relative', width: '120px', height: '120px', margin: '0 auto 16px' },
    profileImage: { width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '4px solid #ffffff', boxShadow: '0 0 10px rgba(0,0,0,0.1)' },
    imageOverlayButton: { position: 'absolute', bottom: '5px', right: '5px', backgroundColor: '#1d4ed8', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white', cursor: 'pointer', transition: 'transform 0.2s' },
    profileName: { fontSize: '1.5rem', fontWeight: '600', color: '#1f2937', margin: 0 },
    profileDetail: { color: '#6b7280', fontSize: '0.9rem', margin: '4px 0 0 0' },
    deletePhotoButton: { marginTop: '16px', backgroundColor: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', margin: '16px auto 0' },
    formContainer: { display: 'flex', flexDirection: 'column', gap: '24px' },
    card: { backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' },
    cardTitle: { margin: '0 0 24px 0', color: '#1e293b', fontSize: '1.25rem', fontWeight: '600', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' },
    label: { display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#334155', fontWeight: '600' },
    inputContainer: { position: 'relative', marginBottom: '16px' },
    inputIcon: { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' },
    inputWithIcon: { width: '100%', boxSizing: 'border-box', padding: '10px 12px 10px 40px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '1rem' },
    eyeIcon: { position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' },
    button: { width: '100%', padding: '12px', backgroundColor: '#1d4ed8', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
    toast: { position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', padding: '12px 24px', color: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 1000 },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: 'white', padding: '24px', borderRadius: '12px', maxWidth: '450px', width: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' },
    modalTitle: { margin: '0 0 8px 0', color: '#1e293b', fontSize: '1.25rem' },
    modalMessage: { margin: '0 0 20px 0', color: '#475569', lineHeight: '1.6' },
    modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '12px' },
    modalCancelButton: { padding: '10px 20px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
    modalConfirmButton: { padding: '10px 20px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
};

const styleSheet = document.createElement("style");
// ✅ 3. CSS diperbarui untuk menangani tata letak responsif
styleSheet.innerHTML = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  input:focus { outline: none; border-color: #1d4ed8; box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.2); }
  button:hover { filter: brightness(0.95); }
  .imageOverlayButton:hover { transform: scale(1.1); }

  /* Tampilan Mobile (Default) */
  .page-title {
    font-size: 1.75rem;
  }
  .profile-grid {
    display: grid;
    grid-template-columns: 1fr; /* 1 kolom di mobile */
    gap: 24px;
  }
  .profile-card-sticky {
    position: static; /* Hapus 'sticky' di mobile */
  }

  /* Tampilan Desktop (Layar lebih besar dari 800px) */
  @media (min-width: 800px) {
    .page-title {
      font-size: 2rem;
    }
    .profile-grid {
      /* Kolom profil lebar tetap, form menyesuaikan */
      grid-template-columns: 280px 1fr;
    }
    .profile-card-sticky {
      position: sticky; /* Aktifkan 'sticky' kembali di desktop */
      top: 90px;
    }
  }
`;
document.head.appendChild(styleSheet);


export default AdminProfil;