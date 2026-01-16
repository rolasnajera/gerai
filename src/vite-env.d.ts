/// <reference types="vite/client" />

interface Window {
    electron: {
        platform: string;
        invoke: (channel: string, data?: any) => Promise<any>;
        on: (channel: string, callback: (...args: any[]) => void) => any;
        removeListener: (channel: string, callback: any) => void;
        // Auto-update methods
        getAppVersion: () => Promise<string>;
        checkForUpdates: () => Promise<{ success: boolean; updateInfo?: any; message?: string }>;
        installUpdate: () => Promise<{ success: boolean; message?: string }>;
        openReleasesPage: () => Promise<void>;
        searchConversations: (query: string) => Promise<any[]>;
        onUpdateChecking: (callback: () => void) => void;
        onUpdateAvailable: (callback: (info: any) => void) => void;
        onUpdateDownloadProgress: (callback: (progress: any) => void) => void;
        onUpdateDownloaded: (callback: (info: any) => void) => void;
        onUpdateError: (callback: (error: { message: string, isSignatureError?: boolean }) => void) => void;
    };
}
