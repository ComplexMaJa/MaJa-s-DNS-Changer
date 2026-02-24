"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// electron/preload.ts
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    scanDNS: (testsPerServer) => electron_1.ipcRenderer.invoke('scan-dns', testsPerServer),
    applyDNS: (primaryIP, secondaryIP) => electron_1.ipcRenderer.invoke('apply-dns', primaryIP, secondaryIP),
    restoreDNS: () => electron_1.ipcRenderer.invoke('restore-dns'),
    getSystemDNS: () => electron_1.ipcRenderer.invoke('get-system-dns'),
    onScanProgress: (callback) => {
        const handler = (_event, data) => callback(data);
        electron_1.ipcRenderer.on('scan-progress', handler);
        return () => {
            electron_1.ipcRenderer.removeListener('scan-progress', handler);
        };
    },
    windowMinimize: () => electron_1.ipcRenderer.invoke('window-minimize'),
    windowMaximize: () => electron_1.ipcRenderer.invoke('window-maximize'),
    windowClose: () => electron_1.ipcRenderer.invoke('window-close'),
});
//# sourceMappingURL=preload.js.map