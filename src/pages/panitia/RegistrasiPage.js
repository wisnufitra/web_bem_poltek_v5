import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../../firebase/firebaseConfig';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp, onSnapshot, collection, query, where } from 'firebase/firestore';
import { signInAnonymously, signOut } from 'firebase/auth';
import { 
    Search, UserCheck, LogOut, Ticket, AlertCircle, CheckCircle2, Monitor, 
    HelpCircle, XCircle, User, Activity, Clock, RefreshCw, Trash2, 
    Wifi, WifiOff, Lock, ChevronRight 
} from 'lucide-react';

// --- HELPER: LOGIN & AUTH ---
const usePetugasAuth = (eventId) => {
    const [petugas, setPetugas] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isProfileReady, setIsProfileReady] = useState(false);
    const navigate = useNavigate();

    const ensureFirestoreProfile = async (user, petugasData) => {
        if (!user || !petugasData) return;
        try {
            await setDoc(doc(db, 'users', user.uid), {
                role: 'petugas', 
                eventId: eventId, 
                username: petugasData.username,
                createdAt: serverTimestamp(),
                isAnonymousInfo: true
            });
            setIsProfileReady(true);
        } catch (error) {
            console.error("Gagal memperbarui profil petugas:", error);
        }
    };

    useEffect(() => {
        const initAuth = async () => {
            const session = localStorage.getItem(`petugas_session_${eventId}`);
            if (session) {
                const data = JSON.parse(session);
                if (data.role === 'registrasi') {
                    setPetugas(data);
                    if (!auth.currentUser) {
                        try {
                            const cred = await signInAnonymously(auth);
                            await ensureFirestoreProfile(cred.user, data);
                        } catch (e) { 
                            console.error("Auto-login gagal:", e); 
                        }
                    } else {
                        await ensureFirestoreProfile(auth.currentUser, data);
                    }
                }
            }
            setLoading(false);
        };
        initAuth();
    }, [eventId]);

    const login = async (username, password) => {
        try {
            const eventRef = doc(db, 'pemilihan_events', eventId);
            const snap = await getDoc(eventRef);
            
            if (snap.exists()) {
                const data = snap.data();
                const validUser = data.petugas?.find(p => 
                    p.username === username && 
                    p.password === password && 
                    p.role === 'registrasi'
                );

                if (validUser) {
                    localStorage.setItem(`petugas_session_${eventId}`, JSON.stringify(validUser));
                    setPetugas(validUser);
                    const userCredential = await signInAnonymously(auth); 
                    await ensureFirestoreProfile(userCredential.user, validUser);
                    return { success: true };
                }
            }
            return { success: false, message: 'Username atau password salah.' };
        } catch (error) {
            console.error(error);
            return { success: false, message: 'Terjadi kesalahan koneksi.' };
        }
    };

    const logout = async () => {
        localStorage.removeItem(`petugas_session_${eventId}`);
        setPetugas(null);
        setIsProfileReady(false);
        await signOut(auth);
    };

    return { petugas, loading, isProfileReady, login, logout };
};

const generateToken = () => Math.floor(100000 + Math.random() * 900000).toString();

