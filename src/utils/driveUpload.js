// src/utils/driveUpload.js

// Ganti dengan URL Web App dari langkah Deploy tadi
const GAS_URL = "https://script.google.com/macros/s/AKfycbw_1IJBWcKX5TYxfPjgbonM59pus-IO1XDmpdMYzJhCf0DHXYSvppQbflcb8TAEZ_2x/exec"; 

export const uploadToGoogleDrive = async (file, folderHierarchy) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        reader.onload = async () => {
            // Hapus prefix data:application/pdf;base64,
            const rawBase64 = reader.result.split(',')[1]; 

            const payload = {
                filename: file.name,
                mimeType: file.type,
                fileBase64: rawBase64,
                folders: folderHierarchy
            };

            try {
                // --- PERBAIKAN CORS DISINI ---
                const response = await fetch(GAS_URL, {
                    method: "POST",
                    redirect: "follow", // Ikuti redirect Google
                    headers: {
                        // Trik: Gunakan text/plain agar browser TIDAK melakukan preflight check (OPTIONS)
                        "Content-Type": "text/plain;charset=utf-8", 
                    },
                    // Kirim data sebagai string biasa
                    body: JSON.stringify(payload)
                });

                const result = await response.json();

                if (result.status === 'success') {
                    resolve(result.url); 
                } else {
                    reject(result.message || "Gagal upload ke Drive");
                }
            } catch (error) {
                console.error("Upload Gagal:", error);
                reject(error);
            }
        };

        reader.onerror = error => reject(error);
    });
};