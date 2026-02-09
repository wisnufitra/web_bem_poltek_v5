// src/pages/AdminKelolaForm.js
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase/firebaseConfig';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy, addDoc, writeBatch } from 'firebase/firestore';
import { logActivity } from '../utils/logActivity'; // Pastikan path utilitas Anda benar

const AdminKelolaForm = () => {
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editData, setEditData] = useState(null);
    const navigate = useNavigate();
    const draggedItem = useRef(null);
    const draggedOverItem = useRef(null);

    useEffect(() => {
        const q = query(collection(db, "submissionFormFields"), orderBy("position", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setFields(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleUpdate = async () => {
        if (!editData) return;
        const { id, ...dataToUpdate } = editData;
        const docRef = doc(db, "submissionFormFields", id);

        // Pastikan options adalah array
        if (typeof dataToUpdate.options === 'string') {
            dataToUpdate.options = dataToUpdate.options.split(',').map(item => item.trim());
        }

        await updateDoc(docRef, dataToUpdate);
        await logActivity(`Memperbarui kolom form: "${editData.label}"`);
        setEditData(null);
    };

    const handleAdd = async () => {
        const newField = {
            label: "Label Pertanyaan Baru",
            fieldName: `field_${Date.now()}`,
            type: 'text',
            placeholder: 'Placeholder baru',
            required: false,
            step: 1,
            position: fields.length,
            options: []
        };
        await addDoc(collection(db, "submissionFormFields"), newField);
        await logActivity(`Menambahkan kolom form baru: "${newField.label}"`);
    };

    const handleDelete = async (id, label) => {
        if (window.confirm(`Yakin ingin menghapus kolom "${label}"?`)) {
            await deleteDoc(doc(db, "submissionFormFields", id));
            await logActivity(`Menghapus kolom form: "${label}"`);
        }
    };
    
    const handleSort = async () => {
        const itemsClone = [...fields];
        const draggedItemContent = itemsClone.splice(draggedItem.current, 1)[0];
        itemsClone.splice(draggedOverItem.current, 0, draggedItemContent);
        
        const batch = writeBatch(db);
        itemsClone.forEach((item, index) => {
            const docRef = doc(db, "submissionFormFields", item.id);
            batch.update(docRef, { position: index });
        });
        await batch.commit();

        draggedItem.current = null;
        draggedOverItem.current = null;
    };

    const containerStyle = { maxWidth: '1000px', margin: '40px auto', padding: '20px' };
    const buttonStyle = { padding: "10px 20px", backgroundColor: "#00092f", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 'bold' };
    const cardStyle = { backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '10px' };
    const inputStyle = { padding: "10px", border: "1px solid #ccc", borderRadius: "6px", width: "100%", boxSizing: "border-box", marginTop: '5px' };
    
    if (loading) return <p style={{textAlign: 'center', marginTop: '40px'}}>Memuat data formulir...</p>;

    return (
        <div style={containerStyle}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px'}}>
                <h1 style={{ color: "#00092f", margin: 0 }}>Kelola Formulir Pengajuan</h1>
                <button onClick={handleAdd} style={buttonStyle}>+ Tambah Kolom Baru</button>
            </div>

            {fields.map((field, index) => (
                <div 
                    key={field.id} 
                    style={cardStyle}
                    draggable
                    onDragStart={() => (draggedItem.current = index)}
                    onDragEnter={() => (draggedOverItem.current = index)}
                    onDragEnd={handleSort}
                    onDragOver={(e) => e.preventDefault()}
                >
                    {editData && editData.id === field.id ? (
                        <div style={{display: 'grid', gap: '15px'}}>
                            <h4 style={{margin: 0, color: '#00092f'}}>Edit Kolom</h4>
                            <div><label>Label Pertanyaan:</label><input value={editData.label} onChange={(e) => setEditData({...editData, label: e.target.value})} style={inputStyle} /></div>
                            <div><label>Tipe Kolom:</label>
                                <select value={editData.type} onChange={(e) => setEditData({...editData, type: e.target.value})} style={inputStyle}>
                                    <option value="text">Teks Singkat</option>
                                    <option value="select">Pilihan Ganda (Dropdown)</option>
                                    <option value="file">Unggah File</option>
                                </select>
                            </div>
                            {editData.type === 'select' && (
                                <div><label>Opsi (pisahkan dengan koma):</label><input value={Array.isArray(editData.options) ? editData.options.join(', ') : ''} onChange={(e) => setEditData({...editData, options: e.target.value})} style={inputStyle} /></div>
                            )}
                            <div><label>Langkah Formulir (1, 2, atau 3):</label><input type="number" value={editData.step} onChange={(e) => setEditData({...editData, step: parseInt(e.target.value) || 1})} style={inputStyle} /></div>
                            <div><label><input type="checkbox" checked={editData.required} onChange={(e) => setEditData({...editData, required: e.target.checked})} /> Wajib Diisi</label></div>
                            <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                                <button onClick={handleUpdate} style={buttonStyle}>Simpan</button>
                                <button onClick={() => setEditData(null)} style={{...buttonStyle, backgroundColor: '#6c757d'}}>Batal</button>
                            </div>
                        </div>
                    ) : (
                        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                             <span style={{cursor: 'grab'}}>☰</span>
                            <div style={{flexGrow: 1, marginLeft: '15px'}}>
                                <strong>{field.label}</strong>
                                <small style={{display: 'block', color: '#666'}}>Tipe: {field.type} | Langkah: {field.step} {field.required && '| Wajib'}</small>
                            </div>
                            <div style={{display: 'flex', gap: '10px'}}>
                                <button onClick={() => setEditData(field)} style={{...buttonStyle, backgroundColor: '#1e88e5', padding: '8px 16px'}}>Edit</button>
                                <button onClick={() => handleDelete(field.id, field.label)} style={{...buttonStyle, backgroundColor: '#d32f2f', padding: '8px 16px'}}>Hapus</button>
                            </div>
                        </div>
                    )}
                </div>
            ))}
             <button onClick={() => navigate("/admin")} style={{ ...buttonStyle, backgroundColor: "#6c757d", marginTop: "30px" }}>Kembali ke Dashboard</button>
        </div>
    );
};

export default AdminKelolaForm;

