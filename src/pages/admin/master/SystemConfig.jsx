import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase/firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { 
    Save, Calendar, Clock, Lock, Unlock, AlertTriangle, 
    Settings, ToggleLeft, ToggleRight, Loader2
} from 'lucide-react';

const SystemConfig = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // State Config
    const [config, setConfig] = useState({
        activePeriod: '2025/2026',
        rktDeadline: '',
        proposalLeadTime: 14, // hari minimal upload sebelum hari-H
        reportingGracePeriod: 7, // hari batas upload LPJ setelah selesai
        allowRktSubmission: true,
        allowProgramInput: false,
        isSystemMaintenance: false
    });

    // 1. Load Config saat ini
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const docRef = doc(db, 'master_metadata', 'system_config');
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                    setConfig(docSnap.data());
                } else {
                    // Jika belum ada, buat default (First run initialization)
                    const defaultConfig = {
                        activePeriod: '2025/2026',
                        rktDeadline: '2025-12-31',
                        allowRktSubmission: true,
                        allowProgramInput: false,
                        isSystemMaintenance: false
                    };
                    await setDoc(docRef, defaultConfig);
                    setConfig(defaultConfig);
                }
            } catch (error) {
                console.error("Gagal load config:", error);
                alert("Gagal memuat pengaturan sistem.");
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, []);

    // 2. Handle Save
    const handleSave = async () => {
        setSaving(true);
        try {
            const docRef = doc(db, 'master_metadata', 'system_config');
            await setDoc(docRef, config); // Overwrite/Merge
            alert("Pengaturan Sistem Berhasil Disimpan!");
        } catch (error) {
            console.error(error);
            alert("Gagal menyimpan: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    // Helper Toggle Switch
    const ToggleSwitch = ({ label, value, onChange, danger = false }) => (
        <div style={styles.toggleRow}>
            <div>
                <div style={styles.toggleLabel}>{label}</div>
                <div style={styles.toggleDesc}>
                    {value ? 'Status: AKTIF (Diizinkan)' : 'Status: NON-AKTIF (Dikunci)'}
                </div>
            </div>
            <button 
                onClick={() => onChange(!value)}
                style={{
                    ...styles.toggleBtn,
                    background: value ? (danger ? '#ef4444' : '#10b981') : '#cbd5e1',
                    justifyContent: value ? 'flex-end' : 'flex-start'
                }}
            >
                <div style={styles.toggleKnob}></div>
            </button>
        </div>
    );

    if (loading) return <div style={{padding:40, textAlign:'center'}}><Loader2 className="spin"/> Memuat Pengaturan...</div>;

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}><Settings size={28}/> Konfigurasi Sistem Utama</h1>
                <p style={styles.subtitle}>Pusat kendali operasional sistem KM Poltek Nuklir</p>
            </div>

            <div style={styles.grid}>
                {/* KOLOM KIRI: PERIODE & WAKTU */}
                <div style={styles.card}>
                    <div style={styles.cardHeader}>
                        <Calendar size={20} color="#3b82f6"/>
                        <h3>Periode & Waktu</h3>
                    </div>
                    <div style={styles.cardBody}>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Periode Akademik Aktif</label>
                            <input 
                                type="text" 
                                value={config.activePeriod}
                                onChange={(e) => setConfig({...config, activePeriod: e.target.value})}
                                style={styles.input}
                                placeholder="Contoh: 2025/2026"
                            />
                            <small style={styles.helper}>Ubah ini saat pergantian kepengurusan. Data lama akan terarsip otomatis berdasarkan label ini.</small>
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Minimal Upload Proposal (Hari Sebelum Kegiatan)</label>
                            <div style={{display:'flex', alignItems:'center', gap: 10}}>
                                <input 
                                    type="number" 
                                    style={{...styles.input, width: 80}} 
                                    value={config.proposalLeadTime}
                                    onChange={(e) => setConfig({...config, proposalLeadTime: parseInt(e.target.value) || 0})}
                                />
                                <span>Hari</span>
                            </div>
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Batas Hari Upload LPJ (Setelah Hari-H)</label>
                            <div style={{display:'flex', alignItems:'center', gap: 10}}>
                                <input 
                                    type="number" 
                                    style={{...styles.input, width: 80}} 
                                    value={config.reportingGracePeriod}
                                    onChange={(e) => setConfig({...config, reportingGracePeriod: parseInt(e.target.value)})}
                                />
                                <span>Hari</span>
                            </div>
                            <small style={styles.helper}>Ormawa diharapkan lapor sebelum X hari setelah kegiatan berakhir.</small>
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Batas Akhir Upload RKT</label>
                            <input 
                                type="date" 
                                value={config.rktDeadline}
                                onChange={(e) => setConfig({...config, rktDeadline: e.target.value})}
                                style={styles.input}
                            />
                            <small style={styles.helper}>Setelah tanggal ini, tombol upload RKT di sisi ormawa akan hilang.</small>
                        </div>
                    </div>
                </div>

                {/* KOLOM KANAN: AKSES & KUNCI */}
                <div style={styles.card}>
                    <div style={styles.cardHeader}>
                        <Lock size={20} color="#f59e0b"/>
                        <h3>Kontrol Akses Global</h3>
                    </div>
                    <div style={styles.cardBody}>
                        <ToggleSwitch 
                            label="Izinkan Pengajuan RKT Baru" 
                            value={config.allowRktSubmission}
                            onChange={(val) => setConfig({...config, allowRktSubmission: val})}
                        />
                        
                        <ToggleSwitch 
                            label="Izinkan Input Program Kerja (Proker)" 
                            value={config.allowProgramInput}
                            onChange={(val) => setConfig({...config, allowProgramInput: val})}
                        />

                        <div style={styles.divider}></div>

                        <div style={{background: '#fef2f2', padding: 16, borderRadius: 8, border: '1px solid #fecaca'}}>
                            <div style={{display:'flex', gap: 10, alignItems:'center', marginBottom: 10, color: '#b91c1c'}}>
                                <AlertTriangle size={20}/>
                                <strong>Mode Maintenance (Darurat)</strong>
                            </div>
                            <ToggleSwitch 
                                label="Kunci Seluruh Sistem" 
                                value={config.isSystemMaintenance}
                                onChange={(val) => setConfig({...config, isSystemMaintenance: val})}
                                danger={true}
                            />
                            <small style={{color:'#b91c1c', display:'block', marginTop: 8}}>
                                Jika diaktifkan, hanya Master Admin yang bisa login. User lain akan ditolak masuk.
                            </small>
                        </div>
                    </div>
                </div>
            </div>

            <div style={styles.footer}>
                <button 
                    onClick={handleSave} 
                    disabled={saving}
                    style={styles.saveBtn}
                >
                    {saving ? <Loader2 className="spin" size={20}/> : <Save size={20}/>}
                    {saving ? 'Menyimpan Perubahan...' : 'Simpan Konfigurasi'}
                </button>
            </div>

            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

const styles = {
    container: { fontFamily: 'Inter, sans-serif', padding: '32px', maxWidth: 1000, margin: '0 auto', color: '#1e293b' },
    header: { marginBottom: 32, textAlign: 'center' },
    title: { fontSize: '2rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 },
    subtitle: { color: '#64748b', fontSize: '1.1rem', marginTop: 8 },
    
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 },
    
    card: { background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' },
    cardHeader: { padding: '20px 24px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', gap: 12, alignItems: 'center' },
    cardBody: { padding: 24 },
    
    formGroup: { marginBottom: 20 },
    label: { display: 'block', fontWeight: 600, marginBottom: 8, color: '#334155' },
    input: { width: '100%', padding: '12px', borderRadius: 8, border: '1px solid #cbd5e0', fontSize: '1rem', boxSizing: 'border-box' },
    helper: { display: 'block', marginTop: 6, fontSize: '0.85rem', color: '#64748b', lineHeight: 1.4 },
    
    toggleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    toggleLabel: { fontWeight: 600, fontSize: '0.95rem' },
    toggleDesc: { fontSize: '0.8rem', color: '#64748b' },
    toggleBtn: { width: 56, height: 30, borderRadius: 15, border: 'none', padding: 4, cursor: 'pointer', display: 'flex', transition: 'background 0.3s' },
    toggleKnob: { width: 22, height: 22, background: 'white', borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' },
    
    divider: { height: 1, background: '#e2e8f0', margin: '24px 0' },
    
    footer: { marginTop: 32, display: 'flex', justifyContent: 'center' },
    saveBtn: { background: '#2563eb', color: 'white', border: 'none', padding: '14px 40px', borderRadius: 12, fontSize: '1rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 10px 20px -5px rgba(37, 99, 235, 0.3)', transition: 'transform 0.1s' }
};

export default SystemConfig;