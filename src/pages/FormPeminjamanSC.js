// src/pages/FormPeminjamanSC.js

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'; 
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase/firebaseConfig';
import { collection, onSnapshot, addDoc, query, where, getDocs, doc } from 'firebase/firestore';

// Impor untuk Kalender dan penanganan tanggal
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import { id } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// Impor Ikon dan komponen lain
import { CalendarDays, Loader, CheckCircle, XCircle, AlertTriangle, Phone, X, Info } from 'lucide-react';
import EventDetailModal from './EventDetailModal';
import './FormPeminjamanSC.css';

// Konfigurasi awal untuk 'react-big-calendar'
const locales = { 'id': id };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const generateTicketCode = () => {
    const prefix = 'SC-';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return prefix + result;
};

// Peta relasi ruangan untuk logika anti-tabrakan cerdas
const ruanganTerkait = {
    'Lapangan Badminton Barat (Lantai 2)': ['Lapangan Badminton Barat & Timur (Lantai 2)'],
    'Lapangan Badminton Timur (Lantai 2)': ['Lapangan Badminton Barat & Timur (Lantai 2)'],
    'Lapangan Badminton Barat & Timur (Lantai 2)': ['Lapangan Badminton Barat (Lantai 2)', 'Lapangan Badminton Timur (Lantai 2)'],
};

// Peta warna untuk setiap lokasi di kalender
const lokasiColors = {
    "Ruang Rapat SC (Lantai 3)": '#f59e0b',
    "Lapangan Badminton Timur (Lantai 2)": '#3b82f6',
    "Lapangan Badminton Barat (Lantai 2)": '#10b981',
    "Lapangan Badminton Barat & Timur (Lantai 2)": '#8b5cf6',
};

const WhatsAppButton = ({ nomor, template }) => {
    if (!nomor) return null;
    const whatsappLink = `https://wa.me/${nomor}?text=${encodeURIComponent(template)}`;
    return (
        <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="whatsapp-fab" title="Hubungi Narahubung">
            <Phone size={24} />
        </a>
    );
};

const InfoModal = ({ isOpen, onClose, configData }) => {
    if (!isOpen) return null;

    // Fungsi untuk mengubah \n menjadi elemen <br>
    const renderWithLineBreaks = (text = '') => {
        return text.split('\n').map((line, index) => (
            <React.Fragment key={index}>
                {line}
                <br />
            </React.Fragment>
        ));
    };

    return (
        <div className="info-modal-overlay" onClick={onClose}>
            <div className="info-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="info-modal-header">
                    {/* [PENINGKATAN] Ikon dibungkus untuk styling */}
                    <div className="info-icon-wrapper">
                        <Info size={24} />
                    </div>
                    <h2>{configData.infoJudul || 'Informasi Peminjaman'}</h2>
                    <button onClick={onClose} className="close-btn"><X size={24}/></button>
                </div>
                <div className="info-modal-body">
                    {renderWithLineBreaks(configData.infoKonten)}
                </div>
            </div>
        </div>
    );
};

