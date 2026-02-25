// electron/main.ts
import { app, BrowserWindow, ipcMain, shell, Notification } from 'electron';
import { join } from 'path';
import { scanAllDNS, loadScanResults, type BenchmarkProgress, type DNSBenchmarkResult } from './latencyScanner';
import { applyDNS, restoreDNS, getSystemDNS } from './dnsManager';

let appIconPath: string;

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
    appIconPath = app.isPackaged
        ? join(process.resourcesPath, 'icon.ico')
        : join(__dirname, '../build/icon.ico');

    mainWindow = new BrowserWindow({
        width: 1100,
        height: 780,
        minWidth: 900,
        minHeight: 650,
        frame: false,
        titleBarStyle: 'hidden',
        backgroundColor: '#000000',
        icon: appIconPath,
        show: false,
        webPreferences: {
            preload: join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,
        },
    });

    mainWindow.on('ready-to-show', () => {
        mainWindow?.show();
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    if (!app.isPackaged) {
        mainWindow.loadURL('http://localhost:5173');
    } else {
        mainWindow.loadFile(join(__dirname, '../dist/index.html'));
    }
}

// ----- IPC Handlers -----

ipcMain.handle('scan-dns', async (_event, testsPerMethod: number) => {
    const results: DNSBenchmarkResult[] = [];
    const progressCallback = (progress: BenchmarkProgress) => {
        mainWindow?.webContents.send('scan-progress', progress);
    };
    const finalResults = await scanAllDNS(testsPerMethod, progressCallback);
    return finalResults;
});

ipcMain.handle('load-scan-results', async () => {
    return loadScanResults();
});

ipcMain.handle('apply-dns', async (_event, primaryIP: string, secondaryIP: string) => {
    return applyDNS(primaryIP, secondaryIP);
});

ipcMain.handle('restore-dns', async () => {
    return restoreDNS();
});

ipcMain.handle('get-system-dns', async () => {
    return getSystemDNS();
});

// Window controls
ipcMain.handle('window-minimize', () => {
    mainWindow?.minimize();
});

ipcMain.handle('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
        mainWindow.unmaximize();
    } else {
        mainWindow?.maximize();
    }
});

ipcMain.handle('window-close', () => {
    mainWindow?.close();
});

// Notifications
ipcMain.handle('show-notification', (_event, title: string, body: string) => {
    if (Notification.isSupported()) {
        const notification = new Notification({
            title,
            body,
            icon: appIconPath,
            silent: false,
        });
        notification.on('click', () => {
            if (mainWindow) {
                if (mainWindow.isMinimized()) mainWindow.restore();
                mainWindow.focus();
            }
        });
        notification.show();
    }
});

// ----- App Lifecycle -----

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
