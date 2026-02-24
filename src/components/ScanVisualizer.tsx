// src/components/ScanVisualizer.tsx
import React, { memo } from 'react';
import { motion } from 'framer-motion';

interface ScanVisualizerProps {
    isScanning: boolean;
    progress: number;
    currentProvider: string;
    completedCount: number;
    totalCount: number;
}

export const ScanVisualizer: React.FC<ScanVisualizerProps> = memo(({
    isScanning,
    progress,
    currentProvider,
    completedCount,
    totalCount,
}) => {
    if (!isScanning && progress === 0) return null;

    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <motion.div
            className="scan-visualizer"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
        >
            <div className="scan-ring-container">
                <svg width="100" height="100" viewBox="0 0 100 100">
                    {/* Background ring */}
                    <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="none"
                        stroke="rgba(255,255,255,0.06)"
                        strokeWidth="4"
                    />
                    {/* Progress ring */}
                    <motion.circle
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="none"
                        stroke={isScanning ? '#22c55e' : '#22c55e'}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        transform="rotate(-90 50 50)"
                        style={{
                            filter: isScanning ? 'drop-shadow(0 0 6px rgba(34, 197, 94, 0.4))' : 'none',
                        }}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                    {/* Center text */}
                    <text
                        x="50"
                        y="46"
                        textAnchor="middle"
                        fill="white"
                        fontSize="18"
                        fontWeight="600"
                        fontFamily="Inter, sans-serif"
                    >
                        {Math.round(progress)}%
                    </text>
                    <text
                        x="50"
                        y="60"
                        textAnchor="middle"
                        fill="#666"
                        fontSize="9"
                        fontFamily="Inter, sans-serif"
                    >
                        {isScanning ? 'SCANNING' : 'COMPLETE'}
                    </text>
                </svg>
            </div>

            <div className="scan-info">
                <div className="scan-info-title">
                    {isScanning ? 'Scanning DNS Providers...' : 'Scan Complete'}
                </div>
                <div className="scan-info-detail">
                    {isScanning ? (
                        <>
                            Testing <strong>{currentProvider}</strong>
                        </>
                    ) : (
                        <>All {totalCount} providers benchmarked</>
                    )}
                </div>
                <div className="scan-info-progress">
                    {completedCount} / {totalCount} completed
                </div>
            </div>
        </motion.div>
    );
});

ScanVisualizer.displayName = 'ScanVisualizer';
