// src/pages/AbsensiSC.js

import React, { useState, useRef } from 'react';
import { db } from '../firebase/firebaseConfig';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { Search, ShieldAlert, LogIn, LogOut, Loader, QrCode, CheckCircle, Clock, MapPin, Users, Hash, FileCheck2, PartyPopper } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './AbsensiSC.css';

// --- Helper Functions ---
const resizeAndConvertToBase64 = (file, maxWidth, quality) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const scale = maxWidth / img.width;
                canvas.width = maxWidth;
                canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};

// --- Sub-Components ---
const SearchForm = ({ onSearch, loading }) => {
    const [ticketCode, setTicketCode] = useState('');
    const handleSubmit = (e) => {
        e.preventDefault();
        onSearch(ticketCode);
    };

    return (
        <div className="search-widget">
            <h2 className="absensi-title">Lacak Peminjaman Anda</h2>
            <p className="absensi-subtitle">Masukkan Nomor Tiket untuk memulai atau menyelesaikan sesi Anda.</p>
            <form onSubmit={handleSubmit} className="search-form">
                <div className="input-with-icon">
                    <Hash size={20} className="input-icon" />
                    <input
                        type="text"
                        value={ticketCode}
                        onChange={(e) => setTicketCode(e.target.value)}
                        placeholder="Masukkan Nomor Tiket (cth: SC-XXXX)..."
                        className="search-input"
                        required
                    />
                </div>
                <button type="submit" className="search-button" disabled={loading}>
                    {loading ? <Loader size={18} className="spinner-inline" /> : <Search size={18} />}
                    <span>{loading ? 'Mencari...' : 'Cari'}</span>
                </button>
            </form>
        </div>
    );
};

const BookingDetails = ({ data }) => (
    <div className="booking-details-list">
        <p><MapPin size={16} /> <strong>Lokasi:</strong> {data.lokasi}</p>
        <p><Users size={16} /> <strong>Organisasi:</strong> {data.organisasi}</p>
        <p><Clock size={16} /> <strong>Jadwal:</strong> {data.waktuMulai} - {data.waktuSelesai}</p>
    </div>
);

const ActionCard = ({ title, icon, description, buttonText, onClick, disabled, type }) => (
    <div className={`action-box ${type}`}>
        <h3>{icon} {title}</h3>
        <p>{description}</p>
        <button onClick={onClick} className={`button button-${type === 'checkin' ? 'primary' : 'danger'}`} disabled={disabled}>
            {disabled ? <Loader size={18} className="spinner-inline" /> : <>{icon} {buttonText}</>}
        </button>
    </div>
);

const CompletedCard = () => (
    <div className="action-box completed">
        <h3><PartyPopper size={20} /> Sesi Selesai</h3>
        <p>Terima kasih! Anda telah menyelesaikan sesi peminjaman ini dengan baik.</p>
    </div>
);

const StatusTimeline = ({ status }) => {
    const steps = ['Cari Tiket', 'Check-in', 'Check-out'];
    const currentStepIndex = status === 'found' ? 1 : status === 'checked-in' ? 2 : status === 'completed' ? 3 : 0;

    return (
        <div className="timeline-status">
            {steps.map((step, index) => (
                <React.Fragment key={step}>
                    <div className={`timeline-step ${index < currentStepIndex ? 'completed' : ''} ${index === currentStepIndex -1 ? 'active' : ''}`}>
                        <div className="timeline-dot">
                            {index < currentStepIndex -1 && <CheckCircle size={14} />}
                        </div>
                        <div className="timeline-label">{step}</div>
                    </div>
                    {index < steps.length - 1 && <div className="timeline-connector"></div>}
                </React.Fragment>
            ))}
        </div>
    );
};


