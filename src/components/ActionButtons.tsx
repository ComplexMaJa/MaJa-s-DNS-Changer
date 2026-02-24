// src/components/ActionButtons.tsx
import React from 'react';

interface ActionButtonsProps {
    isScanning: boolean;
    hasBestDNS: boolean;
    onScan: () => void;
    onApply: () => void;
    onRestore: () => void;
    isApplying: boolean;
    isRestoring: boolean;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
    isScanning,
    hasBestDNS,
    onScan,
    onApply,
    onRestore,
    isApplying,
    isRestoring,
}) => {
    return (
        <div className="actions-bar" id="action-buttons">
            <button
                className="btn btn-primary"
                onClick={onScan}
                disabled={isScanning || isApplying || isRestoring}
                id="btn-scan"
            >
                {isScanning ? (
                    <>
                        <span className="spinner" />
                        Scanning...
                    </>
                ) : (
                    <>
                        ⚡ Scan & Optimize DNS
                    </>
                )}
            </button>

            <button
                className="btn btn-secondary"
                onClick={onApply}
                disabled={!hasBestDNS || isScanning || isApplying || isRestoring}
                id="btn-apply"
            >
                {isApplying ? (
                    <>
                        <span className="spinner" />
                        Applying...
                    </>
                ) : (
                    <>
                        ✓ Apply Best DNS
                    </>
                )}
            </button>

            <button
                className="btn btn-danger"
                onClick={onRestore}
                disabled={isScanning || isApplying || isRestoring}
                id="btn-restore"
            >
                {isRestoring ? (
                    <>
                        <span className="spinner" />
                        Restoring...
                    </>
                ) : (
                    <>
                        ↺ Restore Default DNS
                    </>
                )}
            </button>
        </div>
    );
};
