/// <reference types="vite/client" />

interface Window {
    electron: {
        platform: string;
        invoke: (channel: string, data?: any) => Promise<any>;
        on: (channel: string, callback: (...args: any[]) => void) => any;
        removeListener: (channel: string, callback: any) => void;
    };
}
