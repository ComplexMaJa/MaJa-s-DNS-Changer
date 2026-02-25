// src/components/ServerList.tsx
import React, { useState, useMemo, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ProviderUIState } from '../hooks/useDNSScanner';

interface ServerListProps {
    providers: ProviderUIState[];
    bestProvider: string | null;
    onApplyDNS?: (primary: string, secondary: string, providerName: string) => void;
}

function getScoreColor(score: number): string {
    if (score >= 85) return '#22c55e';
    if (score >= 70) return '#4ade80';
    if (score >= 50) return '#eab308';
    if (score >= 30) return '#f97316';
    return '#ef4444';
}

function getLatencyColor(ms: number): string {
    if (ms <= 20) return '#22c55e';
    if (ms <= 50) return '#4ade80';
    if (ms <= 100) return '#eab308';
    if (ms <= 200) return '#f97316';
    return '#ef4444';
}

function getLossColor(loss: number): string {
    if (loss === 0) return '#22c55e';
    if (loss <= 5) return '#eab308';
    return '#ef4444';
}

function formatTestResult(value: number): string {
    if (value === -1) return 'Timeout';
    return `${value}ms`;
}

function getTestResultColor(value: number): string {
    if (value === -1) return '#ef4444';
    if (value <= 20) return '#22c55e';
    if (value <= 50) return '#4ade80';
    if (value <= 100) return '#eab308';
    return '#f97316';
}

function getMethodLabel(method: string): string {
    switch (method) {
        case 'icmp': return 'ICMP';
        case 'dns': return 'DNS Query';
        case 'https': return 'HTTPS';
        default: return '';
    }
}

// ========== Expanded Details Panel ==========
const DetailsPanel: React.FC<{
    result: DNSBenchmarkResult;
    onApply?: (primary: string, secondary: string, providerName: string) => void;
}> = memo(({ result, onApply }) => {
    return (
        <motion.div
            className="benchmark-details-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
        >
            <div className="details-content">
                {/* Test results grid */}
                <div className="details-tests-grid">
                    {/* ICMP Results */}
                    <div className="details-test-section">
                        <div className="details-test-title">
                            <span className="details-test-icon">📡</span>
                            ICMP Results
                        </div>
                        <div className="details-test-results">
                            {result.icmpTests.map((t: number, i: number) => (
                                <span key={i} className="test-result-chip" style={{ color: getTestResultColor(t) }}>
                                    {formatTestResult(t)}
                                </span>
                            ))}
                        </div>
                        <div className="details-test-avg">
                            Avg: <span style={{ color: getLatencyColor(result.icmpAverage) }}>
                                {result.icmpAverage >= 9999 ? 'N/A' : `${result.icmpAverage}ms`}
                            </span>
                        </div>
                    </div>

                    {/* DNS Query Results */}
                    <div className="details-test-section">
                        <div className="details-test-title">
                            <span className="details-test-icon">🔍</span>
                            DNS Query Results
                        </div>
                        <div className="details-test-results">
                            {result.dnsTests.map((t: number, i: number) => (
                                <span key={i} className="test-result-chip" style={{ color: getTestResultColor(t) }}>
                                    {formatTestResult(t)}
                                </span>
                            ))}
                        </div>
                        <div className="details-test-avg">
                            Avg: <span style={{ color: getLatencyColor(result.dnsAverage) }}>
                                {result.dnsAverage >= 9999 ? 'N/A' : `${result.dnsAverage}ms`}
                            </span>
                        </div>
                    </div>

                    {/* HTTPS Results */}
                    <div className="details-test-section">
                        <div className="details-test-title">
                            <span className="details-test-icon">🌐</span>
                            HTTPS Results
                        </div>
                        <div className="details-test-results">
                            {result.httpsTests.map((t: number, i: number) => (
                                <span key={i} className="test-result-chip" style={{ color: getTestResultColor(t) }}>
                                    {formatTestResult(t)}
                                </span>
                            ))}
                        </div>
                        <div className="details-test-avg">
                            Avg: <span style={{ color: getLatencyColor(result.httpsAverage) }}>
                                {result.httpsAverage >= 9999 ? 'N/A' : `${result.httpsAverage}ms`}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Metrics Summary */}
                <div className="details-metrics-grid">
                    <div className="details-metric">
                        <span className="details-metric-label">Average Latency</span>
                        <span className="details-metric-value" style={{ color: getLatencyColor(result.averageLatency) }}>
                            {result.averageLatency >= 9999 ? 'N/A' : `${result.averageLatency}ms`}
                        </span>
                    </div>
                    <div className="details-metric">
                        <span className="details-metric-label">Jitter</span>
                        <span className="details-metric-value" style={{ color: result.jitter <= 5 ? '#22c55e' : result.jitter <= 15 ? '#eab308' : '#ef4444' }}>
                            {result.jitter}ms
                        </span>
                    </div>
                    <div className="details-metric">
                        <span className="details-metric-label">Packet Loss</span>
                        <span className="details-metric-value" style={{ color: getLossColor(result.packetLoss) }}>
                            {result.packetLoss}%
                        </span>
                    </div>
                    <div className="details-metric">
                        <span className="details-metric-label">Stability Score</span>
                        <span className="details-metric-value" style={{ color: getScoreColor(result.stabilityScore) }}>
                            {result.stabilityScore}
                        </span>
                    </div>
                    <div className="details-metric">
                        <span className="details-metric-label">Performance Score</span>
                        <span className="details-metric-value details-metric-highlight" style={{ color: getScoreColor(result.performanceScore) }}>
                            {result.performanceScore}
                        </span>
                    </div>
                    <div className="details-metric">
                        <span className="details-metric-label">DNS IPs</span>
                        <span className="details-metric-value details-metric-ips">
                            {result.primary} / {result.secondary}
                        </span>
                    </div>
                </div>

                {/* Apply Button */}
                {onApply && (
                    <div className="details-apply-row">
                        <button
                            className="btn-apply-dns"
                            onClick={(e) => {
                                e.stopPropagation();
                                onApply(result.primary, result.secondary, result.providerName);
                            }}
                            id={`apply-${result.providerName.toLowerCase().replace(/[\s.]+/g, '-')}`}
                        >
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <path d="M3 7.5L5.5 10L11 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Apply {result.providerName}
                            <span className="btn-apply-ips">{result.primary} / {result.secondary}</span>
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
});

DetailsPanel.displayName = 'DetailsPanel';

// ========== Main Server List ==========
export const ServerList: React.FC<ServerListProps> = memo(({ providers, bestProvider, onApplyDNS }) => {
    const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

    // Sort: after scanning, sort by performanceScore. Before scan, alphabetical.
    const sorted = useMemo(() => {
        const hasDoneResults = providers.some((p) => p.status === 'done' && p.result);
        return [...providers].sort((a, b) => {
            if (hasDoneResults) {
                // Done items first, then testing, then waiting
                if (a.result && b.result) {
                    return b.result.performanceScore - a.result.performanceScore;
                }
                if (a.result) return -1;
                if (b.result) return 1;
                if (a.status === 'testing') return -1;
                if (b.status === 'testing') return 1;
                if (a.status === 'error' && b.status !== 'error') return 1;
                if (b.status === 'error' && a.status !== 'error') return -1;
                return 0;
            }
            // Before scan, alphabetical
            return a.providerName.localeCompare(b.providerName);
        });
    }, [providers]);

    const toggleExpand = useCallback((provider: string) => {
        setExpandedProvider((prev) => (prev === provider ? null : provider));
    }, []);

    return (
        <div className="server-list" id="server-list">
            {/* Header */}
            <div className="server-list-header benchmark-header">
                <span>Provider</span>
                <span>Latency</span>
                <span>Stability</span>
                <span>Loss</span>
                <span>Score</span>
                <span>Status</span>
            </div>

            {/* Rows */}
            <AnimatePresence mode="popLayout">
                {sorted.map((provider, index) => {
                    const isBest = provider.providerName === bestProvider;
                    const isExpanded = expandedProvider === provider.providerName;
                    const result = provider.result;
                    const isDone = provider.status === 'done' && result;

                    return (
                        <motion.div
                            key={provider.providerName}
                            layout
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.02 }}
                        >
                            <div
                                className={`server-row benchmark-row ${isBest ? 'best' : ''} ${isExpanded ? 'expanded' : ''}`}
                                onClick={() => isDone && toggleExpand(provider.providerName)}
                                style={{ cursor: isDone ? 'pointer' : 'default' }}
                                id={`server-${provider.providerName.toLowerCase().replace(/[\s.]+/g, '-')}`}
                            >
                                {/* Provider Name */}
                                <span className="server-name">
                                    {isBest && <span className="best-star">★</span>}
                                    {provider.providerName}
                                </span>

                                {/* Latency */}
                                <span className="server-latency">
                                    {isDone ? (
                                        <span className="latency-with-bar">
                                            <span style={{ color: getLatencyColor(result.averageLatency) }}>
                                                {result.averageLatency >= 9999 ? 'N/A' : `${result.averageLatency}ms`}
                                            </span>
                                        </span>
                                    ) : provider.status === 'error' ? (
                                        <span style={{ color: '#ef4444' }}>Timeout</span>
                                    ) : (
                                        '—'
                                    )}
                                </span>

                                {/* Stability */}
                                <span className="server-stability">
                                    {isDone ? (
                                        <span className="stability-bar-cell">
                                            <div className="stability-bar-track">
                                                <motion.div
                                                    className="stability-bar-fill"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${result.stabilityScore}%` }}
                                                    transition={{ duration: 0.6, ease: 'easeOut' }}
                                                    style={{ backgroundColor: getScoreColor(result.stabilityScore) }}
                                                />
                                            </div>
                                            <span className="stability-value" style={{ color: getScoreColor(result.stabilityScore) }}>
                                                {result.stabilityScore}%
                                            </span>
                                        </span>
                                    ) : (
                                        '—'
                                    )}
                                </span>

                                {/* Packet Loss */}
                                <span className="server-loss">
                                    {isDone ? (
                                        <span
                                            className={`loss-indicator ${result.packetLoss > 5 ? 'loss-high' : ''}`}
                                            style={{ color: getLossColor(result.packetLoss) }}
                                        >
                                            {result.packetLoss > 5 && <span className="loss-warning-dot" />}
                                            {result.packetLoss}%
                                        </span>
                                    ) : (
                                        '—'
                                    )}
                                </span>

                                {/* Performance Score */}
                                <span className="server-score">
                                    {isDone ? (
                                        <span className="score-badge" style={{
                                            color: getScoreColor(result.performanceScore),
                                            borderColor: getScoreColor(result.performanceScore) + '30',
                                            background: getScoreColor(result.performanceScore) + '10',
                                        }}>
                                            {isBest && <span className="score-crown">👑</span>}
                                            {result.performanceScore}
                                        </span>
                                    ) : (
                                        '—'
                                    )}
                                </span>

                                {/* Status */}
                                <span className="server-status">
                                    {provider.status === 'testing' ? (
                                        <span className="status-badge testing">
                                            <motion.span
                                                className="status-pulse"
                                                animate={{ opacity: [0.4, 1, 0.4] }}
                                                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                                            />
                                            {getMethodLabel(provider.currentMethod) || 'Testing'}
                                        </span>
                                    ) : provider.status === 'done' ? (
                                        <span className="status-badge good">
                                            <span className="status-dot" />
                                            Done
                                        </span>
                                    ) : provider.status === 'error' ? (
                                        <span className="status-badge bad">
                                            <span className="status-dot" />
                                            Error
                                        </span>
                                    ) : (
                                        <span className="status-badge waiting">
                                            <span className="status-dot" />
                                            Waiting
                                        </span>
                                    )}
                                </span>
                            </div>

                            {/* Expanded Details */}
                            <AnimatePresence>
                                {isExpanded && isDone && result && (
                                    <DetailsPanel result={result} onApply={onApplyDNS} />
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
