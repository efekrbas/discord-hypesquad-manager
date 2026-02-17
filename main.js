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
            contextIsolation: true
        },
        icon: path.join(__dirname, 'images/logo.png')
    });

    mainWindow.loadFile('index.html');
    // mainWindow.webContents.openDevTools(); // Optional: specifically for debugging
}

app.whenReady().then(() => {
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

        loginWindow = new BrowserWindow({
            width: 500,
            height: 800,
            parent: mainWindow,
            modal: true,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        });

        const filter = {
            urls: ['https://discord.com/api/*']
        };

        // Intercept requests to find the token
        session.defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
            const authHeader = details.requestHeaders['Authorization'];
            if (authHeader && authHeader !== 'undefined' && authHeader !== 'null') {
                // Found token!
                console.log('Token found!');

                // Close login window
                if (loginWindow && !loginWindow.isDestroyed()) {
                    loginWindow.close();
                }
                loginWindow = null;

                // Resolve the promise with the token
                resolve(authHeader);
            }
            callback({ requestHeaders: details.requestHeaders });
        });

        loginWindow.loadURL('https://discord.com/login');

        loginWindow.on('closed', () => {
            loginWindow = null;
            // If window closed without finding token, resolve with null
            // This might happen if user closes the window manually
            // But if we already resolved, this promise ignores it (which is fine)
            // Ideally we should track if resolved, but for simplicity:
            // The promise might hang if we don't handle rejection/resolve here.
            // A better way is to rely on the fact that if we found the token, we resolve.
            // If the user closes the window, we should probably resolve with null.
            resolve(null);
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
