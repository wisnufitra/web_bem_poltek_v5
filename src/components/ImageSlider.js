import React, { useState } from 'react';

const ImageSlider = ({ images }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const goToPrevious = () => {
        const isFirstSlide = currentIndex === 0;
        const newIndex = isFirstSlide ? images.length - 1 : currentIndex - 1;
        setCurrentIndex(newIndex);
    };

    const goToNext = () => {
        const isLastSlide = currentIndex === images.length - 1;
        const newIndex = isLastSlide ? 0 : currentIndex + 1;
        setCurrentIndex(newIndex);
    };

    // Styles
    const sliderStyles = { position: 'relative', height: '400px', margin: '0 auto', marginBottom: '15px' };
    const imageStyles = { width: '100%', height: '100%', borderRadius: '8px', objectFit: 'contain', backgroundColor: '#e9eef2' };
    const arrowStyles = { position: 'absolute', top: '50%', transform: 'translateY(-50%)', fontSize: '45px', color: 'white', zIndex: 1, cursor: 'pointer', textShadow: '1px 1px 3px rgba(0,0,0,0.7)' };
    const leftArrowStyles = { ...arrowStyles, left: '15px' };
    const rightArrowStyles = { ...arrowStyles, right: '15px' };
    const counterStyles = { position: 'absolute', bottom: '10px', right: '10px', color: 'white', backgroundColor: 'rgba(0,0,0,0.6)', padding: '2px 10px', borderRadius: '10px', fontSize: '14px' };

    if (!images || images.length === 0) {
        return null;
    }

    return (
        <div style={sliderStyles}>
            {images.length > 1 && <div style={leftArrowStyles} onClick={goToPrevious}>&#10094;</div>}
            {images.length > 1 && <div style={rightArrowStyles} onClick={goToNext}>&#10095;</div>}
            <img src={images[currentIndex]} alt={`Slide ${currentIndex + 1}`} style={imageStyles} />
            {images.length > 1 && <div style={counterStyles}>{currentIndex + 1} / {images.length}</div>}
        </div>
    );
};

export default ImageSlider;