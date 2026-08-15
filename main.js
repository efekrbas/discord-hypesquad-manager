const { app, BrowserWindow, ipcMain, session, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let loginWindow;
let resolveLoginPromise = null;

const gotTheLock = app.requestSingleInstanceLock();

app.name = 'discord-badge-manager';

// Silence non-fatal Chromium internal terminal log noise and cache lock warnings
app.commandLine.appendSwitch('log-level', '3');
app.commandLine.appendSwitch('disable-logging');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-http-cache');

if (!gotTheLock) {
    app.quit();
} else {
    // Clean up any stale or corrupted Chromium QuotaManager files on startup
    try {
        const quotaDir = path.join(app.getPath('userData'), 'QuotaManager');
        if (fs.existsSync(quotaDir)) {
            fs.rmSync(quotaDir, { recursive: true, force: true });
        }
    } catch (e) {}

    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    function createWindow() {
        mainWindow = new BrowserWindow({
            width: 1024,
            height: 720,
            icon: path.join(__dirname, 'images', 'icon.ico'),
            show: false,
            backgroundColor: '#0a0a0f',
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
                nodeIntegration: false,
                contextIsolation: true,
                webSecurity: false
            },
            autoHideMenuBar: true
        });

        mainWindow.loadFile(path.join(__dirname, 'index.html'));
        mainWindow.once('ready-to-show', () => {
            mainWindow.show();
        });

        // Open external links in default browser
        mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            if (url.startsWith('http')) {
                require('electron').shell.openExternal(url);
                return { action: 'deny' };
            }
            return { action: 'allow' };
        });
    }

app.whenReady().then(() => {
    // Intercept Discord API requests globally to bypass CORS / Cloudflare restrictions
    session.defaultSession.webRequest.onBeforeSendHeaders(
        { urls: ['https://discord.com/api/*'] },
        (details, callback) => {
            // Fake Origin and Referer to make it look like requests come from Discord itself
            details.requestHeaders['Origin'] = 'https://discord.com';
            details.requestHeaders['Referer'] = 'https://discord.com/';
            // Spoof User-Agent to avoid Cloudflare blocking "Electron" requests
            details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

            const authHeader = details.requestHeaders['Authorization'];
            if (authHeader && authHeader !== 'undefined' && authHeader !== 'null') {
                if (loginWindow && !loginWindow.isDestroyed() && resolveLoginPromise) {
                    console.log('Token found!');
                    resolveLoginPromise(authHeader);
                    resolveLoginPromise = null;
                    const win = loginWindow;
                    loginWindow = null;
                    setImmediate(() => {
                        if (win && !win.isDestroyed()) win.close();
                    });
                }
            }

            callback({ requestHeaders: details.requestHeaders });
        }
    );

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC Handler for Discord Login
ipcMain.handle('login-discord', async () => {
    return new Promise((resolve, reject) => {
        if (loginWindow) {
            loginWindow.focus();
            return;
        }
        
        resolveLoginPromise = resolve;

        loginWindow = new BrowserWindow({
            width: 500,
            height: 800,
            parent: mainWindow,
            modal: true,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            },
            autoHideMenuBar: true
        });

        loginWindow.loadURL('https://discord.com/login', {
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });

        loginWindow.on('closed', () => {
            loginWindow = null;
            if (resolveLoginPromise) {
                resolveLoginPromise(null);
                resolveLoginPromise = null;
            }
        });
    });
});

// IPC Handler for Logout
ipcMain.handle('logout-discord', async () => {
    try {
        await session.defaultSession.clearStorageData();
        console.log('Session data cleared.');
    } catch (error) {
        console.error('Failed to clear session data:', error);
    }
});

// Native Node fetch wrapper to completely bypass any Chromium CORS / Cloudflare interceptors
ipcMain.handle('discord-request', async (event, url, options) => {
    try {
        options = options || {};
        options.headers = options.headers || {};
        // Spoof headers manually because Node's native fetch bypasses Chromium's webRequest hooks
        options.headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        options.headers['Origin'] = 'https://discord.com';
        options.headers['Referer'] = 'https://discord.com/';

        const res = await fetch(url, options);
        let data = null;
        try { data = await res.json(); } catch(e) {}
        
        return {
            ok: res.ok,
            status: res.status,
            data: data
        };
    } catch (err) {
        throw new Error(err.message);
    }
});

const getTokenPath = () => path.join(app.getPath('userData'), 'discord_token.enc');

ipcMain.handle('save-token', async (event, token) => {
    try {
        if (safeStorage.isEncryptionAvailable()) {
            const encrypted = safeStorage.encryptString(token);
            fs.writeFileSync(getTokenPath(), encrypted);
        } else {
            fs.writeFileSync(getTokenPath(), Buffer.from(token, 'utf-8')); 
        }
        return true;
    } catch (e) {
        console.error('Failed to save token:', e);
        return false;
    }
});

ipcMain.handle('get-token', async () => {
    try {
        const tokenPath = getTokenPath();
        if (fs.existsSync(tokenPath)) {
            const encrypted = fs.readFileSync(tokenPath);
            if (safeStorage.isEncryptionAvailable()) {
                return safeStorage.decryptString(encrypted);
            } else {
                return encrypted.toString('utf-8');
            }
        }
    } catch (e) {
        console.error('Failed to read token:', e);
    }
    return null;
});

ipcMain.handle('delete-token', async () => {
    try {
        const tokenPath = getTokenPath();
        if (fs.existsSync(tokenPath)) {
            fs.unlinkSync(tokenPath);
        }
        return true;
    } catch (e) {
        console.error('Failed to delete token:', e);
        return false;
    }
});
}

