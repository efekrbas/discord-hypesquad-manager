const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');

let mainWindow;
let loginWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 700,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false
        },
        icon: path.join(__dirname, 'images/logo.png'),
        autoHideMenuBar: true
    });

    mainWindow.loadFile('index.html');
    // mainWindow.webContents.openDevTools(); // Optional: specifically for debugging

    // Open external links in default browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http')) {
            require('electron').shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });
}

let resolveLoginPromise = null;

app.whenReady().then(() => {
    // Intercept Discord API requests globally to bypass CORS / Cloudflare restrictions
    session.defaultSession.webRequest.onBeforeSendHeaders(
        { urls: ['https://discord.com/api/*'] },
        (details, callback) => {
            // Fake Origin and Referer to make it look like requests come from Discord itself
            details.requestHeaders['Origin'] = 'https://discord.com';
            details.requestHeaders['Referer'] = 'https://discord.com/';

            const authHeader = details.requestHeaders['Authorization'];
            if (authHeader && authHeader !== 'undefined' && authHeader !== 'null') {
                if (loginWindow && !loginWindow.isDestroyed() && resolveLoginPromise) {
                    console.log('Token found!');
                    resolveLoginPromise(authHeader);
                    resolveLoginPromise = null;
                    loginWindow.close();
                    loginWindow = null;
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
