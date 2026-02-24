// src/hooks/useDNSScanner.ts
import { useState, useCallback, useEffect, useRef } from 'react';

export interface ScanResult {
    provider: string;
    primaryIP: string;
    secondaryIP: string;
    latency: number;
    status: 'waiting' | 'testing' | 'done' | 'error';
}

const DNS_PROVIDERS = [
    { name: 'Cloudflare', primaryIP: '1.1.1.1', secondaryIP: '1.0.0.1' },
    { name: 'Google DNS', primaryIP: '8.8.8.8', secondaryIP: '8.8.4.4' },
    { name: 'Quad9', primaryIP: '9.9.9.9', secondaryIP: '149.112.112.112' },
    { name: 'OpenDNS', primaryIP: '208.67.222.222', secondaryIP: '208.67.220.220' },
    { name: 'AdGuard', primaryIP: '94.140.14.14', secondaryIP: '94.140.15.15' },
    { name: 'NextDNS', primaryIP: '45.90.28.0', secondaryIP: '45.90.30.0' },
    { name: 'Control D', primaryIP: '76.76.2.0', secondaryIP: '76.76.10.0' },
    { name: 'Mullvad', primaryIP: '194.242.2.2', secondaryIP: '193.19.108.2' },
    { name: 'CleanBrowsing', primaryIP: '185.228.168.9', secondaryIP: '185.228.169.9' },
    { name: 'Alternate DNS', primaryIP: '76.76.19.19', secondaryIP: '76.223.122.150' },
];

export function useDNSScanner() {
    const [results, setResults] = useState<ScanResult[]>(
        DNS_PROVIDERS.map((p) => ({
            provider: p.name,
            primaryIP: p.primaryIP,
            secondaryIP: p.secondaryIP,
            latency: 0,
            status: 'waiting' as const,
        }))
    );
    const [isScanning, setIsScanning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [bestDNS, setBestDNS] = useState<ScanResult | null>(null);
    const cleanupRef = useRef<(() => void) | null>(null);

    // Listen for real-time progress from electron
    useEffect(() => {
        if (!window.electronAPI) return;

        const cleanup = window.electronAPI.onScanProgress((data) => {
            setResults((prev) =>
                prev.map((r) => {
                    if (r.provider === data.provider) {
                        return {
                            ...r,
                            latency: data.latency,
                            status: data.status === 'testing' ? 'testing' : data.status === 'error' ? 'error' : 'done',
                        };
                    }
                    return r;
                })
            );
            setProgress(data.progress);
        });

        cleanupRef.current = cleanup;
        return () => {
            cleanup();
        };
    }, []);

    const startScan = useCallback(async (testsPerServer: number) => {
        if (!window.electronAPI) {
            console.warn('electronAPI not available');
            return;
        }

        setIsScanning(true);
        setProgress(0);
        setBestDNS(null);

        // Reset all results to waiting
        setResults(
            DNS_PROVIDERS.map((p) => ({
                provider: p.name,
                primaryIP: p.primaryIP,
                secondaryIP: p.secondaryIP,
                latency: 0,
                status: 'waiting' as const,
            }))
        );

        try {
            await window.electronAPI.scanDNS(testsPerServer);

            // Find best result after scan completes
            setResults((prev) => {
                const completed = prev.filter((r) => r.status === 'done' && r.latency < 9999);
                if (completed.length > 0) {
                    const best = completed.reduce((a, b) => (a.latency < b.latency ? a : b));
                    setBestDNS(best);
                }
                return prev;
            });
        } catch (err) {
            console.error('Scan failed:', err);
        } finally {
            setIsScanning(false);
            setProgress(100);
        }
    }, []);

    return { results, isScanning, progress, bestDNS, startScan };
}
