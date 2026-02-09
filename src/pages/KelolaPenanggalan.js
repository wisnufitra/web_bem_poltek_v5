// src/pages/KelolaPenanggalan.js
import React, { useEffect, useState, useMemo } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';

const API_URL = "https://script.google.com/macros/s/AKfycbw5-f5rawSFC9VMRxb7W18DtTKQK5WB6nMnUcI4lSo62dtTUd-BnEmDcrVDKH7Ju03Xmw/exec";

const KelolaPenanggalan = () => {
    // State untuk mengelola data dan tampilan
    const [allEvents, setAllEvents] = useState([]);
    const [filteredEvents, setFilteredEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [editingEvent, setEditingEvent] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null);
    const [selectedEvent, setSelectedEvent] = useState(null); // State untuk pop-up detail

    const getEventsForDateRange = (data, start, end) => {
        return data.filter(event => {
            const eventDate = new Date(event.tanggalMulai);
            return eventDate >= start && eventDate <= end;
        });
    };

    const fetchAndInitializeEvents = async () => {
        setLoading(true);
        try {
            const response = await fetch(API_URL);
            const data = await response.json();
            setAllEvents(data);

            const today = new Date();
            const firstDayOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
            const lastDayOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() + 6);
            
            setStartDate(firstDayOfWeek.toISOString().split('T')[0]);
            setEndDate(lastDayOfWeek.toISOString().split('T')[0]);

            const weeklyEvents = getEventsForDateRange(data, firstDayOfWeek, lastDayOfWeek);
            setFilteredEvents(weeklyEvents);
        } catch (error) {
            console.error("Gagal memuat data kalender:", error);
            alert("Gagal memuat data kalender. Cek koneksi atau URL API.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAndInitializeEvents();
    }, []);

    const displayedEvents = useMemo(() => {
        if (!searchTerm) {
            return filteredEvents;
        }
        return allEvents.filter(event => 
            event.namaKegiatan.toLowerCase().includes(searchTerm.toLowerCase()) ||
            event.pelaksana.toLowerCase().includes(searchTerm.toLowerCase()) ||
            event.tempat.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [allEvents, filteredEvents, searchTerm]);

    const handleEdit = (event) => {
        setEditingEvent({ ...event });
        setSelectedEvent(null); // Tutup pop-up detail saat membuka pop-up edit
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setEditingEvent(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({ 
                    action: 'updateEvent', 
                    id: editingEvent.id,
                    newDetails: {
                        namaKegiatan: editingEvent.namaKegiatan,
                        tanggalMulai: editingEvent.tanggalMulai,
                        tanggalSelesai: editingEvent.tanggalSelesai,
                        tempat: editingEvent.tempat,
                        pelaksana: editingEvent.pelaksana,
                        keterangan: editingEvent.keterangan,
                        sasaran: editingEvent.sasaran
                    }
                })
            });
            const result = await response.json();
            if (result.status === 'success') {
                alert('Acara berhasil diperbarui!');
                setEditingEvent(null);
                setConfirmAction(null);
                fetchAndInitializeEvents();
            } else {
                alert('Gagal memperbarui acara: ' + result.message);
            }
        } catch (error) {
            console.error("Gagal menyimpan perubahan:", error);
            alert("Terjadi kesalahan saat menyimpan. Coba lagi.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, namaKegiatan) => {
        setLoading(true);
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'deleteEvent', id: id })
            });
            const result = await response.json();
            if (result.status === 'success') {
                alert('Acara berhasil dihapus!');
                setConfirmAction(null);
                fetchAndInitializeEvents();
            } else {
                alert('Gagal menghapus acara: ' + result.message);
            }
        } catch (error) {
            console.error("Gagal menghapus acara:", error);
            alert("Terjadi kesalahan saat menghapus. Coba lagi.");
        } finally {
            setLoading(false);
        }
    };

    const handleDateFilter = () => {
        if (!startDate || !endDate) {
            alert("Pilih rentang tanggal yang valid.");
            return;
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        const results = getEventsForDateRange(allEvents, start, end);
        setFilteredEvents(results);
        setSearchTerm('');
    };

    const handleClearFilter = () => {
        setSearchTerm('');
        const today = new Date();
        const firstDayOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
        const lastDayOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() + 6);
        setStartDate(firstDayOfWeek.toISOString().split('T')[0]);
        setEndDate(lastDayOfWeek.toISOString().split('T')[0]);
        setFilteredEvents(getEventsForDateRange(allEvents, firstDayOfWeek, lastDayOfWeek));
    };

    const showDetails = (event) => {
        setSelectedEvent(event);
        setEditingEvent(null); // Tutup pop-up edit jika terbuka
    };

    const closeDetails = () => {
        setSelectedEvent(null);
    };

    const showDeleteConfirmation = (id, namaKegiatan) => {
        setConfirmAction({ type: 'delete', id, namaKegiatan });
    };

    const showSaveConfirmation = () => {
        setConfirmAction({ type: 'save' });
    };

    const closeConfirmPopup = () => {
        setConfirmAction(null);
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div style={styles.container}>
            <h1 style={styles.header}>Kelola Penanggalan KM Poltek Nuklir 📅</h1>
            <div style={styles.controls}>
                <div style={styles.dateFilter}>
                    <label htmlFor="startDate" style={styles.label}>Dari:</label>
                    <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} style={styles.dateInput} />
                    <label htmlFor="endDate" style={styles.label}>Sampai:</label>
                    <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} style={styles.dateInput} />
                    <button onClick={handleDateFilter} style={styles.filterButton}>Filter</button>
                    <button onClick={handleClearFilter} style={styles.clearFilterButton}>Reset</button>
                </div>
                <input
                    type="text"
                    placeholder="Cari kegiatan, pelaksana, atau tempat..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.searchInput}
                />
            </div>
            
            {displayedEvents.length > 0 ? (
                <div style={styles.tableContainer}>
                    <table style={styles.table}>
                        <thead style={styles.tableHeader}>
                            <tr>
                                <th style={{ ...styles.tableTh, textAlign: 'center' }}>Nama Kegiatan</th>
                                <th style={{ ...styles.tableTh, ...styles.dateColumn, textAlign: 'center' }}>Tanggal</th>
                                <th style={{ ...styles.tableTh, ...styles.timeColumn, textAlign: 'center' }}>Waktu</th>
                                <th style={{ ...styles.tableTh, textAlign: 'center' }}>Tempat</th>
                                <th style={{ ...styles.tableTh, textAlign: 'center' }}>Pelaksana</th>
                                <th style={{ ...styles.tableTh, textAlign: 'center' }}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayedEvents.map(event => (
                                <tr key={event.id} style={styles.tableRow} onClick={() => showDetails(event)}>
                                    <td style={styles.tableTd}>{event.namaKegiatan}</td>
                                    <td style={{ ...styles.tableTd, ...styles.dateColumn, textAlign: 'center' }}>
                                        {new Date(event.tanggalMulai).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}
                                    </td>
                                    <td style={{ ...styles.tableTd, ...styles.timeColumn, textAlign: 'center' }}>{event.waktu}</td>
                                    <td style={styles.tableTd}>{event.tempat}</td>
                                    <td style={styles.tableTd}>{event.pelaksana}</td>
                                    <td style={{ ...styles.tableTdAction, textAlign: 'center' }}>
                                        <button onClick={(e) => { e.stopPropagation(); handleEdit(event); }} style={styles.iconButton}>
                                            <span role="img" aria-label="edit">✏️</span>
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); showDeleteConfirmation(event.id, event.namaKegiatan); }} style={styles.iconButton}>
                                            <span role="img" aria-label="delete">🗑️</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div style={styles.noEvents}>
                    Tidak ada acara yang ditemukan.
                </div>
            )}
            
            {/* Pop-up Detail Acara (Hanya Menampilkan) */}
            {selectedEvent && !editingEvent && (
                <div style={styles.popupOverlay}>
                    <div style={styles.popupContent}>
                        <button onClick={closeDetails} style={styles.closeButton}>&times;</button>
                        <h2 style={styles.popupHeader}>Detail Acara</h2>
                        <hr style={styles.popupHr} />
                        <div style={styles.popupDetails}>
                            <p><strong>Nama Kegiatan:</strong> {selectedEvent.namaKegiatan}</p>
                            <p><strong>Tanggal:</strong> {new Date(selectedEvent.tanggalMulai).toLocaleDateString('id-ID', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'})}</p>
                            <p><strong>Waktu:</strong> {selectedEvent.waktu}</p>
                            <p><strong>Tempat:</strong> {selectedEvent.tempat}</p>
                            <p><strong>Pelaksana:</strong> {selectedEvent.pelaksana}</p>
                            <p><strong>Keterangan:</strong> {selectedEvent.keterangan}</p>
                            <p><strong>Sasaran:</strong> {selectedEvent.sasaran}</p>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Pop-up Edit Acara (Formulir Edit) */}
            {editingEvent && (
                <div style={styles.popupOverlay}>
                    <div style={styles.popupContent}>
                        <button onClick={() => setEditingEvent(null)} style={styles.closeButton}>&times;</button>
                        <h2 style={styles.popupHeader}>Edit Acara</h2>
                        <hr style={styles.popupHr} />
                        <div style={styles.formGroup}>
                            <label style={styles.formLabel}>Nama Kegiatan</label>
                            <input type="text" name="namaKegiatan" value={editingEvent.namaKegiatan} onChange={handleChange} style={styles.formInput} />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.formLabel}>Tanggal Mulai</label>
                            <input type="datetime-local" name="tanggalMulai" value={new Date(editingEvent.tanggalMulai).toISOString().slice(0, 16)} onChange={handleChange} style={styles.formInput} />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.formLabel}>Tanggal Selesai</label>
                            <input type="datetime-local" name="tanggalSelesai" value={new Date(editingEvent.tanggalSelesai).toISOString().slice(0, 16)} onChange={handleChange} style={styles.formInput} />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.formLabel}>Tempat</label>
                            <input type="text" name="tempat" value={editingEvent.tempat} onChange={handleChange} style={styles.formInput} />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.formLabel}>Pelaksana</label>
                            <input type="text" name="pelaksana" value={editingEvent.pelaksana} onChange={handleChange} style={styles.formInput} />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.formLabel}>Keterangan</label>
                            <textarea name="keterangan" value={editingEvent.keterangan} onChange={handleChange} style={styles.formTextarea}></textarea>
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.formLabel}>Sasaran</label>
                            <input type="text" name="sasaran" value={editingEvent.sasaran} onChange={handleChange} style={styles.formInput} />
                        </div>
                        <div style={styles.formActions}>
                            <button onClick={showSaveConfirmation} style={styles.saveButton}>Simpan Perubahan</button>
                            <button onClick={() => setEditingEvent(null)} style={styles.cancelButton}>Batal</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pop-up Konfirmasi Hapus/Simpan */}
            {confirmAction && (
                <div style={styles.popupOverlay}>
                    <div style={styles.confirmPopupContent}>
                        <h3 style={styles.confirmHeader}>
                            {confirmAction.type === 'delete' ? 'Konfirmasi Hapus' : 'Konfirmasi Simpan'}
                        </h3>
                        <p style={styles.confirmMessage}>
                            {confirmAction.type === 'delete' ? 
                                `Apakah Anda yakin ingin menghapus acara "${confirmAction.namaKegiatan}"? Aksi ini tidak dapat dibatalkan.` :
                                'Apakah Anda yakin ingin menyimpan perubahan pada acara ini?'
                            }
                        </p>
                        <div style={styles.confirmActions}>
                            <button 
                                onClick={closeConfirmPopup} 
                                style={styles.confirmButtonCancel}
                            >
                                Batal
                            </button>
                            <button 
                                onClick={() => {
                                    if (confirmAction.type === 'delete') {
                                        handleDelete(confirmAction.id, confirmAction.namaKegiatan);
                                    } else if (confirmAction.type === 'save') {
                                        handleSave();
                                    }
                                }} 
                                style={styles.confirmButtonConfirm}
                            >
                                {confirmAction.type === 'delete' ? 'Hapus' : 'Simpan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Objek styles
const styles = {
    container: {
        fontFamily: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        padding: '30px',
        maxWidth: '1200px',
        margin: '30px auto',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.1)',
    },
    header: {
        fontSize: '2.5rem',
        color: '#1f2937',
        borderBottom: '2px solid #e5e7eb',
        paddingBottom: '15px',
        marginBottom: '30px',
        fontWeight: '700',
    },
    controls: {
        marginBottom: '25px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    dateFilter: {
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        flexWrap: 'wrap',
    },
    label: {
        fontSize: '1rem',
        color: '#4b5563',
        fontWeight: '600',
    },
    dateInput: {
        padding: '12px',
        borderRadius: '8px',
        border: '1px solid #d1d5db',
        fontSize: '1rem',
        outline: 'none',
        transition: 'border-color 0.3s, box-shadow 0.3s',
        flex: '1',
    },
    filterButton: {
        padding: '12px 25px',
        backgroundColor: '#2563eb',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: '600',
        transition: 'background-color 0.3s, transform 0.2s',
        boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)',
        ':hover': {
            backgroundColor: '#1d4ed8',
            transform: 'translateY(-2px)',
        },
    },
    clearFilterButton: {
        padding: '12px 25px',
        backgroundColor: '#9ca3af',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: '600',
        transition: 'background-color 0.3s, transform 0.2s',
        boxShadow: '0 4px 10px rgba(156, 163, 175, 0.2)',
        ':hover': {
            backgroundColor: '#6b7280',
            transform: 'translateY(-2px)',
        },
    },
    searchInput: {
        width: '100%',
        maxWidth: '400px',
        padding: '14px',
        borderRadius: '8px',
        border: '1px solid #d1d5db',
        fontSize: '1rem',
        outline: 'none',
        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
        transition: 'border-color 0.3s, box-shadow 0.3s',
        ':focus': {
            borderColor: '#2563eb',
            boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.1)',
        },
    },
    tableContainer: {
        overflowX: 'auto',
    },
    table: {
        width: '100%',
        borderCollapse: 'separate',
        borderSpacing: '0',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    },
    tableHeader: {
        backgroundColor: '#1f2937',
        color: '#f9fafb',
    },
    tableTh: {
        padding: '18px 25px',
        textAlign: 'left',
        fontWeight: '600',
    },
    tableRow: {
        backgroundColor: '#ffffff',
        transition: 'background-color 0.3s',
        cursor: 'pointer',
        ':hover': {
            backgroundColor: '#f3f4f6',
        },
    },
    tableTd: {
        padding: '18px 25px',
        borderBottom: '1px solid #e5e7eb',
        verticalAlign: 'middle',
        color: '#374151',
    },
    tableTdAction: {
        padding: '18px 25px',
        borderBottom: '1px solid #e5e7eb',
        whiteSpace: 'nowrap',
    },
    iconButton: {
        padding: '10px',
        border: 'none',
        backgroundColor: 'transparent',
        cursor: 'pointer',
        fontSize: '1.2rem',
        transition: 'transform 0.2s',
        ':hover': {
            transform: 'scale(1.1)',
        },
    },
    noEvents: {
        textAlign: 'center',
        padding: '60px',
        fontSize: '1.2rem',
        color: '#6b7280',
        backgroundColor: '#fff',
        borderRadius: '12px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
    },
    popupOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000,
        padding: '20px',
    },
    popupContent: {
        backgroundColor: '#ffffff',
        padding: '40px',
        borderRadius: '12px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        position: 'relative',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
    },
    closeButton: {
        position: 'absolute',
        top: '15px',
        right: '15px',
        background: 'none',
        border: 'none',
        fontSize: '2.5rem',
        cursor: 'pointer',
        color: '#9ca3af',
        transition: 'color 0.3s',
        ':hover': {
            color: '#1f2937',
        },
    },
    popupHeader: {
        marginTop: '0',
        color: '#1f2937',
        fontSize: '2rem',
        fontWeight: '700',
    },
    popupHr: {
        borderColor: '#e5e7eb',
        marginBottom: '25px',
    },
    formGroup: {
        marginBottom: '20px',
    },
    formLabel: {
        display: 'block',
        marginBottom: '8px',
        fontWeight: '600',
        color: '#4b5563',
    },
    formInput: {
        width: 'calc(100% - 24px)',
        padding: '12px',
        borderRadius: '8px',
        border: '1px solid #d1d5db',
        fontSize: '1rem',
        transition: 'border-color 0.3s, box-shadow 0.3s',
        ':focus': {
            borderColor: '#2563eb',
            boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.1)',
        },
    },
    formTextarea: {
        width: 'calc(100% - 24px)',
        padding: '12px',
        borderRadius: '8px',
        border: '1px solid #d1d5db',
        fontSize: '1rem',
        minHeight: '100px',
        resize: 'vertical',
        transition: 'border-color 0.3s, box-shadow 0.3s',
        ':focus': {
            borderColor: '#2563eb',
            boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.1)',
        },
    },
    formActions: {
        marginTop: '30px',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '15px',
    },
    saveButton: {
        padding: '12px 25px',
        backgroundColor: '#22c55e',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: '600',
        transition: 'background-color 0.3s, transform 0.2s',
        boxShadow: '0 4px 10px rgba(34, 197, 94, 0.2)',
        ':hover': {
            backgroundColor: '#15803d',
            transform: 'translateY(-2px)',
        },
    },
    cancelButton: {
        padding: '12px 25px',
        backgroundColor: '#ef4444',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: '600',
        transition: 'background-color 0.3s, transform 0.2s',
        boxShadow: '0 4px 10px rgba(239, 68, 68, 0.2)',
        ':hover': {
            backgroundColor: '#b91c1c',
            transform: 'translateY(-2px)',
        },
    },
    confirmPopupContent: {
        backgroundColor: '#ffffff',
        padding: '40px',
        borderRadius: '12px',
        maxWidth: '450px',
        width: '100%',
        position: 'relative',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        textAlign: 'center',
    },
    confirmHeader: {
        fontSize: '1.8rem',
        marginBottom: '15px',
        color: '#1f2937',
        fontWeight: '700',
    },
    confirmMessage: {
        marginBottom: '30px',
        color: '#4b5563',
        lineHeight: '1.6',
        fontSize: '1rem',
    },
    confirmActions: {
        display: 'flex',
        justifyContent: 'center',
        gap: '20px',
    },
    confirmButtonConfirm: {
        padding: '12px 25px',
        backgroundColor: '#2563eb',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: '600',
        transition: 'background-color 0.3s, transform 0.2s',
        boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)',
        ':hover': {
            backgroundColor: '#1d4ed8',
            transform: 'translateY(-2px)',
        },
    },
    confirmButtonCancel: {
        padding: '12px 25px',
        backgroundColor: '#9ca3af',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: '600',
        transition: 'background-color 0.3s, transform 0.2s',
        boxShadow: '0 4px 10px rgba(156, 163, 175, 0.2)',
        ':hover': {
            backgroundColor: '#6b7280',
            transform: 'translateY(-2px)',
        },
    },
    dateColumn: {
        width: '150px',
    },
    timeColumn: {
        width: '120px',
    },
    popupDetails: {
        lineHeight: '1.6',
        color: '#374151',
    }
};

export default KelolaPenanggalan;