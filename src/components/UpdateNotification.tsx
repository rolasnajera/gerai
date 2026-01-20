import { useEffect, useState } from 'react';
import { useDataService } from '../core/hooks/useDataService';

interface UpdateInfo {
    version: string;
    releaseDate?: string;
    releaseName?: string;
}

interface DownloadProgress {
    percent: number;
    bytesPerSecond: number;
    transferred: number;
    total: number;
}

export default function UpdateNotification() {
    const dataService = useDataService();
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [updateDownloaded, setUpdateDownloaded] = useState(false);
    const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
    const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [hasSignatureError, setHasSignatureError] = useState(false);

    useEffect(() => {
        // Listen for update events via dataService
        const removeListeners = dataService.onUpdateEvent({
            onAvailable: (info: UpdateInfo) => {
                console.log('Update available:', info);
                setUpdateAvailable(true);
                setUpdateInfo(info);
                setIsDownloading(true);
                setHasSignatureError(false);
            },
            onProgress: (progress: DownloadProgress) => {
                console.log('Download progress:', progress);
                setDownloadProgress(progress);
            },
            onDownloaded: (info: UpdateInfo) => {
                console.log('Update downloaded:', info);
                setUpdateDownloaded(true);
                setIsDownloading(false);
            },
            onError: (error: { message: string, isSignatureError?: boolean }) => {
                console.error('Update error:', error);
                setIsDownloading(false);
                if (error.isSignatureError) {
                    setHasSignatureError(true);
                    setUpdateAvailable(true);
                }
            }
        });

        return () => {
            removeListeners();
        };
    }, [dataService]);

    const handleDismiss = () => {
        setUpdateAvailable(false);
        setUpdateDownloaded(false);
        setHasSignatureError(false);
    };

    const handleManualInstall = () => {
        dataService.openReleasesPage();
    };

    if (!updateAvailable && !updateDownloaded) {
        return null;
    }

    return (
        <div className="fixed top-4 right-4 z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-4 max-w-md">
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                    <svg
                        className={`w-6 h-6 ${hasSignatureError ? 'text-yellow-400' : 'text-blue-400'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        {hasSignatureError ? (
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        ) : (
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                        )}
                    </svg>
                </div>
                <div className="flex-1">
                    <h3 className="text-sm font-semibold text-white mb-1">
                        {hasSignatureError ? 'Action Required' : (updateDownloaded ? 'Update Ready' : 'Update Available')}
                    </h3>
                    <p className="text-xs text-gray-300 mb-3">
                        {hasSignatureError
                            ? `Version ${updateInfo?.version} downloaded, but security verification failed (app not signed). Please update manually.`
                            : (updateDownloaded
                                ? `Version ${updateInfo?.version} will be installed automatically when you quit the app.`
                                : `Version ${updateInfo?.version} is available.${isDownloading ? ' Downloading...' : ''}`)}
                    </p>

                    {isDownloading && downloadProgress && !hasSignatureError && (
                        <div className="mb-3">
                            <div className="w-full bg-gray-700 rounded-full h-2 mb-1">
                                <div
                                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${downloadProgress.percent}%` }}
                                />
                            </div>
                            <p className="text-xs text-gray-400">
                                {downloadProgress.percent.toFixed(1)}% • {(downloadProgress.bytesPerSecond / 1024 / 1024).toFixed(2)} MB/s
                            </p>
                        </div>
                    )}

                    <div className="flex gap-2">
                        {hasSignatureError ? (
                            <button
                                onClick={handleManualInstall}
                                className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
                            >
                                Update Manually
                            </button>
                        ) : null}
                        <button
                            onClick={handleDismiss}
                            className={`${hasSignatureError ? 'flex-1' : 'w-full'} px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium rounded transition-colors`}
                        >
                            {hasSignatureError ? 'Cancel' : 'OK'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
