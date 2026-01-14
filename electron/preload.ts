import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
    platform: process.platform,
    invoke: (channel: string, data?: any) => ipcRenderer.invoke(channel, data),
    on: (channel: string, callback: (...args: any[]) => void) => {
        const subscription = (_event: any, ...args: any[]) => callback(...args);
        ipcRenderer.on(channel, subscription);
        return subscription;
    },
    removeListener: (channel: string, callback: any) => {
        ipcRenderer.removeListener(channel, callback);
    },
    // Auto-update methods
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    installUpdate: () => ipcRenderer.invoke('install-update'),
    onUpdateChecking: (callback: () => void) => {
        ipcRenderer.on('update-checking', callback);
    },
    onUpdateAvailable: (callback: (info: any) => void) => {
        ipcRenderer.on('update-available', (_event, info) => callback(info));
    },
    onUpdateDownloadProgress: (callback: (progress: any) => void) => {
        ipcRenderer.on('update-download-progress', (_event, progress) => callback(progress));
    },
    onUpdateDownloaded: (callback: (info: any) => void) => {
        ipcRenderer.on('update-downloaded', (_event, info) => callback(info));
    },
    onUpdateError: (callback: (error: any) => void) => {
        ipcRenderer.on('update-error', (_event, error) => callback(error));
    },
});
