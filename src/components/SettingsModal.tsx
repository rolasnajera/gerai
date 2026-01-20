import React, { useState, useEffect } from 'react';
import { useDataService } from '../core/hooks/useDataService';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const dataService = useDataService();
    const [contextRows, setContextRows] = useState<string[]>(['']);

    useEffect(() => {
        if (isOpen) {
            dataService.getGeneralContext().then((data: any[]) => {
                setContextRows(data.length > 0 ? data.map(d => d.content) : ['']);
            });
        }
    }, [isOpen, dataService]);

    const handleSave = async () => {
        await dataService.updateGeneralContext(contextRows.filter((r: string) => r.trim() !== ''));
        onClose();
    };

    const handleAddContext = () => {
        setContextRows([...contextRows, '']);
    };

    const handleRemoveContext = (index: number) => {
        const newRows = contextRows.filter((_: string, i: number) => i !== index);
        setContextRows(newRows.length > 0 ? newRows : ['']);
    };

    const handleContextChange = (index: number, value: string) => {
        const newRows = [...contextRows];
        newRows[index] = value;
        setContextRows(newRows);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl transform transition-all scale-100">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold dark:text-white">Settings</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">✕</button>
                </div>

                <div className="space-y-4">
                    <div className="hidden">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">OpenAI API Key</label>
                        <input
                            type="password"
                            value={""}
                            readOnly
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent dark:text-white"
                            placeholder="Moved to Model Management"
                        />
                        <p className="text-xs text-gray-500 mt-1">Stored in your browser (LocalStorage/Secure).</p>
                    </div>


                    {/* General Memory / Context */}
                    <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-gray-700 dark:text-gray-200">General Memory Bank</label>
                            <button
                                onClick={handleAddContext}
                                className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                Add Fact
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 -mt-2">Facts here are shared across ALL chats. AI will not automatically add things here; it's manual-only.</p>

                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                            {contextRows.map((row: string, index: number) => (
                                <div key={index} className="relative group">
                                    <textarea
                                        placeholder={`Enter a general fact...`}
                                        value={row}
                                        onChange={(e) => handleContextChange(index, e.target.value)}
                                        rows={2}
                                        className="w-full p-2 pr-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent text-sm dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                                    />
                                    <button
                                        onClick={() => handleRemoveContext(index)}
                                        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <button
                        onClick={handleSave}
                        className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-lg font-medium hover:opacity-90"
                    >
                        Save & Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
