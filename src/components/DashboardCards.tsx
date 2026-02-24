// src/components/DashboardCards.tsx
import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { AnimatedNumber } from './AnimatedNumber';
import type { ScanResult } from '../hooks/useDNSScanner';

interface DashboardCardsProps {
    currentDNS: string[];
    adapter: string;
    isDHCP: boolean;
    bestDNS: ScanResult | null;
    isLoading: boolean;
}

function getPerformanceLevel(ms: number): { label: string; color: string; width: number } {
    if (ms <= 15) return { label: 'Excellent', color: '#22c55e', width: 95 };
    if (ms <= 30) return { label: 'Great', color: '#4ade80', width: 80 };
    if (ms <= 50) return { label: 'Good', color: '#86efac', width: 65 };
    if (ms <= 80) return { label: 'Average', color: '#a3a3a3', width: 45 };
    return { label: 'Poor', color: '#ef4444', width: 25 };
}

const cardVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.08, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const },
    }),
};

export const DashboardCards: React.FC<DashboardCardsProps> = memo(({
    currentDNS,
    adapter,
    isDHCP,
    bestDNS,
    isLoading,
}) => {
    const perf = bestDNS ? getPerformanceLevel(bestDNS.latency) : null;

    return (
        <div className="dashboard-grid">
            {/* Current DNS */}
            <motion.div
                className="stat-card"
                id="card-current-dns"
                custom={0}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
            >
                <div className="stat-card-icon-row">
                    <svg className="stat-card-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M3 9h12M9 2.5c-2 2.5-2.5 4-2.5 6.5s.5 4 2.5 6.5c2-2.5 2.5-4 2.5-6.5S11 4.5 9 2.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                    <span className="stat-card-label">Current DNS</span>
                </div>
                {isLoading ? (
                    <>
                        <div className="skeleton skeleton-value" />
                        <div className="skeleton skeleton-text" style={{ marginTop: 8, width: '50%' }} />
                    </>
                ) : (
                    <>
                        <div className="stat-card-value">{currentDNS[0]}</div>
                        <div className="stat-card-sub">
                            {isDHCP ? 'DHCP (Automatic)' : `on ${adapter}`}
                            {currentDNS[1] && ` · ${currentDNS[1]}`}
                        </div>
                    </>
                )}
            </motion.div>

            {/* Best DNS Found */}
            <motion.div
                className={`stat-card ${bestDNS ? 'stat-card-highlight' : ''}`}
                id="card-best-dns"
                custom={1}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
            >
                <div className="stat-card-icon-row">
                    <svg className="stat-card-icon stat-card-icon-green" width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M9 2l1.8 3.6L15 6.3l-2.7 2.6.6 3.8L9 10.8l-3.9 1.9.6-3.8L3 6.3l4.2-.7L9 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                    </svg>
                    <span className="stat-card-label">Best DNS Found</span>
                </div>
                {bestDNS ? (
                    <>
                        <div className="stat-card-value" style={{ color: '#22c55e' }}>
                            {bestDNS.provider}
                        </div>
                        <div className="stat-card-sub">
                            {bestDNS.primaryIP} / {bestDNS.secondaryIP}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="stat-card-value stat-card-value-muted">—</div>
                        <div className="stat-card-sub">Run a scan to find the best DNS</div>
                    </>
                )}
            </motion.div>

            {/* Latency */}
            <motion.div
                className="stat-card"
                id="card-latency"
                custom={2}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
            >
                <div className="stat-card-icon-row">
                    <svg className="stat-card-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <circle cx="9" cy="10" r="6" stroke="currentColor" strokeWidth="1.3" />
                        <path d="M9 7v3l2 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                        <path d="M7 2h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                    <span className="stat-card-label">Best Latency</span>
                </div>
                {bestDNS ? (
                    <>
                        <div className="stat-card-value-large" style={{ color: perf?.color }}>
                            <AnimatedNumber value={bestDNS.latency} suffix=" ms" />
                        </div>
                        {/* Performance bar */}
                        <div className="perf-bar-container">
                            <motion.div
                                className="perf-bar-fill"
                                initial={{ width: 0 }}
                                animate={{ width: `${perf?.width}%` }}
                                transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
                                style={{ backgroundColor: perf?.color }}
                            />
                        </div>
                        <div className="stat-card-sub" style={{ color: perf?.color }}>
                            {perf?.label}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="stat-card-value-large stat-card-value-muted">— ms</div>
                        <div className="perf-bar-container">
                            <div className="perf-bar-fill" style={{ width: 0 }} />
                        </div>
                        <div className="stat-card-sub">No data yet</div>
                    </>
                )}
            </motion.div>
        </div>
    );
});

DashboardCards.displayName = 'DashboardCards';
