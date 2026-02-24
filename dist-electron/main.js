"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// electron/main.ts
const electron_1 = require("electron");
const path_1 = require("path");
const latencyScanner_1 = require("./latencyScanner");
const dnsManager_1 = require("./dnsManager");
let mainWindow = null;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1000,
        height: 720,
        minWidth: 800,
        minHeight: 600,
        frame: false,
        titleBarStyle: 'hidden',
        backgroundColor: '#000000',
        show: false,
        webPreferences: {
            preload: (0, path_1.join)(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,
        },
    });
    mainWindow.on('ready-to-show', () => {
        mainWindow?.show();
    });
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        electron_1.shell.openExternal(url);
        return { action: 'deny' };
    });
    if (!electron_1.app.isPackaged) {
        mainWindow.loadURL('http://localhost:5173');
    }
    else {
        mainWindow.loadFile((0, path_1.join)(__dirname, '../dist/index.html'));
    }
}
// ----- IPC Handlers -----
electron_1.ipcMain.handle('scan-dns', async (event, testsPerServer) => {
    const results = [];
    const progressCallback = (progress) => {
        results.push(progress);
        mainWindow?.webContents.send('scan-progress', progress);
    };
    await (0, latencyScanner_1.scanAllDNS)(testsPerServer, progressCallback);
    return results;
});
electron_1.ipcMain.handle('apply-dns', async (_event, primaryIP, secondaryIP) => {
    return (0, dnsManager_1.applyDNS)(primaryIP, secondaryIP);
});
electron_1.ipcMain.handle('restore-dns', async () => {
    return (0, dnsManager_1.restoreDNS)();
});
electron_1.ipcMain.handle('get-system-dns', async () => {
    return (0, dnsManager_1.getSystemDNS)();
});
// Window controls
electron_1.ipcMain.handle('window-minimize', () => {
    mainWindow?.minimize();
});
electron_1.ipcMain.handle('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
        mainWindow.unmaximize();
    }
    else {
        mainWindow?.maximize();
    }
});
electron_1.ipcMain.handle('window-close', () => {
    mainWindow?.close();
});
// ----- App Lifecycle -----
electron_1.app.whenReady().then(createWindow);
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
//# sourceMappingURL=main.js.map