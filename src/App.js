// src/App.js
import React, { useEffect, useRef, Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, Outlet } from "react-router-dom";
import { auth } from "./firebase/firebaseConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import LoadingSpinner from "./components/LoadingSpinner";
import ProfilPemilih from './pages/ProfilPemilih';

import LayananBerkasLayout from './components/layanan-berkas/LayananBerkasLayout';
import PortalLayanan from './components/layanan-berkas/PortalLayanan';
import FormPengajuan from './components/layanan-berkas/FormPengajuan';
import LacakStatus from './components/layanan-berkas/LacakStatus';
import AdminBerkas from './components/layanan-berkas/AdminBerkas';
import AdminKelolaForm from './pages/AdminKelolaForm';
import LupaSandiPemilih from "./pages/LupaSandiPemilih";
import Terms from './pages/Terms';
import TermsPemilih from './pages/TermsPemilih';
import AdminLayout from "./layouts/AdminLayout";
import { listenForAuthChange } from "./utils/authSync";

import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';

ChartJS.register(
  ArcElement,
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend
);

const Beranda = lazy(() => import('./pages/Beranda'));
const Layanan = lazy(() => import('./pages/Layanan'));
const Struktur = lazy(() => import('./pages/Struktur'));
const Dokumen = lazy(() => import('./pages/Dokumen'));
const Tentang = lazy(() => import('./pages/Tentang'));
const Berita = lazy(() => import('./pages/Berita'));
const Login = lazy(() => import('./pages/Login'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Register = lazy(() => import('./pages/Register'));
const RegisterPanitia = lazy(() => import('./pages/RegisterPanitia'));
const RegisterPemilih = lazy(() => import('./pages/RegisterPemilih'));
const Admin = lazy(() => import('./pages/Admin'));
const AdminProfil = lazy(() => import('./pages/AdminProfil'));
const AdminHistori = lazy(() => import('./pages/AdminHistori'));
const KelolaAdmin = lazy(() => import('./pages/KelolaAdmin'));
const AdminStruktur = lazy(() => import('./pages/AdminStruktur'));
const AdminDokumen = lazy(() => import('./pages/AdminDokumen'));
const AdminLayanan = lazy(() => import('./pages/AdminLayanan'));
const KelolaBerita = lazy(() => import('./pages/KelolaBerita'));
const KelolaTentang = lazy(() => import('./pages/KelolaTentang'));
const DaftarPemilihan = lazy(() => import('./pages/DaftarPemilihan'));
const RequestPemilihan = lazy(() => import('./pages/RequestPemilihan'));
const AdminMasterVoting = lazy(() => import('./pages/AdminMasterVoting'));
const LoginPemilih = lazy(() => import('./pages/LoginPemilih'));
const DashboardPemilih = lazy(() => import('./pages/DashboardPemilih'));
const BilikSuara = lazy(() => import('./pages/BilikSuara'));
const HasilPemilihan = lazy(() => import('./pages/HasilPemilihan'));
const PanitiaLayout = lazy(() => import('./layouts/PanitiaLayout'));
const PanitiaRingkasan = lazy(() => import('./pages/panitia/PanitiaRingkasan'));
const PanitiaPengaturan = lazy(() => import('./pages/panitia/PanitiaPengaturan'));
const PanitiaKelolaKandidat = lazy(() => import('./pages/panitia/PanitiaKelolaKandidat'));
const PanitiaKelolaPemilih = lazy(() => import('./pages/panitia/PanitiaKelolaPemilih'));
const KelolaPemilihTerdaftar = lazy(() => import('./pages/panitia/KelolaPemilihTerdaftar'));
const PanitiaProfil = lazy(() => import('./pages/panitia/PanitiaProfil'));
const RegistrasiPage = lazy(() => import('./pages/panitia/RegistrasiPage'));
const BilikLogin = lazy(() => import('./pages/panitia/BilikLogin'));

const AdminAnggaran = lazy(() => import('./pages/admin/AdminAnggaran'));
const AdminProker = lazy(() => import('./pages/admin/AdminProker'));
const AdminRisalah = lazy(() => import('./pages/admin/AdminRisalah'));
const AdminAset = lazy(() => import('./pages/admin/AdminAset'));

const PublikasiHome = lazy(() => import('./pages/publikasi/PublikasiHome'));
const PublikasiDetail = lazy(() => import('./pages/publikasi/PublikasiDetail'));
const PublikasiSubmit = lazy(() => import('./pages/publikasi/PublikasiSubmit'));
const AdminPublikasi = lazy(() => import('./pages/admin/AdminPublikasi'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const UserManagement = lazy(() => import('./pages/admin/UserManagement'));
const PublikasiHelpCenter = lazy(() => import('./pages/publikasi/PublikasiHelpCenter'));
const PublikasiPanduan = lazy(() => import('./pages/publikasi/PublikasiPanduan'));
const PublikasiKebijakan = lazy(() => import('./pages/publikasi/PublikasiKebijakan'));
const PublikasiKontak = lazy(() => import('./pages/publikasi/PublikasiKontak'));
const PublikasiStatus = lazy(() => import('./pages/publikasi/PublikasiStatus'));

const PublicTransparencyPage = lazy(() => import('./pages/PublicTransparencyPage')); 
const PublicProkerPage = lazy(() => import('./pages/PublicProkerPage')); 
const DetailAset = lazy(() => import('./pages/DetailAset'));
const PublicRisalahPage = lazy(() => import('./pages/PublicRisalahPage')); 
const PublicAsetPage = lazy(() => import('./pages/PublicAsetPage')); 

const AdminOrganisasi = lazy(() => import('./pages/AdminOrganisasi'));
const DaftarOrganisasi = lazy(() => import('./pages/DaftarOrganisasi'));
const ProfilOrganisasi = lazy(() => import('./pages/ProfilOrganisasi'));

const FormPeminjamanSC = lazy(() => import('./pages/FormPeminjamanSC'));
const HalamanSuksesSC = lazy(() => import('./pages/HalamanSukses'));
const KelolaPeminjamanSC = lazy(() => import('./pages/KelolaPeminjamanSC'));
const AdminPeminjamanSC = lazy(() => import('./pages/admin/AdminPeminjamanSC'));
const AbsensiSC = lazy(() => import('./pages/AbsensiSC'));

const KelolaPenanggalan = lazy(() => import('./pages/KelolaPenanggalan'));
const AuthActionHandler = lazy(() => import('./pages/AuthActionHandler'));

const SettingsAdmin = lazy(() => import('./pages/admin/SettingsAdmin'));
const RktPengajuan = lazy(() => import('./pages/admin/manajemen-rkt/RktPengajuan'));
const RktProgramList = lazy(() => import('./pages/admin/manajemen-rkt/RktProgramList'));
const RktVerifikasi = lazy(() => import('./pages/admin/manajemen-rkt/RktVerifikasi'));
const SystemConfig = lazy(() => import('./pages/admin/master/SystemConfig'));
const ProkerDivisi = lazy(() => import('./pages/admin/activity/ProkerDivisi'));
const VerifikasiInternal = lazy(() => import ('./pages/admin/activity/VerifikasiInternal'));
const VerifikasiEksternal = lazy(() => import ('./pages/admin/activity/VerifikasiEksternal'));

const PublicTransparencyLayout = () => (
    <div className="public-transparency-layout">
        <Outlet /> 
    </div>
);

const AppContent = () => {
  const navigate = useNavigate();
  const idleTimer = useRef(null);
  const IDLE_TIMEOUT = 15 * 60 * 1000;

  const resetIdleTimer = () => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      if (auth.currentUser) {
        signOut(auth).then(() => {
          alert("Anda telah logout secara otomatis karena tidak ada aktivitas.");
          navigate('/login');
        });
      }
    }, IDLE_TIMEOUT);
  };

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown'];
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        resetIdleTimer();
        events.forEach(event => window.addEventListener(event, resetIdleTimer));
      } else {
        if (idleTimer.current) clearTimeout(idleTimer.current);
        events.forEach(event => window.removeEventListener(event, resetIdleTimer));
      }
    });
    return () => {
      unsubscribe();
      if (idleTimer.current) clearTimeout(idleTimer.current);
      events.forEach(event => window.removeEventListener(event, resetIdleTimer));
    };
  }, [navigate]);
  
  useEffect(() => {
        listenForAuthChange();
    }, []);

  return (
    <main style={{ flex: 1, paddingTop: "65px" }}>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* Rute Publik */}
          <Route path="/" element={<Beranda />} />
          <Route path="/struktur" element={<Struktur />} />
          <Route path="/layanan" element={<Layanan />} />
          <Route path="/berita" element={<Berita />} />
          <Route path="/dokumen" element={<Dokumen />} />
          <Route path="/tentang" element={<Tentang />} />

          {/* >>> RUTE BARU: PUBLIKASI KARYA TULIS <<< */}
          <Route path="/publikasi" element={<PublikasiHome />} />
          <Route path="/publikasi/:id" element={<PublikasiDetail />} />
          <Route path="/publikasi/submit" element={<PublikasiSubmit />} />
          <Route path="/publikasi/bantuan" element={<PublikasiHelpCenter />} />
          <Route path="/publikasi/panduan" element={<PublikasiPanduan />} />
          <Route path="/publikasi/kebijakan" element={<PublikasiKebijakan />} />
          <Route path="/publikasi/kontak" element={<PublikasiKontak />} />
          <Route path="/publikasi/status/:id" element={<PublikasiStatus />} />
          {/* ---------------------------------------- */}
          
          {/*Rute untuk Peminjaman Student Center*/}
          <Route path="/pinjam-sc" element={<FormPeminjamanSC />} />
          <Route path="/pinjam-sc/sukses" element={<HalamanSuksesSC />} />
          <Route path="/pinjam-sc/kelola" element={<KelolaPeminjamanSC />} />
          <Route path="/pinjam-sc/absensi" element={<AbsensiSC />} />

          {/* >>> RUTE KETERBUKAAN INFORMASI BERLAPIS (NESTED) <<< */}
          <Route path="/keterbukaan-informasi" element={<PublicTransparencyLayout />}>
              {/* Rute Index (Default) mengarahkan ke Anggaran */}
              <Route index element={<Navigate to="anggaran" replace />} />
              {/* Modul Anggaran (Gunakan PublicTransparencyPage sebagai konten Anggaran) */}
              <Route path="anggaran" element={<PublicTransparencyPage />} />
              <Route path="program-kerja" element={<PublicProkerPage />} />
              <Route path="inventaris" element={<PublicAsetPage />} />
              <Route path="inventaris/:assetId" element={<DetailAset />} />
              <Route path="risalah-rapat" element={<PublicRisalahPage />} />
          </Route>
          {/* -------------------------------------------------- */}

          <Route path="/profil-pemilih" element={<ProfilPemilih />} />
          {/* Rute Autentikasi */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/register-panitia" element={<RegisterPanitia />} />
          <Route path="/register-pemilih" element={<RegisterPemilih />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Rute Admin Utama */}
          <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Admin />} />
              <Route path="/admin/profil" element={<AdminProfil />} />
              <Route path="/admin/histori" element={<AdminHistori />} />
              <Route path="/admin/kelola-admin" element={<KelolaAdmin />} />
              <Route path="verifikasi-pengguna" element={<UserManagement />} />
              <Route path="/admin/struktur" element={<AdminStruktur />} />
              <Route path="/admin/dokumen" element={<AdminDokumen />} />
              <Route path="/admin/layanan" element={<AdminLayanan />} />
              <Route path="/admin/kelola-berita" element={<KelolaBerita />} />
              <Route path="/admin/kelola-tentang" element={<KelolaTentang />} />
              <Route path="/admin/manajemen-voting" element={<AdminMasterVoting />} />
              <Route path="/admin/organisasi" element={<AdminOrganisasi />} />
              <Route path="/admin/berkas" element={<AdminBerkas />} />
              <Route path="/admin/kelola-form-berkas" element={<AdminKelolaForm />} />
              <Route path="/admin/anggaran" element={<AdminAnggaran />} />
              <Route path="/admin/proker" element={<AdminProker />} />
              <Route path="/admin/risalah-rapat" element={<AdminRisalah />} />
              <Route path="/admin/aset-bem" element={<AdminAset />} />
              <Route path="/admin/kelola-penanggalan" element={<KelolaPenanggalan />} />
              <Route path="/admin/peminjaman-sc" element={<AdminPeminjamanSC />} />
              <Route path="kelola-publikasi" element={<AdminPublikasi />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="konfigurasi-sistem" element={<SettingsAdmin />} />
              <Route path="perencanaan-rkt" element={<RktPengajuan />} />
              <Route path="perencanaan-rkt/input-program" element={<RktProgramList />} />
              <Route path="verifikasi-rkt" element={<RktVerifikasi />} />
              <Route path="config-sistem" element={<SystemConfig />} />
              <Route path="program-divisi" element={<ProkerDivisi />} />
              <Route path="verifikasi-internal" element={<VerifikasiInternal />} />
              <Route path="verifikasi-eksternal" element={<VerifikasiEksternal />} />
          </Route>

          {/* Rute E-Voting */}
          <Route path="/pemilihan" element={<DaftarPemilihan />} />
          <Route path="/request-pemilihan" element={<RequestPemilihan />} />
          <Route path="/login-pemilih" element={<LoginPemilih />} />
          <Route path="/lupa-sandi-pemilih" element={<LupaSandiPemilih />} />
          <Route path="/dashboard-pemilih" element={<DashboardPemilih />} />
          <Route path="/voting/:eventId" element={<BilikSuara />} />
          <Route path="/hasil/:eventId" element={<HasilPemilihan />} />

          {/* Rute ini di luar PanitiaLayout karena fullscreen */}
          <Route path="/panitia/:eventId/registrasi" element={<RegistrasiPage />} />
          <Route path="/panitia/:eventId/bilik-login" element={<BilikLogin />} />
          
          <Route path="/panitia/:eventId" element={<PanitiaLayout />}>
            <Route index element={<Navigate to="ringkasan" replace />} />
            <Route path="ringkasan" element={<PanitiaRingkasan />} />
            <Route path="pengaturan" element={<PanitiaPengaturan />} />
            <Route path="kandidat" element={<PanitiaKelolaKandidat />} />
            <Route path="pemilih" element={<PanitiaKelolaPemilih />} />
            <Route path="verifikasi-pemilih" element={<KelolaPemilihTerdaftar />} />
            <Route path="profil" element={<PanitiaProfil />} />
          </Route>

          <Route path="/direktori" element={<DaftarOrganisasi />} />
          <Route path="/organisasi/:orgId" element={<ProfilOrganisasi />} />
          
          
          {/* --- RUTE LAINNYA --- */}
          <Route path="/layanan/berkaskm" element={<LayananBerkasLayout />}>
              <Route index element={<PortalLayanan />} /> 
              <Route path="ajukan" element={<FormPengajuan />} /> 
              <Route path="lacak" element={<LacakStatus />} /> 
          </Route>
          
          <Route path="/auth/action" element={<AuthActionHandler />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/terms-pemilih" element={<TermsPemilih />} />
        </Routes>
      </Suspense>
    </main>
  );
}

function App() {
  return (
    <Router>
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <Navbar />
        <ScrollToTop /> 
        <AppContent />
        <Footer />
      </div>
    </Router>
  );
}

export default App;