// --- Main Component ---
const AbsensiSC = () => {
    const [bookingData, setBookingData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const checkinFileRef = useRef(null);
    const checkoutFileRef = useRef(null);

    const handleSearch = async (ticketCode) => {
        if (!ticketCode.trim()) {
            setError('Nomor Tiket tidak boleh kosong.');
            return;
        }
        setLoading(true);
        setError('');
        setSuccessMessage('');
        setBookingData(null);

        const bookingsRef = collection(db, "peminjamanSC");
        const q = query(bookingsRef, where("ticketCode", "==", ticketCode.trim().toUpperCase()));

        try {
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                setError('Peminjaman dengan Nomor Tiket ini tidak ditemukan.');
            } else {
                const docSnap = querySnapshot.docs[0];
                setBookingData({ id: docSnap.id, ...docSnap.data() });
            }
        } catch (err) {
            setError('Terjadi kesalahan saat mencari tiket.');
        } finally {
            setLoading(false);
        }
    };

    const handlePhotoUpload = async (event, action) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsUploading(true);
        setError('');
        setSuccessMessage('');
        try {
            const base64String = await resizeAndConvertToBase64(file, 800, 0.7);
            const bookingRef = doc(db, "peminjamanSC", bookingData.id);
            let updateData = {};
            
            if (action === 'checkin') {
                updateData = { waktuMulaiAktual: Timestamp.now(), fotoAwalBase64: base64String };
            } else if (action === 'checkout') {
                updateData = { waktuSelesaiAktual: Timestamp.now(), fotoAkhirBase64: base64String };
            }

            await updateDoc(bookingRef, updateData);
            setBookingData(prev => ({ ...prev, ...updateData }));
            setSuccessMessage(`Proses ${action === 'checkin' ? 'Check-in' : 'Check-out'} berhasil!`);

        } catch (error) {
            setError("Gagal memproses gambar. Silakan coba lagi.");
        } finally {
            setIsUploading(false);
        }
    };
    
    const getStatus = () => {
        if (!bookingData) return 'search';
        if (bookingData.waktuMulaiAktual && bookingData.waktuSelesaiAktual) return 'completed';
        if (bookingData.waktuMulaiAktual) return 'checked-in';
        return 'found';
    };

    const currentStatus = getStatus();

    return (
        <div className="root-wrapper">
            <header className="page-header">
                <div className="header-content-wrapper">
                    <QrCode size={40} />
                    <div>
                        <h1 className="page-title">Absensi Peminjaman</h1>
                        <p className="page-subtitle">Gunakan halaman ini untuk check-in dan check-out.</p>
                    </div>
                </div>
            </header>
            <main className="absensi-main-content">
                <div className="absensi-card">
                    <AnimatePresence mode="wait">
                        {!bookingData ? (
                            <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                <SearchForm onSearch={handleSearch} loading={loading} />
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="details"
                                initial={{ opacity: 0, y: 20 }} 
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                            >
                                <StatusTimeline status={currentStatus} />
                                <h2 className="absensi-title detail-title">Detail Peminjaman #{bookingData.ticketCode}</h2>
                                <BookingDetails data={bookingData} />

                                <div className="action-section">
                                    {currentStatus === 'found' && (
                                        <ActionCard
                                            title="Langkah 1: Mulai Penggunaan"
                                            icon={<LogIn size={20} />}
                                            description="Ambil foto kondisi awal ruangan untuk memulai sesi Anda."
                                            buttonText="Check-in dengan Foto"
                                            onClick={() => checkinFileRef.current.click()}
                                            disabled={isUploading}
                                            type="checkin"
                                        />
                                    )}
                                    {currentStatus === 'checked-in' && (
                                        <ActionCard
                                            title="Langkah 2: Selesaikan Penggunaan"
                                            icon={<LogOut size={20} />}
                                            description="Ambil foto kondisi akhir ruangan untuk menyelesaikan sesi Anda."
                                            buttonText="Check-out dengan Foto"
                                            onClick={() => checkoutFileRef.current.click()}
                                            disabled={isUploading}
                                            type="checkout"
                                        />
                                    )}
                                    {currentStatus === 'completed' && <CompletedCard />}
                                    
                                    <input type="file" accept="image/*" capture="environment" ref={checkinFileRef} onChange={(e) => handlePhotoUpload(e, 'checkin')} style={{ display: 'none' }} />
                                    <input type="file" accept="image/*" capture="environment" ref={checkoutFileRef} onChange={(e) => handlePhotoUpload(e, 'checkout')} style={{ display: 'none' }} />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    
                    {error && <p className="message-box error"><ShieldAlert size={16} /> {error}</p>}
                    {successMessage && <p className="message-box success"><FileCheck2 size={16}/> {successMessage}</p>}
                </div>
            </main>
        </div>
    );
};

export default AbsensiSC;