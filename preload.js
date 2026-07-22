const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    loginWithDiscord: () => ipcRenderer.invoke('login-discord'),
    logout: () => ipcRenderer.invoke('logout-discord'),
    discordRequest: (url, options) => ipcRenderer.invoke('discord-request', url, options)
});
