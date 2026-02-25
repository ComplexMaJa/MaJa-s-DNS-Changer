// src/hooks/useDNSScanner.ts
import { useState, useCallback, useEffect, useRef } from 'react';

const DNS_PROVIDERS = [
    { name: 'Cloudflare', primary: '1.1.1.1', secondary: '1.0.0.1' },
    { name: 'Google DNS', primary: '8.8.8.8', secondary: '8.8.4.4' },
    { name: 'Quad9', primary: '9.9.9.9', secondary: '149.112.112.112' },
    { name: 'OpenDNS', primary: '208.67.222.222', secondary: '208.67.220.220' },
    { name: 'AdGuard', primary: '94.140.14.14', secondary: '94.140.15.15' },
    { name: 'NextDNS', primary: '45.90.28.0', secondary: '45.90.30.0' },
    { name: 'ControlD', primary: '76.76.2.0', secondary: '76.76.10.0' },
    { name: 'Mullvad', primary: '194.242.2.2', secondary: '193.19.108.2' },
    { name: 'CleanBrowsing', primary: '185.228.168.9', secondary: '185.228.169.9' },
    { name: 'Alternate DNS', primary: '76.76.19.19', secondary: '76.223.122.150' },
    { name: 'Comodo Secure', primary: '8.26.56.26', secondary: '8.20.247.20' },
    { name: 'DNS.SB', primary: '185.222.222.222', secondary: '45.11.45.11' },
    { name: 'FreeDNS', primary: '37.235.1.174', secondary: '37.235.1.177' },
    { name: 'UncensoredDNS', primary: '91.239.100.100', secondary: '89.233.43.71' },
    { name: 'Yandex DNS', primary: '77.88.8.8', secondary: '77.88.8.1' },
    { name: 'SafeDNS', primary: '195.46.39.39', secondary: '195.46.39.40' },
    { name: 'OpenNIC', primary: '94.247.43.254', secondary: '23.94.60.240' },
];

export interface ProviderUIState {
    providerName: string;
    primary: string;
    secondary: string;
    status: 'waiting' | 'testing' | 'done' | 'error';
    currentMethod: string;
    result: DNSBenchmarkResult | null;
}

function createInitialStates(): ProviderUIState[] {
    return DNS_PROVIDERS.map((p) => ({
        providerName: p.name,
        primary: p.primary,
        secondary: p.secondary,
        status: 'waiting' as const,
        currentMethod: '',
        result: null,
    }));
}

export function useDNSScanner() {
    const [providers, setProviders] = useState<ProviderUIState[]>(createInitialStates());
    const [isScanning, setIsScanning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [bestDNS, setBestDNS] = useState<DNSBenchmarkResult | null>(null);
    const [scanResults, setScanResults] = useState<DNSBenchmarkResult[]>([]);
    const cleanupRef = useRef<(() => void) | null>(null);

    // Listen for real-time progress from electron
    useEffect(() => {
        if (!window.electronAPI) return;

        const cleanup = window.electronAPI.onScanProgress((data) => {
            setProviders((prev) =>
                prev.map((p) => {
                    if (p.providerName === data.providerName) {
                        return {
                            ...p,
                            status: data.status,
                            currentMethod: data.currentMethod,
                            result: data.result || p.result,
                        };
                    }
                    return p;
                })
            );
            setProgress(data.progress);
        });

        cleanupRef.current = cleanup;
        return () => {
            cleanup();
        };
    }, []);

    const startScan = useCallback(async (testsPerMethod: number): Promise<DNSBenchmarkResult | null> => {
        if (!window.electronAPI) {
            console.warn('electronAPI not available');
            return null;
        }

        setIsScanning(true);
        setProgress(0);
        setBestDNS(null);
        setScanResults([]);

        // Reset all providers to waiting
        setProviders(createInitialStates());

        let best: DNSBenchmarkResult | null = null;

        try {
            const results = await window.electronAPI.scanDNS(testsPerMethod);

            setScanResults(results);

            // Update provider states with final results
            setProviders((prev) =>
                prev.map((p) => {
                    const result = results.find((r) => r.providerName === p.providerName);
                    if (result) {
                        return {
                            ...p,
                            status: result.averageLatency >= 9999 ? 'error' : 'done',
                            currentMethod: '',
                            result,
                        };
                    }
                    return p;
                })
            );

            // Find best DNS by performance score
            const validResults = results.filter((r) => r.averageLatency < 9999);
            if (validResults.length > 0) {
                best = validResults.reduce((a, b) =>
                    a.performanceScore > b.performanceScore ? a : b
                );
                setBestDNS(best);
            }
        } catch (err) {
            console.error('Scan failed:', err);
        } finally {
            setIsScanning(false);
            setProgress(100);
        }

        return best;
    }, []);

    return { providers, isScanning, progress, bestDNS, scanResults, startScan };
}
