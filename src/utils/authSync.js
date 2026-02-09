// src/utils/authSync.js

// Buat satu channel untuk seluruh aplikasi
const authChannel = new BroadcastChannel('auth-channel');

/**
 * Mengirim pesan ke semua tab lain bahwa status auth berubah.
 * @param {'login' | 'logout'} status - Status baru.
 */
export const broadcastAuthChange = (status) => {
    authChannel.postMessage(status);
};

/**
 * Mendengarkan perubahan auth dari tab lain.
 * Jika ada pesan 'login' atau 'logout', muat ulang halaman.
 */
export const listenForAuthChange = () => {
    authChannel.onmessage = (event) => {
        if (event.data === 'login' || event.data === 'logout') {
            // Muat ulang halaman untuk mengambil status auth terbaru
            window.location.reload();
        }
    };
};