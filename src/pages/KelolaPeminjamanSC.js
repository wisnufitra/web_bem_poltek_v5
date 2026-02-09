// src/pages/KelolaPeminjamanSC.js

import React, { useState, useRef, useCallback } from 'react';
import { db } from '../firebase/firebaseConfig';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { Search, Save, Trash2, ShieldAlert, FileEdit, Lock, CheckCircle, Ticket, Hash, X, AlertCircle } from 'lucide-react';
import './KelolaPeminjamanSC.css';

const lokasiOptions = ["Ruang Rapat SC (Lantai 3)", "Lapangan Badminton Timur (Lantai 2)", "Lapangan Badminton Barat (Lantai 2)", "Lapangan Badminton Barat & Timur (Lantai 2)"];

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText, confirmType = 'danger' }) => {
    if (!isOpen) return null;
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content confirmation-modal" onClick={e => e.stopPropagation()}>
                <div className={`confirmation-icon ${confirmType}`}>
                    <AlertCircle size={48} />
                </div>
                <h2 className="confirmation-title">{title}</h2>
                <p className="confirmation-message">{message}</p>
                <div className="modal-footer">
                    <button onClick={onClose} className="button-secondary">Batal</button>
                    <button onClick={onConfirm} className={`button button-${confirmType}`}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

const NotificationIcon = ({ type }) => {
    const style = { marginRight: '10px', flexShrink: 0 };
    if (type === 'error') {
        // Gunakan ShieldAlert yang sudah Anda impor
        return <ShieldAlert size={22} style={style} />;
    }
    // Gunakan CheckCircle yang sudah Anda impor
    return <CheckCircle size={22} style={style} />;
};

const KelolaPeminjamanSC = () => {
    const [ticketCode, setTicketCode] = useState('');
    const [bookingData, setBookingData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [lockReason, setLockReason] = useState('');

    const [notification, setNotification] = useState({ show: false, message: '', type: 'success', closing: false });
    const notificationTimerRef = useRef(null);
    const [confirmation, setConfirmation] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    const handleCloseNotification = useCallback(() => {
        if (notificationTimerRef.current) {
            clearTimeout(notificationTimerRef.current);
            notificationTimerRef.current = null;
        }
        setNotification(prev => ({ ...prev, closing: true }));
        setTimeout(() => {
            setNotification({ show: false, message: '', type: 'success', closing: false });
        }, 500); // 500ms
    }, []);

    const showNotification = useCallback((message, type = 'success') => {
        if (notificationTimerRef.current) {
            clearTimeout(notificationTimerRef.current);
        }
        setNotification({ show: true, message, type, closing: false }); 
        notificationTimerRef.current = setTimeout(handleCloseNotification, 3000);
    }, [handleCloseNotification]);

    const handleConfirmAction = () => {
        if (confirmation.onConfirm) {
            confirmation.onConfirm();
        }
        setConfirmation({ isOpen: false });
    };

    const handleSearch = async () => {
        if (!ticketCode.trim()) {
            showNotification('Nomor Tiket tidak boleh kosong.', 'error'); // <-- Ganti
            return;
        }
        setLoading(true);
        setLockReason('');
        setBookingData(null);

        const bookingsRef = collection(db, "peminjamanSC");
        const q = query(bookingsRef, where("ticketCode", "==", ticketCode.trim().toUpperCase()));
        
        try {
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                showNotification('Peminjaman dengan Nomor Tiket ini tidak ditemukan.', 'error'); // <-- Ganti
            } else {
                const docSnap = querySnapshot.docs[0];
                const data = { id: docSnap.id, ...docSnap.data() };

                const now = new Date();
                const eventStartTime = new Date(`${data.tanggal}T${data.waktuMulai}`);
                const eventEndTime = new Date(`${data.tanggal}T${data.waktuSelesai}`);
                const oneHourBefore = new Date(eventStartTime.getTime() - 60 * 60 * 1000);

                let isEditable = true;

                if (data.status === 'dibatalkan') {
                    isEditable = false;
                    setLockReason('Peminjaman ini telah dibatalkan.');
                } else if (data.waktuSelesaiAktual) {
                    isEditable = false;
                    setLockReason('Sesi peminjaman ini sudah selesai (check-out telah dilakukan).');
                } else if (now > eventEndTime) {
                    isEditable = false;
                    setLockReason('Jadwal ini sudah berlalu dan tidak dapat diubah lagi.');
                } else if (now >= oneHourBefore) {
                    isEditable = false;
                    setLockReason('Batas waktu perubahan telah berakhir (kurang dari 1 jam sebelum acara).');
                }

                setBookingData({ ...data, isEditable });
            }
        } catch (err) {
            console.error(err);
            showNotification('Terjadi kesalahan saat mencari tiket.', 'error'); // <-- Ganti
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => setBookingData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const redirectToSearch = () => {
        setTimeout(() => {
            setBookingData(null);
            setTicketCode('');
        }, 5000); // 5 detik
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        const docRef = doc(db, "peminjamanSC", bookingData.id);
        try {
            await updateDoc(docRef, {
                tanggal: bookingData.tanggal,
                waktuMulai: bookingData.waktuMulai,
                waktuSelesai: bookingData.waktuSelesai,
            });
           showNotification('Perubahan berhasil disimpan! Anda akan dialihkan dalam 5 detik.'); // <-- Ganti
            redirectToSearch();
            } catch (err) {
                console.error(err);
                showNotification('Gagal menyimpan perubahan.', 'error'); // <-- Ganti
            } finally {
            setLoading(false);
        }
    };

    const handleCancelBooking = async () => {
        setConfirmation({
            isOpen: true,
            title: 'Konfirmasi Pembatalan',
            message: 'Apakah Anda yakin ingin membatalkan peminjaman ini? Aksi ini tidak dapat diurungkan.',
            confirmText: 'Ya, Batalkan',
            confirmType: 'danger',
            onConfirm: async () => {
                setLoading(true);
                const docRef = doc(db, "peminjamanSC", bookingData.id);
                try {
                    await updateDoc(docRef, { status: 'dibatalkan' });
                    showNotification('Peminjaman berhasil dibatalkan. Anda akan dialihkan dalam 5 detik.'); // <-- Ganti
                    redirectToSearch();
                } catch (err) {
                    console.error(err);
                    showNotification('Gagal membatalkan peminjaman.', 'error'); // <-- Ganti
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    return (
        <div className="root-wrapper">
            {notification.show && (
                <div className={`notification-popup ${notification.type} ${notification.closing ? 'closing' : ''}`}>
                    <NotificationIcon type={notification.type} />
                    <span>{notification.message}</span>
                    <button onClick={handleCloseNotification} className="notification-close-btn"><X size={18}/></button>
                </div>
            )}
            <header className="page-header">
                <div className="header-content-wrapper">
                    <FileEdit size={40} />
                    <div>
                        <h1 className="page-title">Kelola Peminjaman</h1>
                        <p className="page-subtitle">Ubah detail atau batalkan jadwal peminjaman Anda melalui halaman ini.</p>
                    </div>
                </div>
            </header>
            <main className="kelola-main-content">
                <div className="kelola-container card">
                    {!bookingData ? (
                        <div className="search-widget">
                            <div className="search-icon-wrapper">
                                <Ticket size={32} />
                            </div>
                            <h2 className="kelola-title">Lacak Peminjaman Anda</h2>
                            <p className="kelola-subtitle">Masukkan Nomor Tiket untuk melihat detail jadwal Anda.</p>
                            <div className="search-form">
                                <div className="input-with-icon">
                                    <Hash size={20} className="input-icon" />
                                    <input
                                        type="text"
                                        value={ticketCode}
                                        onChange={(e) => setTicketCode(e.target.value)}
                                        placeholder="Tempel Tiket di sini (cth: SC-XXXX)..."
                                        className="search-input"
                                    />
                                </div>
                                <button onClick={handleSearch} className="search-button" disabled={loading}>
                                    <Search size={18} />
                                    <span>{loading ? 'Mencari...' : 'Cari'}</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <h2 className="kelola-title">Detail Peminjaman #{bookingData.ticketCode}</h2>
                            <form onSubmit={handleUpdate} className="kelola-form">
                                <div className="form-group">
                                    <label>Lokasi Peminjaman</label>
                                    <input type="text" value={bookingData.lokasi} disabled />
                                </div>
                                <div className="form-group">
                                    <label>Nama Penanggung Jawab</label>
                                    <input type="text" value={bookingData.nama} disabled />
                                </div>
                                <div className="form-group">
                                    <label>Organisasi / Keperluan</label>
                                    <input type="text" value={bookingData.organisasi} disabled />
                                </div>
                                
                                <div className="divider"></div>
                                
                                <p className="editable-section-title">Anda hanya dapat mengubah jadwal acara:</p>
                                
                                <div className="form-group">
                                    <label>Tanggal</label>
                                    <input type="date" name="tanggal" value={bookingData.tanggal} onChange={handleInputChange} disabled={!bookingData.isEditable} />
                                </div>
                                <div className="form-row">
                                    <div className="form-group"><label>Waktu Mulai</label><input type="time" name="waktuMulai" value={bookingData.waktuMulai} onChange={handleInputChange} disabled={!bookingData.isEditable} /></div>
                                    <div className="form-group"><label>Waktu Selesai</label><input type="time" name="waktuSelesai" value={bookingData.waktuSelesai} onChange={handleInputChange} disabled={!bookingData.isEditable} /></div>
                                </div>

                                {bookingData.isEditable && (
                                    <div className="action-buttons">
                                        <button type="button" onClick={handleCancelBooking} className="button button-danger" disabled={loading}>
                                            <Trash2 size={16}/> Batalkan Peminjaman
                                        </button>
                                        <button type="submit" className="button button-primary" disabled={loading}>
                                            <Save size={16}/> {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                                        </button>
                                    </div>
                                )}
                            </form>
                        </div>
                    )}
                </div>
            </main>
            <ConfirmationModal
                isOpen={confirmation.isOpen}
                onClose={() => setConfirmation({ isOpen: false })}
                onConfirm={handleConfirmAction}
                title={confirmation.title}
                message={confirmation.message}
                confirmText={confirmation.confirmText}
                confirmType={confirmation.confirmType}
            />
        </div>
    );
};

export default KelolaPeminjamanSC;