// src/components/ServerList.tsx
import React, { useState, useMemo, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

function getBarColor(ms: number, maxMs: number): string {
    const ratio = ms / maxMs;
    if (ratio <= 0.3) return '#22c55e';
    if (ratio <= 0.5) return '#4ade80';
    if (ratio <= 0.7) return '#a3a3a3';
    return '#525252';
}

function getStatusBadge(result: ScanResult): React.ReactNode {
    switch (result.status) {
        case 'testing':
            return (
                <span className="status-badge testing">
                    <motion.span
                        className="status-pulse"
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    Testing
                </span>
            );
        case 'done':
            return (
                <span className={`status-badge ${getLatencyClass(result.latency)}`}>
                    <span className="status-dot" />
                    {result.latency <= 30 ? 'Fast' : result.latency <= 80 ? 'OK' : 'Slow'}
                </span>
            );
        case 'error':
            return <span className="status-badge bad"><span className="status-dot" /> Error</span>;
        default:
            return <span className="status-badge waiting"><span className="status-dot" /> Waiting</span>;
    }
}

const ExpandedRow: React.FC<{ result: ScanResult; maxLatency: number }> = memo(({ result, maxLatency }) => {
    const barWidth = Math.max((result.latency / maxLatency) * 100, 4);
    const barColor = getBarColor(result.latency, maxLatency);

    return (
        <motion.div
            className="server-row-expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
        >
            <div className="expanded-grid">
                <div className="expanded-item">
                    <span className="expanded-label">Primary DNS</span>
                    <span className="expanded-value">{result.primaryIP}</span>
                </div>
                <div className="expanded-item">
                    <span className="expanded-label">Secondary DNS</span>
                    <span className="expanded-value">{result.secondaryIP}</span>
                </div>
                <div className="expanded-item">
                    <span className="expanded-label">Average Latency</span>
                    <span className="expanded-value" style={{ color: barColor }}>
                        {result.latency} ms
                    </span>
                </div>
                <div className="expanded-item expanded-item-full">
                    <span className="expanded-label">Performance</span>
                    <div className="expanded-bar-track">
                        <motion.div
                            className="expanded-bar-fill"
                            initial={{ width: 0 }}
                            animate={{ width: `${barWidth}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            style={{ backgroundColor: barColor }}
                        />
                    </div>
                </div>
            </div>
        </motion.div>
    );
});

ExpandedRow.displayName = 'ExpandedRow';

export const ServerList: React.FC<ServerListProps> = memo(({ results, bestProvider }) => {
    const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

    const maxLatency = useMemo(() => {
        const doneResults = results.filter((r) => r.status === 'done' && r.latency < 9999);
        return Math.max(...doneResults.map((r) => r.latency), 1);
    }, [results]);

    const sorted = useMemo(() => {
        return [...results].sort((a, b) => {
            if (a.status === 'done' && b.status === 'done') return a.latency - b.latency;
            if (a.status === 'done') return -1;
            if (b.status === 'done') return 1;
            if (a.status === 'testing') return -1;
            if (b.status === 'testing') return 1;
            return 0;
        });
    }, [results]);

    const toggleExpand = useCallback((provider: string) => {
        setExpandedProvider((prev) => (prev === provider ? null : provider));
    }, []);

    return (
        <div className="server-list" id="server-list">
            <div className="server-list-header">
                <span>Provider</span>
                <span>Latency</span>
                <span>Performance</span>
                <span>Status</span>
            </div>

            <AnimatePresence mode="popLayout">
                {sorted.map((result, index) => {
                    const isBest = result.provider === bestProvider;
                    const isExpanded = expandedProvider === result.provider;
                    const barWidth = result.status === 'done'
                        ? Math.max((result.latency / maxLatency) * 100, 4)
                        : 0;
                    const barColor = result.status === 'done'
                        ? getBarColor(result.latency, maxLatency)
                        : '#1e1e1e';

                    return (
                        <motion.div
                            key={result.provider}
                            layout
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.03 }}
                        >
                            <div
                                className={`server-row ${isBest ? 'best' : ''} ${isExpanded ? 'expanded' : ''}`}
                                onClick={() => result.status === 'done' && toggleExpand(result.provider)}
                                style={{ cursor: result.status === 'done' ? 'pointer' : 'default' }}
                                id={`server-${result.provider.toLowerCase().replace(/\s+/g, '-')}`}
                            >
                                <span className="server-name">
                                    {isBest && <span className="best-star">★</span>}
                                    {result.provider}
                                </span>

                                <span className={`server-latency ${result.status === 'done' ? `latency-${getLatencyClass(result.latency)}` : ''}`}>
                                    {result.status === 'done'
                                        ? `${result.latency} ms`
                                        : result.status === 'error'
                                            ? 'Timeout'
                                            : '—'}
                                </span>

                                <span className="server-perf">
                                    <div className="inline-bar-track">
                                        <motion.div
                                            className="inline-bar-fill"
                                            animate={{ width: `${barWidth}%` }}
                                            transition={{ duration: 0.6, ease: 'easeOut' }}
                                            style={{ backgroundColor: barColor }}
                                        />
                                    </div>
                                </span>

                                <span className="server-status">
                                    {getStatusBadge(result)}
                                </span>
                            </div>

                            <AnimatePresence>
                                {isExpanded && result.status === 'done' && (
                                    <ExpandedRow result={result} maxLatency={maxLatency} />
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
});

ServerList.displayName = 'ServerList';
