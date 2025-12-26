import React from 'react';

function ImagePreview({ isOpen, imageName, imagePath, onClose }) {
    if (!isOpen) return null;

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
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
                    <div style={{
                        background: '#f8f9fa',
                        padding: '15px',
                        borderRadius: '6px',
                        border: '1px solid #e1e5e9'
                    }}>
                        <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666' }}>Image Data</h4>
                        <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>Details will be added here later</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ImagePreview;