import React, { useState, useEffect } from 'react';

const SettingsModal = ({ isOpen, onClose, apiKey, setApiKey, systemPrompt, setSystemPrompt }) => {
    const [localKey, setLocalKey] = useState(apiKey);
    const [localPrompt, setLocalPrompt] = useState(systemPrompt);

    useEffect(() => {
        setLocalKey(apiKey);
        setLocalPrompt(systemPrompt);
    }, [apiKey, systemPrompt, isOpen]);

    const handleSave = () => {
        setApiKey(localKey);
        setSystemPrompt(localPrompt);
        onClose();
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
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">OpenAI API Key</label>
                        <input
                            type="password"
                            value={localKey}
                            onChange={(e) => setLocalKey(e.target.value)}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent dark:text-white"
                            placeholder="sk-..."
                        />
                        <p className="text-xs text-gray-500 mt-1">Stored in your browser (LocalStorage/Secure).</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">System Prompt</label>
                        <textarea
                            value={localPrompt}
                            onChange={(e) => setLocalPrompt(e.target.value)}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent text-sm dark:text-white"
                            rows="3"
                        />
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
