// src/vite-env.d.ts
/// <reference types="vite/client" />

interface ScanProgressData {
    provider: string;
    primaryIP: string;
    secondaryIP: string;
    latency: number;
    status: 'testing' | 'done' | 'error';
    progress: number;
    totalProviders: number;
    currentTest: number;
    totalTests: number;
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
    scanDNS: (testsPerServer: number) => Promise<ScanProgressData[]>;
    applyDNS: (primaryIP: string, secondaryIP: string) => Promise<DNSResult>;
    restoreDNS: () => Promise<DNSResult>;
    getSystemDNS: () => Promise<SystemDNSInfo>;
    onScanProgress: (callback: (data: ScanProgressData) => void) => () => void;
    windowMinimize: () => void;
    windowMaximize: () => void;
    windowClose: () => void;
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}

export { };
