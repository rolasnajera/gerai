/// <reference types="vite/client" />

interface Window {
    electron: {
        invoke: (channel: string, data?: any) => Promise<any>;
    };
}
