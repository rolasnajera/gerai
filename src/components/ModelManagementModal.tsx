import React, { useState, useEffect } from 'react';
import { ModelProvider, ProviderModel } from '../types';
import ProviderIcon from './ProviderIcon';

interface ModelManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ModelManagementModal: React.FC<ModelManagementModalProps> = ({ isOpen, onClose }) => {
    const [providers, setProviders] = useState<ModelProvider[]>([]);
    const [selectedProviderId, setSelectedProviderId] = useState<string>('openai');
    const [models, setModels] = useState<ProviderModel[]>([]);
    const [apiKey, setApiKey] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadProviders();
        }
    }, [isOpen]);

    useEffect(() => {
        if (selectedProviderId) {
            loadProviderData(selectedProviderId);
        }
    }, [selectedProviderId]);

    const loadProviders = async () => {
        if (window.electron) {
            const data = await window.electron.invoke('get-providers');
            setProviders(data);
            if (data.length > 0 && !selectedProviderId) {
                setSelectedProviderId(data[0].id);
            }
        }
    };

    const loadProviderData = async (providerId: string) => {
        if (window.electron) {
            const pModels = await window.electron.invoke('get-provider-models', providerId);
            setModels(pModels);

            // We don't fetch the API key back in plain text for security usually, 
            // but the prototype shows a masked key. For simplicity, we'll keep it empty
            // unless the user wants to update it.
            setApiKey('');
        }
    };

    const handleToggleModel = async (modelId: string, isEnabled: boolean) => {
        if (window.electron) {
            const success = await window.electron.invoke('toggle-provider-model', { id: modelId, isEnabled });
            if (success) {
                setModels(prev => prev.map(m => m.id === modelId ? { ...m, is_enabled: isEnabled } : m));
            }
        }
    };

    const handleUpdateApiKey = async () => {
        if (!apiKey.trim()) return;
        setIsValidating(true);
        if (window.electron) {
            const success = await window.electron.invoke('update-provider', {
                id: selectedProviderId,
                apiKey: apiKey,
                isActive: true
            });
            if (success) {
                setApiKey('');
                // Refresh models
                await window.electron.invoke('fetch-remote-models', selectedProviderId);
                loadProviderData(selectedProviderId);
                loadProviders();
            }
        }
        setIsValidating(false);
    };

    const handleRemoveApiKey = async () => {
        if (!window.confirm('Are you sure you want to remove the API key for this provider? This will disable all models for this provider.')) return;
        setIsValidating(true);
        if (window.electron) {
            const success = await window.electron.invoke('update-provider', {
                id: selectedProviderId,
                apiKey: null,
                isActive: false
            });
            if (success) {
                setApiKey('');
                loadProviderData(selectedProviderId);
                loadProviders();
            }
        }
        setIsValidating(false);
    };


    const filteredModels = models.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isOpen) return null;

    const selectedProvider = providers.find(p => p.id === selectedProviderId);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-5xl h-[80vh] flex overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in duration-200">
                {/* Sidebar */}
                <aside className="w-72 bg-gray-50/50 dark:bg-gray-950/50 border-r border-gray-100 dark:border-gray-800 flex flex-col">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                        <h2 className="text-xl font-black tracking-tight text-gray-900 dark:text-white">Model Providers</h2>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Configure your LLM connections</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                        {providers.map(p => (
                            <button
                                key={p.id}
                                onClick={() => setSelectedProviderId(p.id)}
                                className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all group ${selectedProviderId === p.id ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-200 dark:shadow-none' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${selectedProviderId === p.id ? 'bg-white/20' : 'bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700'}`}>
                                    <ProviderIcon providerId={p.id} className="w-6 h-6" />
                                </div>
                                <div className="text-left min-w-0">
                                    <p className="text-sm font-bold truncate">{p.name}</p>
                                    <p className={`text-[10px] truncate ${selectedProviderId === p.id ? 'opacity-70' : 'text-gray-400'}`}>
                                        {p.is_active ? 'Connected & Active' : 'Needs Setup'}
                                    </p>
                                </div>
                                {p.is_active && (
                                    <div className={`ml-auto w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]`}></div>
                                )}
                            </button>
                        ))}
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50/30 dark:bg-gray-950/20">
                    <div className="p-8 max-w-4xl mx-auto space-y-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">{selectedProvider?.name} Settings</h3>
                                <p className="text-gray-500 text-sm mt-1">Manage your API keys and enabled models for this provider.</p>
                            </div>
                            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>

                        {/* API Key Box */}
                        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-black uppercase tracking-widest text-gray-400">API Key</label>
                                <a href="#" className="text-xs font-bold text-indigo-500 hover:text-indigo-600 transition-colors">Get from {selectedProvider?.name} →</a>
                            </div>
                            <div className="flex gap-3">
                                <div className="relative flex-1">
                                    <input
                                        type={showApiKey ? "text" : "password"}
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        placeholder={selectedProvider?.is_active ? "••••••••••••••••••••••••••••••••" : "Enter your API key"}
                                        className="w-full bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-750 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-gray-400 dark:text-white"
                                    />
                                    <button
                                        onClick={() => setShowApiKey(!showApiKey)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            {showApiKey ? <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /> : <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />}
                                            <circle cx="12" cy="12" r="3" />
                                            {!showApiKey && <line x1="1" y1="1" x2="23" y2="23" />}
                                        </svg>
                                    </button>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleUpdateApiKey}
                                        disabled={!apiKey.trim() || isValidating}
                                        className="px-6 py-3.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-2xl hover:opacity-90 transition-all shadow-xl shadow-gray-200 dark:shadow-none disabled:opacity-50 disabled:shadow-none flex items-center gap-2 text-sm whitespace-nowrap"
                                    >
                                        {isValidating ? (
                                            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        )}
                                        {selectedProvider?.is_active ? 'Update Key' : 'Save Key'}
                                    </button>
                                    {selectedProvider?.is_active && (
                                        <button
                                            onClick={handleRemoveApiKey}
                                            disabled={isValidating}
                                            className="px-6 py-3.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-bold rounded-2xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-all flex items-center gap-2 text-sm whitespace-nowrap"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                            Remove Key
                                        </button>
                                    )}
                                </div>
                            </div>
                            <p className="text-[10px] text-gray-400 flex items-center gap-1.5">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                Your API key is encrypted and stored securely on your device.
                            </p>
                        </div>

                        {/* Models List */}
                        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                <div>
                                    <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">Available Models</h4>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Select models to enable in chat</p>
                                </div>
                                <div className="relative">
                                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                    <input
                                        type="text"
                                        placeholder="Search models..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-xs w-48 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-gray-400"
                                    />
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50/50 dark:bg-gray-800/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4">Model Name</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4 text-right">Enabled</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {filteredModels.length > 0 ? filteredModels.map(model => (
                                            <tr key={model.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{model.name}</span>
                                                        <span className="text-[10px] text-gray-400 font-medium font-mono">{model.id}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">Supported</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => handleToggleModel(model.id, !model.is_enabled)}
                                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${model.is_enabled ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                                                    >
                                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${model.is_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                                    </button>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={3} className="px-6 py-12 text-center">
                                                    <p className="text-sm text-gray-400 font-medium">No models found or configured for this provider.</p>
                                                    {!apiKey && !selectedProvider?.is_active && (
                                                        <p className="text-xs text-indigo-500 mt-1 cursor-pointer hover:underline" onClick={() => document.querySelector('input')?.focus()}>Configure API key to see available models</p>
                                                    )}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Footer Info */}
                        <div className="flex items-center gap-3 p-4 bg-gray-100/50 dark:bg-gray-800/30 rounded-2xl border border-gray-100/50 dark:border-gray-700/30">
                            <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-950 flex items-center justify-center text-indigo-500 shadow-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                Changes are applied immediately. Models enabled here will appear in the model selector in your chats.
                            </p>
                            <button
                                onClick={onClose}
                                className="ml-auto px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-gray-200 dark:shadow-none"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default ModelManagementModal;
