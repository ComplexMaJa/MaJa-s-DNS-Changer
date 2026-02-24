// electron/main.ts
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { join } from 'path';
import { scanAllDNS, type ScanProgress } from './latencyScanner';
import { applyDNS, restoreDNS, getSystemDNS } from './dnsManager';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 720,
        minWidth: 800,
        minHeight: 600,
        frame: false,
        titleBarStyle: 'hidden',
        backgroundColor: '#000000',
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

ipcMain.handle('scan-dns', async (event, testsPerServer: number) => {
    const results: ScanProgress[] = [];
    const progressCallback = (progress: ScanProgress) => {
        results.push(progress);
        mainWindow?.webContents.send('scan-progress', progress);
    };
    await scanAllDNS(testsPerServer, progressCallback);
    return results;
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
