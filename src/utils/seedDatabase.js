// src/utils/seedDatabase.js
import { doc, setDoc } from "firebase/firestore"; 
import { db } from "../firebase/firebaseConfig";

export const seedOrganizationData = async () => {
  const masterRef = doc(db, "master_metadata", "organization_structure");

  // Struktur Awal KM Poltek Nuklir
  // Kamu bisa edit bagian ini sesuai kondisi real di kampus
  const initialData = {
    last_updated: new Date().toISOString(),
    entities: {
      // 1. EKSEKUTIF (BEM)
      "bem_pusat": {
        id: "bem_pusat",
        name: "BEM Poltek Nuklir",
        type: "eksekutif",
        logo: "https://via.placeholder.com/150", // Nanti bisa diganti url storage
        divisions: [
          "Pengurus Harian (PH)",
          "Kementerian Dalam Negeri",
          "Kementerian Luar Negeri",
          "Kementerian Keuangan",
          "Kementerian PSDM",
          "Kementerian Kominfo",
          "Kementerian SOSMAS",
          "Kementerian Kajian Strategis"
        ],
        positions: [
          "Presiden Mahasiswa",
          "Wakil Presiden Mahasiswa",
          "Menteri",
          "Sekretaris Kementerian",
          "Staf Ahli",
          "Staf Muda"
        ]
      },

      // 2. LEGISLATIF (DPM)
      "dpm_pusat": {
        id: "dpm_pusat",
        name: "DPM Poltek Nuklir",
        type: "legislatif",
        divisions: [
          "Pengurus Inti",
          "Komisi 1 (Hukum)",
          "Komisi 2 (Pengawasan)",
          "Komisi 3 (Aspirasi)"
        ],
        positions: [
          "Ketua Umum",
          "Sekretaris Jenderal",
          "Ketua Komisi",
          "Anggota Komisi"
        ]
      },

      // 3. HIMA (Contoh: Elins)
      "hima_elins": {
        id: "hima_elins",
        name: "HIMA Elins",
        type: "hima",
        divisions: [
          "PH",
          "Divisi Humas",
          "Divisi Iptek",
          "Divisi Minat Bakat"
        ],
        positions: ["Ketua Himpunan", "Wakil Ketua", "Kepala Divisi", "Staf"]
      },
      
      // 4. HIMA (Contoh: TKN)
      "hima_tkn": {
        id: "hima_tkn",
        name: "HIMA Teknokimia",
        type: "hima",
        divisions: ["PH", "Humas", "Ristek"],
        positions: ["Ketua Himpunan", "Staf"]
      },

      // 5. UKM (Contoh)
      "ukm_futsal": {
        id: "ukm_futsal",
        name: "UKM Olahraga",
        type: "ukm",
        divisions: ["Futsal", "Basket", "Voli"],
        positions: ["Ketua UKM", "Anggota"]
      }
    }
  };

  try {
    await setDoc(masterRef, initialData);
    alert("✅ Database Berhasil Diisi! Struktur Organisasi Siap.");
    console.log("Seeding Success:", initialData);
  } catch (error) {
    console.error("Seeding Error:", error);
    alert("❌ Gagal mengisi database: " + error.message);
  }
};