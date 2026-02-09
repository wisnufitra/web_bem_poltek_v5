import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  // "pathname" akan berubah setiap kali URL berubah
  const { pathname } = useLocation();

  // Gunakan useEffect untuk menjalankan perintah setiap kali pathname berubah
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // Komponen ini tidak menampilkan apa-apa, hanya menjalankan logika
  return null;
};

export default ScrollToTop;