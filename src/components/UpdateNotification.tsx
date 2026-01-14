import { useEffect, useState } from 'react';

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
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [updateDownloaded, setUpdateDownloaded] = useState(false);
    const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
    const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        // Listen for update events
        window.electron.onUpdateAvailable((info: UpdateInfo) => {
            console.log('Update available:', info);
            setUpdateAvailable(true);
            setUpdateInfo(info);
            setIsDownloading(true);
        });

        window.electron.onUpdateDownloadProgress((progress: DownloadProgress) => {
            console.log('Download progress:', progress);
            setDownloadProgress(progress);
        });

        window.electron.onUpdateDownloaded((info: UpdateInfo) => {
            console.log('Update downloaded:', info);
            setUpdateDownloaded(true);
            setIsDownloading(false);
        });

        window.electron.onUpdateError((error: { message: string }) => {
            console.error('Update error:', error);
            setIsDownloading(false);
        });
    }, []);

    const handleInstallNow = async () => {
        try {
            console.log('Installing update...');
            const result = await window.electron.installUpdate();
            if (!result.success) {
                console.error('Failed to install update:', result.message);
                alert('Failed to install update. Please try restarting the app.');
            }
        } catch (err) {
            console.error('Error installing update:', err);
            alert('Failed to install update. Please try restarting the app.');
        }
    };

    const handleLater = () => {
        setUpdateAvailable(false);
        setUpdateDownloaded(false);
    };

    if (!updateAvailable && !updateDownloaded) {
        return null;
    }

    return (
        <div className="fixed top-4 right-4 z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-4 max-w-md">
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                    <svg
                        className="w-6 h-6 text-blue-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                    </svg>
                </div>
                <div className="flex-1">
                    <h3 className="text-sm font-semibold text-white mb-1">
                        {updateDownloaded ? 'Update Ready to Install' : 'Update Available'}
                    </h3>
                    <p className="text-xs text-gray-300 mb-3">
                        {updateDownloaded
                            ? `Version ${updateInfo?.version} has been downloaded and is ready to install.`
                            : `Version ${updateInfo?.version} is available.${isDownloading ? ' Downloading...' : ''}`}
                    </p>

                    {isDownloading && downloadProgress && (
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
                        {updateDownloaded && (
                            <button
                                onClick={handleInstallNow}
                                className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
                            >
                                Install Now
                            </button>
                        )}
                        <button
                            onClick={handleLater}
                            className="flex-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium rounded transition-colors"
                        >
                            Later
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
