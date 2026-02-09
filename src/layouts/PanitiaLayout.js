import React, { useState, useEffect, createContext, useContext } from 'react';
import { useParams, useNavigate, NavLink, Outlet } from 'react-router-dom';
import { db, auth } from '../firebase/firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import LoadingSpinner from '../components/LoadingSpinner';

// Impor ikon yang dibutuhkan dari Lucide
import {
    LayoutDashboard, Settings, Users, UserCheck, Menu, X, LogOut, ArrowLeft,
    UserCircle // ✅ 1. Impor ikon untuk profil
} from 'lucide-react';

const EventContext = createContext();
export const useEvent = () => useContext(EventContext);

const PanitiaLayout = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [profil, setProfil] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    const MAIN_HEADER_HEIGHT = '8px';
    const REAL_NAVBAR_HEIGHT = '88px';

    useEffect(() => {
        const unsubAuth = onAuthStateChanged(auth, user => {
            if (user) {
                const userDocRef = doc(db, 'users', user.uid);
                // Gunakan unsub dalam onSnapshot
                const unsubProfile = onSnapshot(userDocRef, (docSnap) => {
                    if (docSnap.exists()) {
                        setProfil(docSnap.data());
                    } else {
                        // Jika data tidak ada di 'users', logout atau redirect
                        console.error("Data profil panitia tidak ditemukan di 'users'.");
                        signOut(auth).then(() => navigate('/login'));
                    }
                    // Pindahkan setLoading(false) ke sini agar profil pasti sudah dicek
                    setLoading(false);
                }, (error) => {
                    // Tangani error saat fetch profil
                    console.error("Error fetching panitia profile:", error);
                    setLoading(false);
                    navigate('/login'); // Redirect jika error
                });
                // Kembalikan fungsi unsub untuk profile
                return () => unsubProfile();
            } else {
                navigate('/login');
                setLoading(false); // Pastikan loading false jika tidak ada user
            }
        });

        // Event listener hanya jika eventId ada
        let unsubEvent = null;
        if (eventId) {
            const eventDocRef = doc(db, 'pemilihan_events', eventId);
            unsubEvent = onSnapshot(eventDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    setEvent({ id: docSnap.id, ...docSnap.data() });
                } else {
                    console.error(`Event dengan ID ${eventId} tidak ditemukan.`);
                    setEvent(null); // Set event jadi null jika tidak ada
                    // Pertimbangkan redirect atau tampilkan pesan error di sini
                    // navigate('/admin/manajemen-voting'); // Contoh redirect
                }
                // setLoading(false); // Loading dihandle oleh auth listener
            }, (error) => {
                console.error(`Error fetching event ${eventId}:`, error);
                setEvent(null);
                setLoading(false);
                // Handle error, mungkin redirect
            });
        } else {
            // Jika tidak ada eventId (misal URL salah), set loading false
             console.warn("Tidak ada eventId di URL.");
             setLoading(false); // Mungkin perlu loading false di sini juga
        }


        return () => {
            unsubAuth();
            if (unsubEvent) unsubEvent();
        };
    }, [eventId, navigate]);


    const closeSidebar = () => setSidebarOpen(false);

    const handleLogout = () => {
        closeSidebar();
        signOut(auth).then(() => navigate("/login"));
    };

    const navItems = [
        { to: `/panitia/${eventId}`, text: 'Ringkasan', icon: <LayoutDashboard size={20} /> },
        { to: `pengaturan`, text: 'Pengaturan', icon: <Settings size={20} /> },
        { to: `kandidat`, text: 'Kelola Kandidat', icon: <Users size={20} /> },
        { to: `pemilih`, text: 'Kelola Pemilih', icon: <UserCheck size={20} /> },
    ];

    // Pindahkan Loading dan cek event/profil ke sini agar lebih jelas
     if (loading) return <LoadingSpinner />;
     // Cek setelah loading selesai
     if (!profil) return <div style={{padding: '40px', textAlign: 'center'}}>Gagal memuat profil panitia atau akses ditolak.</div>; // Pesan jika profil null
     if (!event && eventId) return <div style={{padding: '40px', textAlign: 'center'}}>Event tidak ditemukan atau gagal dimuat.</div>; // Pesan jika event null tapi eventId ada
     if (!eventId) return <div style={{padding: '40px', textAlign: 'center'}}>ID Event tidak valid.</div>; // Pesan jika eventId tidak ada


    const renderNavLink = (item) => (
      <NavLink
        key={item.to}
        to={item.to}
        // 'end' hanya true jika path SAMA PERSIS (untuk Ringkasan)
        end={item.to === `/panitia/${eventId}`}
        style={({isActive}) => isActive ? styles.activeLink : styles.navLink}
        className="nav-link"
        onClick={closeSidebar}
      >
        {item.icon}
        <span>{item.text}</span>
      </NavLink>
    );

    const styles = {
        layout: { display: 'flex', minHeight: `calc(100vh - ${REAL_NAVBAR_HEIGHT})`, backgroundColor: '#f8fafc', position: 'relative', marginTop: MAIN_HEADER_HEIGHT },
        sidebar: {
            position: 'fixed',
            top: REAL_NAVBAR_HEIGHT,
            left: 0,
            width: '280px',
            height: `calc(100vh - ${REAL_NAVBAR_HEIGHT})`,
            backgroundColor: '#1e293b',
            color: '#e2e8f0',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1100,
            transform: 'translateX(-100%)',
            transition: 'transform 0.3s ease-in-out',
        },
        sidebarOpen: {
            transform: 'translateX(0)',
            boxShadow: '10px 0 20px rgba(0,0,0,0.2)'
        },
        sidebarHeader: { display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #334155', paddingBottom: '20px', marginBottom: '20px', position: 'relative' },
        profileImage: { width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #475569' },
        profileName: { color: '#ffffff', fontSize: '1rem', fontWeight: '600', margin: 0 },
        eventSubHeader: { color: '#94a3b8', fontSize: '0.8rem', margin: '4px 0 0', textTransform: 'capitalize' },
        nav: { display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1, overflowY: 'auto' },
        navLink: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', textDecoration: 'none', color: '#cbd5e0', borderRadius: '8px', transition: 'background-color 0.2s ease, color 0.2s ease' },
        activeLink: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', textDecoration: 'none', borderRadius: '8px', backgroundColor: '#334155', color: '#ffffff', fontWeight: '600' },
        divider: { border: 'none', borderTop: '1px solid #334155', margin: '16px 0' },
        mainContainer: { width: '100%', display: 'flex', flexDirection: 'column' },
        mobileHeader: {
            display: 'flex', alignItems: 'center', padding: '16px', backgroundColor: '#ffffff',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)', color: '#1e293b', zIndex: 900,
        },
        hamburgerButton: { background: 'none', border: 'none', cursor: 'pointer', color: '#1e293b', padding: 0 },
        mobileHeaderText: { marginLeft: '16px', fontSize: '1.1rem', fontWeight: '600' },
        closeButton: {
            position: 'absolute', top: '15px', right: '-5px', background: 'none',
            border: 'none', color: '#94a3b8', cursor: 'pointer'
        },
        content: { flex: 1, padding: '24px' },
        logoutButton: { display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 16px', backgroundColor: 'transparent', color: '#cbd5e0', border: '1px solid #334155', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontSize: '1rem', transition: 'background-color 0.2s ease, color 0.2s ease' },
        overlay: {
            position: 'fixed', top: MAIN_HEADER_HEIGHT, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1050,
        },
    };

    return (
        <EventContext.Provider value={{ event, eventId }}>
            <div className="panitia-layout-container" style={styles.layout}>
                {isSidebarOpen && <div style={styles.overlay} onClick={closeSidebar}></div>}

                <aside className="panitia-sidebar" style={{...styles.sidebar, ...(isSidebarOpen ? styles.sidebarOpen : {})}}>
                    <div style={styles.sidebarHeader}>
                        <img src={profil.foto || `https://ui-avatars.com/api/?name=${profil.namaTampilan.replace(/\s/g, '+')}&background=334155&color=fff&font-size=0.5`} alt="Profil" style={styles.profileImage} />
                        <div>
                            <h2 style={styles.profileName}>{profil.namaTampilan}</h2>
                            {/* Pastikan event ada sebelum menampilkan namanya */}
                            <p style={styles.eventSubHeader}>Panitia: {event?.namaEvent || '...'}</p>
                        </div>
                        <button style={styles.closeButton} className="sidebar-close-button" onClick={closeSidebar}>
                            <X size={24} />
                        </button>
                    </div>
                    <nav style={styles.nav}>
                        {navItems.map(renderNavLink)}
                        <hr style={styles.divider} />
                        <NavLink to={`verifikasi-pemilih`} style={({isActive}) => isActive ? styles.activeLink : styles.navLink} className="nav-link" onClick={closeSidebar}>
                            <UserCheck size={20} />
                            <span>Verifikasi Akun</span>
                        </NavLink>
                        {/* ✅ 2. Tambahkan link ke profil panitia */}
                        <NavLink to={`profil`} style={({isActive}) => isActive ? styles.activeLink : styles.navLink} className="nav-link" onClick={closeSidebar}>
                            <UserCircle size={20} />
                            <span>Edit Profil</span>
                        </NavLink>
                    </nav>
                     <div style={{marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px'}}>
                         {profil.role === 'master' && (
                             <NavLink to="/admin/manajemen-voting" style={styles.navLink} className="nav-link back-button" onClick={closeSidebar}>
                                <ArrowLeft size={20} />
                                <span>Kembali ke Manajemen</span>
                             </NavLink>
                         )}
                         <button onClick={handleLogout} style={styles.logoutButton} className="logout-button">
                             <LogOut size={20} />
                             <span>Logout</span>
                         </button>
                     </div>
                </aside>

                <div style={styles.mainContainer}>
                    <header style={styles.mobileHeader} className="mobile-header">
                        <button style={styles.hamburgerButton} onClick={() => setSidebarOpen(true)}>
                            <Menu size={28} />
                        </button>
                        {/* Pastikan event ada sebelum menampilkan namanya */}
                        <span style={styles.mobileHeaderText}>{event?.namaEvent || 'Loading...'}</span>
                    </header>
                    <main className="panitia-content" style={styles.content}>
                        <Outlet />
                    </main>
                </div>
            </div>
        </EventContext.Provider>
    );
};

// Stylesheet tetap sama
const styleSheet = document.createElement("style");
styleSheet.innerHTML = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  .nav-link:hover { background-color: #334155; color: #ffffff; }
  .logout-button:hover { background-color: #ef4444; border-color: #ef4444; color: #ffffff; }
  .back-button:hover { background-color: #475569; }
  .sidebar-close-button { display: block; }

  @media (min-width: 768px) {
    .mobile-header { display: none; }
    .panitia-sidebar {
      position: sticky; /* Ini kunci untuk scrolling */
      transform: translateX(0);
      box-shadow: none !important;
    }
    .panitia-layout-container > div:not(.panitia-sidebar) {
        /* Ganti margin-left: 0px menjadi width: calc(100% - 280px) dan margin-left: 280px jika sidebar fixed */
        width: 100%; /* Atau sesuaikan jika perlu */
        margin-left: 0; /* Sesuaikan jika sidebar fixed */
    }
    .panitia-content {
      padding: 32px;
    }
    .sidebar-close-button { display: none; }

    /* Pastikan mainContainer memiliki lebar yang benar di desktop */
    .mainContainer {
       padding-left: 280px; /* Jika sidebar fixed di desktop */
    }
  }
`;
document.head.appendChild(styleSheet);


export default PanitiaLayout;