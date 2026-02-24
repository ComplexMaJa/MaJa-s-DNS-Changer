// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

export interface ScanProgressData {
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
    scanDNS: (testsPerServer: number) => Promise<ScanProgressData[]>;
    applyDNS: (primaryIP: string, secondaryIP: string) => Promise<DNSResult>;
    restoreDNS: () => Promise<DNSResult>;
    getSystemDNS: () => Promise<SystemDNSInfo>;
    onScanProgress: (callback: (data: ScanProgressData) => void) => () => void;
    windowMinimize: () => void;
    windowMaximize: () => void;
    windowClose: () => void;
}

contextBridge.exposeInMainWorld('electronAPI', {
    scanDNS: (testsPerServer: number) => ipcRenderer.invoke('scan-dns', testsPerServer),
    applyDNS: (primaryIP: string, secondaryIP: string) => ipcRenderer.invoke('apply-dns', primaryIP, secondaryIP),
    restoreDNS: () => ipcRenderer.invoke('restore-dns'),
    getSystemDNS: () => ipcRenderer.invoke('get-system-dns'),
    onScanProgress: (callback: (data: ScanProgressData) => void) => {
        const handler = (_event: Electron.IpcRendererEvent, data: ScanProgressData) => callback(data);
        ipcRenderer.on('scan-progress', handler);
        return () => {
            ipcRenderer.removeListener('scan-progress', handler);
        };
    },
    windowMinimize: () => ipcRenderer.invoke('window-minimize'),
    windowMaximize: () => ipcRenderer.invoke('window-maximize'),
    windowClose: () => ipcRenderer.invoke('window-close'),
} satisfies ElectronAPI);
