// src/pages/admin/SettingsAdmin.jsx

import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { 
    Settings, Save, Plus, Trash2, Building2, 
    Layers, Users, Loader2 
} from 'lucide-react';

const SettingsAdmin = () => {
    const [data, setData] = useState({ entities: {} });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // State untuk Form Tambah Organisasi Baru
    const [newOrgName, setNewOrgName] = useState('');
    const [newOrgType, setNewOrgType] = useState('ukm');
    const [newOrgId, setNewOrgId] = useState('');

    // State untuk Accordion (Buka/Tutup Card)
    const [expandedOrg, setExpandedOrg] = useState(null);

    // 1. Fetch Data Metadata
    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const docRef = doc(db, 'master_metadata', 'organization_structure');
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    setData(snap.data());
                }
            } catch (error) {
                console.error("Gagal ambil metadata:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchMetadata();
    }, []);

    // 2. Fungsi Tambah Item ke Array (Divisi/Jabatan)
    const addItem = (orgId, field, value) => {
        if (!value.trim()) return;
        const updatedEntities = { ...data.entities };
        if (!updatedEntities[orgId][field]) updatedEntities[orgId][field] = [];
        
        updatedEntities[orgId][field].push(value);
        setData({ ...data, entities: updatedEntities });
    };

    // 3. Fungsi Hapus Item dari Array
    const removeItem = (orgId, field, index) => {
        const updatedEntities = { ...data.entities };
        updatedEntities[orgId][field].splice(index, 1);
        setData({ ...data, entities: updatedEntities });
    };

    // 4. Fungsi Tambah Organisasi Baru
    const handleAddOrg = () => {
        if (!newOrgId || !newOrgName) return alert("ID dan Nama wajib diisi");
        const formattedId = newOrgId.toLowerCase().replace(/\s/g, '_');
        
        if (data.entities[formattedId]) return alert("ID Organisasi sudah ada!");

        const newEntity = {
            id: formattedId,
            name: newOrgName,
            type: newOrgType,
            divisions: ['Pengurus Harian'],
            positions: ['Ketua', 'Anggota']
        };

        setData({
            ...data,
            entities: { ...data.entities, [formattedId]: newEntity }
        });

        // Reset Form
        setNewOrgId('');
        setNewOrgName('');
    };

    // 5. Fungsi Hapus Organisasi
    const handleDeleteOrg = (orgId) => {
        if (!window.confirm(`Yakin ingin menghapus ${data.entities[orgId].name}?`)) return;
        const updatedEntities = { ...data.entities };
        delete updatedEntities[orgId];
        setData({ ...data, entities: updatedEntities });
    };

    // 6. Simpan ke Firestore
    const handleSaveToDB = async () => {
        setSaving(true);
        try {
            const docRef = doc(db, 'master_metadata', 'organization_structure');
            await updateDoc(docRef, {
                entities: data.entities,
                last_updated: new Date().toISOString()
            });
            alert("Pengaturan Metadata Berhasil Disimpan!");
        } catch (error) {
            console.error(error);
            alert("Gagal menyimpan data.");
        } finally {
            setSaving(false);
        }
    };

    // --- Sub-Component Kecil untuk List Item (Divisi/Posisi) ---
    const ListEditor = ({ items, onAdd, onRemove, placeholder, icon: Icon }) => {
        const [tempVal, setTempVal] = useState('');
        return (
            <div style={styles.listEditor}>
                <div style={styles.listContainer}>
                    {items?.map((item, idx) => (
                        <div key={idx} style={styles.tag}>
                            {item}
                            <button onClick={() => onRemove(idx)} style={styles.tagClose}><XIcon /></button>
                        </div>
                    ))}
                </div>
                <div style={styles.inputRow}>
                    <Icon size={16} style={{ color: '#94a3b8' }} />
                    <input 
                        style={styles.inputSimple} 
                        placeholder={placeholder}
                        value={tempVal}
                        onChange={(e) => setTempVal(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                onAdd(tempVal);
                                setTempVal('');
                            }
                        }}
                    />
                    <button 
                        onClick={() => { onAdd(tempVal); setTempVal(''); }}
                        style={styles.btnAddSmall}
                    >
                        <Plus size={14} />
                    </button>
                </div>
            </div>
        );
    };

    if (loading) return <div style={styles.center}><Loader2 className="spin" /> Memuat Pengaturan...</div>;

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>Pengaturan Organisasi</h1>
                    <p style={styles.subtitle}>Kelola struktur organisasi, divisi, dan jabatan secara dinamis.</p>
                </div>
                <button 
                    onClick={handleSaveToDB} 
                    disabled={saving}
                    style={styles.btnSaveMain}
                >
                    {saving ? 'Menyimpan...' : <><Save size={18} /> Simpan Perubahan</>}
                </button>
            </div>

            {/* Area Tambah Organisasi */}
            <div style={styles.card}>
                <h3 style={styles.cardTitle}>Tambah Organisasi Baru</h3>
                <div style={styles.addOrgForm}>
                    <input 
                        style={styles.input} 
                        placeholder="ID Unik (cth: mm_pusat)" 
                        value={newOrgId}
                        onChange={(e) => setNewOrgId(e.target.value)}
                    />
                    <input 
                        style={styles.input} 
                        placeholder="Nama Organisasi" 
                        value={newOrgName}
                        onChange={(e) => setNewOrgName(e.target.value)}
                    />
                    <select 
                        style={styles.select}
                        value={newOrgType}
                        onChange={(e) => setNewOrgType(e.target.value)}
                    >
                        <option value="ukm">UKM</option>
                        <option value="hima">HIMA</option>
                        <option value="eksekutif">Eksekutif (BEM)</option>
                        <option value="legislatif">Legislatif (DPM)</option>
                        <option value="yudikatif">Yudikatif (MM)</option>
                    </select>
                    <button onClick={handleAddOrg} style={styles.btnAddBig}>
                        <Plus size={18} /> Tambah
                    </button>
                </div>
            </div>

            {/* List Editor Organisasi */}
            <div style={styles.grid}>
                {Object.values(data.entities).map((org) => (
                    <div key={org.id} style={styles.orgCard}>
                        <div style={styles.orgHeader}>
                            <div style={styles.orgInfo}>
                                <div style={styles.iconBox}><Building2 size={20} /></div>
                                <div>
                                    <h4 style={styles.orgName}>{org.name}</h4>
                                    <div style={{display:'flex', alignItems:'center', gap:8, marginTop:4}}>
                                        <span style={{
                                            ...styles.orgType,
                                            // Warna badge dinamis berdasarkan tipe
                                            backgroundColor: org.type === 'yudikatif' ? '#fce7f3' : 
                                                           org.type === 'eksekutif' ? '#dbeafe' : 
                                                           org.type === 'legislatif' ? '#fff7ed' : '#e0f2fe',
                                            color: org.type === 'yudikatif' ? '#be185d' : 
                                                   org.type === 'eksekutif' ? '#1e40af' : 
                                                   org.type === 'legislatif' ? '#c2410c' : '#0369a1'
                                        }}>
                                            {org.type}
                                        </span>
                                        <span style={styles.orgId}>ID: {org.id}</span>
                                    </div>
                                </div>
                            </div>
                            <div style={styles.actions}>
                                <button 
                                    onClick={() => setExpandedOrg(expandedOrg === org.id ? null : org.id)}
                                    style={styles.btnEdit}
                                >
                                    {expandedOrg === org.id ? 'Tutup' : 'Edit Struktur'}
                                </button>
                                <button onClick={() => handleDeleteOrg(org.id)} style={styles.btnDelete}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Expandable Area */}
                        {expandedOrg === org.id && (
                            <div style={styles.orgBody}>
                                <div style={styles.section}>
                                    <label style={styles.label}><Layers size={14} /> Daftar Divisi / Kementerian</label>
                                    <ListEditor 
                                        items={org.divisions} 
                                        icon={Plus}
                                        placeholder="Tambah Divisi... (Enter)"
                                        onAdd={(val) => addItem(org.id, 'divisions', val)}
                                        onRemove={(idx) => removeItem(org.id, 'divisions', idx)}
                                    />
                                </div>

                                <div style={styles.section}>
                                    <label style={styles.label}><Users size={14} /> Daftar Jabatan</label>
                                    <ListEditor 
                                        items={org.positions} 
                                        icon={Plus}
                                        placeholder="Tambah Jabatan... (Enter)"
                                        onAdd={(val) => addItem(org.id, 'positions', val)}
                                        onRemove={(idx) => removeItem(org.id, 'positions', idx)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

// --- Helper Icon X ---
const XIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);

// --- STYLES ---
const styles = {
    container: { fontFamily: "'Inter', sans-serif", color: '#1e293b', maxWidth: '1200px', margin: '0 auto', padding: '32px' },
    center: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', gap: '10px', color: '#64748b' },
    
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' },
    title: { fontSize: '1.8rem', fontWeight: '700', margin: 0 },
    subtitle: { color: '#64748b', marginTop: '4px' },
    
    btnSaveMain: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)' },

    card: { backgroundColor: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '32px' },
    cardTitle: { marginTop: 0, marginBottom: '16px', fontSize: '1.1rem' },
    addOrgForm: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' },
    
    input: { padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '0.95rem' },
    select: { padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '0.95rem', backgroundColor: 'white' },
    btnAddBig: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', backgroundColor: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },

    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '16px' }, // Responsive Grid
    orgCard: { backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', transition: 'box-shadow 0.2s' },
    orgHeader: { padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff' },
    orgInfo: { display: 'flex', gap: '16px', alignItems: 'center' },
    iconBox: { width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' },
    orgName: { margin: 0, fontSize: '1rem', fontWeight: '700' },
    orgType: { fontSize: '0.75rem', textTransform: 'uppercase', padding: '2px 8px', borderRadius: '4px', marginRight: '8px', fontWeight: '700' },
    orgId: { fontSize: '0.8rem', color: '#94a3b8', fontFamily: 'monospace' },
    
    actions: { display: 'flex', gap: '8px' },
    btnEdit: { padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e0', background: 'white', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500' },
    btnDelete: { padding: '8px', borderRadius: '6px', border: '1px solid #fee2e2', background: '#fef2f2', color: '#ef4444', cursor: 'pointer' },

    orgBody: { padding: '24px', borderTop: '1px solid #f1f5f9', backgroundColor: '#f8fafc', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' },
    section: { display: 'flex', flexDirection: 'column', gap: '8px' },
    label: { fontSize: '0.85rem', fontWeight: '600', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' },
    
    listEditor: { backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' },
    listContainer: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' },
    tag: { display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f1f5f9', padding: '4px 10px', borderRadius: '16px', fontSize: '0.85rem', border: '1px solid #e2e8f0' },
    tagClose: { background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, display: 'flex' },
    
    inputRow: { display: 'flex', alignItems: 'center', gap: '8px' },
    inputSimple: { border: 'none', outline: 'none', width: '100%', fontSize: '0.9rem' },
    btnAddSmall: { background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }
};

export default SettingsAdmin;