// src/components/TitleBar.tsx
import React from 'react';

export const TitleBar: React.FC = () => {
    const handleMinimize = () => window.electronAPI?.windowMinimize();
    const handleMaximize = () => window.electronAPI?.windowMaximize();
    const handleClose = () => window.electronAPI?.windowClose();

    return (
        <div className="titlebar">
            <span className="titlebar-title">MaJa's DNS Changer</span>
            <div className="titlebar-controls">
                <button className="titlebar-btn" onClick={handleMinimize} title="Minimize" id="btn-minimize">
                    ─
                </button>
                <button className="titlebar-btn" onClick={handleMaximize} title="Maximize" id="btn-maximize">
                    □
                </button>
                <button className="titlebar-btn close" onClick={handleClose} title="Close" id="btn-close">
                    ✕
                </button>
            </div>
        </div>
    );
};
