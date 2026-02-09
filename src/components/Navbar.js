import React, { useState, useEffect, useRef } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/firebaseConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import logo from "../assets/logo-bempoltek2.png";
import { ChevronDown } from 'lucide-react';

const Navbar = () => {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const [infoDropdownOpen, setInfoDropdownOpen] = useState(false);
    const [isEvotingPublished, setIsEvotingPublished] = useState(true);

    const navigate = useNavigate();
    const profileDropdownRef = useRef(null);
    const infoDropdownRef = useRef(null);
    const mobileMenuRef = useRef(null);

    const closeAllMenus = () => {
        setMenuOpen(false);
        setProfileDropdownOpen(false);
        setInfoDropdownOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) setProfileDropdownOpen(false);
            if (infoDropdownRef.current && !infoDropdownRef.current.contains(event.target)) setInfoDropdownOpen(false);
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target) && !event.target.closest('.mobile-hamburger')) setMenuOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        // let unsubUserData; // Tidak perlu jika pakai getDoc
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => { // ✅ 2. Jadikan async
            setUser(currentUser);
            if (currentUser) {
                // ✅ 3. Logika Pencarian Data Pengguna yang Diperbaiki
                setUserData(null); // Reset dulu
                const userDocRef = doc(db, 'users', currentUser.uid);
                const userDocSnap = await getDoc(userDocRef); // Gunakan getDoc sekali

                if (userDocSnap.exists()) {
                    // Ditemukan di 'users', set data
                    setUserData(userDocSnap.data());
                } else {
                    // Tidak ada di 'users', coba cari di 'voters'
                    const voterDocRef = doc(db, 'voters', currentUser.uid);
                    const voterDocSnap = await getDoc(voterDocRef); // Gunakan getDoc sekali

                    if (voterDocSnap.exists()) {
                        // Ditemukan di 'voters', buat objek userData
                        const voterData = voterDocSnap.data();
                        setUserData({
                            // Sesuaikan field ini dengan data di 'voters'
                            namaTampilan: voterData.namaLengkap || 'Pemilih',
                            foto: voterData.fotoUrl || null, // Asumsi nama field fotoUrl
                            role: 'pemilih', // Set role secara eksplisit
                            // Tambahkan field lain jika perlu
                        });
                    } else {
                        // Tidak ditemukan di mana pun
                        console.warn(`User data not found for UID: ${currentUser.uid} in 'users' or 'voters'`);
                        setUserData(null); // Pastikan null jika tidak ada
                    }
                }
                // --- Akhir Perbaikan Pencarian Data ---

            } else {
                setUserData(null);
            }
        });

        const settingsDocRef = doc(db, 'settings', 'general');
        const unsubSettings = onSnapshot(settingsDocRef, (docSnap) => {
            if (docSnap.exists()) setIsEvotingPublished(docSnap.data().isEvotingPublished ?? true);
        });

        const styleTag = document.createElement('style');
        styleTag.id = 'navbar-styles';
        styleTag.innerHTML = styleSheet; // styleSheet dari bawah
        document.head.appendChild(styleTag);

        return () => {
            unsubscribeAuth();
            // unsubUserData tidak perlu karena kita pakai getDoc
            unsubSettings();
            const styleEl = document.getElementById('navbar-styles');
            if (styleEl) styleEl.parentNode.removeChild(styleEl);
        };
    }, []);

    const handleLogout = () => {
        signOut(auth).then(() => { closeAllMenus(); navigate("/"); });
    };
    
    const renderDropdownMenu = (isMobile = false) => {
        if (!userData) return null;
        
        // Ambil 'role' dan 'eventId' dari data pengguna
        const { role, eventId } = userData; 
        const linkClass = isMobile ? "mobile-link" : "dropdown-item";

        if (role === 'admin' || role === 'master') {
            return (<>
                <Link to="/admin" className={linkClass} onClick={closeAllMenus}>Dashboard Admin</Link>
                <Link to="/admin/profil" className={linkClass} onClick={closeAllMenus}>Edit Profil</Link>
                {role === 'master' && <Link to="/admin/kelola-admin" className={linkClass} onClick={closeAllMenus}>Kelola Pengguna</Link>}
            </>);
        } 
        // Tambahkan link untuk 'panitia'
        else if (role === 'panitia') {
            return (<>
                {/* Pastikan panitia memiliki eventId sebelum membuat link */}
                {eventId ? (
                    <Link to={`/panitia/${eventId}`} className={linkClass} onClick={closeAllMenus}>Dashboard Panitia</Link>
                ) : (
                    <span className={`${linkClass} disabled`} style={{opacity: 0.5, cursor: 'not-allowed'}}>Dashboard Panitia</span>
                )}
                {eventId && ( // Hanya tampilkan jika eventId ada
                   <Link to={`/panitia/${eventId}/profil`} className={linkClass} onClick={closeAllMenus}>Edit Profil</Link>
                )}
            </>);
        }
        // Tambahkan link untuk 'pemilih' (sesuaikan role 'pemilih' jika namanya berbeda di DB Anda)
        else if (role === 'pemilih') { 
            return (<>
                {/* Asumsi route untuk pemilih */}
                <Link to="/dashboard-pemilih" className={linkClass} onClick={closeAllMenus}>Dashboard Pemilih</Link>
                <Link to="/profil-pemilih" className={linkClass} onClick={closeAllMenus}>Edit Profil</Link>
            </>);
        }
        
        // Jika role tidak dikenal, tidak menampilkan apa-apa
        return null;
    };

    return (
        <>
            <nav className="main-navbar">
                <div className="nav-content">
                    <Link to="/" className="logo-container" onClick={closeAllMenus}>
                        <img src={logo} alt="Logo BEM" />
                    </Link>
                    
                    {/* ✅ PERBAIKAN 1: Struktur Menu Desktop diubah */}
                    <div className="desktop-menu">
                        <div className="nav-links-group">
                            <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeAllMenus}>Beranda</NavLink>
                            <NavLink to="/struktur" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeAllMenus}>Struktur</NavLink>
                            <NavLink to="/layanan" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeAllMenus}>Layanan</NavLink>
                            
                            <div className="nav-dropdown-container" ref={infoDropdownRef} onMouseEnter={() => setInfoDropdownOpen(true)} onMouseLeave={() => setInfoDropdownOpen(false)}>
                                <button className="nav-link nav-dropdown-toggle"><span>Informasi</span><ChevronDown size={16} /></button>
                                {infoDropdownOpen && (
                                    <div className="nav-dropdown-menu">
                                        <Link to="/keterbukaan-informasi/anggaran" className="dropdown-item" onClick={closeAllMenus}>Transparansi Anggaran</Link>
                                        <Link to="/keterbukaan-informasi/program-kerja" className="dropdown-item" onClick={closeAllMenus}>Program Kerja</Link>
                                        <Link to="/keterbukaan-informasi/risalah-rapat" className="dropdown-item" onClick={closeAllMenus}>Risalah Rapat</Link>
                                        <Link to="/keterbukaan-informasi/inventaris" className="dropdown-item" onClick={closeAllMenus}>Inventaris Aset</Link>
                                    </div>
                                )}
                            </div>
                            
                            <NavLink to="/berita" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeAllMenus}>Berita</NavLink>
                            <NavLink to="/dokumen" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeAllMenus}>Dokumen</NavLink>
                            <NavLink to="/publikasi" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeAllMenus}>Publikasi</NavLink>
                            <NavLink to="/tentang" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeAllMenus}>Tentang</NavLink>
                        </div>

                        <div className="nav-actions-group">
                            {isEvotingPublished && <Link to="/pemilihan" className="nav-button evoting" onClick={closeAllMenus}>E-Voting</Link>}
                            {user ? (
                                <div className="profile-container" ref={profileDropdownRef}>
                                    <button className="profile-button" onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}>
                                        {userData?.foto ? <img src={userData.foto} alt="Profil" /> : <div className="profile-initial">{(userData?.namaTampilan || 'U').charAt(0)}</div>}
                                    </button>
                                    {profileDropdownOpen && (
                                        <div className="profile-dropdown-menu">
                                            <div className="dropdown-header"><p className="dropdown-name">{userData?.namaTampilan}</p><p className="dropdown-email">{user.email}</p></div>
                                            {renderDropdownMenu(false)}
                                            <hr />
                                            <button onClick={handleLogout} className="dropdown-item logout">Logout</button>
                                        </div>
                                    )}
                                </div>
                            ) : <Link to="/login" className="nav-button login" onClick={closeAllMenus}>Login</Link>}
                        </div>
                    </div>

                    <button className={`mobile-hamburger ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(!menuOpen)}>
                        <div className="line"></div><div className="line"></div><div className="line"></div>
                    </button>
                </div>
            </nav>
            
            {menuOpen && <div className="mobile-menu-overlay open" onClick={closeAllMenus}></div>}
            <div className={`mobile-menu-container ${menuOpen ? 'open' : ''}`} ref={mobileMenuRef}>
                <div className="mobile-menu-scroll">
                    <NavLink to="/" className="mobile-link" onClick={closeAllMenus}>Beranda</NavLink>
                    <NavLink to="/struktur" className="mobile-link" onClick={closeAllMenus}>Struktur</NavLink>
                    <NavLink to="/layanan" className="mobile-link" onClick={closeAllMenus}>Layanan</NavLink>
                    <hr/>
                    <span className="mobile-menu-heading">Informasi</span>
                    <NavLink to="/keterbukaan-informasi/anggaran" className="mobile-link sub-link" onClick={closeAllMenus}>Transparansi Anggaran</NavLink>
                    <NavLink to="/keterbukaan-informasi/program-kerja" className="mobile-link sub-link" onClick={closeAllMenus}>Program Kerja</NavLink>
                    <NavLink to="/keterbukaan-informasi/risalah-rapat" className="mobile-link sub-link" onClick={closeAllMenus}>Risalah Rapat</NavLink>
                    <NavLink to="/keterbukaan-informasi/inventaris" className="mobile-link sub-link" onClick={closeAllMenus}>Inventaris Aset</NavLink>
                    <hr/>
                    <NavLink to="/berita" className="mobile-link" onClick={closeAllMenus}>Berita</NavLink>
                    <NavLink to="/dokumen" className="mobile-link" onClick={closeAllMenus}>Dokumen</NavLink>
                    <NavLink to="/publikasi" className="mobile-link" onClick={closeAllMenus}>Publikasi</NavLink>
                    <NavLink to="/tentang" className="mobile-link" onClick={closeAllMenus}>Tentang</NavLink>
                    {isEvotingPublished && <NavLink to="/pemilihan" className="mobile-link" onClick={closeAllMenus}>E-Voting</NavLink>}
                    <hr />
                    {user && userData ? (<>
                        {renderDropdownMenu(true)}
                        <a href="#" onClick={(e) => { e.preventDefault(); handleLogout(); }} className="mobile-link logout">Logout</a>
                    </>) : <NavLink to="/login" className="mobile-link" onClick={closeAllMenus}>Login</NavLink>}
                </div>
            </div>
        </>
    );
};
const styleSheet = `
    .main-navbar{position:fixed;top:0;left:0;right:0;z-index:1000;background-color:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,.1);height:88px;padding:0 24px;font-family:'Inter',sans-serif}
    .nav-content{display:flex;align-items:center;justify-content:space-between;width:100%;max-width:1400px}
    .logo-container{display:flex;align-items:center;text-decoration:none;color:#fff;flex-shrink:0}.logo-container img{height:65px;margin-right:10px}
    
    /* ✅ PERBAIKAN 2: Logika Layout Desktop Diperbaiki */
    .desktop-menu{display:none; align-items:center; gap: 24px; margin-left: auto;}
    .nav-links-group{display:flex;align-items:center;gap:32px}
    .nav-actions-group{display:flex;align-items:center;gap:16px}
    
    .nav-link{color:#e2e8f0;text-decoration:none;font-weight:500;padding:8px 0;font-size:1rem;position:relative;transition:color .2s}.nav-link:hover{color:#fff}
    .nav-link::after{content:'';position:absolute;bottom:-5px;left:0;width:100%;height:2px;background-color:#3b82f6;transform:scaleX(0);transition:transform .2s ease-in-out;transform-origin:center}
    .nav-link.active{color:#fff;font-weight:600}.nav-link.active::after{transform:scaleX(1)}
    .nav-button{padding:8px 16px;border-radius:6px;text-decoration:none;font-weight:700;font-size:.9rem;transition:all .2s ease}.nav-button.evoting{background-color:#ffd700;color:#0f172a}.nav-button.evoting:hover{background-color:#facc15;transform:translateY(-1px)}.nav-button.login{background-color:#2563eb;color:#fff}.nav-button.login:hover{background-color:#1d4ed8;transform:translateY(-1px)}
    .profile-container{position:relative}.profile-button{cursor:pointer;background:0 0;border:none;padding:0}.profile-button img,.profile-button .profile-initial{width:45px;height:45px;border-radius:50%;object-fit:cover;border:2px solid #3b82f6}.profile-button .profile-initial{background-color:#334155;display:flex;justify-content:center;align-items:center;color:#e2e8f0;font-weight:700;font-size:1.2rem}
    .profile-dropdown-menu{position:absolute;top:60px;right:0;background-color:#fff;border-radius:8px;box-shadow:0 4px 15px rgba(0,0,0,.15);z-index:1001;width:250px;overflow:hidden;animation:fadeIn .2s ease-out}.dropdown-header{padding:15px;border-bottom:1px solid #f3f4f6}.dropdown-name{margin:0;font-weight:600;color:#1f2737}.dropdown-email{margin:0;font-size:12px;color:#6b7280}.dropdown-item{display:block;padding:12px 20px;text-decoration:none;color:#1f2737;font-weight:500}.dropdown-item:hover{background-color:#f3f4f6}.dropdown-item.logout{width:100%;border:none;background:0 0;text-align:left;font-family:inherit;font-size:inherit;cursor:pointer}.profile-dropdown-menu hr{margin:0;border:none;border-top:1px solid #f3f4f6}
    .nav-dropdown-container{position:relative;padding-bottom:20px;margin-bottom:-20px}
    .nav-dropdown-toggle{display:flex;align-items:center;gap:6px;background:0 0;border:none;color:#e2e8f0;cursor:pointer;font-family:'Inter',sans-serif;font-size:1rem;font-weight:500;padding:8px 0}.nav-dropdown-toggle:hover{color:#fff}.nav-dropdown-toggle svg{transition:transform .2s}.nav-dropdown-container:hover .nav-dropdown-toggle svg{transform:rotate(180deg)}.nav-dropdown-menu{position:absolute;top:100%;left:50%;transform:translateX(-50%);background-color:#fff;border-radius:8px;box-shadow:0 4px 15px rgba(0,0,0,.15);z-index:1001;width:240px;overflow:hidden;padding:8px 0;animation:fadeIn .2s ease-out}@keyframes fadeIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
    .mobile-hamburger{display:block;background:0 0;border:none;color:#fff;cursor:pointer;padding:10px;z-index:1002}.mobile-hamburger .line{display:block;width:24px;height:2px;background-color:#fff;margin:5px 0;transition:all .3s ease-in-out}.mobile-hamburger.open .line:nth-child(1){transform:translateY(7px) rotate(45deg)}.mobile-hamburger.open .line:nth-child(2){opacity:0}.mobile-hamburger.open .line:nth-child(3){transform:translateY(-7px) rotate(-45deg)}
    .mobile-menu-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background-color:rgba(0,0,0,.5);z-index:998;opacity:0;pointer-events:none;transition:opacity .3s ease-in-out}
    .mobile-menu-overlay.open{opacity:1;pointer-events:auto}
    .mobile-menu-container{position:fixed;top:0;right:0;width:300px;height:100%;background-color:#0f172a;box-shadow:-5px 0 15px rgba(0,0,0,.2);z-index:999;transform:translateX(100%);transition:transform .3s ease-in-out;display:flex;flex-direction:column}
    .mobile-menu-container.open{transform:translateX(0)}
    .mobile-menu-scroll{overflow-y:auto;padding:100px 30px 30px}
    .mobile-link{color:#e2e8f0;text-decoration:none;font-size:1.1rem;font-weight:500;padding:10px 0;display:block}.mobile-link.sub-link{padding-left:16px;font-size:1rem;color:#cbd5e0}.mobile-link.active{color:#3b82f6;font-weight:600}.mobile-link.logout{color:#ef4444}.mobile-menu-heading{color:#94a3b8;font-size:.9rem;text-transform:uppercase;margin-top:16px;margin-bottom:4px}.mobile-menu-container hr{width:100%;border:none;border-top:1px solid #334155}
    
    @media(min-width:1025px){
        .desktop-menu{display:flex}
        .mobile-hamburger{display:none}
        /* ✅ PERBAIKAN 3: Sembunyikan total menu mobile di desktop */
        .mobile-menu-container, .mobile-menu-overlay {display: none !important;}
    }
    @media(max-width:1024px){
        .desktop-menu{display:none}
    }
`;

export default Navbar;