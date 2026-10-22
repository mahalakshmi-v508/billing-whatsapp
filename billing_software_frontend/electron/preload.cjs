const { contextBridge, ipcRenderer } = require('electron');

// Expose safe, selected APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,

  // App version query
  getVersion: () => ipcRenderer.invoke('app:get-version'),

  // Manual update check
  checkForUpdates: () => ipcRenderer.invoke('updater:check-for-updates'),

  // Restart and install ready update
  restartAndInstall: () => ipcRenderer.invoke('updater:restart-and-install'),

  // Subscribe to updater status events
  onUpdaterStatus: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on('updater:status', subscription);
    return () => ipcRenderer.removeListener('updater:status', subscription);
  },

  // Subscribe to download progress
  onDownloadProgress: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on('updater:progress', subscription);
    return () => ipcRenderer.removeListener('updater:progress', subscription);
  },
});
