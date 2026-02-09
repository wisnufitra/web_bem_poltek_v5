import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase/firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { logActivity } from '../../utils/logActivity'; // Asumsi path utilitas log benar

// Komponen Toast Sederhana (bisa diganti dengan library notifikasi)
const Toast = ({ message, type = 'success', clear }) => {
    useEffect(() => {
        const timer = setTimeout(clear, 3000);
        return () => clearTimeout(timer);
    }, [clear]);
    const bgColor = type === 'error' ? '#fee2e2' : '#dcfce7'; // Merah muda atau Hijau muda
    const textColor = type === 'error' ? '#991b1b' : '#166534'; // Merah tua atau Hijau tua
    return <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', backgroundColor: bgColor, color: textColor, padding: '12px 24px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 1000 }}>{message}</div>;
};


const PanitiaProfil = () => {
    const { eventId } = useParams(); // eventId mungkin berguna untuk konteks
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [namaTampilan, setNamaTampilan] = useState('');
    // State untuk ganti password
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');

    const [loading, setLoading] = useState(true);
    const [savingProfile, setSavingProfile] = useState(false); // Indikator loading simpan profil
    const [savingPassword, setSavingPassword] = useState(false); // Indikator loading simpan password
    const [toastMessage, setToastMessage] = useState({ text: '', type: 'success' });

    // Fungsi untuk menampilkan toast
    const showToast = (text, type = 'success') => {
        setToastMessage({ text, type });
    };

    // Fetch data user saat komponen mount
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const docRef = doc(db, 'users', currentUser.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setUserData(data);
                    setNamaTampilan(data.namaTampilan || ''); // Set nama tampilan awal
                    // Validasi role dan eventId (opsional tapi bagus)
                    if (data.role !== 'panitia' || data.eventId !== eventId) {
                         console.warn("Akses tidak sesuai. Role atau Event ID panitia tidak cocok.");
                         // Redirect atau tampilkan pesan error
                         navigate('/'); // Contoh redirect ke beranda
                    }
                } else {
                    console.error("Data user tidak ditemukan di Firestore.");
                    navigate('/login'); // Redirect jika data tidak ada
                }
            } else {
                navigate('/login'); // Redirect jika tidak login
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [navigate, eventId]); // Tambahkan eventId dependency

    // Handler untuk update profil (nama tampilan)
    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        if (!user || !namaTampilan) return;
        setSavingProfile(true);
        const userDocRef = doc(db, 'users', user.uid);
        try {
            await updateDoc(userDocRef, {
                namaTampilan: namaTampilan
            });
            await logActivity(`Memperbarui nama tampilan profil panitia menjadi "${namaTampilan}"`);
            showToast('Nama tampilan berhasil diperbarui.', 'success');
            setUserData(prev => ({ ...prev, namaTampilan })); // Update state lokal
        } catch (error) {
            console.error("Error updating profile:", error);
            showToast('Gagal memperbarui profil.', 'error');
        } finally {
            setSavingProfile(false);
        }
    };

    // Handler untuk ganti password
    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');
        if (!user) return;
        if (newPassword !== confirmNewPassword) {
            setPasswordError('Password baru tidak cocok.');
            return;
        }
        if (newPassword.length < 6) {
            setPasswordError('Password baru minimal 6 karakter.');
            return;
        }

        setSavingPassword(true);
        try {
            // 1. Reautentikasi pengguna
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);

            // 2. Jika reautentikasi berhasil, update password
            await updatePassword(user, newPassword);
            await logActivity('Memperbarui password profil panitia.');
            setPasswordSuccess('Password berhasil diubah.');
            showToast('Password berhasil diperbarui.', 'success');
            // Kosongkan field password
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (error) {
            console.error("Error changing password:", error);
            if (error.code === 'auth/wrong-password') {
                setPasswordError('Password saat ini salah.');
            } else if (error.code === 'auth/too-many-requests') {
                 setPasswordError('Terlalu banyak percobaan gagal. Coba lagi nanti.');
            }
             else {
                setPasswordError('Gagal mengubah password. Coba lagi.');
            }
            showToast('Gagal mengubah password.', 'error');
        } finally {
            setSavingPassword(false);
        }
    };


    if (loading || !userData) {
        // Tampilkan loading spinner atau skeleton
        return <div style={styles.container}><p>Loading profil...</p></div>;
    }

    return (
        <div style={styles.container}>
            {/* Tampilkan Toast */}
            {toastMessage.text && (
                <Toast
                    message={toastMessage.text}
                    type={toastMessage.type}
                    clear={() => setToastMessage({ text: '', type: 'success' })}
                />
            )}

            <h1 style={styles.title}>Edit Profil Panitia</h1>

            {/* Form Edit Nama Tampilan */}
            <form onSubmit={handleUpdateProfile} style={styles.formSection}>
                <h2 style={styles.sectionTitle}>Informasi Dasar</h2>
                 <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="email">Email</label>
                    <input
                        style={{...styles.input, backgroundColor: '#f3f4f6', cursor: 'not-allowed'}}
                        type="email"
                        id="email"
                        value={user.email || ''}
                        readOnly // Email tidak bisa diubah
                    />
                </div>
                 <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="eventIdDisplay">Event Terkait</label>
                    <input
                        style={{...styles.input, backgroundColor: '#f3f4f6', cursor: 'not-allowed'}}
                        type="text"
                        id="eventIdDisplay"
                        value={userData.eventId || 'Tidak ada'}
                        readOnly // Event ID tidak bisa diubah
                    />
                </div>
                <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="namaTampilan">Nama Tampilan</label>
                    <input
                        style={styles.input}
                        type="text"
                        id="namaTampilan"
                        value={namaTampilan}
                        onChange={(e) => setNamaTampilan(e.target.value)}
                        required
                    />
                </div>
                <button type="submit" style={savingProfile ? styles.buttonDisabled : styles.buttonPrimary} disabled={savingProfile}>
                    {savingProfile ? 'Menyimpan...' : 'Simpan Nama Tampilan'}
                </button>
            </form>

            {/* Form Ganti Password */}
            <form onSubmit={handleChangePassword} style={styles.formSection}>
                <h2 style={styles.sectionTitle}>Ubah Password</h2>
                {passwordError && <p style={styles.errorMessage}>{passwordError}</p>}
                {passwordSuccess && <p style={styles.successMessage}>{passwordSuccess}</p>}
                <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="currentPassword">Password Saat Ini</label>
                    <input
                        style={styles.input}
                        type="password"
                        id="currentPassword"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                    />
                </div>
                <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="newPassword">Password Baru</label>
                    <input
                        style={styles.input}
                        type="password"
                        id="newPassword"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength="6"
                    />
                </div>
                <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="confirmNewPassword">Konfirmasi Password Baru</label>
                    <input
                        style={styles.input}
                        type="password"
                        id="confirmNewPassword"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        required
                    />
                </div>
                 <button type="submit" style={savingPassword ? styles.buttonDisabled : styles.buttonPrimary} disabled={savingPassword}>
                    {savingPassword ? 'Menyimpan...' : 'Ubah Password'}
                </button>
            </form>
        </div>
    );
};

