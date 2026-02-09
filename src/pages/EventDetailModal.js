// src/pages/EventDetailModal.js (Kode Baru)

import React from 'react';
import { X, MapPin, Calendar, Clock, User, Activity, Phone } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import './EventDetailModal.css'; // Kita akan tambahkan file CSS ini

const EventDetailModal = ({ event, onClose }) => {
    if (!event) return null;

    // Helper untuk format
    const formatWaktu = (date) => format(date, 'HH:mm', { locale: id });
    const formatTanggal = (date) => format(date, 'cccc, dd MMMM yyyy', { locale: id });

    // Daftar detail untuk ditampilkan
    // 'event.nama' dll. diambil dari ...docData yang kita tambahkan di Langkah 1
    const details = [
        { icon: <MapPin size={18} />, label: 'Lokasi', value: event.lokasi }, // Menggunakan event.lokasi
        { icon: <Calendar size={18} />, label: 'Tanggal', value: formatTanggal(event.start) },
        { icon: <Clock size={18} />, label: 'Waktu', value: `${formatWaktu(event.start)} - ${formatWaktu(event.end)} WIB` },
        { icon: <User size={18} />, label: 'Penanggung Jawab', value: event.nama }, // Data baru
        { icon: <Activity size={18} />, label: 'Nama Kegiatan', value: event.deskripsi }, // Data baru
        { icon: <Phone size={18} />, label: 'No. Handphone', value: event.kontakpeminjam }, // Data baru
    ];

    return (
        <div className="modal-overlay" onClick={onClose}>
            {/* Hentikan propagasi klik agar modal tidak tertutup saat diklik di dalam */}
            <div className="modal-content event-detail-modal" onClick={e => e.stopPropagation()}>
                
                <div className="modal-header">
                    {/* Judul modal sekarang adalah Nama Organisasi */}
                    <h2>{event.organisasi}</h2>
                    <button onClick={onClose} className="close-btn"><X size={24}/></button>
                </div>
                
                <div className="modal-body">
                    {/* event.title (cth: "Ruang Rapat - Hima Einsten") 
                      dijadikan subjudul
                    */}
                    <h3 className="event-modal-subtitle">{event.title}</h3>
                    
                    <div className="event-detail-list">
                        {details.map((item, index) => (
                            // Hanya tampilkan jika 'value' ada
                            item.value && (
                                <div key={index} className="event-detail-item">
                                    <div className="detail-icon">{item.icon}</div>
                                    <div className="detail-info">
                                        <span className="detail-label">{item.label}</span>
                                        <span className="detail-value">{item.value}</span>
                                    </div>
                                </div>
                            )
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventDetailModal;