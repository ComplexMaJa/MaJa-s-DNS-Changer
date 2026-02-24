// src/components/LatencyHistoryGraph.tsx
import React, { useMemo, memo } from 'react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from 'recharts';
import type { ScanResult } from '../hooks/useDNSScanner';

interface LatencyHistoryGraphProps {
    results: ScanResult[];
    bestProvider: string | null;
}

interface ChartDataPoint {
    name: string;
    latency: number;
    fill: string;
}

const CustomTooltip: React.FC<{
    active?: boolean;
    payload?: Array<{ value: number; payload: ChartDataPoint }>;
    label?: string;
}> = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;
    return (
        <div className="chart-tooltip">
            <p className="chart-tooltip-label">{label}</p>
            <p className="chart-tooltip-value">{payload[0].value} ms</p>
        </div>
    );
};

export const LatencyHistoryGraph: React.FC<LatencyHistoryGraphProps> = memo(({
    results,
    bestProvider,
}) => {
    const chartData = useMemo<ChartDataPoint[]>(() => {
        return results
            .filter((r) => r.status === 'done' && r.latency < 9999)
            .sort((a, b) => a.latency - b.latency)
            .map((r) => ({
                name: r.provider.replace(' DNS', '').replace('Alternate ', 'Alt. '),
                latency: r.latency,
                fill: r.provider === bestProvider ? '#22c55e' : '#3b3b3b',
            }));
    }, [results, bestProvider]);

    if (chartData.length === 0) return null;

    return (
        <div className="history-graph-card">
            <div className="history-graph-header">
                <div className="history-graph-title">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.5 }}>
                        <path
                            d="M2 12L5.5 7L8.5 9.5L14 3"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                        <path
                            d="M10 3H14V7"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                    <span>Latency History</span>
                </div>
            </div>

            <div className="history-graph-body">
                <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255,255,255,0.04)"
                            vertical={false}
                        />
                        <XAxis
                            dataKey="name"
                            tick={{ fontSize: 10, fill: '#666' }}
                            axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                            tickLine={false}
                            interval={0}
                            angle={-30}
                            textAnchor="end"
                            height={40}
                        />
                        <YAxis
                            tick={{ fontSize: 10, fill: '#666' }}
                            axisLine={false}
                            tickLine={false}
                            unit=" ms"
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="latency"
                            stroke="#22c55e"
                            strokeWidth={2}
                            fill="url(#latencyGradient)"
                            dot={{
                                r: 3,
                                fill: '#000',
                                stroke: '#22c55e',
                                strokeWidth: 2,
                            }}
                            activeDot={{
                                r: 5,
                                fill: '#22c55e',
                                stroke: '#000',
                                strokeWidth: 2,
                            }}
                            animationDuration={1200}
                            animationEasing="ease-out"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
});

LatencyHistoryGraph.displayName = 'LatencyHistoryGraph';