// --- Styles --- (Gunakan objek agar lebih rapi)
const styles = {
    container: {
        maxWidth: '700px',
        margin: '40px auto',
        padding: '30px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        fontFamily: "'Inter', sans-serif"
    },
    title: {
        textAlign: 'center',
        color: '#1e293b',
        marginBottom: '30px',
        fontSize: '1.75rem',
        fontWeight: '700',
    },
    formSection: {
        marginBottom: '40px',
        paddingBottom: '30px',
        borderBottom: '1px solid #e2e8f0',
    },
    sectionTitle: {
        color: '#334155',
        fontSize: '1.25rem',
        fontWeight: '600',
        marginBottom: '20px',
        borderBottom: '2px solid #3b82f6', // Biru
        paddingBottom: '8px',
        display: 'inline-block',
    },
    formGroup: {
        marginBottom: '20px',
    },
    label: {
        display: 'block',
        marginBottom: '8px',
        fontWeight: '600',
        color: '#475569',
        fontSize: '0.9rem',
    },
    input: {
        width: '100%',
        padding: '12px 15px',
        border: '1px solid #cbd5e0',
        borderRadius: '8px',
        fontSize: '1rem',
        boxSizing: 'border-box', // Penting agar padding tidak menambah lebar
        transition: 'border-color 0.2s, box-shadow 0.2s',
    },
    // Tambahkan style untuk input focus
    // input:focus {
    //     outline: 'none',
    //     borderColor: '#3b82f6', // Biru saat fokus
    //     boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.3)',
    // },
    buttonPrimary: {
        display: 'inline-block',
        padding: '12px 25px',
        backgroundColor: '#2563eb', // Biru
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '1rem',
        transition: 'background-color 0.2s',
    },
    // buttonPrimary:hover {
    //     backgroundColor: '#1d4ed8', // Biru lebih gelap saat hover
    // },
    buttonDisabled: {
        display: 'inline-block',
        padding: '12px 25px',
        backgroundColor: '#94a3b8', // Abu-abu
        color: '#e2e8f0',
        border: 'none',
        borderRadius: '8px',
        cursor: 'not-allowed',
        fontWeight: '600',
        fontSize: '1rem',
    },
    errorMessage: {
        color: '#dc2626', // Merah
        backgroundColor: '#fee2e2',
        padding: '10px 15px',
        borderRadius: '8px',
        marginBottom: '15px',
        fontSize: '0.9rem',
    },
    successMessage: {
        color: '#166534', // Hijau
        backgroundColor: '#dcfce7',
        padding: '10px 15px',
        borderRadius: '8px',
        marginBottom: '15px',
        fontSize: '0.9rem',
    }
};

// Inject CSS for focus and hover states (karena inline style tidak bisa handle pseudo-class)
const styleTag = document.createElement('style');
styleTag.innerHTML = `
    ${Object.keys(styles).map(key => `.${key} { ${Object.entries(styles[key]).map(([prop, val]) => `${prop.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${val};`).join(' ')} }`).join('\n')}

    input:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
    }
    button[type="submit"]:not(:disabled):hover {
         filter: brightness(0.9);
    }
`;
// Optional: Check if style already exists to avoid duplication during hot-reloads
if (!document.getElementById('panitia-profil-styles')) {
    styleTag.id = 'panitia-profil-styles';
    document.head.appendChild(styleTag);
}


export default PanitiaProfil;

