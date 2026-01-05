import React, { useState } from 'react';
import apiService from '../services/api';

function ImagePreview({ isOpen, imageName, imagePath, imageData, images, currentIndex, onClose, onImageReplaced, onImageChange }) {
    const [replacing, setReplacing] = useState(false);
    
    const hasPrevious = currentIndex > 0;
    const hasNext = currentIndex < images.length - 1;

    const goToPrevious = () => {
        if (hasPrevious) {
            const newIndex = currentIndex - 1;
            const newImage = images[newIndex];
            onImageChange(newImage.fileName, newIndex);
        }
    };

    const goToNext = () => {
        if (hasNext) {
            const newIndex = currentIndex + 1;
            const newImage = images[newIndex];
            onImageChange(newImage.fileName, newIndex);
        }
    };

    // Keyboard navigation - always call useEffect
    React.useEffect(() => {
        if (!isOpen) return;
        
        const handleKeyPress = (e) => {
            if (e.key === 'ArrowLeft' && hasPrevious) {
                goToPrevious();
            } else if (e.key === 'ArrowRight' && hasNext) {
                goToNext();
            }
        };

        document.addEventListener('keydown', handleKeyPress);
        return () => document.removeEventListener('keydown', handleKeyPress);
    }, [isOpen, hasPrevious, hasNext, currentIndex]);
    
    if (!isOpen) return null;

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleReplaceImage = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        // Validate image file
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
        const isImage = imageExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
        
        if (!isImage) {
            alert('Please select a valid image file');
            return;
        }
        
        setReplacing(true);
        
        try {
            await apiService.replaceImage(imageData.imageId, file);
            alert('Image replaced successfully!');
            onImageReplaced(); // Refresh the image list
            onClose();
        } catch (error) {
            alert('Failed to replace image: ' + error.message);
        } finally {
            setReplacing(false);
            event.target.value = ''; // Reset file input
        }
    };

    return (
        <div 
            className="image-preview-overlay"
            onClick={handleOverlayClick}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
            }}
        >
            <div 
                className="image-preview-content"
                style={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    width: '80vw',
                    height: '80vh',
                    position: 'relative',
                    display: 'flex'
                }}
            >
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: 'none',
                        border: 'none',
                        fontSize: '24px',
                        cursor: 'pointer',
                        color: '#666',
                        zIndex: 1001
                    }}
                >
                    ×
                </button>
                
                {/* Left side - Image preview */}
                <div style={{
                    flex: '2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px',
                    borderRight: '1px solid #e1e5e9'
                }}>
                    <img
                        src={imagePath}
                        alt={imageName}
                        style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain'
                        }}
                    />
                </div>
                
                {/* Right side - Image data */}
                <div style={{
                    flex: '1',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <h3 style={{ marginTop: 0, marginBottom: '20px' }}>{imageName}</h3>
                    
                    {/* Replace Image Button */}
                    <div style={{ marginBottom: '20px' }}>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleReplaceImage}
                            disabled={replacing}
                            style={{ display: 'none' }}
                            id="replace-image-input"
                        />
                        <label
                            htmlFor="replace-image-input"
                            style={{
                                display: 'inline-block',
                                padding: '8px 16px',
                                background: replacing ? '#6c757d' : '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: replacing ? 'not-allowed' : 'pointer',
                                fontSize: '14px',
                                textAlign: 'center',
                                width: '100%',
                                boxSizing: 'border-box'
                            }}
                        >
                            {replacing ? 'Replacing...' : 'Replace Image'}
                        </label>
                    </div>
                    
                    <div style={{
                        background: '#f8f9fa',
                        padding: '15px',
                        borderRadius: '6px',
                        border: '1px solid #e1e5e9'
                    }}>
                        <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666' }}>Image Details</h4>
                        {imageData && (
                            <div style={{ fontSize: '12px', color: '#666' }}>
                                <p style={{ margin: '5px 0' }}><strong>File:</strong> {imageData.fileName}</p>
                                <p style={{ margin: '5px 0' }}><strong>Size:</strong> {imageData.fileSize ? Math.round(imageData.fileSize / 1024) + ' KB' : 'Unknown'}</p>
                                <p style={{ margin: '5px 0' }}><strong>Type:</strong> {imageData.contentType || 'Unknown'}</p>
                            </div>
                        )}
                    </div>
                    
                    {/* Navigation Arrows */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '20px',
                        marginTop: '20px'
                    }}>
                        <button
                            onClick={goToPrevious}
                            disabled={!hasPrevious}
                            style={{
                                background: hasPrevious ? '#007bff' : '#e9ecef',
                                color: hasPrevious ? 'white' : '#6c757d',
                                border: 'none',
                                borderRadius: '50%',
                                width: '50px',
                                height: '50px',
                                fontSize: '24px',
                                cursor: hasPrevious ? 'pointer' : 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                if (hasPrevious) {
                                    e.target.style.background = '#0056b3';
                                    e.target.style.transform = 'scale(1.1)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (hasPrevious) {
                                    e.target.style.background = '#007bff';
                                    e.target.style.transform = 'scale(1)';
                                }
                            }}
                        >
                            ◀
                        </button>
                        
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            fontSize: '14px',
                            color: '#666',
                            minWidth: '80px',
                            justifyContent: 'center'
                        }}>
                            {currentIndex + 1} of {images.length}
                        </div>
                        
                        <button
                            onClick={goToNext}
                            disabled={!hasNext}
                            style={{
                                background: hasNext ? '#007bff' : '#e9ecef',
                                color: hasNext ? 'white' : '#6c757d',
                                border: 'none',
                                borderRadius: '50%',
                                width: '50px',
                                height: '50px',
                                fontSize: '24px',
                                cursor: hasNext ? 'pointer' : 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                if (hasNext) {
                                    e.target.style.background = '#0056b3';
                                    e.target.style.transform = 'scale(1.1)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (hasNext) {
                                    e.target.style.background = '#007bff';
                                    e.target.style.transform = 'scale(1)';
                                }
                            }}
                        >
                            ▶
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ImagePreview;