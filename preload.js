const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    loginWithDiscord: () => ipcRenderer.invoke('login-discord'),
    logout: () => ipcRenderer.invoke('logout-discord')
});
