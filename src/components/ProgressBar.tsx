// src/components/ProgressBar.tsx
import React from 'react';

interface ProgressBarProps {
    progress: number;
    isScanning: boolean;
    currentTest: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, isScanning, currentTest }) => {
    if (!isScanning && progress === 0) return null;

    return (
        <div className="progress-container" id="scan-progress">
            <div className="progress-header">
                <span className="progress-label">
                    {isScanning ? (
                        <>
                            <span className="spinner" style={{ marginRight: 8 }} />
                            Scanning {currentTest}...
                        </>
                    ) : (
                        'Scan Complete'
                    )}
                </span>
                <span className="progress-value">{Math.round(progress)}%</span>
            </div>
            <div className="progress-bar">
                <div
                    className="progress-fill"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
};