// --- MAIN COMPONENT ---
const RegistrasiPage = () => {
    const { eventId } = useParams();
    const { petugas, isProfileReady, login, logout } = usePetugasAuth(eventId);
    
    // State
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [eventData, setEventData] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedToken, setGeneratedToken] = useState(null);
    const [assignedBooth, setAssignedBooth] = useState(1);
    const [selectedVoter, setSelectedVoter] = useState(null);
    const [activeTokens, setActiveTokens] = useState([]);
    const [totalVoted, setTotalVoted] = useState(0);
    const [networkQuality, setNetworkQuality] = useState('unknown'); 
    const [networkInfo, setNetworkInfo] = useState({ speed: 0 });

    // Network Monitoring
    useEffect(() => {
        const handleConnectionChange = () => {
            if (!navigator.onLine) { setNetworkQuality('offline'); return; }
            const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            if (connection) {
                const speed = connection.downlink; 
                const rtt = connection.rtt; 
                setNetworkInfo({ speed: speed });
                if (rtt > 500 || speed < 0.5) setNetworkQuality('poor'); 
                else if (rtt > 150 || speed < 2) setNetworkQuality('good'); 
                else setNetworkQuality('excellent'); 
            } else { setNetworkQuality('excellent'); }
        };
        window.addEventListener('online', handleConnectionChange);
        window.addEventListener('offline', handleConnectionChange);
        if (navigator.connection) navigator.connection.addEventListener('change', handleConnectionChange);
        handleConnectionChange();
        return () => {
            window.removeEventListener('online', handleConnectionChange);
            window.removeEventListener('offline', handleConnectionChange);
            if (navigator.connection) navigator.connection.removeEventListener('change', handleConnectionChange);
        };
    }, []);

    // Load Data
    useEffect(() => {
        if (petugas && eventId) {
            const docRef = doc(db, 'pemilihan_events', eventId);
            const unsub = onSnapshot(docRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setEventData(data);
                    const votedCount = Object.values(data.pemilihInfo || {}).filter(p => p.telahMemilih).length;
                    setTotalVoted(votedCount);
                }
            });
            return () => unsub();
        }
    }, [petugas, eventId]);

    useEffect(() => {
        if (petugas && isProfileReady && eventId) {
            const q = query(collection(db, 'kiosk_tokens'), where('eventId', '==', eventId));
            const unsubTokens = onSnapshot(q, (snapshot) => {
                const tokens = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                tokens.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                setActiveTokens(tokens);
            }, (err) => console.log("Menunggu sinkronisasi..."));
            return () => unsubTokens();
        }
    }, [petugas, isProfileReady, eventId]);

    // Handlers
    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginError('');
        setIsLoggingIn(true);
        const result = await login(username, password);
        if (!result.success) setLoginError(result.message);
        setIsLoggingIn(false);
    };

    const handleSearch = (e) => {
        const queryText = e.target.value;
        setSearchQuery(queryText);
        
        if (!eventData || !eventData.pemilih || queryText.length < 3) {
            setSearchResults([]);
            return;
        }

        const results = eventData.pemilih.filter(p => 
            p.nama.toLowerCase().includes(queryText.toLowerCase()) || 
            (p.nim && p.nim.includes(queryText))
        );
        
        const enrichedResults = results.map(p => {
            const info = eventData.pemilihInfo?.[p.uid];
            const activeToken = activeTokens.find(t => t.voterUid === p.uid);
            return { ...p, hasVoted: info?.telahMemilih || false, activeToken: activeToken };
        });

        setSearchResults(enrichedResults.slice(0, 5));
    };

    const handleBatalkanToken = async (tokenDocId) => {
        if (!window.confirm("Batalkan token ini? Pemilih harus antri ulang.")) return;
        try { await deleteDoc(doc(db, 'kiosk_tokens', tokenDocId)); } catch (error) { alert("Gagal membatalkan token."); }
    };

    const handleGenerateToken = async (voter) => {
        if (!eventData?.isOfflineMode) { alert("Mode Offline sedang tidak aktif."); return; }
        if (voter.hasVoted) return;
        
        if (voter.activeToken) {
            const confirm = window.confirm(`Pemilih ini SUDAH punya token aktif (${voter.activeToken.token}). Ganti baru?`);
            if (!confirm) return;
            try { await deleteDoc(doc(db, 'kiosk_tokens', voter.activeToken.id)); } catch (e) { console.error(e); }
        }
        
        setIsGenerating(true);
        try {
            const totalBilik = eventData.jumlahBilik || 1;
            const nextBooth = (activeTokens.length % totalBilik) + 1; 
            const token = generateToken();
            const expiredAt = new Date();
            expiredAt.setMinutes(expiredAt.getMinutes() + 5); 

            await setDoc(doc(db, 'kiosk_tokens', token), {
                token: token,
                eventId: eventId,
                voterUid: voter.uid,
                voterName: voter.nama,
                voterProdi: voter.prodi,
                booth: nextBooth,
                createdAt: serverTimestamp(),
                expiredAt: expiredAt.toISOString(),
                createdBy: petugas.username
            });

            setGeneratedToken(token);
            setAssignedBooth(nextBooth);
            setSelectedVoter(voter);
        } catch (error) {
            alert(`Gagal membuat token: ${error.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const closeTokenModal = () => {
        setGeneratedToken(null);
        setSelectedVoter(null);
        setSearchQuery('');
        setSearchResults([]);
    };

    const renderSignalBadge = () => {
        let colorClass = 'good';
        let text = 'Online';
        if (networkQuality === 'offline') { colorClass = 'offline'; text = 'Offline'; }
        else if (networkQuality === 'poor') { colorClass = 'poor'; text = `Lemah (${networkInfo.speed}M)`; }
        else if (networkQuality === 'excellent') { colorClass = 'excellent'; text = 'Stabil'; }

        return <div className={`signal-pill ${colorClass}`}>{networkQuality === 'offline' ? <WifiOff size={12}/> : <Wifi size={12}/>} {text}</div>;
    };

    const isOfflineActive = eventData?.isOfflineMode;

    // ---------------- VIEW: LOGIN PAGE ----------------
    if (!petugas) {
        return (
            <div className="login-wrapper">
                <div className="login-card">
                    <div className="login-header">
                        <div className="brand-icon"><Ticket size={32} strokeWidth={2}/></div>
                        <h1>Akses Kiosk</h1>
                        <p>Masuk untuk mengelola antrian pemilihan</p>
                    </div>
                    {loginError && <div className="error-banner"><AlertCircle size={16}/> {loginError}</div>}
                    <form onSubmit={handleLogin}>
                        <div className="form-group">
                            <label>Username</label>
                            <div className="input-container">
                                <User size={18} className="input-icon"/>
                                <input type="text" placeholder="ID Petugas" value={username} onChange={e => setUsername(e.target.value)} autoFocus required />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Password</label>
                            <div className="input-container">
                                <Lock size={18} className="input-icon"/>
                                <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                            </div>
                        </div>
                        <button type="submit" className="btn-primary" disabled={isLoggingIn}>
                            {isLoggingIn ? <RefreshCw className="spin" size={18}/> : 'Masuk Sistem'}
                        </button>
                    </form>
                    <div className="login-footer">
                        {renderSignalBadge()}
                        <span className="secure-tag"><Lock size={10}/> Enkripsi TLS</span>
                    </div>
                </div>
                <style>{`
                    .login-wrapper { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); font-family: 'Inter', sans-serif; padding: 20px; }
                    .login-card { background: white; width: 100%; max-width: 380px; padding: 40px; border-radius: 24px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.1); }
                    .login-header { text-align: center; margin-bottom: 30px; }
                    .brand-icon { width: 60px; height: 60px; background: #0f172a; color: white; border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; box-shadow: 0 10px 20px -5px rgba(15,23,42,0.3); }
                    .login-header h1 { font-size: 1.5rem; font-weight: 700; color: #0f172a; margin: 0 0 8px; }
                    .login-header p { font-size: 0.9rem; color: #64748b; margin: 0; }
                    .form-group { margin-bottom: 20px; }
                    .form-group label { display: block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 8px; }
                    .input-container { position: relative; }
                    .input-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
                    .input-container input { width: 100%; padding: 12px 16px 12px 42px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 0.95rem; transition: 0.2s; box-sizing: border-box; }
                    .input-container input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
                    .btn-primary { width: 100%; padding: 14px; background: #0f172a; color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; display: flex; justify-content: center; align-items: center; transition: 0.2s; }
                    .btn-primary:hover { background: #1e293b; transform: translateY(-1px); }
                    .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
                    .error-banner { background: #fef2f2; color: #ef4444; padding: 10px; border-radius: 8px; font-size: 0.85rem; display: flex; align-items: center; gap: 8px; margin-bottom: 20px; border: 1px solid #fecaca; }
                    .login-footer { margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 20px; display: flex; justify-content: center; gap: 12px; }
                    .signal-pill { display: flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
                    .signal-pill.excellent { background: #dbfefe; color: #0e7490; }
                    .secure-tag { display: flex; align-items: center; gap: 4px; font-size: 0.75rem; color: #94a3b8; }
                    .spin { animation: spin 1s linear infinite; }
                    @keyframes spin { 100% { transform: rotate(360deg); } }
                `}</style>
            </div>
        );
    }

    // ---------------- VIEW: DASHBOARD PAGE ----------------
    return (
        <div className="dashboard-container">
            <header className="top-bar">
                <div className="top-left">
                    <div className="logo-pill"><Ticket size={18}/></div>
                    <div>
                        <h1 className="app-name">Pos Registrasi</h1>
                        <span className="event-name">{eventData?.namaEvent || 'Memuat...'}</span>
                    </div>
                </div>
                <div className="top-right">
                    {renderSignalBadge()}
                    <div className="user-profile">
                        <div className="avatar">{petugas.username.charAt(0).toUpperCase()}</div>
                        <span className="username">{petugas.username}</span>
                    </div>
                    <button onClick={logout} className="btn-icon-only" title="Keluar"><LogOut size={18}/></button>
                </div>
            </header>

            {!isOfflineActive && (
                <div className="warning-banner">
                    <AlertCircle size={20}/>
                    <div>
                        <strong>Mode Offline Nonaktif</strong>
                        <p>Pembuatan token baru ditutup sementara oleh Admin.</p>
                    </div>
                </div>
            )}

            <main className="main-grid">
                {/* LEFT COLUMN: SEARCH & RESULTS */}
                <section className="search-panel">
                    <div className="search-box-wrapper">
                        <div className="search-input-group">
                            <Search className="search-icon" size={20}/>
                            <input 
                                value={searchQuery} 
                                onChange={handleSearch} 
                                placeholder="Cari Nama atau NIM Pemilih..." 
                                autoFocus 
                                disabled={!isOfflineActive} 
                            />
                            {searchQuery && <button onClick={() => {setSearchQuery(''); setSearchResults([])}} className="clear-btn"><XCircle size={16}/></button>}
                        </div>
                        <p className="helper-text">Masukkan minimal 3 karakter untuk pencarian cepat.</p>
                    </div>

                    <div className="results-container">
                        {searchResults.length > 0 ? (
                            <div className="results-list">
                                {searchResults.map(voter => (
                                    <div key={voter.uid} className={`voter-item ${voter.hasVoted ? 'status-voted' : ''} ${voter.activeToken ? 'status-token' : ''}`}>
                                        <div className="voter-info">
                                            <div className="voter-icon">{voter.hasVoted ? <CheckCircle2 size={20}/> : <User size={20}/>}</div>
                                            <div>
                                                <div className="voter-name">{voter.nama}</div>
                                                <div className="voter-details">{voter.nim} • {voter.prodi}</div>
                                            </div>
                                        </div>
                                        <div className="voter-action">
                                            {voter.hasVoted ? (
                                                <span className="badge-voted">Selesai</span>
                                            ) : voter.activeToken ? (
                                                <div className="token-actions">
                                                    <div className="token-display">
                                                        <span>TOKEN</span>
                                                        <strong>{voter.activeToken.token}</strong>
                                                    </div>
                                                    <button onClick={() => handleGenerateToken(voter)} className="btn-icon secondary" title="Regenerate"><RefreshCw size={16}/></button>
                                                    <button onClick={() => handleBatalkanToken(voter.activeToken.id)} className="btn-icon danger" title="Hapus"><Trash2 size={16}/></button>
                                                </div>
                                            ) : (
                                                <button onClick={() => handleGenerateToken(voter)} className="btn-issue-token" disabled={isGenerating || !isOfflineActive}>
                                                    <Ticket size={16}/> Buat Token
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-placeholder">
                                <div className="placeholder-icon">
                                    {searchQuery.length > 0 ? <AlertCircle size={40} strokeWidth={1}/> : <Monitor size={40} strokeWidth={1}/>}
                                </div>
                                <h3>{searchQuery.length > 0 ? 'Data Tidak Ditemukan' : 'Siap Melayani'}</h3>
                                <p>{searchQuery.length > 0 ? 'Coba kata kunci lain atau pastikan NIM benar.' : 'Gunakan kolom pencarian di atas.'}</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* RIGHT COLUMN: STATS & QUEUE */}
                <aside className="info-panel">
                    <div className="stat-card">
                        <div className="card-header">
                            <Activity size={16}/> <span>Status Kiosk</span>
                        </div>
                        <div className="stat-numbers">
                            <div className="stat-item">
                                <span className="val">{activeTokens.length}</span>
                                <span className="lbl">Antrian</span>
                            </div>
                            <div className="stat-divider"></div>
                            <div className="stat-item">
                                <span className="val">{totalVoted}</span>
                                <span className="lbl">Selesai</span>
                            </div>
                        </div>
                        <div className="status-indicator">
                            <div className={`dot ${isOfflineActive ? 'green' : 'red'}`}></div>
                            {isOfflineActive ? 'Sistem Aktif' : 'Sistem Nonaktif'}
                        </div>
                    </div>

                    {activeTokens.length > 0 && (
                        <div className="queue-card">
                            <div className="card-header">
                                <Clock size={16}/> <span>Sedang di Bilik</span>
                            </div>
                            <div className="queue-list">
                                {activeTokens.map(t => (
                                    <div key={t.token} className="queue-row">
                                        <div className="q-info">
                                            <span className="q-name">{t.voterName}</span>
                                            <span className="q-booth">Bilik {t.booth}</span>
                                        </div>
                                        <span className="q-token">{t.token}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="tips-card">
                        <div className="card-header"><HelpCircle size={16}/> <span>Panduan</span></div>
                        <ul>
                            <li>Pastikan identitas fisik pemilih sesuai (KTM).</li>
                            <li>Token hanya berlaku <strong>5 menit</strong>.</li>
                            <li>Jika token hangus, buatkan token baru.</li>
                        </ul>
                    </div>
                </aside>
            </main>

            {/* TICKET MODAL */}
            {generatedToken && (
                <div className="modal-overlay">
                    <div className="ticket-paper">
                        <div className="ticket-top">
                            <div className="ticket-heading">AKSES BILIK SUARA</div>
                            <h2 className="voter-name-large">{selectedVoter?.nama}</h2>
                            <div className="voter-nim-pill">{selectedVoter?.nim}</div>
                        </div>
                        <div className="ticket-rip">
                            <div className="rip-circle left"></div>
                            <div className="rip-line"></div>
                            <div className="rip-circle right"></div>
                        </div>
                        <div className="ticket-bottom">
                            <div className="booth-assignment">
                                <span className="label">MENUJU KE</span>
                                <div className="booth-number">BILIK {assignedBooth}</div>
                            </div>
                            <div className="token-code-wrapper">
                                <span className="label">KODE TOKEN</span>
                                <div className="token-digits">
                                    {generatedToken.split('').map((char, i) => (
                                        <span key={i} className="digit">{char}</span>
                                    ))}
                                </div>
                            </div>
                            <div className="ticket-actions">
                                <div className="timer-hint"><Clock size={14}/> Berlaku 5 Menit</div>
                                <button onClick={closeTokenModal} className="btn-print-done">Selesai & Tutup</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                /* --- RESET & BASE (FULL SCREEN MODE) --- */
                .dashboard-container { 
                    /* Membuat halaman ini menutupi seluruh layar (di atas navbar utama) */
                    position: fixed; 
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    z-index: 9999; /* Pastikan angka ini lebih tinggi dari z-index navbar utama Anda */
                    
                    background-color: #f8fafc; 
                    font-family: 'Inter', sans-serif; 
                    color: #1e293b; 
                    
                    /* Aktifkan scroll di dalam container ini */
                    overflow-y: auto;
                    padding-bottom: 40px;
                    padding-top: 0; /* Tidak perlu padding karena navbar utama tertutup */
                }
                
                /* --- TOP BAR (Header Internal) --- */
                .top-bar { 
                    background: rgba(255,255,255,0.95); 
                    backdrop-filter: blur(10px); 
                    position: sticky; 
                    top: 0; /* Menempel di paling atas layar */
                    z-index: 100;
                    
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center; 
                    padding: 16px 24px; 
                    border-bottom: 1px solid #e2e8f0; 
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
                    margin-bottom: 24px;
                }

                .top-left { display: flex; align-items: center; gap: 12px; }
                .logo-pill { width: 36px; height: 36px; background: #0f172a; color: white; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
                .app-name { font-size: 1rem; font-weight: 700; margin: 0; line-height: 1.2; }
                .event-name { font-size: 0.8rem; color: #64748b; }
                .top-right { display: flex; align-items: center; gap: 16px; }
                .user-profile { display: flex; align-items: center; gap: 8px; background: #f1f5f9; padding: 4px 12px 4px 4px; border-radius: 20px; border: 1px solid #e2e8f0; }
                .avatar { width: 24px; height: 24px; background: #cbd5e1; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 700; }
                .username { font-size: 0.85rem; font-weight: 500; }
                .btn-icon-only { background: white; border: 1px solid #e2e8f0; width: 36px; height: 36px; border-radius: 8px; cursor: pointer; color: #ef4444; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
                .btn-icon-only:hover { background: #fee2e2; border-color: #fca5a5; }

                /* LAYOUT GRID */
                .main-grid { display: grid; grid-template-columns: 1fr 320px; gap: 24px; max-width: 1200px; margin: 0 auto; padding: 0 24px; }
                
                /* SEARCH PANEL */
                .search-panel { background: white; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); min-height: 600px; display: flex; flex-direction: column; overflow: hidden; }
                .search-box-wrapper { padding: 24px; border-bottom: 1px solid #f1f5f9; background: #fafbfc; }
                .search-input-group { position: relative; display: flex; align-items: center; }
                .search-icon { position: absolute; left: 16px; color: #94a3b8; pointer-events: none; }
                .search-input-group input { width: 100%; padding: 14px 40px 14px 48px; border: 1px solid #cbd5e1; border-radius: 12px; font-size: 1rem; transition: 0.2s; box-sizing: border-box; }
                .search-input-group input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
                .clear-btn { position: absolute; right: 12px; background: none; border: none; color: #cbd5e1; cursor: pointer; }
                .helper-text { font-size: 0.8rem; color: #94a3b8; margin: 8px 0 0 4px; }

                /* RESULTS */
                .results-container { flex: 1; padding: 20px; overflow-y: auto; }
                .voter-item { display: flex; justify-content: space-between; align-items: center; background: white; border: 1px solid #f1f5f9; padding: 16px; border-radius: 12px; margin-bottom: 12px; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.03); }
                .voter-item:hover { border-color: #cbd5e1; transform: translateY(-2px); box-shadow: 0 8px 16px -4px rgba(0,0,0,0.05); }
                .voter-item.status-voted { background: #f8fafc; opacity: 0.6; }
                .voter-item.status-token { border-color: #fde047; background: #fffff7; }
                .voter-info { display: flex; align-items: center; gap: 16px; }
                .voter-icon { width: 40px; height: 40px; background: #f1f5f9; color: #64748b; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
                .status-voted .voter-icon { background: #dcfce7; color: #166534; }
                .voter-name { font-weight: 700; color: #0f172a; }
                .voter-details { font-size: 0.85rem; color: #64748b; margin-top: 2px; }
                
                /* BUTTONS & BADGES */
                .btn-issue-token { background: #0f172a; color: white; padding: 10px 16px; border-radius: 8px; border: none; font-weight: 600; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: 0.2s; }
                .btn-issue-token:hover { background: #2563eb; }
                .btn-issue-token:disabled { background: #cbd5e1; cursor: not-allowed; }
                .badge-voted { background: #f1f5f9; color: #64748b; font-size: 0.8rem; font-weight: 700; padding: 6px 12px; border-radius: 20px; border: 1px solid #e2e8f0; }
                .token-actions { display: flex; align-items: center; gap: 8px; }
                .token-display { display: flex; flex-direction: column; background: #fef9c3; border: 1px solid #fde047; padding: 4px 12px; border-radius: 6px; text-align: center; }
                .token-display span { font-size: 0.65rem; font-weight: 700; color: #a16207; letter-spacing: 1px; }
                .token-display strong { font-size: 1rem; font-weight: 800; color: #854d0e; line-height: 1; }
                .btn-icon { width: 34px; height: 34px; border: none; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
                .btn-icon.secondary { background: #eff6ff; color: #2563eb; } 
                .btn-icon.secondary:hover { background: #dbeafe; }
                .btn-icon.danger { background: #fef2f2; color: #ef4444; }
                .btn-icon.danger:hover { background: #fee2e2; }

                /* RIGHT PANEL */
                .info-panel { display: flex; flex-direction: column; gap: 20px; }
                .stat-card, .queue-card, .tips-card { background: white; padding: 20px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
                .card-header { font-size: 0.85rem; font-weight: 700; color: #64748b; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
                .stat-numbers { display: flex; justify-content: space-around; align-items: center; margin-bottom: 20px; }
                .stat-item { text-align: center; }
                .stat-item .val { display: block; font-size: 1.8rem; font-weight: 800; color: #0f172a; line-height: 1; }
                .stat-item .lbl { font-size: 0.75rem; color: #64748b; font-weight: 500; }
                .stat-divider { width: 1px; height: 40px; background: #e2e8f0; }
                .status-indicator { background: #f8fafc; border-radius: 8px; padding: 10px; text-align: center; font-size: 0.85rem; font-weight: 600; color: #334155; display: flex; justify-content: center; align-items: center; gap: 8px; }
                .dot { width: 8px; height: 8px; border-radius: 50%; }
                .dot.green { background: #10b981; box-shadow: 0 0 0 3px #dcfce7; }
                .dot.red { background: #ef4444; box-shadow: 0 0 0 3px #fee2e2; }

                .queue-list { display: flex; flex-direction: column; gap: 8px; }
                .queue-row { display: flex; justify-content: space-between; align-items: center; background: #fffbeb; padding: 10px 12px; border-radius: 8px; border: 1px solid #fef3c7; }
                .q-name { font-weight: 700; color: #92400e; font-size: 0.9rem; display: block; }
                .q-booth { font-size: 0.75rem; color: #b45309; }
                .q-token { font-family: monospace; background: white; padding: 2px 6px; border-radius: 4px; border: 1px solid #fcd34d; color: #b45309; font-weight: 700; }
                .tips-card ul { margin: 0; padding-left: 20px; color: #64748b; font-size: 0.85rem; line-height: 1.6; }

                /* EMPTY STATE */
                .empty-placeholder { text-align: center; padding: 60px 20px; color: #94a3b8; }
                .placeholder-icon { color: #e2e8f0; margin-bottom: 16px; }

                /* TICKET MODAL (PREMIUM) */
                .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; animation: fadeIn 0.2s; }
                .ticket-paper { background: #f8fafc; width: 340px; border-radius: 20px; overflow: hidden; position: relative; box-shadow: 0 20px 50px rgba(0,0,0,0.5); animation: slideUp 0.3s ease-out; }
                .ticket-top { background: #0f172a; color: white; padding: 32px 24px 40px; text-align: center; background-image: radial-gradient(#334155 1px, transparent 1px); background-size: 20px 20px; }
                .ticket-heading { font-size: 0.7rem; letter-spacing: 2px; color: #94a3b8; font-weight: 700; margin-bottom: 12px; }
                .voter-name-large { font-size: 1.6rem; font-weight: 800; margin: 0 0 8px; line-height: 1.1; }
                .voter-nim-pill { display: inline-block; background: rgba(255,255,255,0.1); padding: 4px 12px; border-radius: 20px; font-family: monospace; font-weight: 700; font-size: 0.9rem; }
                
                .ticket-rip { position: relative; height: 20px; background: #f8fafc; margin-top: -10px; display: flex; align-items: center; }
                .rip-circle { width: 24px; height: 24px; background: rgba(15, 23, 42, 0.8); border-radius: 50%; position: absolute; top: -12px; }
                .rip-circle.left { left: -12px; }
                .rip-circle.right { right: -12px; }
                .rip-line { flex: 1; border-top: 2px dashed #cbd5e1; margin: 0 16px; }
                
                .ticket-bottom { padding: 24px; text-align: center; }
                .booth-assignment { margin-bottom: 24px; }
                .booth-number { font-size: 2.2rem; font-weight: 900; color: #2563eb; margin-top: 4px; }
                .label { font-size: 0.7rem; font-weight: 700; color: #94a3b8; letter-spacing: 1px; display: block; }
                
                .token-digits { display: flex; justify-content: center; gap: 8px; margin-top: 10px; margin-bottom: 30px; }
                .digit { width: 40px; height: 52px; background: #1e293b; color: white; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; font-weight: 800; box-shadow: 0 4px 0 #0f172a; }
                
                .timer-hint { font-size: 0.85rem; color: #ef4444; font-weight: 700; display: flex; justify-content: center; align-items: center; gap: 6px; margin-bottom: 16px; animation: pulse 2s infinite; }
                .btn-print-done { width: 100%; background: #0f172a; color: white; padding: 14px; border-radius: 12px; border: none; font-weight: 700; cursor: pointer; font-size: 1rem; }
                .btn-print-done:hover { background: #1e293b; }

                .warning-banner { background: #fff7ed; border-bottom: 1px solid #fed7aa; color: #c2410c; padding: 12px 24px; display: flex; align-items: center; gap: 16px; justify-content: center; }
                
                @keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
                
                /* LOGIN STYLES */
                .login-wrapper { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); font-family: 'Inter', sans-serif; padding: 20px; padding-top: 60px; }
                .login-card { background: white; width: 100%; max-width: 380px; padding: 40px; border-radius: 24px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.1); }
                .login-header { text-align: center; margin-bottom: 30px; }
                .brand-icon { width: 60px; height: 60px; background: #0f172a; color: white; border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; box-shadow: 0 10px 20px -5px rgba(15,23,42,0.3); }
                .login-header h1 { font-size: 1.5rem; font-weight: 700; color: #0f172a; margin: 0 0 8px; }
                .login-header p { font-size: 0.9rem; color: #64748b; margin: 0; }
                .form-group { margin-bottom: 20px; }
                .form-group label { display: block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 8px; }
                .input-container { position: relative; }
                .input-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
                .input-container input { width: 100%; padding: 12px 16px 12px 42px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 0.95rem; transition: 0.2s; box-sizing: border-box; }
                .input-container input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
                .btn-primary { width: 100%; padding: 14px; background: #0f172a; color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; display: flex; justify-content: center; align-items: center; transition: 0.2s; }
                .btn-primary:hover { background: #1e293b; transform: translateY(-1px); }
                .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
                .error-banner { background: #fef2f2; color: #ef4444; padding: 10px; border-radius: 8px; font-size: 0.85rem; display: flex; align-items: center; gap: 8px; margin-bottom: 20px; border: 1px solid #fecaca; }
                .login-footer { margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 20px; display: flex; justify-content: center; gap: 12px; }
                .signal-pill { display: flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
                .signal-pill.excellent { background: #dbfefe; color: #0e7490; }
                .signal-pill.good { background: #fef9c3; color: #a16207; }
                .signal-pill.poor { background: #fee2e2; color: #b91c1c; }
                .signal-pill.offline { background: #e2e8f0; color: #475569; }
                .secure-tag { display: flex; align-items: center; gap: 4px; font-size: 0.75rem; color: #94a3b8; }
                .spin { animation: spin 1s linear infinite; }
                
                /* RESPONSIVE */
                @media (max-width: 900px) { 
                    .main-grid { grid-template-columns: 1fr; padding: 0 16px; } 
                    .top-bar { padding: 12px 16px; }
                    .dashboard-container { padding-top: 60px; } /* Padding lebih kecil di HP */
                }
            `}</style>
        </div>
    );
};

export default RegistrasiPage;