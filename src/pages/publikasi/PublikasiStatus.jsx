import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { db } from "../../firebase/firebaseConfig"; // Pastikan path ini benar sesuai struktur folder Anda
import { collection, query, where, getDocs } from "firebase/firestore";
import { 
  CheckCircle2, Printer, Copy, ArrowLeft, 
  Clock, XCircle, BookOpen, AlertTriangle 
} from 'lucide-react';
import logo from "../../assets/logo-bempoltek.png"; // Pastikan path logo benar

const PublikasiStatus = () => {
  const { id } = useParams();
  const location = useLocation(); // Mengambil data dari redirect setelah submit
  
  // 1. Cek apakah ada data bawaan dari proses Submit sebelumnya?
  const [data, setData] = useState(location.state?.receiptData || null);
  
  // 2. Jika tidak ada data bawaan, berarti user akses via Link, maka loading = true
  const [loading, setLoading] = useState(!location.state?.receiptData);
  
  // 3. State khusus jika kena blokir Security Rules (Status Pending/Rejected)
  const [permissionError, setPermissionError] = useState(false);

  // Decode ID dari URL
  const submissionID = decodeURIComponent(id);

  useEffect(() => {
    // Jika data sudah ada (baru saja submit), tidak perlu fetch ke Firebase
    if (data) {
        setLoading(false);
        return;
    }

    const fetchData = async () => {
      try {
        const q = query(
          collection(db, "repository"), 
          where("submission_id", "==", submissionID)
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const docData = querySnapshot.docs[0].data();
          
          // Format tanggal dari Firestore Timestamp ke String
          const formattedDate = docData.created_at?.toDate 
            ? docData.created_at.toDate().toLocaleDateString('id-ID', { 
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
              }) 
            : docData.tanggal_publikasi;

          setData({
            ...docData,
            created_at_fmt: formattedDate
          });
        } else {
          setData(null);
        }
      } catch (err) {
        console.error("Error fetching status:", err);
        // Jika errornya karena permission (artinya data ada tapi status pending/rejected & user tidak login)
        if (err.code === 'permission-denied') {
            setPermissionError(true);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [submissionID, data]);

  // --- ACTIONS ---
  const handlePrint = () => {
    setTimeout(() => window.print(), 500);
  };

  const copyCitation = () => {
     if(!data) return;
     const year = data.tanggal_publikasi ? data.tanggal_publikasi.split('-')[0] : new Date().getFullYear();
     const text = `${data.penulis[0].nama} et al. (${year}). ${data.judul}. Repository BEM KM Poltek Nuklir.`;
     navigator.clipboard.writeText(text);
     alert("Kutipan disalin!");
  };

  // --- VIEW: LOADING ---
  if (loading) return (
    <div className="status-page-wrapper center-content">
       <div className="spinner"></div>
       <p>Memuat status publikasi...</p>
       <style>{styleSheet}</style>
    </div>
  );

  // --- VIEW: PERMISSION DENIED (Status Pending/Rejected di Sesi Baru) ---
  if (permissionError) {
      return (
        <div className="status-page-wrapper center-content">
           <style>{styleSheet}</style>
           <Clock size={64} color="#f59e0b" style={{marginBottom: '20px'}}/>
           <h2 style={{color:'#0f172a', margin: '0 0 10px'}}>Status: Sedang Diproses</h2>
           <div className="card-message">
             <p>
               Dokumen dengan ID <strong>{submissionID}</strong> saat ini masih dalam antrean verifikasi atau memerlukan revisi.
             </p>
             <p className="privacy-note">
               <AlertTriangle size={16} style={{display:'inline', marginBottom:'-2px'}}/> 
               Demi keamanan & privasi, detail lengkap dokumen belum dapat ditampilkan ke publik hingga status berubah menjadi <strong>Disetujui (Approved)</strong>.
             </p>
             <hr style={{margin: '20px 0', borderTop: '1px solid #e2e8f0'}}/>
             <p className="small-note">
               Silakan cek kotak masuk email Anda secara berkala untuk notifikasi persetujuan atau revisi dari Admin.
             </p>
           </div>
           <Link to="/publikasi" className="btn-back"><ArrowLeft size={18}/> Kembali ke Depan</Link>
        </div>
      );
  }

  // --- VIEW: NOT FOUND (ID Salah) ---
  if (!data) return (
    <div className="status-page-wrapper center-content">
       <style>{styleSheet}</style>
       <XCircle size={64} color="#ef4444" style={{marginBottom: '20px'}}/>
       <h2>Dokumen Tidak Ditemukan</h2>
       <p>ID: <strong>{submissionID}</strong> tidak terdaftar di sistem kami.</p>
       <Link to="/publikasi" className="btn-back">Kembali ke Depan</Link>
    </div>
  );

  // --- VIEW: MAIN CONTENT (Sukses Submit / Approved) ---
  const isApproved = data.status === 'approved';
  const isRejected = data.status === 'rejected';
  
  // Menentukan tanggal tampilan (prioritas: format string -> tanggal input -> sekarang)
  const displayDate = data.created_at_fmt || data.created_at_date || data.tanggal_publikasi || new Date().toLocaleDateString('id-ID');

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.href)}`;

  return (
    <div className="status-page-wrapper">
      <style>{styleSheet}</style>

      <div className="receipt-container">
        <div className="card receipt-card">
          
          {/* === TAMPILAN WEB === */}
          <div className="screen-success-view">
            <div className="success-header">
              <div className={`icon-wrapper-check ${data.status}`}>
                {isApproved ? <BookOpen size={48}/> : isRejected ? <XCircle size={48}/> : <CheckCircle2 size={48} />}
              </div>
              
              <h1>
                {isApproved ? "Karya Telah Terbit" : isRejected ? "Pengajuan Ditolak" : "Berhasil Disimpan"}
              </h1>
              
              <p>
                {isApproved 
                  ? "Selamat! Karya Anda telah lolos verifikasi dan sudah dapat diakses publik." 
                  : isRejected 
                  ? "Mohon maaf, karya Anda belum memenuhi kriteria. Cek email untuk detail revisi."
                  : "Karya Anda telah tersimpan di sistem Repository dan saat ini berstatus Menunggu Verifikasi."}
              </p>

              <div className={`status-badge ${data.status}`}>
                Status: {data.status === 'pending' ? 'MENUNGGU VERIFIKASI' : data.status.toUpperCase()}
              </div>
            </div>

            <div className="success-actions-grid">
              <div className="action-box highlight">
                <span className="lbl">ID Dokumen</span>
                <span className="val code">{data.submission_id}</span>
              </div>
              <div className="action-box">
                <span className="lbl">Link Akses</span>
                <div className="val link disabled">
                  {window.location.origin}/publikasi/...
                </div>
                {!isApproved && (
                    <small style={{color: '#d97706', fontSize: '0.8rem', marginTop: '4px', display:'block'}}>
                    *Link akan aktif setelah disetujui Admin.
                    </small>
                )}
              </div>
            </div>

            <div className="citation-box-wrapper">
              <div className="citation-box">
                  <p>"{data.penulis[0]?.nama} et al. ({data.tanggal_publikasi?.split('-')[0]}). {data.judul}..."</p>
                  <button onClick={copyCitation} className="btn-copy"><Copy size={16}/> Salin Sitasi</button>
              </div>
            </div>
          </div>

          {/* === TAMPILAN CETAK (PRINT ONLY) === */}
          <div className="printable-area">
            <div className="print-header">
              <img src={logo} alt="Logo" className="print-logo" />
              <div className="print-header-text">
                <h2>BEM KM POLTEK NUKLIR</h2>
                <h3>SISTEM REPOSITORY KARYA ILMIAH MAHASISWA</h3>
                <p>Jl. Babarsari, Caturtunggal, Depok, Sleman, DIY 55281</p>
              </div>
            </div>
            <div className="print-divider-thick"></div>

            <div className="print-doc-title">
              <h1>{isApproved ? "BUKTI PENERBITAN DIGITAL" : "TANDA TERIMA PENYERAHAN"}</h1>
              <p>{isApproved ? "Digital Publication Certificate" : "Submission Receipt"}</p>
            </div>

            <div className="print-body">
              <p>Menerangkan bahwa karya tulis ilmiah dengan rincian berikut tercatat dalam sistem database:</p>
              
              <table className="print-table">
                <tbody>
                  <tr><td className="td-label">ID Dokumen</td><td className="td-val bold">{data.submission_id}</td></tr>
                  <tr><td className="td-label">Judul Karya</td><td className="td-val">{data.judul}</td></tr>
                  <tr><td className="td-label">Jenis Karya</td><td className="td-val">{data.jenis_karya}</td></tr>
                  <tr><td className="td-label">Penulis Utama</td><td className="td-val">{data.penulis[0]?.nama} ({data.penulis[0]?.nim})</td></tr>
                  <tr><td className="td-label">Program Studi</td><td className="td-val">{data.prodi}</td></tr>
                  <tr><td className="td-label">Tanggal Upload</td><td className="td-val">{displayDate}</td></tr>
                  <tr><td className="td-label">Status Terkini</td><td className="td-val" style={{textTransform:'uppercase', fontWeight:'bold'}}>{data.status}</td></tr>
                </tbody>
              </table>

              <div className="print-footer-grid">
                <div className="qr-section">
                  <img src={qrCodeUrl} alt="QR Code" className="qr-img" />
                  <span>Scan untuk Validasi</span>
                </div>
                <div className="signature-section">
                  <p>Yogyakarta, {new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
                  <div className="digital-stamp">
                    <span>{isApproved ? "PUBLISHED / VALID" : "TERVERIFIKASI SISTEM"}</span>
                    <small>REPOSITORY BEM</small>
                  </div>
                  <p className="signer-name">Admin Repository</p>
                </div>
              </div>
            </div>
            <div className="print-bottom-footer">
              <p>Dokumen ini dihasilkan secara otomatis oleh komputer dan sah tanpa tanda tangan basah.</p>
            </div>
          </div>

          {/* ACTIONS BUTTONS */}
          <div className="receipt-actions">
            <button onClick={handlePrint} className="action-button primary"><Printer size={18} /> Cetak Bukti</button>
            <Link to="/publikasi" className="action-button secondary"><ArrowLeft size={18}/> Kembali ke Depan</Link>
          </div>

        </div>
      </div>
    </div>
  );
};

// --- CSS ---
const styleSheet = `
  /* PRINT STYLES */
  @media print {
    body * { visibility: hidden; height: 0; overflow: hidden; }
    .printable-area, .printable-area * { visibility: visible; height: auto; overflow: visible; }
    .printable-area { position: absolute; top: 0; left: 0; width: 100%; margin: 0; padding: 40px; background: white; color: black; z-index: 99999; display: block !important; }
    nav, footer, .page-header, .receipt-actions, .screen-success-view, .btn-submit, .btn-cancel, .main-navbar { display: none !important; }
  }

  /* WEB STYLES */
  .status-page-wrapper { font-family: 'Inter', sans-serif; background-color: #f8fafc; min-height: 100vh; padding: 40px 20px; }
  .center-content { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; height: 80vh; }
  
  .receipt-container { max-width: 800px; margin: 0 auto; }
  .card { background-color: #fff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.04); overflow: hidden; }
  
  .screen-success-view { padding: 40px; text-align: center; }
  .success-header { margin-bottom: 40px; display: flex; flex-direction: column; align-items: center; }
  
  .icon-wrapper-check { width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; transition: 0.3s; }
  .icon-wrapper-check.pending { background: #dcfce7; color: #16a34a; } 
  .icon-wrapper-check.approved { background: #eff6ff; color: #3b82f6; } 
  .icon-wrapper-check.rejected { background: #fef2f2; color: #ef4444; }

  .success-header h1 { color: #0f172a; margin: 0 0 10px 0; font-size: 1.8rem; font-weight: 800; }
  .success-header p { color: #64748b; margin: 0; max-width: 500px; line-height: 1.6; }
  
  .status-badge { margin-top: 16px; padding: 6px 16px; border-radius: 20px; font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  .status-badge.pending { background: #fffbeb; color: #d97706; border: 1px solid #fcd34d; }
  .status-badge.approved { background: #dcfce7; color: #16a34a; border: 1px solid #86efac; }
  .status-badge.rejected { background: #fee2e2; color: #ef4444; border: 1px solid #fca5a5; }

  .success-actions-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; text-align: left; }
  .action-box { background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 6px; }
  .action-box.highlight { background: #eff6ff; border-color: #bfdbfe; }
  .action-box .lbl { font-size: 0.85rem; color: #64748b; font-weight: 600; text-transform: uppercase; }
  .action-box .val { font-weight: 700; color: #0f172a; font-size: 1.1rem; }
  .action-box .val.code { font-family: monospace; }
  
  .citation-box-wrapper { margin-top: 20px; }
  .citation-box { background: #f1f5f9; padding: 16px; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; gap: 20px; text-align: left; border: 1px dashed #cbd5e1; }
  .citation-box p { margin: 0; font-family: 'Times New Roman', serif; color: #334155; font-style: italic; font-size: 0.95rem; }
  .btn-copy { border: 1px solid #cbd5e0; background: white; padding: 8px 12px; border-radius: 6px; cursor: pointer; color: #475569; display: flex; align-items: center; gap: 6px; font-weight: 600; font-size: 0.85rem; transition: 0.2s; }
  .btn-copy:hover { background: #f1f5f9; color: #0f172a; }
  
  .receipt-actions { background-color: #f8fafc; padding: 24px; display: flex; justify-content: center; gap: 16px; border-top: 1px solid #e2e8f0; }
  .action-button { padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; text-decoration: none; transition: 0.2s; }
  .action-button.primary { background-color: #0f172a; color: white; border: none; }
  .action-button.primary:hover { background-color: #1e293b; }
  .action-button.secondary { background-color: white; border: 1px solid #cbd5e0; color: #475569; }
  .action-button.secondary:hover { background-color: #f1f5f9; color: #0f172a; }
  
  .btn-back { background: #0f172a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px; font-weight: 600; display: inline-flex; align-items: center; gap: 8px; }
  .btn-back:hover { background: #1e293b; }

  /* Card Message for Restricted Access */
  .card-message { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; max-width: 500px; text-align: left; margin: 10px 0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
  .card-message p { color: #475569; line-height: 1.6; margin-bottom: 12px; }
  .card-message strong { color: #0f172a; }
  .privacy-note { color: #d97706 !important; font-size: 0.9rem; background: #fffbeb; padding: 10px; border-radius: 6px; border: 1px solid #fcd34d; }
  .small-note { font-size: 0.85rem; color: #64748b !important; font-style: italic; }

  .spinner { border: 4px solid #e2e8f0; border-top: 4px solid #3b82f6; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 16px; }
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

  /* Style Print (Copy dari sebelumnya) */
  .printable-area { display: none; }
  .print-header { display: flex; align-items: center; gap: 20px; margin-bottom: 10px; }
  .print-logo { height: 80px; width: auto; object-fit: contain; }
  .print-header-text h2 { margin: 0; font-size: 16pt; font-weight: 800; text-transform: uppercase; color: #000; }
  .print-header-text h3 { margin: 4px 0; font-size: 12pt; font-weight: 600; color: #333; }
  .print-header-text p { margin: 0; font-size: 9pt; color: #555; }
  .print-divider-thick { border-bottom: 3px solid #000; margin-bottom: 2px; }
  .print-doc-title { text-align: center; margin: 40px 0; }
  .print-doc-title h1 { margin: 0; font-size: 18pt; text-decoration: underline; font-weight: bold; }
  .print-doc-title p { margin: 5px 0 0; font-size: 10pt; font-style: italic; }
  .print-body { font-size: 11pt; line-height: 1.5; }
  .print-table { width: 100%; border-collapse: collapse; margin: 20px 0 40px; }
  .print-table td { padding: 8px 12px; vertical-align: top; border-bottom: 1px solid #eee; }
  .td-label { width: 180px; font-weight: bold; color: #444; }
  .td-val { color: #000; }
  .td-val.bold { font-weight: bold; font-family: monospace; font-size: 12pt; }
  .print-footer-grid { display: flex; justify-content: space-between; margin-top: 60px; }
  .qr-section { display: flex; flex-direction: column; align-items: center; gap: 5px; }
  .qr-img { width: 100px; height: 100px; border: 1px solid #000; }
  .signature-section { text-align: center; width: 250px; }
  .digital-stamp { border: 2px solid #16a34a; color: #16a34a; padding: 10px; margin: 15px auto; display: inline-block; font-weight: bold; transform: rotate(-5deg); opacity: 0.8; }
  .digital-stamp span { display: block; font-size: 12pt; }
  .digital-stamp small { font-size: 8pt; text-transform: uppercase; }
  .signer-name { font-weight: bold; text-decoration: underline; margin-top: 60px; }
  .print-bottom-footer { margin-top: 50px; border-top: 1px solid #ccc; pt: 10px; font-size: 8pt; color: #666; text-align: center; position: fixed; bottom: 20px; width: 100%; }

  @media (max-width: 768px) {
    .success-actions-grid { grid-template-columns: 1fr; }
    .citation-box { flex-direction: column; align-items: flex-start; }
    .btn-copy { width: 100%; justify-content: center; }
  }
`;

export default PublikasiStatus;