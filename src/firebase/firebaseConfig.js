// src/firebase/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";

// Konfigurasi Firebase Anda
const firebaseConfig = {
  apiKey: "AIzaSyDWrlhXcPyNmXuC38lYrMfoTLTW5DGYk7w",
  authDomain: "bem-poltek.firebaseapp.com",
  projectId: "bem-poltek",
  storageBucket: "bem-poltek.appspot.com", // Pastikan ini .appspot.com
  messagingSenderId: "671720576339",
  appId: "1:671720576339:web:aedc3fd2f9c7be245e3da6",
  measurementId: "G-RVKCBV4XDP"
};

// 1. Inisialisasi aplikasi Firebase utama
const app = initializeApp(firebaseConfig);

// 2. Inisialisasi dan ekspor setiap layanan secara terpisah
// Pola ini lebih aman dan mencegah error inisialisasi.
export const db = getFirestore(app);
export const auth = getAuth(app);
export const analytics = getAnalytics(app);
export const storage = getStorage(app);
