import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
    invoke: (channel: string, data: any) => ipcRenderer.invoke(channel, data),
});
