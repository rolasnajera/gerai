import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
    invoke: (channel: string, data?: any) => ipcRenderer.invoke(channel, data),
    on: (channel: string, callback: (...args: any[]) => void) => {
        const subscription = (_event: any, ...args: any[]) => callback(...args);
        ipcRenderer.on(channel, subscription);
        return subscription;
    },
    removeListener: (channel: string, callback: any) => {
        ipcRenderer.removeListener(channel, callback);
    }
});
