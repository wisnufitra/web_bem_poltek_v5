import React, { useState, useEffect, useMemo } from 'react';
import { useAdmin } from '../layouts/AdminLayout';
import { db } from '../firebase/firebaseConfig';
import { collection, query, where, getDocs, getCountFromServer, orderBy, limit } from 'firebase/firestore';
import { 
    Wallet, FileText, Activity, AlertCircle, AlertTriangle,
    CheckCircle2, Clock, ArrowRight, TrendingUp,
    Users, Shield, Vote, Bell, Building2, Lock
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Admin = () => {
    // 1. AMBIL CONTEXT (Agar dashboard ikut berubah saat role diganti)
    const { profil, sysConfig, activeRole } = useAdmin();
    
    // State Data
    const [stats, setStats] = useState({
        budgetTotal: 0,
        budgetUsed: 0,
        proposalPending: 0,
        proposalNeedRevision: 0,
        rktStatus: 'NOT_SUBMITTED',
        // Master Stats
        totalUsers: 0,
        totalOrgs: 0
    });
    
    const [recentActivities, setRecentActivities] = useState([]);
    const [greeting, setGreeting] = useState("");
    const [loading, setLoading] = useState(true);

    const periodeAktif = sysConfig?.activePeriod || "2025/2026";

    // 2. Logic Sapaan Waktu
    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 11) setGreeting("Selamat Pagi");
        else if (hour < 15) setGreeting("Selamat Siang");
        else if (hour < 18) setGreeting("Selamat Sore");
        else setGreeting("Selamat Malam");
    }, []);

    // --- LOGIC DETEKSI TIPE USER ---
    const userType = useMemo(() => {
        if (profil?.role_global === 'master') return 'MASTER';
        if (!activeRole) return 'GUEST';

        const eid = activeRole.entity_id;
        const div = (activeRole.division || '').toLowerCase();

        // Cek Birokrat Pusat (Reviewer)
        if ((eid === 'bem_pusat' && ['inti', 'sekretariat jenderal', 'kementerian keuangan', 'kementerian dalam negeri', 'bendahara'].some(k => div.includes(k))) ||
            (eid === 'dpm_pusat' && div.includes('anggaran'))) {
            return 'REVIEWER';
        }
        
        // Sisanya adalah Ormawa (HIMA/UKM)
        return 'ORMAWA';
    }, [profil, activeRole]);

    // --- FETCH DATA DASHBOARD ---
    useEffect(() => {
        if (!sysConfig) return;

        const loadDashboard = async () => {
            setLoading(true);
            try {
                // 1. STATISTIK MASTER (Global)
                if (userType === 'MASTER') {
                    const [snapUser, snapOrg] = await Promise.all([
                        getCountFromServer(collection(db, 'users')),
                        // Hitung jumlah key di dokumen metadata (agak tricky, jadi kita mock dulu atau ambil dr collection lain jika ada)
                        // Untuk performa, kita skip hitung org detail, fokus user aja
                    ]);
                    
                    setStats(prev => ({
                        ...prev,
                        totalUsers: snapUser.data().count,
                        totalOrgs: 15 // Placeholder atau ambil real dari metadata
                    }));
                }

                // 2. STATISTIK ORMAWA (HIMA/UKM) - Butuh activeRole
                else if (userType === 'ORMAWA' && activeRole) {
                    // A. Cek Status RKT & Budget
                    const rktQ = query(
                        collection(db, 'rkt_submissions'),
                        where('orgId', '==', activeRole.entity_id),
                        where('periode', '==', periodeAktif)
                    );
                    const rktSnap = await getDocs(rktQ);
                    
                    let limit = 0;
                    let rktSts = 'Belum Upload';
                    
                    if (!rktSnap.empty) {
                        const d = rktSnap.docs[0].data();
                        limit = d.finalBudgetLimit || 0;
                        rktSts = d.status;
                    }

                    // B. Hitung Serapan Anggaran (Dari Programs)
                    const progQ = query(
                        collection(db, 'programs'),
                        where('orgId', '==', activeRole.entity_id),
                        where('periode', '==', periodeAktif)
                    );
                    const progSnap = await getDocs(progQ);
                    const used = progSnap.docs.reduce((acc, curr) => acc + (parseInt(curr.data().estimasiBiaya) || 0), 0);

                    // C. Cek Proposal Butuh Revisi (Internal Divisi ataupun KM)
                    const propQ = query(
                        collection(db, 'activity_proposals'),
                        where('orgId', '==', activeRole.entity_id),
                        where('status', 'in', ['REVISION_INTERNAL', 'REVISION_KM'])
                    );
                    const propSnap = await getDocs(propQ);

                    setStats(prev => ({
                        ...prev,
                        budgetTotal: limit,
                        budgetUsed: used,
                        proposalNeedRevision: propSnap.size,
                        rktStatus: rktSts
                    }));
                }

                // 3. STATISTIK REVIEWER (BEM/DPM) - Butuh activeRole
                else if (userType === 'REVIEWER' && activeRole) {
                    // Hitung berapa proposal yang statusnya WAITING di meja mereka
                    const waitQ = query(
                        collection(db, 'activity_proposals'),
                        where('status', '==', 'WAITING_KM')
                    );
                    const waitSnap = await getDocs(waitQ);
                    
                    // Hitung RKT yang pending
                    const rktPendingQ = query(
                        collection(db, 'rkt_submissions'),
                        where('status', '==', 'PENDING_REVIEW'),
                        where('periode', '==', periodeAktif)
                    );
                    const rktPendingSnap = await getDocs(rktPendingQ);

                    setStats(prev => ({
                        ...prev,
                        proposalPending: waitSnap.size,
                        rktPending: rktPendingSnap.size
                    }));
                }

                // 4. AKTIVITAS TERAKHIR (Global Mock / Real)
                // Disini kita bisa ambil log terakhir yang relevan
                setRecentActivities([]); // Kosongkan dulu untuk kesederhanaan

            } catch (error) {
                console.error("Dashboard error:", error);
            } finally {
                setLoading(false);
            }
        };

        loadDashboard();
    }, [activeRole, userType, sysConfig, periodeAktif]);

    const formatRp = (num) => "Rp " + new Intl.NumberFormat('id-ID').format(num);

    // --- HELPER COMPONENTS ---

    const StatWidget = ({ title, value, icon: Icon, color, subtext, link }) => (
        <div className="stat-widget" style={{ borderBottom: `4px solid ${color}` }}>
            <div className="stat-header">
                <div className="stat-icon-bg" style={{ backgroundColor: `${color}15`, color: color }}>
                    <Icon size={24} />
                </div>
            </div>
            <div className="stat-body">
                <h3 className="stat-value">{value}</h3>
                <p className="stat-title">{title}</p>
                {subtext && <p className="stat-sub">{subtext}</p>}
                {link && (
                    <Link to={link} className="stat-link" style={{color: color}}>
                        Lihat Detail <ArrowRight size={14}/>
                    </Link>
                )}
            </div>
        </div>
    );

    const WelcomeBanner = () => (
        <div className="welcome-banner">
            <div className="welcome-text">
                <h1>{greeting}, {profil?.namaTampilan.split(' ')[0]}! 👋</h1>
                <p>
                    {userType === 'MASTER' 
                        ? 'Anda login sebagai Super Admin System.'
                        : <>Anda aktif sebagai <span className="role-badge">{activeRole?.position}</span> di <strong>{activeRole?.entity_name}</strong>.</>
                    }
                </p>
            </div>
            <div className="date-display">
                <Clock size={16} />
                <span>{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
        </div>
    );

    if (loading) return <div style={{padding:40, textAlign:'center'}}>Memuat Dashboard...</div>;

    return (
        <div className="dashboard-container">
            <style>{cssStyles}</style>
            <WelcomeBanner />

            {/* --- DASHBOARD UNTUK ORMAWA (HIMA/UKM) --- */}
            {userType === 'ORMAWA' && (
                <div className="dashboard-grid">
                    <div className="left-column">
                        <div className="stats-row">
                            {/* Card 1: Status RKT */}
                            <div className="content-card">
                                <div className="card-header">
                                    <h3><FileText size={20} color="#64748b"/> Status RKT Tahunan</h3>
                                </div>
                                <div className="card-body-center">
                                    <div className={`status-pill large ${stats.rktStatus}`}>
                                        {stats.rktStatus === 'APPROVED' ? <CheckCircle2 size={20}/> : 
                                         stats.rktStatus === 'PENDING_REVIEW' ? <Clock size={20}/> : 
                                         <AlertCircle size={20}/>}
                                        <span>{stats.rktStatus === 'APPROVED' ? 'Disetujui' : stats.rktStatus === 'PENDING_REVIEW' ? 'Menunggu Review' : 'Belum/Revisi'}</span>
                                    </div>
                                    <p className="status-desc">
                                        {stats.rktStatus !== 'APPROVED' 
                                            ? "Segera selesaikan proposal tahunan Anda agar anggaran bisa cair." 
                                            : "RKT disetujui. Anda dapat mulai mengajukan kegiatan."}
                                    </p>
                                    {stats.rktStatus !== 'APPROVED' && (
                                        <Link to="/admin/perencanaan-rkt" className="btn-action primary">Cek Proposal</Link>
                                    )}
                                </div>
                            </div>

                            {/* Card 2: Anggaran */}
                            <div className="content-card">
                                <div className="card-header">
                                    <h3><Wallet size={20} color="#64748b"/> Serapan Anggaran</h3>
                                </div>
                                <div className="budget-display">
                                    <div className="budget-val">{formatRp(stats.budgetUsed)}</div>
                                    <div className="budget-sub">dari Pagu {formatRp(stats.budgetTotal)}</div>
                                </div>
                                <div className="progress-bg">
                                    <div className="progress-fill" style={{
                                        width: stats.budgetTotal > 0 ? `${Math.min((stats.budgetUsed/stats.budgetTotal)*100, 100)}%` : '0%',
                                        background: stats.budgetUsed > stats.budgetTotal ? '#ef4444' : '#3b82f6'
                                    }}></div>
                                </div>
                                <div className="budget-footer">
                                    <span>{stats.budgetTotal > 0 ? ((stats.budgetUsed/stats.budgetTotal)*100).toFixed(1) : 0}% Terserap</span>
                                </div>
                            </div>

                            {/* Card 3: Revisi */}
                            <div className="content-card">
                                <div className="card-header">
                                    <h3><AlertCircle size={20} color="#ef4444"/> Perlu Tindakan</h3>
                                </div>
                                <div className="action-stat">
                                    <strong>{stats.proposalNeedRevision}</strong>
                                    <span>Proposal Butuh Revisi</span>
                                </div>
                                {stats.proposalNeedRevision > 0 ? (
                                    <Link to="/admin/program-divisi" className="btn-action danger">Perbaiki Sekarang</Link>
                                ) : (
                                    <div className="all-clear">
                                        <CheckCircle2 size={24} color="#10b981"/> Semua aman.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- DASHBOARD UNTUK REVIEWER (BEM/DPM) --- */}
            {userType === 'REVIEWER' && (
                <div className="dashboard-grid">
                    <div className="left-column">
                        <div className="stats-row">
                            <StatWidget 
                                title="RKT Menunggu" 
                                value={stats.rktPending} 
                                icon={FileText} 
                                color="#2563eb" 
                                subtext="Proposal Tahunan Baru"
                                link="/admin/verifikasi-rkt"
                            />
                            <StatWidget 
                                title="Proposal Kegiatan" 
                                value={stats.proposalPending} 
                                icon={Activity} 
                                color="#f59e0b" 
                                subtext="Event Menunggu Review"
                                link="/admin/verifikasi-eksternal"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* --- DASHBOARD MASTER --- */}
            {userType === 'MASTER' && (
                <div className="dashboard-grid">
                    <div className="left-column">
                        <div className="stats-row">
                            <StatWidget title="Total User" value={stats.totalUsers} icon={Users} color="#8b5cf6"/>
                            <StatWidget title="Total Organisasi" value={stats.totalOrgs} icon={Shield} color="#10b981"/>
                        </div>
                        
                        <div className="master-panel">
                            <h3>Panel Super Admin</h3>
                            <div className="shortcuts-grid">
                                <Link to="/admin/konfigurasi-sistem" className="shortcut-card">
                                    <div className="icon-box"><Activity/></div>
                                    <span>Konfigurasi Sistem</span>
                                </Link>
                                <Link to="/admin/verifikasi-pengguna" className="shortcut-card">
                                    <div className="icon-box"><Users/></div>
                                    <span>Kelola User</span>
                                </Link>
                                <Link to="/admin/organisasi" className="shortcut-card">
                                    <div className="icon-box"><Building2/></div>
                                    <span>Master Organisasi</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Tampilan jika belum ada Role (Guest/Error) */}
            {userType === 'GUEST' && (
                <div className="empty-state">
                    <AlertTriangle size={48} color="#f59e0b"/>
                    <h2>Akun Belum Memiliki Jabatan</h2>
                    <p>Hubungi admin pusat untuk mendapatkan akses ke organisasi.</p>
                </div>
            )}
        </div>
    );
};

// --- CSS STYLES ---
const cssStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    .dashboard-container { font-family: 'Inter', sans-serif; color: #1e293b; max-width: 1400px; margin: 0 auto; }

    /* Welcome Banner */
    .welcome-banner {
        background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
        color: white; padding: 32px; border-radius: 16px; margin-bottom: 32px;
        display: flex; justify-content: space-between; align-items: flex-end;
        box-shadow: 0 10px 25px -5px rgba(30, 41, 59, 0.3);
    }
    .welcome-text h1 { margin: 0 0 8px 0; font-size: 1.8rem; font-weight: 700; }
    .welcome-text p { margin: 0; color: #94a3b8; font-size: 0.95rem; }
    .role-badge { background: #f59e0b; padding: 2px 8px; border-radius: 6px; color: #fff; font-weight: 700; font-size: 0.85rem; margin-left: 0px; text-transform: uppercase; }
    .date-display { display: flex; align-items: center; gap: 8px; background: rgba(0,0,0,0.2); padding: 8px 12px; border-radius: 8px; font-size: 0.9rem; color: #cbd5e0; }

    /* Layout */
    .dashboard-grid { display: flex; flex-direction: column; gap: 24px; }
    .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; }

    /* Cards Common */
    .content-card { background: white; border-radius: 16px; border: 1px solid #e2e8f0; padding: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); display: flex; flexDirection: column; height: 100%; }
    .card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #f1f5f9; }
    .card-header h3 { margin: 0; font-size: 1.1rem; font-weight: 600; color: #1e293b; display: flex; align-items: center; gap: 10px; }

    /* RKT Status Card */
    .card-body-center { display: flex; flex-direction: column; align-items: center; text-align: center; flex: 1; justify-content: center; }
    .status-pill { padding: 8px 16px; border-radius: 50px; font-weight: 700; display: flex; align-items: center; gap: 8px; font-size: 0.9rem; margin-bottom: 12px; }
    .status-pill.large { font-size: 1.1rem; padding: 10px 24px; }
    .status-pill.APPROVED { background: #dcfce7; color: #166534; }
    .status-pill.PENDING_REVIEW { background: #ffedd5; color: #c2410c; }
    .status-pill.NOT_SUBMITTED { background: #f1f5f9; color: #64748b; }
    .status-desc { color: #64748b; font-size: 0.9rem; margin-bottom: 20px; line-height: 1.5; }

    /* Budget Card */
    .budget-display { margin-bottom: 16px; }
    .budget-val { font-size: 2rem; font-weight: 800; color: #0f172a; line-height: 1; }
    .budget-sub { color: #64748b; font-size: 0.9rem; margin-top: 4px; }
    .progress-bg { width: 100%; height: 10px; background: #f1f5f9; border-radius: 5px; overflow: hidden; margin-bottom: 8px; }
    .progress-fill { height: 100%; border-radius: 5px; transition: width 0.5s ease; }
    .budget-footer { font-size: 0.85rem; font-weight: 600; color: #3b82f6; text-align: right; }

    /* Action Card */
    .action-stat { font-size: 3rem; font-weight: 800; color: #ef4444; line-height: 1; margin-bottom: 8px; display: flex; flex-direction: column; align-items: center; }
    .action-stat span { font-size: 1rem; color: #64748b; font-weight: 500; margin-top: 4px; }
    .all-clear { display: flex; align-items: center; gap: 8px; color: #10b981; font-weight: 600; background: #f0fdf4; padding: 12px; border-radius: 8px; }

    /* Buttons */
    .btn-action { display: inline-flex; align-items: center; justify-content: center; padding: 10px 20px; border-radius: 8px; font-weight: 600; text-decoration: none; transition: all 0.2s; width: 100%; box-sizing: border-box; }
    .btn-action.primary { background: #3b82f6; color: white; }
    .btn-action.primary:hover { background: #2563eb; }
    .btn-action.danger { background: #ef4444; color: white; }
    .btn-action.danger:hover { background: #dc2626; }

    /* Stat Widgets (Reviewer/Master) */
    .stat-widget { background: white; padding: 20px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 2px 4px rgba(0,0,0,0.02); transition: transform 0.2s; display: flex; flex-direction: column; height: 100%; }
    .stat-widget:hover { transform: translateY(-2px); box-shadow: 0 8px 12px rgba(0,0,0,0.05); }
    .stat-header { margin-bottom: 12px; }
    .stat-icon-bg { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
    .stat-value { font-size: 2rem; font-weight: 800; color: #0f172a; margin: 0; line-height: 1; }
    .stat-title { font-size: 0.95rem; color: #64748b; margin: 4px 0 0 0; font-weight: 600; }
    .stat-sub { font-size: 0.8rem; color: #94a3b8; margin: 4px 0 16px 0; }
    .stat-link { font-size: 0.85rem; font-weight: 600; display: flex; align-items: center; gap: 4px; margin-top: auto; text-decoration: none; }

    /* Master Panel */
    .master-panel { margin-top: 32px; background: #f8fafc; padding: 24px; border-radius: 16px; border: 1px solid #e2e8f0; }
    .master-panel h3 { margin: 0 0 16px 0; color: #334155; }
    .shortcuts-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
    .shortcut-card { background: white; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; align-items: center; gap: 12px; text-decoration: none; color: #334155; font-weight: 600; transition: all 0.2s; text-align: center; }
    .shortcut-card:hover { border-color: #3b82f6; color: #2563eb; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1); }
    .icon-box { background: #eff6ff; color: #2563eb; padding: 12px; border-radius: 50%; }

    /* Empty State */
    .empty-state { text-align: center; padding: 60px 20px; color: #64748b; background: white; border-radius: 16px; border: 1px dashed #e2e8f0; }

    /* Responsive */
    @media (max-width: 768px) {
        .dashboard-grid { display: flex; flex-direction: column; }
        .welcome-banner { flex-direction: column; align-items: flex-start; gap: 16px; }
    }
`;

export default Admin;