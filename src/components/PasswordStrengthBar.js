// src/components/PasswordStrengthBar.js
import React from 'react';

const PasswordStrengthBar = ({ score }) => {
    const getBarColor = () => {
        if (score >= 80) return '#22c55e'; // green-500
        if (score >= 40) return '#f59e0b'; // amber-500
        return '#ef4444'; // red-500
    };

    const getStrengthText = () => {
        if (score >= 80) return 'Sangat Kuat';
        if (score >= 60) return 'Kuat';
        if (score >= 40) return 'Cukup';
        return 'Lemah';
    };

    const barStyle = {
        height: '6px',
        backgroundColor: '#e2e8f0', // gray-200
        borderRadius: '3px',
        overflow: 'hidden',
    };

    const progressStyle = {
        height: '100%',
        width: `${score}%`,
        backgroundColor: getBarColor(),
        borderRadius: '3px',
        transition: 'width 0.3s ease',
    };

    const textStyle = {
        margin: '4px 0 0',
        fontSize: '0.8rem',
        color: getBarColor(),
        textAlign: 'right',
        fontWeight: '500',
    };

    return (
        <div style={{ marginTop: '-10px', marginBottom: '20px' }}>
            <div style={barStyle}>
                <div style={progressStyle} />
            </div>
            <p style={textStyle}>
                {getStrengthText()}
            </p>
        </div>
    );
};

export default PasswordStrengthBar;