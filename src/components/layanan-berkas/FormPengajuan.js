// src/components/layanan-berkas/FormPengajuan.js
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase/firebaseConfig';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { logActivity } from '../../utils/logActivity';

// Komponen Canggih untuk Upload File Hibrida
const HybridFileUploader = ({ field, value, onUpload, onLinkChange }) => {
    const [uploadMethod, setUploadMethod] = useState('upload');
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const inputRef = useRef(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            if (selectedFile.size > 5 * 1024 * 1024) {
                alert("Ukuran file terlalu besar (Maks 5MB). Silakan gunakan opsi 'Gunakan Tautan'.");
                return;
            }
            setFile(selectedFile);
            handleUpload(selectedFile);
        }
    };

    const handleUpload = (fileToUpload) => {
        if (!fileToUpload) return;
        setUploading(true);
        const reader = new FileReader();
        reader.readAsDataURL(fileToUpload);
        reader.onload = () => {
            const fileDataString = `${reader.result};name=${fileToUpload.name}`;
            onUpload(field.fieldName, fileDataString);
            setUploading(false);
        };
        reader.onerror = (error) => {
            console.error("Error saat membaca file:", error);
            setUploading(false);
        };
    };

    const toggleContainerStyle = { display: 'flex', border: '1px solid #ccc', borderRadius: '6px', overflow: 'hidden', marginBottom: '15px' };
    const toggleButtonStyle = (isActive) => ({ flex: 1, padding: '10px', border: 'none', background: isActive ? '#00092f' : '#f0f2f5', color: isActive ? 'white' : '#333', cursor: 'pointer', fontWeight: 'bold', transition: 'background 0.2s' });
    const uploadButtonStyle = { padding: '8px 16px', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#f9f9f9' };
    const fileInfoStyle = { display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', backgroundColor: '#f0f2f5', padding: '10px', borderRadius: '6px' };
    const inputStyle = { width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' };
    const helperTextStyle = { fontSize: '12px', color: '#666', marginTop: '5px', lineHeight: '1.5' };

    return (
        <div style={{ marginTop: '10px' }}>
            <div style={toggleContainerStyle}>
                <button type="button" onClick={() => setUploadMethod('upload')} style={toggleButtonStyle(uploadMethod === 'upload')}>Unggah File</button>
                <button type="button" onClick={() => setUploadMethod('link')} style={toggleButtonStyle(uploadMethod === 'link')}>Gunakan Tautan</button>
            </div>
            {uploadMethod === 'upload' ? (
                <>
                    <input type="file" ref={inputRef} style={{ display: 'none' }} onChange={handleFileChange} />
                    <button type="button" onClick={() => inputRef.current.click()} style={uploadButtonStyle} disabled={uploading}>{uploading ? `Memproses...` : 'Pilih File'}</button>
                    <p style={helperTextStyle}>Disarankan untuk file di bawah 5 MB.</p>
                    {file && <div style={fileInfoStyle}><span>📄 {file.name}</span></div>}
                </>
            ) : (
                <>
                    <input name={field.fieldName} value={(value && value.startsWith('data:')) ? '' : value || ''} onChange={onLinkChange} placeholder="Tempelkan link Google Drive di sini" style={inputStyle} />
                    <p style={helperTextStyle}>Untuk file besar. Pastikan akses diatur ke "Siapa saja yang memiliki link".</p>
                </>
            )}
        </div>
    );
};


const FormPengajuan = () => {
    const [step, setStep] = useState(1);
    const [formFields, setFormFields] = useState([]);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [submittedTicket, setSubmittedTicket] = useState(null);
    const navigate = useNavigate();
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxqOBupHLikJrsh8WiE8MdXGBFSKlnLyd2rJvLLMBjwwJo5VJUvE3WJcNwc3eIwC-396Q/exec";

    useEffect(() => {
        const q = query(collection(db, "submissionFormFields"), orderBy("position", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fields = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setFormFields(fields);
            const initialData = {};
            fields.forEach(field => { initialData[field.fieldName] = field.defaultValue || ''; });
            setFormData(initialData);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleUpload = (fieldName, fileDataString) => {
        setFormData(prev => ({ ...prev, [fieldName]: fileDataString }));
    };

    const validateStep = (currentStep) => {
        for (const field of formFields) {
            if (field.step === currentStep && field.required && !formData[field.fieldName]) {
                setError(`Harap isi kolom: ${field.label}`);
                return false;
            }
        }
        setError('');
        return true;
    };
    
    const nextStep = () => { if (validateStep(step)) setStep(prev => prev + 1); };
    const prevStep = () => setStep(prev => prev - 1);
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateStep(1) || !validateStep(2)) {
            setError("Harap periksa kembali semua kolom wajib diisi.");
            return;
        }
        setLoading(true);

        try {
            // 1. Kirim ke Apps Script dan tunggu respons
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            if (!response.ok) throw new Error("Gagal terhubung ke server Google.");
            
            const result = await response.json();
            if (result.status !== 'success') throw new Error(result.message || 'Gagal memproses data di backend.');
            
            const finalData = result.data; // Data bersih dengan link G-Drive yang benar

            // 2. Simpan data final ke Firestore
            const ticketId = `BEM-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
            const submissionData = {
                ticketId,
                ...finalData,
                currentStatus: 'Diajukan',
                verifiers: { sekjend: { status: "menunggu", updatedAt: null, catatan: "" }, kemendagri: { status: "menunggu", updatedAt: null, catatan: "" }, kemenkeu: { status: "menunggu", updatedAt: null, catatan: "" }, banggar: { status: "menunggu", updatedAt: null, catatan: "" } },
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };
            await addDoc(collection(db, "submissions"), submissionData);
            await logActivity(`Mengajukan berkas baru: "${finalData.namaKegiatan}" (Tiket: ${ticketId})`);
            setSubmittedTicket(ticketId);

        } catch (err) {
            console.error("Gagal saat submit:", err);
            setError(`Terjadi kesalahan: ${err.message}. Silakan coba lagi.`);
        } finally {
            setLoading(false);
        }
    };
    
    const renderField = (field) => {
        const value = formData[field.fieldName] || '';
        const commonProps = { name: field.fieldName, value, onChange: handleChange, style: { width: '100%', padding: '12px', marginTop: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '15px' }, placeholder: field.placeholder, required: field.required };
        switch (field.type) {
            case 'select':
                return (
                    <select {...commonProps}>
                        <option value="" disabled>{field.placeholder || '-- Pilih Opsi --'}</option>
                        {field.options && field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                );
            case 'file':
                return <HybridFileUploader field={field} value={value} onUpload={handleUpload} onLinkChange={handleChange} />;
            default:
                return <input type={field.type} {...commonProps} />;
        }
    };

    // --- Styles ---
    const formContainerStyle = { maxWidth: '750px', margin: '40px auto' };
    const formHeaderStyle = { backgroundColor: 'white', padding: '20px', borderTopLeftRadius: '12px', borderTopRightRadius: '12px', borderTop: '10px solid #00092f' };
    const questionCardStyle = { backgroundColor: 'white', padding: '20px', borderRadius: '12px', marginBottom: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' };
    const buttonStyle = { padding: '12px 22px', backgroundColor: '#00092f', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' };
    const progressBarStyle = { display: 'flex', justifyContent: 'space-between', marginBottom: '30px', position: 'relative' };
    const progressBarStepStyle = (isActive) => ({ width: '35px', height: '35px', borderRadius: '50%', backgroundColor: isActive ? '#00092f' : '#ccc', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1, fontWeight: 'bold', transition: 'background-color 0.3s' });
    const progressBarLineStyle = { position: 'absolute', top: '17px', left: '17px', right: '17px', height: '2px', backgroundColor: '#ccc', zIndex: 0 };
    
    if (loading && formFields.length === 0) return <p style={{textAlign: 'center', marginTop: '50px'}}>Memuat formulir...</p>;
    
    if (submittedTicket) return (
        <div style={{ ...formContainerStyle, textAlign: 'center', padding: '40px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.07)' }}>
            <span style={{ fontSize: '64px' }}>✅</span>
            <h2 style={{ color: '#00092f' }}>Pengajuan Berhasil!</h2>
            <p>Terima kasih, berkas Anda telah berhasil kami terima. Silakan simpan nomor tiket Anda untuk melakukan pelacakan.</p>
            <div style={{ backgroundColor: '#e3f2fd', padding: '20px', borderRadius: '8px', margin: '20px 0', border: '1px solid #bde0fe' }}>
                <p style={{ margin: 0 }}>Nomor Tiket Anda:</p>
                <h3 style={{ margin: '5px 0', fontSize: '24px', color: '#00092f' }}>{submittedTicket}</h3>
            </div>
            <button onClick={() => navigate('/layanan/berkaskm/lacak')} style={buttonStyle}>Lacak Tiket Sekarang</button>
        </div>
    );

    return (
        <div style={formContainerStyle}>
            <div style={formHeaderStyle}><h2 style={{ margin: 0 }}>Pengumpulan Berkas Administrasi</h2></div>
            <div style={{ backgroundColor: 'white', padding: '20px', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
                <div style={progressBarStyle}>
                    <div style={progressBarLineStyle}></div>
                    <div style={progressBarStepStyle(step >= 1)}>1</div>
                    <div style={progressBarStepStyle(step >= 2)}>2</div>
                    <div style={progressBarStepStyle(step >= 3)}>3</div>
                </div>
                {error && <p style={{ color: 'red', fontSize: '14px', textAlign: 'center', marginBottom: '15px' }}>{error}</p>}
                
                {step === 1 && (
                    <div>
                        <h3 style={{color: '#00092f'}}>Informasi Dasar</h3>
                        {formFields.filter(f => f.step === 1).map(field => (
                            <div key={field.fieldName} style={questionCardStyle}>
                                <label style={{fontWeight: '600'}}>{field.label} {field.required && '*'}</label>
                                {renderField(field)}
                            </div>
                        ))}
                    </div>
                )}
                {step === 2 && (
                     <div>
                        <h3 style={{color: '#00092f'}}>Kelengkapan Berkas</h3>
                        {formFields.filter(f => f.step === 2).map(field => (
                            <div key={field.fieldName} style={questionCardStyle}>
                                <label style={{fontWeight: '600'}}>{field.label} {field.required && '*'}</label>
                                {renderField(field)}
                            </div>
                        ))}
                    </div>
                )}
                {step === 3 && (
                    <div>
                        <h3 style={{color: '#00092f'}}>Konfirmasi</h3>
                        <div style={{...questionCardStyle, lineHeight: '1.8'}}>
                            <p>Harap periksa kembali semua data yang Anda masukkan sebelum mengirimkan.</p>
                            <hr style={{border: 'none', borderTop: '1px solid #eee', margin: '15px 0'}} />
                            {formFields.filter(f => formData[f.fieldName]).map(field => {
                                const value = formData[field.fieldName];
                                let displayName = value;
                                if (typeof value === 'string' && value.startsWith('data:')) {
                                    displayName = `File diunggah: ${value.split(';name=')[1] || 'file'}`;
                                } else if (typeof value === 'string' && value.startsWith('http')) {
                                    displayName = <a href={value} target="_blank" rel="noopener noreferrer" style={{color: '#00092f'}}>{value}</a>;
                                }
                                return (
                                    <div key={field.fieldName} style={{padding: '8px 0', display: 'grid', gridTemplateColumns: '180px 1fr'}}>
                                        <strong style={{color: '#333'}}>{field.label}:</strong> 
                                        <span style={{color: '#555'}}>{displayName}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
                    {step > 1 ? <button type="button" onClick={prevStep} style={{...buttonStyle, backgroundColor: '#6c757d'}}>Kembali</button> : <div></div>}
                    {step < 3 && <button type="button" onClick={nextStep} style={buttonStyle}>Selanjutnya</button>}
                    {step === 3 && <button type="button" onClick={handleSubmit} style={buttonStyle} disabled={loading}>{loading ? 'Mengirim...' : 'Kirim Pengajuan'}</button>}
                </div>
            </div>
        </div>
    );
};

export default FormPengajuan;