// src/vite-env.d.ts
/// <reference types="vite/client" />

declare global {
    interface DNSBenchmarkResult {
        providerName: string;
        primary: string;
        secondary: string;

        icmpTests: number[];
        dnsTests: number[];
        httpsTests: number[];

        icmpAverage: number;
        dnsAverage: number;
        httpsAverage: number;

        averageLatency: number;

        jitter: number;

        packetLoss: number;

        stabilityScore: number;

        latencyScore: number;

        performanceScore: number;

        timestamp: number;
    }

    interface BenchmarkProgress {
        providerName: string;
        primary: string;
        secondary: string;
        status: 'waiting' | 'testing' | 'done' | 'error';
        currentMethod: 'icmp' | 'dns' | 'https' | '';
        currentTestIndex: number;
        totalTestsPerMethod: number;
        progress: number;
        totalProviders: number;
        completedProviders: number;
        result: DNSBenchmarkResult | null;
    }

    interface DNSResult {
        success: boolean;
        message: string;
    }

    interface SystemDNSInfo {
        adapter: string;
        dns: string[];
        isDHCP: boolean;
    }

    interface ElectronAPI {
        scanDNS: (testsPerMethod: number) => Promise<DNSBenchmarkResult[]>;
        loadScanResults: () => Promise<DNSBenchmarkResult[] | null>;
        applyDNS: (primaryIP: string, secondaryIP: string) => Promise<DNSResult>;
        restoreDNS: () => Promise<DNSResult>;
        getSystemDNS: () => Promise<SystemDNSInfo>;
        onScanProgress: (callback: (data: BenchmarkProgress) => void) => () => void;
        showNotification: (title: string, body: string) => void;
        windowMinimize: () => void;
        windowMaximize: () => void;
        windowClose: () => void;
    }

    interface Window {
        electronAPI: ElectronAPI;
    }
}

export { };
