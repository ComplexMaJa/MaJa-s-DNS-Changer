// src/components/ServerList.tsx
import React from 'react';
import type { ScanResult } from '../hooks/useDNSScanner';

interface ServerListProps {
    results: ScanResult[];
    bestProvider: string | null;
}

function getLatencyClass(ms: number): string {
    if (ms <= 30) return 'good';
    if (ms <= 80) return 'medium';
    return 'bad';
}

function getStatusBadge(result: ScanResult): React.ReactNode {
    switch (result.status) {
        case 'testing':
            return (
                <span className="status-badge testing">
                    <span className="spinner" style={{ width: 10, height: 10, borderWidth: 1.5 }} />
                    Testing
                </span>
            );
        case 'done':
            return (
                <span className={`status-badge ${getLatencyClass(result.latency)}`}>
                    {result.latency <= 30 ? '●' : result.latency <= 80 ? '●' : '●'}{' '}
                    {result.latency <= 30 ? 'Fast' : result.latency <= 80 ? 'OK' : 'Slow'}
                </span>
            );
        case 'error':
            return <span className="status-badge bad">✕ Error</span>;
        default:
            return <span className="status-badge waiting">○ Waiting</span>;
    }
}

export const ServerList: React.FC<ServerListProps> = ({ results, bestProvider }) => {
    // Sort: done results by latency, then testing, then waiting/error
    const sorted = [...results].sort((a, b) => {
        if (a.status === 'done' && b.status === 'done') return a.latency - b.latency;
        if (a.status === 'done') return -1;
        if (b.status === 'done') return 1;
        if (a.status === 'testing') return -1;
        if (b.status === 'testing') return 1;
        return 0;
    });

    return (
        <div className="server-list" id="server-list">
            <div className="server-list-header">
                <span>Provider</span>
                <span>IP Address</span>
                <span>Latency</span>
                <span>Status</span>
            </div>
            {sorted.map((result, index) => (
                <div
                    key={result.provider}
                    className={`server-row ${result.provider === bestProvider ? 'best' : ''} fade-in`}
                    style={{ animationDelay: `${index * 30}ms` }}
                    id={`server-${result.provider.toLowerCase().replace(/\s+/g, '-')}`}
                >
                    <span className="server-name">
                        {result.provider === bestProvider && '★ '}
                        {result.provider}
                    </span>
                    <span className="server-ip">
                        {result.primaryIP} / {result.secondaryIP}
                    </span>
                    <span className={`server-latency ${result.status === 'done' ? `latency-${getLatencyClass(result.latency)}` : ''}`}>
                        {result.status === 'done' ? `${result.latency} ms` : result.status === 'error' ? 'Timeout' : '—'}
                    </span>
                    <span className="server-status">
                        {getStatusBadge(result)}
                    </span>
                </div>
            ))}
        </div>
    );
};
