import React from 'react';
import logoPoltek from '../assets/logo-poltek.png'; // Pastikan path ini benar

const LoadingSpinner = () => {
    const spinnerOverlayStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
    };

    const spinnerStyle = {
        width: '100px',
        height: '100px',
        animation: 'pulse 1.5s infinite ease-in-out'
    };

    // Menambahkan keyframes animasi ke dalam style tag
    const keyframes = `
        @keyframes pulse {
            0% {
                transform: scale(0.95);
                opacity: 0.7;
            }
            50% {
                transform: scale(1);
                opacity: 1;
            }
            100% {
                transform: scale(0.95);
                opacity: 0.7;
            }
        }
    `;

    return (
        <>
            <style>{keyframes}</style>
            <div style={spinnerOverlayStyle}>
                <img src={logoPoltek} alt="Loading..." style={spinnerStyle} />
            </div>
        </>
    );
};

export default LoadingSpinner;