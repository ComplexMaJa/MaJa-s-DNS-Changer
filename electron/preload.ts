// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

export interface DNSBenchmarkResult {
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

export interface BenchmarkProgress {
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

export interface DNSResult {
    success: boolean;
    message: string;
}

export interface SystemDNSInfo {
    adapter: string;
    dns: string[];
    isDHCP: boolean;
}

export interface ElectronAPI {
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

contextBridge.exposeInMainWorld('electronAPI', {
    scanDNS: (testsPerMethod: number) => ipcRenderer.invoke('scan-dns', testsPerMethod),
    loadScanResults: () => ipcRenderer.invoke('load-scan-results'),
    applyDNS: (primaryIP: string, secondaryIP: string) => ipcRenderer.invoke('apply-dns', primaryIP, secondaryIP),
    restoreDNS: () => ipcRenderer.invoke('restore-dns'),
    getSystemDNS: () => ipcRenderer.invoke('get-system-dns'),
    onScanProgress: (callback: (data: BenchmarkProgress) => void) => {
        const handler = (_event: Electron.IpcRendererEvent, data: BenchmarkProgress) => callback(data);
        ipcRenderer.on('scan-progress', handler);
        return () => {
            ipcRenderer.removeListener('scan-progress', handler);
        };
    },
    showNotification: (title: string, body: string) => ipcRenderer.invoke('show-notification', title, body),
    windowMinimize: () => ipcRenderer.invoke('window-minimize'),
    windowMaximize: () => ipcRenderer.invoke('window-maximize'),
    windowClose: () => ipcRenderer.invoke('window-close'),
} satisfies ElectronAPI);
