// src/components/LatencyBarChart.tsx
import React, { useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ProviderUIState } from '../hooks/useDNSScanner';

interface LatencyBarChartProps {
    providers: ProviderUIState[];
    bestProvider: string | null;
    isScanning: boolean;
}

function getBarColor(ms: number, maxMs: number): string {
    const ratio = ms / maxMs;
    if (ratio <= 0.3) return '#22c55e';
    if (ratio <= 0.5) return '#4ade80';
    if (ratio <= 0.7) return '#a3a3a3';
    return '#525252';
}

export const LatencyBarChart: React.FC<LatencyBarChartProps> = memo(({
    providers,
    bestProvider,
    isScanning,
}) => {
    const completedResults = useMemo(() => {
        return providers
            .filter((p) => p.status === 'done' && p.result && p.result.averageLatency < 9999)
            .map((p) => p.result!)
            .sort((a, b) => a.averageLatency - b.averageLatency);
    }, [providers]);

    const maxLatency = useMemo(() => {
        if (completedResults.length === 0) return 100;
        return Math.max(...completedResults.map((r) => r.averageLatency), 1);
    }, [completedResults]);

    if (completedResults.length === 0 && !isScanning) {
        return null;
    }

    return (
        <div className="latency-chart-card">
            <div className="latency-chart-header">
                <div className="latency-chart-title">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.5 }}>
                        <rect x="1" y="10" width="3" height="5" rx="1" fill="currentColor" />
                        <rect x="5.5" y="6" width="3" height="9" rx="1" fill="currentColor" />
                        <rect x="10" y="2" width="3" height="13" rx="1" fill="currentColor" />
                    </svg>
                    <span>Latency Comparison</span>
                </div>
                {completedResults.length > 0 && (
                    <span className="latency-chart-count">
                        {completedResults.length} providers tested
                    </span>
                )}
            </div>

            <div className="latency-bars-container">
                <AnimatePresence mode="popLayout">
                    {completedResults.map((result, index) => {
                        const barWidth = Math.max((result.averageLatency / maxLatency) * 100, 4);
                        const color = getBarColor(result.averageLatency, maxLatency);
                        const isBest = result.providerName === bestProvider;

                        return (
                            <motion.div
                                key={result.providerName}
                                className={`latency-bar-row ${isBest ? 'latency-bar-best' : ''}`}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{
                                    duration: 0.4,
                                    delay: index * 0.05,
                                    ease: [0.25, 0.46, 0.45, 0.94] as const,
                                }}
                                layout
                            >
                                <div className="latency-bar-label">
                                    {isBest && (
                                        <span className="latency-bar-star">★</span>
                                    )}
                                    <span className="latency-bar-name">{result.providerName}</span>
                                </div>

                                <div className="latency-bar-track">
                                    <motion.div
                                        className="latency-bar-fill"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${barWidth}%` }}
                                        transition={{
                                            duration: 0.8,
                                            delay: index * 0.05,
                                            ease: [0.25, 0.46, 0.45, 0.94] as const,
                                        }}
                                        style={{
                                            backgroundColor: color,
                                            boxShadow: isBest
                                                ? `0 0 12px ${color}40, 0 0 4px ${color}30`
                                                : 'none',
                                        }}
                                    />
                                </div>

                                <motion.span
                                    className="latency-bar-value"
                                    style={{ color }}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.3, delay: index * 0.05 + 0.3 }}
                                >
                                    {result.averageLatency} ms
                                </motion.span>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
});

LatencyBarChart.displayName = 'LatencyBarChart';
