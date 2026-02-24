// src/components/DashboardCards.tsx
import React from 'react';
import type { ScanResult } from '../hooks/useDNSScanner';

interface DashboardCardsProps {
    currentDNS: string[];
    adapter: string;
    isDHCP: boolean;
    bestDNS: ScanResult | null;
    isLoading: boolean;
}

function getLatencyClass(ms: number): string {
    if (ms <= 30) return 'good';
    if (ms <= 80) return 'medium';
    return 'bad';
}

function getLatencyColorClass(ms: number): string {
    if (ms <= 30) return 'latency-good';
    if (ms <= 80) return 'latency-medium';
    return 'latency-bad';
}

export const DashboardCards: React.FC<DashboardCardsProps> = ({
    currentDNS,
    adapter,
    isDHCP,
    bestDNS,
    isLoading,
}) => {
    return (
        <div className="dashboard-grid">
            {/* Current DNS */}
            <div className="stat-card" id="card-current-dns">
                <div className="stat-card-label">Current DNS</div>
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
                            {currentDNS[1] && ` · Secondary: ${currentDNS[1]}`}
                        </div>
                    </>
                )}
            </div>

            {/* Best DNS Found */}
            <div className="stat-card" id="card-best-dns">
                <div className="stat-card-label">Best DNS Found</div>
                {bestDNS ? (
                    <>
                        <div className="stat-card-value" style={{ color: 'var(--status-green)' }}>
                            {bestDNS.provider}
                        </div>
                        <div className="stat-card-sub">
                            {bestDNS.primaryIP} / {bestDNS.secondaryIP}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="stat-card-value" style={{ color: 'var(--text-muted)' }}>—</div>
                        <div className="stat-card-sub">Run a scan to find the best DNS</div>
                    </>
                )}
            </div>

            {/* Latency */}
            <div className="stat-card" id="card-latency">
                <div className="stat-card-label">Best Latency</div>
                {bestDNS ? (
                    <>
                        <div className={`stat-card-value ${getLatencyColorClass(bestDNS.latency)}`}>
                            <span className={`latency-dot ${getLatencyClass(bestDNS.latency)}`} />
                            {bestDNS.latency} ms
                        </div>
                        <div className="stat-card-sub">
                            {bestDNS.latency <= 30 ? 'Excellent' : bestDNS.latency <= 80 ? 'Good' : 'Poor'}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="stat-card-value" style={{ color: 'var(--text-muted)' }}>— ms</div>
                        <div className="stat-card-sub">No data yet</div>
                    </>
                )}
            </div>
        </div>
    );
};