const FormPeminjamanSC = () => {
    // State untuk data dari Firestore
    const [events, setEvents] = useState([]);
    const [formFields, setFormFields] = useState([]);
    const [lokasiOptions, setLokasiOptions] = useState([]);
    
    // State untuk interaksi pengguna
    const [formData, setFormData] = useState({});
    const [selectedLokasi, setSelectedLokasi] = useState('Semua');
    const [selectedEvent, setSelectedEvent] = useState(null);

    // State untuk kontrol kalender
    const [calendarDate, setCalendarDate] = useState(new Date());
    const [view, setView] = useState(Views.MONTH);
    
    // State untuk status loading
    const [loading, setLoading] = useState(false);
    const [formLoading, setFormLoading] = useState(true);

    // State untuk status ketersediaan jadwal
    const [availabilityStatus, setAvailabilityStatus] = useState('idle');

    const navigate = useNavigate();

    const [configData, setConfigData] = useState({});
    const [showInfoModal, setShowInfoModal] = useState(true);

    const [narahubung, setNarahubung] = useState({ nomor: '', template: '' });

    const [notification, setNotification] = useState({ show: false, message: '', type: 'success', closing: false });
    const notificationTimerRef = useRef(null);

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

    const showNotification = (message, type = 'success') => {
        if (notificationTimerRef.current) {
            clearTimeout(notificationTimerRef.current);
        }
        setNotification({ show: true, message, type, closing: false }); 
        notificationTimerRef.current = setTimeout(handleCloseNotification, 3000);
    };

    // Efek utama untuk mengambil semua data dari Firestore secara real-time
    useEffect(() => {
        const unsubscribers = [];

        const formConfigRef = doc(db, "pengaturan", "formPeminjamanConfig");
        unsubscribers.push(onSnapshot(formConfigRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setConfigData(data); // Simpan SEMUA data config

                const fields = data.fields || [];
                fields.sort((a, b) => a.order - b.order);
                setFormFields(fields);
                
                setNarahubung({
                    nomor: data.narahubungNomor || '',
                    template: data.narahubungTemplate || 'Halo, saya ingin bertanya...'
                });
                
                // Inisialisasi formData dengan field dinamis DAN S&K
                const initialFormData = {};
                fields.forEach(field => { initialFormData[field.id] = ''; });
                initialFormData['persetujuanProsedur'] = false;
                initialFormData['persetujuanTanggungJawab'] = false;
                
                setFormData(initialFormData);
                setFormLoading(false);
            } else {
                setFormLoading(false);
            }
        }));

        const locationRef = doc(db, "pengaturan", "lokasiPeminjaman");
        unsubscribers.push(onSnapshot(locationRef, (doc) => {
            if (doc.exists()) setLokasiOptions(doc.data().options || []);
        }));
        
        const bookingsQuery = query(collection(db, "peminjamanSC"), where("status", "==", "aktif")); // <--- SOLUSI
        unsubscribers.push(onSnapshot(bookingsQuery, (snapshot) => {
            const jadwalDariDB = snapshot.docs.map(doc => {
                const docData = doc.data();
                return {
                    // --- Ambil SEMUA data dari dokumen ---
                    ...docData, 
                    
                    // --- Timpa/Buat field yang dibutuhkan Kalender ---
                    id: doc.id,
                    title: `${docData.lokasi} - ${docData.organisasi}`,
                    start: new Date(`${docData.tanggal}T${docData.waktuMulai}`),
                    end: new Date(`${docData.tanggal}T${docData.waktuSelesai}`),
                    resource: docData.lokasi, // 'resource' dipakai kalender, 'lokasi' akan dipakai modal
                };
            });
            setEvents(jadwalDariDB);
        }));

        return () => unsubscribers.forEach(unsub => unsub());
    }, []);
    
    // Efek untuk pengecekan ketersediaan jadwal secara otomatis
    useEffect(() => {
        const { lokasi, tanggal, waktuMulai, waktuSelesai } = formData;

        if (lokasi && tanggal && waktuMulai && waktuSelesai && waktuSelesai > waktuMulai) {
            setAvailabilityStatus('checking');
            const handler = setTimeout(() => {
                const check = async () => {
                    const available = await isSlotAvailable(lokasi, tanggal, waktuMulai, waktuSelesai);
                    setAvailabilityStatus(available ? 'available' : 'unavailable');
                };
                check();
            }, 500);

            return () => clearTimeout(handler);
        } else {
            setAvailabilityStatus('idle');
        }
    }, [formData.lokasi, formData.tanggal, formData.waktuMulai, formData.waktuSelesai]);

    const filteredEvents = useMemo(() => 
        events.filter(event => selectedLokasi === 'Semua' || event.resource === selectedLokasi),
        [events, selectedLokasi]
    );

    const handleInputChange = useCallback((e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    }, []);

    const renderFormField = useCallback((field) => {
        const commonProps = {
            id: field.id, name: field.id,
            value: formData[field.id] || '',
            onChange: handleInputChange, // Sekarang handleInputChange stabil
            required: field.required, placeholder: field.placeholder || '',
        };
        switch (field.type) {
            case 'text': return <input type="text" {...commonProps} />;
            case 'textarea': return <textarea rows="3" {...commonProps}></textarea>;
            case 'date': return <input type="date" {...commonProps} />;
            case 'time': return <input type="time" {...commonProps} />;
            case 'select': return (
                <select {...commonProps}>
                    <option value="" disabled>-- Pilih Lokasi --</option>
                    {lokasiOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
            );
            default: return null;
        }
    }, [formData, lokasiOptions, handleInputChange]);

    const isSlotAvailable = async (lokasi, tanggal, waktuMulai, waktuSelesai) => {
        const locationsToCheck = [lokasi, ...(ruanganTerkait[lokasi] || [])];
        const q = query(
            collection(db, "peminjamanSC"), 
            where("lokasi", "in", locationsToCheck), 
            where("tanggal", "==", tanggal),
            where("status", "==", "aktif")
        );
        try {
            const snapshot = await getDocs(q);
            for (const doc of snapshot.docs) {
                const booking = doc.data();
                if (waktuMulai < booking.waktuSelesai && waktuSelesai > booking.waktuMulai) {
                    return false;
                }
            }
            return true;
        } catch (error) {
            console.error("Kesalahan saat mengecek ketersediaan (cek indeks Firestore):", error);
            return false;
        }
    };
    
    const handleSelectSlot = (slotInfo) => setFormData(prev => ({ ...prev, tanggal: format(slotInfo.start, 'yyyy-MM-dd') }));
    const handleSelectEvent = (event) => setSelectedEvent(event);
    const eventStyleGetter = (event) => ({ style: { backgroundColor: lokasiColors[event.resource] || '#64748b', borderRadius: '5px', opacity: 0.9, color: 'white', border: '0px' } });
    const handleNavigate = (newDate) => setCalendarDate(newDate);
    const handleView = (newView) => setView(newView);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const requiredFields = formFields.filter(f => f.required).map(f => f.id);
        const isFormValid = requiredFields.every(fieldId => formData[fieldId]);

        if (!isFormValid) {
            // GANTI INI:
            // alert('Harap isi semua isian formulir yang wajib diisi.');
            // MENJADI INI:
            showNotification('Harap isi semua isian formulir yang wajib diisi.', 'error');
            return;
        }

        if (!formData.persetujuanProsedur) {
            // GANTI INI:
            // alert('Anda harus menyetujui prosedur peminjaman untuk melanjutkan.');
            // MENJADI INI:
            showNotification('Anda harus menyetujui prosedur peminjaman untuk melanjutkan.', 'error');
            return;
        }
        if (!formData.persetujuanTanggungJawab) {
            // GANTI INI:
            // alert('Anda harus menyatakan bersedia bertanggung jawab.');
            // MENJADI INI:
            showNotification('Anda harus menyatakan bersedia bertanggung jawab.', 'error');
            return;
        }
        
        setLoading(true);
        const available = await isSlotAvailable(formData.lokasi, formData.tanggal, formData.waktuMulai, formData.waktuSelesai);
        if (!available) {
            // GANTI INI:
            // alert(`Maaf, jadwal di ${formData.lokasi} pada rentang waktu tersebut baru saja dipesan atau tumpang tindih.`);
            // MENJADI INI:
            showNotification(`Maaf, jadwal di ${formData.lokasi} pada rentang waktu tersebut tumpang tindih atau baru saja dipesan.`, 'error');
            setLoading(false);
            setAvailabilityStatus('unavailable');
            return;
        }

        try {
            // 1. Hasilkan kode tiket pendek
            const ticketCode = generateTicketCode();

            // 2. Simpan kode tiket bersama data lainnya
            const docRef = await addDoc(collection(db, "peminjamanSC"), {
                ...formData,
                ticketCode: ticketCode, // <-- Field baru
                status: 'aktif',
                createdAt: new Date(),
            });
            
            // 3. Kirim kode tiket pendek ke halaman sukses
            navigate('/pinjam-sc/sukses', {
                state: {
                    ticketId: ticketCode, // <-- Kirim kode pendek, bukan docRef.id
                    bookingDetails: {
                        ...formData,
                        tanggal: new Date(formData.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
                        waktu: `${formData.waktuMulai} - ${formData.waktuSelesai}`
                    }
                }
            });
        } catch (error) {
            console.error(error);
            // GANTI INI:
            // alert('Terjadi kesalahan saat menyimpan data.');
            // MENJADI INI:
            showNotification('Terjadi kesalahan saat menyimpan data.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const AvailabilityIndicator = () => {
        switch (availabilityStatus) {
            case 'checking':
                return <div className="availability-indicator checking"><Loader size={16} className="spinner"/> Mengecek ketersediaan...</div>;
            case 'available':
                return <div className="availability-indicator available"><CheckCircle size={16}/> Jadwal tersedia!</div>;
            case 'unavailable':
                return <div className="availability-indicator unavailable"><XCircle size={16}/> Jadwal sudah terisi.</div>;
            default:
                return <div className="availability-indicator idle"><AlertTriangle size={16}/> Lengkapi waktu untuk mengecek.</div>;
        }
    };

    const isSKValid = useMemo(() => {
        return formData.persetujuanProsedur && formData.persetujuanTanggungJawab;
    }, [formData.persetujuanProsedur, formData.persetujuanTanggungJawab]);

    const NotificationIcon = ({ type }) => {
        const style = { marginRight: '10px', flexShrink: 0 };
        if (type === 'error') {
            return <AlertTriangle size={22} style={style} />;
        }
        return <CheckCircle size={22} style={style} />;
    };

    return (
        <div className="root-wrapper">
            {notification.show && (
                <div className={`notification-popup ${notification.type} ${notification.closing ? 'closing' : ''}`}>
                    <NotificationIcon type={notification.type} />
                    <span>{notification.message}</span>
                    <button onClick={handleCloseNotification} className="notification-close-btn">
                        <X size={18}/>
                    </button>
                </div>
            )}
            <InfoModal 
                isOpen={showInfoModal} 
                onClose={() => setShowInfoModal(false)} 
                configData={configData}
            />
            <header className="page-header">
                <div className="header-content-wrapper">
                    <CalendarDays size={40} />
                    <div>
                        <h1 className="page-title">Peminjaman Student Center</h1>
                        <p className="page-subtitle">Lihat jadwal ketersediaan dan ajukan peminjaman Anda di sini.</p>
                    </div>
                </div>
            </header>
            <main className="peminjaman-main-content">
                <div className="peminjaman-grid">
                    <div className="calendar-container card">
                        <div className="calendar-filter">
                            <label htmlFor="lokasiFilter">Tampilkan Jadwal:</label>
                            <select id="lokasiFilter" value={selectedLokasi} onChange={(e) => setSelectedLokasi(e.target.value)}>
                                <option value="Semua">Semua Lokasi</option>
                                {lokasiOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                        <div className="rbc-calendar-wrapper">
                            <Calendar
                                localizer={localizer} events={filteredEvents} selectable
                                onSelectSlot={handleSelectSlot} onSelectEvent={handleSelectEvent}
                                eventPropGetter={eventStyleGetter} startAccessor="start" endAccessor="end"
                                culture='id' date={calendarDate} onNavigate={handleNavigate}
                                view={view} onView={handleView}
                                messages={{
                                    next: "Berikutnya", previous: "Sebelumnya", today: "Hari Ini", month: "Bulan",
                                    week: "Minggu", day: "Hari", agenda: "Agenda",
                                    noEventsInRange: "Tidak ada jadwal di rentang waktu ini.",
                                }}
                            />
                        </div>
                    </div>
                    <div className="form-container card">
                        <h2 className="form-title">Formulir Pengajuan</h2>
                        {formLoading ? (
                            <div className="form-loading">
                                <Loader className="spinner" size={32} />
                                <p>Memuat formulir...</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit}>
                                {formFields.map(field => (
                                    <div key={field.id} className="form-group">
                                        <label htmlFor={field.id}>{field.label}{field.required && ' *'}</label>
                                        {renderFormField(field)}
                                    </div>
                                ))}

                                <div className="divider"></div>
                                <div className="sk-section">
                                    <h3 className="sk-title">{configData.prosedurJudul || 'Prosedur Peminjaman'}</h3>
                                    <p className="sk-content" style={{ whiteSpace: 'pre-line' }}>
                                        {configData.prosedurKonten || 'Prosedur belum diatur.'}
                                    </p>
                                    <div className="checkbox-group">
                                        <input 
                                            type="checkbox" 
                                            id="persetujuanProsedur" 
                                            name="persetujuanProsedur" 
                                            checked={formData.persetujuanProsedur || false} 
                                            onChange={handleInputChange} 
                                        />
                                        <label htmlFor="persetujuanProsedur">{configData.pertanyaanSetuju || 'Apakah Bersedia?'}</label>
                                    </div>
                                    <div className="checkbox-group">
                                        <input 
                                            type="checkbox" 
                                            id="persetujuanTanggungJawab" 
                                            name="persetujuanTanggungJawab" 
                                            checked={formData.persetujuanTanggungJawab || false} 
                                            onChange={handleInputChange} 
                                        />
                                        <label htmlFor="persetujuanTanggungJawab">{configData.pertanyaanTanggungJawab || 'Bersedia Bertanggung Jawab?'}</label>
                                    </div>
                                </div>

                                <div className="submit-section">
                                    <AvailabilityIndicator />
                                    <button 
                                        type="submit" 
                                        className="button button-primary full-width" 
                                        disabled={loading || availabilityStatus !== 'available'}
                                    >
                                        {loading ? 'Memproses...' : 'Ajukan Peminjaman'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </main>
            <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
            <WhatsAppButton nomor={narahubung.nomor} template={narahubung.template} />
        </div>
    );
};

export default FormPeminjamanSC;