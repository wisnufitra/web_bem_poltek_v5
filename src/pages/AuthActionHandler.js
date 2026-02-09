// src/pages/AuthActionHandler.js
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  applyActionCode,
  verifyPasswordResetCode,
  confirmPasswordReset,
} from "firebase/auth";
import { auth } from "../firebase/firebaseConfig";
import LoadingSpinner from "../components/LoadingSpinner";

const AuthActionHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState("loading"); // loading, success, error, awaiting_password
  const [message, setMessage] = useState("Memproses permintaan Anda...");
  const [actionCode, setActionCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const mode = params.get("mode");
    const oobCode = params.get("oobCode");

    if (!oobCode) {
      setStatus("error");
      setMessage("Tautan tidak valid atau telah kedaluwarsa.");
      return;
    }

    setActionCode(oobCode);

    const handleAction = async () => {
      try {
        switch (mode) {
          case "verifyEmail":
            await applyActionCode(auth, oobCode);
            setStatus("success");
            setMessage(
              "Email Anda telah berhasil diverifikasi! Anda sekarang dapat login."
            );
            break;

          case "resetPassword":
            await verifyPasswordResetCode(auth, oobCode);
            setStatus("awaiting_password");
            setMessage("Silakan masukkan password baru Anda.");
            break;

          default:
            setStatus("error");
            setMessage("Tipe aksi tidak dikenali.");
        }
      } catch (error) {
        setStatus("error");
        setMessage(
          "Tautan tidak valid atau telah kedaluwarsa. Silakan minta tautan baru."
        );
        console.error("Error saat memproses tautan:", error);
      }
    };

    handleAction();
  }, [location]);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setMessage("Password dan konfirmasi password tidak cocok.");
      return;
    }
    if (newPassword.length < 6) {
      setMessage("Password minimal harus 6 karakter.");
      return;
    }

    try {
      await confirmPasswordReset(auth, actionCode, newPassword);
      setStatus("success");
      setMessage(
        "Password Anda telah berhasil diubah! Silakan login dengan password baru Anda."
      );
    } catch (error) {
      setStatus("error");
      setMessage(
        "Gagal mereset password. Tautan mungkin sudah kedaluwarsa. Silakan coba lagi."
      );
      console.error("Error saat reset password:", error);
    }
  };

  // --- Styles ---
  const pageStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "calc(100vh - 150px)",
    backgroundColor: "#f4f6fb",
    padding: "20px",
  };

  const cardStyle = {
    backgroundColor: "#fff",
    padding: "40px 30px",
    borderRadius: "16px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
    maxWidth: "420px",
    width: "100%",
    textAlign: "center",
    animation: "fadeIn 0.5s ease",
  };

  const titleStyle = {
    color: "#00092f",
    marginTop: "10px",
    marginBottom: "10px",
    fontSize: "22px",
    fontWeight: "600",
  };

  const msgStyle = {
    color: "#555",
    fontSize: "15px",
    lineHeight: "1.6",
    marginBottom: "20px",
  };

  const inputStyle = {
    width: "100%",
    padding: "12px",
    marginTop: "10px",
    marginBottom: "15px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    boxSizing: "border-box",
    fontSize: "15px",
  };

  const buttonStyle = {
    width: "100%",
    padding: "12px",
    marginTop: "10px",
    backgroundColor: "#00092f",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "16px",
    transition: "background 0.3s ease",
    textDecoration: "none",
    display: "inline-block",
  };

  if (status === "loading") {
    return <LoadingSpinner />;
  }

  if (status === "awaiting_password") {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: "48px", marginBottom: "10px" }}>🔑</div>
          <h2 style={titleStyle}>Atur Ulang Password</h2>
          <p style={msgStyle}>{message}</p>
          <form onSubmit={handleResetPassword}>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={inputStyle}
              placeholder="Password Baru"
              required
            />
            <input
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              style={inputStyle}
              placeholder="Konfirmasi Password Baru"
              required
            />
            <button
              type="submit"
              style={buttonStyle}
              onMouseOver={(e) =>
                (e.target.style.backgroundColor = "#1a1f5c")
              }
              onMouseOut={(e) => (e.target.style.backgroundColor = "#00092f")}
            >
              Simpan Password Baru
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ fontSize: "52px", marginBottom: "10px" }}>
          {status === "success" ? "✅" : "❌"}
        </div>
        <h2 style={titleStyle}>
          {status === "success" ? "Proses Berhasil!" : "Proses Gagal"}
        </h2>
        <p style={msgStyle}>{message}</p>
        {status === "success" && (
          <Link
            to="/"
            style={buttonStyle}
            onMouseOver={(e) => (e.target.style.backgroundColor = "#1a1f5c")}
            onMouseOut={(e) => (e.target.style.backgroundColor = "#00092f")}
          >
            Lanjutkan ke Login
          </Link>
        )}
      </div>
    </div>
  );
};

export default AuthActionHandler;
