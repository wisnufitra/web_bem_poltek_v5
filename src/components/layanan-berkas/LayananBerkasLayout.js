// src/components/layanan-berkas/LayananBerkasLayout.js
import React from 'react';
import { Outlet } from 'react-router-dom';

/**
 * Komponen ini berfungsi sebagai layout atau "wadah" utama untuk semua halaman
 * di bawah /layanan/berkaskm.
 * <Outlet /> adalah sebuah placeholder dari React Router. Di sinilah React akan
 * secara dinamis merender komponen anak (PortalLayanan, FormPengajuan, atau LacakStatus)
 * sesuai dengan URL yang sedang diakses pengguna.
 */
const LayananBerkasLayout = () => {
    // Latar belakang abu-abu muda ditambahkan di sini untuk memberikan
    // konsistensi visual pada semua halaman di dalam fitur ini,
    // membuatnya terasa seperti satu aplikasi mini yang terintegrasi.
    return (
        <div style={{ backgroundColor: '#f0f2f5', minHeight: 'calc(100vh - 90px)', padding: '1px 0' }}>
            <Outlet />
        </div>
    );
};

export default LayananBerkasLayout;

