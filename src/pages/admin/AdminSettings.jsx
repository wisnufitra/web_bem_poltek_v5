import React, { useState, useEffect } from 'react';
import { db } from "../../firebase/firebaseConfig";
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { 
  Plus, X, Tag, BookOpen, Globe, Save, Database, AlertTriangle 
} from 'lucide-react';

const AdminSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [newInputs, setNewInputs] = useState({
    prodi_list: "",
    jenis_karya_list: "",
    bahasa_list: ""
  });

  // 1. Fetch Data
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "repository_settings", "metadata_options"), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data());
      } else {
        setSettings(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 2. Initialize
  const initializeSettings = async () => {
    const defaultData = {
      prodi_list: ["Teknokimia Nuklir", "Elektronika Instrumentasi", "Elektromekanik"],
      jenis_karya_list: ["Paper / Jurnal Ilmiah", "Tugas Akhir / Skripsi", "Laporan Magang (PKL)", "Poster Ilmiah"],
      bahasa_list: ["Bahasa Indonesia", "English", "Lainnya"]
    };
    await setDoc(doc(db, "repository_settings", "metadata_options"), defaultData);
  };

  // 3. Handlers
  const handleAdd = async (field) => {
    const value = newInputs[field].trim();
    if (!value) return;
    try {
      await updateDoc(doc(db, "repository_settings", "metadata_options"), {
        [field]: arrayUnion(value)
      });
      setNewInputs({ ...newInputs, [field]: "" });
    } catch (error) { alert("Error: " + error.message); }
  };

  const handleRemove = async (field, value) => {
    if (!window.confirm(`Hapus "${value}" dari daftar?`)) return;
    try {
      await updateDoc(doc(db, "repository_settings", "metadata_options"), {
        [field]: arrayRemove(value)
      });
    } catch (error) { alert("Error: " + error.message); }
  };

  if (loading) return <div className="loading-center"><div className="spinner"></div></div>;

  // Tampilan Belum Ada Data
  if (!settings) {
    return (
      <div className="init-wrapper">
        <div className="init-card">
           <Database size={64} className="icon-db"/>
           <h2>Konfigurasi Database Belum Siap</h2>
           <p>Sistem perlu membuat koleksi awal untuk menyimpan data Program Studi dan Kategori Karya.</p>
           <button onClick={initializeSettings} className="btn-init">
             <Save size={18}/> Buat Database Master
           </button>
        </div>
      </div>
    );
  }

  // --- REUSABLE COMPONENT ---
  const ConfigCard = ({ title, icon: Icon, field, data, color }) => (
    <div className="config-card">
       <div className={`card-head ${color}`}>
          <div className="head-icon"><Icon size={20}/></div>
          <h3>{title}</h3>
       </div>
       <div className="card-content">
          <div className="tags-container">
             {data?.length === 0 && <span className="empty-tag">Belum ada data</span>}
             {data?.map((item, idx) => (
                <div key={idx} className="data-tag">
                   <span>{item}</span>
                   <button onClick={() => handleRemove(field, item)} className="btn-del"><X size={12}/></button>
                </div>
             ))}
          </div>
          <div className="input-row">
             <input 
               type="text" 
               placeholder="Tambah baru..." 
               value={newInputs[field]}
               onChange={(e) => setNewInputs({...newInputs, [field]: e.target.value})}
               onKeyPress={(e) => e.key === 'Enter' && handleAdd(field)}
             />
             <button onClick={() => handleAdd(field)} className="btn-add"><Plus size={20}/></button>
          </div>
       </div>
    </div>
  );

  return (
    <div className="settings-page">
      <div className="page-header">
         <div>
            <h1>Master Data</h1>
            <p>Kelola opsi dinamis untuk formulir upload dan filter pencarian.</p>
         </div>
      </div>

      <div className="alert-info">
         <AlertTriangle size={18}/>
         <span>Perubahan di sini akan langsung berdampak pada Formulir Upload Mahasiswa.</span>
      </div>

      <div className="grid-container">
         <ConfigCard 
            title="Program Studi" 
            icon={BookOpen} 
            field="prodi_list" 
            data={settings.prodi_list} 
            color="blue"
         />
         <ConfigCard 
            title="Jenis Karya" 
            icon={Tag} 
            field="jenis_karya_list" 
            data={settings.jenis_karya_list} 
            color="green"
         />
         <ConfigCard 
            title="Opsi Bahasa" 
            icon={Globe} 
            field="bahasa_list" 
            data={settings.bahasa_list} 
            color="purple"
         />
      </div>

      <style>{`
        .settings-page { font-family: 'Inter', sans-serif; max-width: 1200px; margin: 0 auto; }
        
        .page-header { margin-bottom: 30px; border-bottom: 1px solid #e2e8f0; padding-bottom: 20px; }
        .page-header h1 { margin: 0; font-size: 1.8rem; color: #0f172a; }
        .page-header p { margin: 4px 0 0; color: #64748b; }

        .alert-info { background: #fff7ed; border: 1px solid #fed7aa; color: #c2410c; padding: 12px 16px; border-radius: 8px; display: flex; align-items: center; gap: 10px; font-size: 0.9rem; margin-bottom: 30px; }

        .grid-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 24px; }

        .config-card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 2px 4px rgba(0,0,0,0.02); transition: 0.2s; }
        .config-card:hover { box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); transform: translateY(-2px); }

        .card-head { padding: 16px 20px; display: flex; align-items: center; gap: 12px; font-weight: 700; border-bottom: 1px solid #f1f5f9; }
        .card-head h3 { margin: 0; font-size: 1rem; }
        .head-icon { width: 32px; height: 32px; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
        
        .card-head.blue { background: #eff6ff; color: #1e40af; } .card-head.blue .head-icon { background: #dbeafe; }
        .card-head.green { background: #f0fdf4; color: #15803d; } .card-head.green .head-icon { background: #dcfce7; }
        .card-head.purple { background: #faf5ff; color: #6b21a8; } .card-head.purple .head-icon { background: #f3e8ff; }

        .card-content { padding: 20px; flex: 1; display: flex; flex-direction: column; }
        
        .tags-container { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; min-height: 100px; align-content: flex-start; }
        .data-tag { background: #f8fafc; border: 1px solid #cbd5e1; padding: 6px 10px 6px 14px; border-radius: 20px; font-size: 0.85rem; color: #334155; display: flex; align-items: center; gap: 8px; font-weight: 500; }
        .btn-del { background: #e2e8f0; border: none; cursor: pointer; color: #64748b; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
        .btn-del:hover { background: #ef4444; color: white; }
        .empty-tag { font-style: italic; color: #94a3b8; font-size: 0.9rem; }

        .input-row { display: flex; gap: 8px; margin-top: auto; }
        .input-row input { flex: 1; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; outline: none; transition: 0.2s; }
        .input-row input:focus { border-color: #3b82f6; ring: 2px solid #bfdbfe; }
        .btn-add { background: #0f172a; color: white; border: none; width: 42px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
        .btn-add:hover { background: #3b82f6; }

        /* INIT STATE */
        .init-wrapper { height: 60vh; display: flex; align-items: center; justify-content: center; }
        .init-card { text-align: center; padding: 40px; background: white; border-radius: 16px; border: 1px dashed #cbd5e1; max-width: 500px; }
        .icon-db { color: #cbd5e1; margin-bottom: 20px; }
        .btn-init { background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; margin: 24px auto 0; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.5); }
        .btn-init:hover { background: #2563eb; transform: translateY(-2px); }
        
        .loading-center { display: flex; justify-content: center; align-items: center; height: 50vh; }
        .spinner { border: 3px solid #e2e8f0; border-top: 3px solid #3b82f6; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default AdminSettings;