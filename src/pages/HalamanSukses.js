// src/pages/HalamanSukses.js

import React, { useState } from 'react';
import { useLocation, Navigate, Link, useNavigate } from 'react-router-dom';
import { CheckCircle, Copy, Check, Settings, Calendar, User, MapPin, Clock } from 'lucide-react';
import './HalamanSukses.css';

const HalamanSukses = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { state } = location;
    const [isCopied, setIsCopied] = useState(false);

    if (!state || !state.ticketId) {
        return <Navigate to="/pinjam-sc" replace />;
    }

    const { ticketId, bookingDetails } = state;

    const handleCopyToClipboard = () => {
        navigator.clipboard.writeText(ticketId).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2500);
        });
    };

    return (
        <div className="sukses-page-container">
            <div className="sukses-card">
                <div className="sukses-icon-wrapper">
                    <CheckCircle className="sukses-icon" size={48} />
                </div>

                <h1 className="sukses-title">Pengajuan Berhasil!</h1>
                <p className="sukses-subtitle">
                    Jadwal Anda telah dicatat. Harap simpan Nomor Tiket Anda untuk mengelola peminjaman di kemudian hari.
                </p>

                <div className="ticket-display-card">
                    <div className="ticket-info">
                        <span className="ticket-label">Nomor Tiket</span>
                        <p className="ticket-id">{ticketId}</p>
                    </div>
                    <button onClick={handleCopyToClipboard} className={`copy-button ${isCopied ? 'copied' : ''}`}>
                        {isCopied ? <Check size={18} /> : <Copy size={18} />}
                        <span>{isCopied ? 'Tersalin' : 'Salin'}</span>
                    </button>
                </div>

                <div className="divider"></div>

                <div className="booking-summary">
                    <h3 className="summary-title">Ringkasan Peminjaman</h3>
                    <ul className="summary-list">
                        <li><User size={25} /><span><strong>Penanggung Jawab:</strong> {bookingDetails.nama}</span></li>
                        <li><MapPin size={25} /><span><strong>Lokasi:</strong> {bookingDetails.lokasi}</span></li>
                        <li><Calendar size={25} /><span><strong>Tanggal:</strong> {bookingDetails.tanggal}</span></li>
                        <li><Clock size={25} /><span><strong>Waktu:</strong> {bookingDetails.waktu}</span></li>
                    </ul>
                </div>
                <div className="divider"></div>

                <div className="sukses-actions">
                    <h4 className="actions-title">Langkah Selanjutnya?</h4>
                    <div className="button-group">
                        <button onClick={() => navigate('/pinjam-sc')} className="button button-secondary">
                            Lihat di Kalender
                        </button>
                        <Link to="/pinjam-sc/kelola" className="button button-primary">
                            Kelola Peminjaman
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HalamanSukses;