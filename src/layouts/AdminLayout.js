// src/layouts/AdminLayout.js
import React, { useState, useEffect, createContext, useContext, useMemo } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';
import LoadingSpinner from '../components/LoadingSpinner';

import {
    LayoutDashboard, Network, Newspaper, FolderKanban, Handshake,
    Archive, CalendarDays, FileCheck2, Users, Vote, Info, LogOut, Menu, X,
    ChevronDown, Landmark, ClipboardList, Settings, CheckCircle2,
    ShieldCheck, FileText, AlertTriangle, Briefcase, Building2, ChevronsUpDown,
    BookOpenCheck 
} from 'lucide-react';

const AdminContext = createContext();
export const useAdmin = () => useContext(AdminContext);

const AdminLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const [profil, setProfil] = useState(null);
    const [sysConfig, setSysConfig] = useState(null); 
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [openMenus, setOpenMenus] = useState({});
    const [activeRoleIndex, setActiveRoleIndex] = useState(0);
    const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

    const MAIN_HEADER_HEIGHT = '8px'; 
    const REAL_NAVBAR_HEIGHT = '88px';

    // 1. Auto-Open Dropdown logic
    useEffect(() => {
        if (['/admin/anggaran', '/admin/proker', '/admin/risalah', '/admin/aset-bem'].some(path => location.pathname.startsWith(path))) {
            setOpenMenus(prev => ({ ...prev, keterbukaanInformasi: true }));
        }
        if (['/admin/struktur', '/admin/dokumen', '/admin/layanan', '/admin/kelola-tentang', '/admin/kelola-berita'].some(path => location.pathname.startsWith(path))) {
            setOpenMenus(prev => ({ ...prev, kelolaWebsite: true }));
        }
    }, [location.pathname]);

    // 2. Auth & Profile listener
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                const userRef = doc(db, 'users', user.uid);
                const unsubProfile = onSnapshot(userRef, (docSnap) => {
                    if (docSnap.exists()) {
                        const userData = docSnap.data();
                        if (['admin', 'master'].includes(userData.role_global)) {
                            setProfil(userData);
                        } else { navigate('/'); }
                    } else { navigate('/login'); }
                });

                const configRef = doc(db, 'master_metadata', 'system_config');
                const unsubConfig = onSnapshot(configRef, (docSnap) => {
                    if (docSnap.exists()) setSysConfig(docSnap.data());
                });

                return () => { unsubProfile(); unsubConfig(); };
            } else { navigate('/login'); }
        });
        return () => unsubscribeAuth();
    }, [navigate]);

    useEffect(() => {
        if (sysConfig?.isSystemMaintenance && profil && profil.role_global !== 'master') {
            alert("Sistem sedang dalam perbaikan (Maintenance).");
            signOut(auth).then(() => navigate("/login"));
        }
        if (profil) setLoading(false);
    }, [profil, sysConfig, navigate]);

    // 3. Role Engine
    const activeRole = useMemo(() => {
        if (!profil) return null;
        if (profil.role_global === 'master') {
            return { entity_id: 'master', entity_name: 'Super Admin', position: 'Master', division: 'IT' };
        }
        if (profil.assignments && profil.assignments.length > 0) {
            return profil.assignments[activeRoleIndex] || profil.assignments[0];
        }
        return null;
    }, [profil, activeRoleIndex]);

    const isMaster = profil?.role_global === 'master';

    // Hak Akses Spesifik
    const isBemPusat = isMaster || (activeRole?.entity_id === 'bem_pusat');
    
    const isKemenkeu = useMemo(() => {
        if (isMaster) return true;
        if (!activeRole) return false;
        const div = (activeRole.division || '').toLowerCase();
        return activeRole.entity_id === 'bem_pusat' && (div.includes('keuangan') || div.includes('bendahara'));
    }, [activeRole, isMaster]);

    const isSekjenPusat = useMemo(() => {
        if (isMaster) return true;
        if (!activeRole) return false;
        const div = (activeRole.division || '').toLowerCase();
        const pos = (activeRole.position || '').toLowerCase();
        return activeRole.entity_id === 'bem_pusat' && (div.includes('sekretariat') || div.includes('sekjen') || pos.includes('sekretaris'));
    }, [activeRole, isMaster]);

    const isDagriPusat = useMemo(() => {
        if (isMaster) return true;
        if (!activeRole) return false;
        const div = (activeRole.division || '').toLowerCase();
        return activeRole.entity_id === 'bem_pusat' && (div.includes('dalam negeri') || div.includes('dagri'));
    }, [activeRole, isMaster]);

    const isPoraPusat = useMemo(() => {
        if (isMaster) return true;
        if (!activeRole) return false;
        const div = (activeRole.division || '').toLowerCase();
        return activeRole.entity_id === 'bem_pusat' && (div.includes('pemuda') || div.includes('olahraga'));
    }, [activeRole, isMaster]);

    const isLeaderInternal = useMemo(() => {
        if (isMaster) return true;
        if (!activeRole) return false;
        const pos = (activeRole.position || '').toLowerCase();
        const div = (activeRole.division || '').toLowerCase();
        return (pos.includes('ketua') || pos.includes('presiden') || pos.includes('wakil') || pos.includes('sekretaris') || pos.includes('bendahara') || div.includes('keuangan') || div === 'inti' || div.includes('pengurus harian'));
    }, [activeRole, isMaster]);

    const isExternalReviewer = useMemo(() => {
        if (isMaster) return true;
        if (!activeRole) return false;
        const eid = activeRole.entity_id;
        const div = (activeRole.division || '').toLowerCase();
        if (eid === 'bem_pusat') return (div.includes('dalam negeri') || div.includes('sekretaris') || div.includes('keuangan') || div.includes('inti'));
        if (eid === 'dpm_pusat') return (div.includes('anggaran') || div.includes('inti') || div.includes('pimpinan'));
        return false;
    }, [activeRole, isMaster]);

    const showActivityMenu = useMemo(() => {
        return isMaster || (!!activeRole && activeRole.entity_id !== 'master');
    }, [isMaster, activeRole]);

    // --- MENU CONFIG ---
    const linksUtama = [
        { to: '/admin', text: 'Ringkasan', icon: <LayoutDashboard size={20} /> },
        { to: 'profil', text: 'Profil Saya', icon: <Users size={20} /> },
        // Histori hanya untuk Master
        { to: 'histori', text: 'Log Aktivitas', icon: <Archive size={20} />, show: isMaster }, 
        // Verifikasi Publikasi sekarang hanya untuk Master
        { to: 'kelola-publikasi', text: 'Verifikasi Publikasi', icon: <CheckCircle2 size={20} />, show: isMaster }, 
    ];

    const menuBemWebsite = [
        { to: 'struktur', text: 'Kelola Struktur BEM', icon: <Network size={20} /> },
        { to: 'dokumen', text: 'Kelola Dokumen BEM', icon: <FolderKanban size={20} /> },
        { to: 'layanan', text: 'Kelola Layanan BEM', icon: <Handshake size={20} /> },
        { to: 'kelola-tentang', text: 'Kelola Tentang BEM', icon: <Info size={20} /> },
        { to: 'kelola-berita', text: 'Kelola Berita BEM', icon: <Newspaper size={20} /> },
    ];

    const menuBemTransparansi = [
        { to: 'anggaran', text: 'Kelola Anggaran KM', icon: <Landmark size={20} />, show: isKemenkeu },
        { to: 'proker', text: 'Kelola Proker KM', icon: <Briefcase size={20} />, show: isBemPusat }, 
        { to: 'risalah-rapat', text: 'Kelola Risalah KM', icon: <FileText size={20} />, show: isSekjenPusat },
        { to: 'aset-bem', text: 'Kelola Aset BEM', icon: <Building2 size={20} />, show: isKemenkeu },
    ];

    const menuBemBirokrasi = [
        { to: 'kelola-penanggalan', text: 'Kelola Penanggalan', icon: <CalendarDays size={20} />, show: isDagriPusat },
        { to: 'peminjaman-sc', text: 'Peminjaman SC (Admin)', icon: <ClipboardList size={20} />, show: isPoraPusat },
        { to: 'berkas', text: 'Arsip Berkas KM', icon: <Archive size={20} />, show: isBemPusat },
    ];

    const linksManajemenKM = [
        { to: 'perencanaan-rkt', text: 'Perencanaan RKT', icon: <FileText size={20} /> },
        { to: 'program-divisi', text: 'Pengajuan Kegiatan', icon: <Briefcase size={20} /> },
        { to: 'verifikasi-internal', text: 'Verifikasi Internal', icon: <CheckCircle2 size={20} />, show: isLeaderInternal },
        { to: 'verifikasi-rkt', text: 'Verifikasi RKT (DPM)', icon: <ShieldCheck size={20} />, show: isExternalReviewer },
        { to: 'verifikasi-eksternal', text: 'Verifikasi Kegiatan', icon: <Building2 size={20} />, show: isExternalReviewer },
    ];

    const menuMaster = [
        { to: 'organisasi', text: 'Data Organisasi', icon: <Building2 size={20} /> },
        { to: 'verifikasi-pengguna', text: 'Verifikasi User Baru', icon: <Users size={20} /> },
        { to: 'kelola-admin', text: 'Verifikasi User Lama', icon: <Users size={20} /> },
        { to: 'manajemen-voting', text: 'Manajemen E-Voting', icon: <Vote size={20} /> },
        { to: 'konfigurasi-sistem', text: 'Metadata Organisasi', icon: <Settings size={20} /> },
        { to: 'config-sistem', text: 'Setting Rakor', icon: <Settings size={20} /> }
    ];

    const switchRole = (index) => {
        setActiveRoleIndex(index);
        setIsRoleDropdownOpen(false);
        navigate('/admin'); 
    };

    const hasAccess = (targetEntityId, targetDivision = null) => {
        if (!activeRole) return false;
        if (profil.role_global === 'master') return true;
        const isEntityMatch = activeRole.entity_id === targetEntityId;
        const isDivMatch = targetDivision ? activeRole.division === targetDivision : true;
        return isEntityMatch && isDivMatch;
    };

    const renderNavLink = (item) => {
        // 1. Prioritas utama: Jika properti 'show' ada dan nilainya false, langsung sembunyikan.
        if (item.show === false) return null;

        // 2. Cek Master Only (untuk pengamanan tambahan)
        if (item.masterOnly && !isMaster) return null;

        // 3. Cek Permission Entity lama (jika masih dipakai)
        if (item.reqEntity && !hasAccess(item.reqEntity, item.reqDiv)) return null;

        return (
            <NavLink 
                key={item.to} 
                to={item.to} 
                end={item.to === '/admin'} 
                style={({isActive}) => isActive ? styles.activeLink : styles.navLink} 
                className="nav-link" 
                onClick={() => setSidebarOpen(false)}
            >
                {item.icon} <span>{item.text}</span>
            </NavLink>
        );
    };

    const toggleMenu = (menuName) => setOpenMenus(prev => ({ ...prev, [menuName]: !prev[menuName] }));
    const handleLogout = () => { setSidebarOpen(false); signOut(auth).then(() => navigate("/login")); };

    if (loading || !profil) return <LoadingSpinner />;

    const RoleInfo = () => (
        <div>
            <div style={{fontWeight:'700', fontSize:'0.9rem'}}>{activeRole?.position || 'Guest'}</div>
            <div style={{fontSize:'0.75rem', opacity: 0.8}}>{activeRole?.division || '-'}</div>
            <div style={{fontSize:'0.7rem', color:'#94a3b8'}}>{activeRole?.entity_name || '-'}</div>
        </div>
    );

    const styles = {
        layout: { display: 'flex', minHeight: `calc(100vh - ${REAL_NAVBAR_HEIGHT})`, backgroundColor: '#f8fafc', position: 'relative', marginTop: MAIN_HEADER_HEIGHT },
        sidebar: { position: 'fixed', top: REAL_NAVBAR_HEIGHT, left: 0, width: '280px', height: `calc(100vh - ${REAL_NAVBAR_HEIGHT})`, backgroundColor: '#1e293b', color: '#e2e8f0', padding: '20px', display: 'flex', flexDirection: 'column', zIndex: 1100, transform: 'translateX(-100%)', transition: 'transform 0.3s ease-in-out' },
        sidebarOpen: { transform: 'translateX(0)', boxShadow: '10px 0 20px rgba(0,0,0,0.2)' },
        sidebarHeader: { display: 'flex', flexDirection: 'column', borderBottom: '1px solid #334155', paddingBottom: '20px', marginBottom: '20px', position: 'relative' },
        profileRow: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' },
        profileImage: { width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #475569' },
        profileName: { color: '#ffffff', fontSize: '0.9rem', fontWeight: '600', margin: 0 },
        roleSwitcher: { background: '#334155', border: '1px solid #475569', borderRadius: '8px', padding: '10px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white', fontSize: '0.85rem' },
        roleDropdown: { background: '#1e293b', border: '1px solid #475569', borderRadius: '8px', marginTop: '8px', overflow: 'hidden', position: 'absolute', top: '100%', left: 0, width: '100%', zIndex: 50, boxShadow: '0 4px 6px rgba(0,0,0,0.3)' },
        roleOption: { padding: '10px', cursor: 'pointer', borderBottom: '1px solid #334155', fontSize: '0.85rem', color: '#cbd5e0' },
        roleOptionActive: { background: '#2563eb', color: 'white' },
        nav: { display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1, overflowY: 'auto' },
        navLink: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', textDecoration: 'none', color: '#cbd5e0', borderRadius: '8px', transition: 'background-color 0.2s ease, color 0.2s ease' },
        activeLink: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', textDecoration: 'none', borderRadius: '8px', backgroundColor: '#334155', color: '#ffffff', fontWeight: '600' },
        divider: { border: 'none', borderTop: '1px solid #334155', margin: '16px 0' },
        mainContainer: { width: '100%', display: 'flex', flexDirection: 'column' },
        mobileHeader: { display: 'flex', alignItems: 'center', padding: '16px', backgroundColor: '#ffffff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', color: '#1e293b', zIndex: 900 },
        hamburgerButton: { background: 'none', border: 'none', cursor: 'pointer', color: '#1e293b', padding: 0 },
        mobileHeaderText: { marginLeft: '16px', fontSize: '1.1rem', fontWeight: '600' },
        closeButton: { position: 'absolute', top: '0', right: '0', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' },
        content: { flex: 1, padding: '24px', overflowY: 'auto' },
        logoutButton: { display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 16px', backgroundColor: 'transparent', color: '#cbd5e0', border: '1px solid #334155', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontSize: '1rem', transition: 'background-color 0.2s ease, color 0.2s ease' },
        overlay: { position: 'fixed', top: MAIN_HEADER_HEIGHT, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1050 },
        maintBadge: { background: '#ef4444', color: 'white', fontSize: '0.7rem', padding: '2px 8px', borderRadius: 10, marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }
    };

    return (
        <AdminContext.Provider value={{ profil, sysConfig, activeRole }}>
            <div style={styles.layout}>
                {isSidebarOpen && <div style={styles.overlay} onClick={() => setSidebarOpen(false)}></div>}

                <aside className="admin-sidebar" style={{...styles.sidebar, ...(isSidebarOpen ? styles.sidebarOpen : {})}}>
                    <div style={styles.sidebarHeader}>
                        <button style={styles.closeButton} className="sidebar-close-button" onClick={() => setSidebarOpen(false)}><X size={24} /></button>
                        <div style={styles.profileRow}>
                            <img src={profil?.foto || `https://ui-avatars.com/api/?name=${profil?.namaTampilan?.replace(/\s/g, '+') || 'User'}&background=334155&color=fff&font-size=0.5`} alt="Profil" style={styles.profileImage} />
                            <div>
                                <h2 style={styles.profileName}>{profil?.namaTampilan}</h2>
                                {sysConfig?.isSystemMaintenance && <div style={styles.maintBadge}><AlertTriangle size={10}/> Maintenance</div>}
                            </div>
                        </div>

                        {profil.assignments && profil.assignments.length > 1 ? (
                            <div style={{position: 'relative'}}>
                                <div style={styles.roleSwitcher} onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}>
                                    <RoleInfo /><ChevronsUpDown size={16}/>
                                </div>
                                {isRoleDropdownOpen && (
                                    <div style={styles.roleDropdown}>
                                        {profil.assignments.map((role, idx) => (
                                            <div key={idx} style={{...styles.roleOption, ...(idx === activeRoleIndex ? styles.roleOptionActive : {})}} onClick={() => switchRole(idx)}>
                                                <strong>{role.position}</strong> - {role.entity_name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (<div style={{padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px'}}><RoleInfo /></div>)}
                    </div>

                    <nav style={styles.nav}>
                        {linksUtama.map(renderNavLink)}

                        {isBemPusat && (
                            <>
                                <hr style={styles.divider} />
                                <div className="nav-group">
                                    <button className="nav-dropdown-toggle" onClick={() => toggleMenu('kelolaWebsite')}>
                                        <div className="nav-link-content"><Network size={20} /><span>Kelola Website</span></div>
                                        <ChevronDown size={16} className={`chevron ${openMenus.kelolaWebsite ? 'open' : ''}`} />
                                    </button>
                                    {openMenus.kelolaWebsite && <div className="nav-submenu">{menuBemWebsite.map(renderNavLink)}</div>}
                                </div>

                                <div className="nav-group" style={{marginTop:8}}>
                                    <button className="nav-dropdown-toggle" onClick={() => toggleMenu('keterbukaanInformasi')}>
                                        <div className="nav-link-content"><Landmark size={20} /><span>Kelola Transparansi</span></div>
                                        <ChevronDown size={16} className={`chevron ${openMenus.keterbukaanInformasi ? 'open' : ''}`} />
                                    </button>
                                    {openMenus.keterbukaanInformasi && <div className="nav-submenu">{menuBemTransparansi.map(renderNavLink)}</div>}
                                </div>

                                <div style={{padding:'16px 16px 8px', fontSize:'0.7rem', textTransform:'uppercase', color:'#64748b', fontWeight:700}}>Birokrasi Pusat</div>
                                {menuBemBirokrasi.map(renderNavLink)}
                            </>
                        )}

                        {showActivityMenu && (
                            <>
                                <hr style={styles.divider} />
                                <div style={{padding:'0 16px 8px', fontSize:'0.7rem', textTransform:'uppercase', color:'#64748b', fontWeight:700}}>Manajemen Kegiatan</div>
                                {linksManajemenKM.map(renderNavLink)}
                            </>
                        )}

                        {isMaster && (
                            <>
                                <hr style={styles.divider} />
                                <div style={{padding:'0 16px 8px', fontSize:'0.7rem', textTransform:'uppercase', color:'#64748b', fontWeight:700}}>Master Menu</div>
                                {menuMaster.map(renderNavLink)}
                            </>
                        )}

                        <hr style={styles.divider} />
                        <NavLink to="/dashboard-pemilih" className="nav-link" style={styles.navLink}>
                            <Vote size={20}/> <span>Ke Dashboard Pemilih</span>
                        </NavLink>
                    </nav>

                    <div style={{marginTop: 'auto'}}>
                        <button onClick={handleLogout} style={styles.logoutButton} className="logout-button">
                            <LogOut size={20} /><span>Logout</span>
                        </button>
                    </div>
                </aside>

                <div style={styles.mainContainer}>
                    <header style={styles.mobileHeader} className="mobile-header">
                        <button style={styles.hamburgerButton} onClick={() => setSidebarOpen(true)}><Menu size={28} /></button>
                        <span style={styles.mobileHeaderText}>Admin Dashboard</span>
                    </header>
                    <main className="admin-content" style={styles.content}>
                        <Outlet />
                    </main>
                </div>
            </div>
        </AdminContext.Provider>
    );
};

// CSS Injection
const styleSheet = document.createElement("style");
styleSheet.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    .admin-layout { display: flex; min-height: 100vh; background-color: #f8fafc; }
    .main-container { flex: 1; display: flex; flex-direction: column; }
    .admin-content { flex: 1; padding: 24px; overflow-y: auto; }
    .overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.5); z-index: 1050; }
    .admin-sidebar { background-color: #1e293b; color: #e2e8f0; width: 280px; position: fixed; top: 0; left: 0; height: 100%; display: flex; flex-direction: column; z-index: 1100; transform: translateX(-100%); transition: transform 0.3s ease-in-out; }
    .admin-sidebar.open { transform: translateX(0); box-shadow: 10px 0 20px rgba(0,0,0,0.2); }
    .nav-link { display: flex; align-items: center; gap: 12px; padding: 12px 16px; text-decoration: none; color: #cbd5e0; border-radius: 8px; transition: all 0.2s ease; }
    .nav-link.active { background-color: #334155; color: #ffffff; font-weight: 600; }
    .nav-link:hover:not(.active) { background-color: #334155; color: #ffffff; }
    .nav-group { display: flex; flex-direction: column; }
    .nav-dropdown-toggle { display: flex; align-items: center; justify-content: space-between; width: 100%; background: none; border: none; cursor: pointer; padding: 12px 16px; color: #cbd5e0; border-radius: 8px; transition: all 0.2s ease; }
    .nav-dropdown-toggle:hover { background-color: #334155; color: #ffffff; }
    .nav-link-content { display: flex; align-items: center; gap: 12px; }
    .chevron { transition: transform 0.2s ease-in-out; }
    .chevron.open { transform: rotate(180deg); }
    .nav-submenu { display: flex; flex-direction: column; gap: 4px; margin: 4px 0 0 16px; padding-left: 28px; border-left: 1px solid #475569; }
    .logout-button:hover { background-color: #b91c1c !important; border-color: #b91c1c !important; color: #ffffff !important; }
    @media (min-width: 1024px) {
        .admin-layout { display: block; } 
        .main-container { padding-left: 280px; }
        .admin-sidebar { transform: translateX(0); box-shadow: none !important; }
        .mobile-header, .sidebar-close-button, .overlay { display: none; }
        .admin-content { padding: 32px; }
    }
`;
document.head.appendChild(styleSheet);

export default AdminLayout;