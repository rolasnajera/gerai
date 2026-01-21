import React, { useState, useRef, useEffect } from 'react';
import { AVAILABLE_MODELS, Model } from '../constants/models';
import ProviderIcon from './ProviderIcon';
import { ProviderModel } from '../types';

interface ModelSelectorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    showGeneralDefault?: boolean;
    models?: ProviderModel[];
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
    value,
    onChange,
    placeholder = "Select a model...",
    showGeneralDefault = true,
    models: dynamicModels
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    const displayModels = dynamicModels ? dynamicModels.map(m => ({
        id: m.id,
        name: m.name,
        provider: m.provider_id as any
    })) : AVAILABLE_MODELS;

    const selectedModel = displayModels.find(m => m.id === value);

    const filteredModels = displayModels.filter(m =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Group models by provider
    const groupedModels: Record<string, Model[]> = {};
    filteredModels.forEach(model => {
        const provider = model.provider || 'others';
        if (!groupedModels[provider]) {
            groupedModels[provider] = [];
        }
        groupedModels[provider].push(model);
    });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (modelId: string) => {
        onChange(modelId);
        setIsOpen(false);
        setSearchQuery('');
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            >
                <div className="flex items-center gap-2.5">
                    {selectedModel ? (
                        <>
                            <ProviderIcon providerId={selectedModel.provider} className="w-5 h-5" />
                            <span className="font-medium">{selectedModel.name}</span>
                        </>
                    ) : (
                        <span className="text-gray-500 dark:text-gray-400">
                            {value === '' && showGeneralDefault ? 'General Default' : placeholder}
                        </span>
                    )}
                </div>
                <svg
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M6 9l6 6 6-6" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-3 border-b border-gray-100 dark:border-gray-800">
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            <input
                                autoFocus
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search models..."
                                className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800/50 border border-transparent focus:border-blue-500 dark:focus:border-blue-500/50 rounded-lg outline-none transition-all text-gray-900 dark:text-gray-100"
                            />
                        </div>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar px-1 py-1">
                        {showGeneralDefault && !searchQuery && (
                            <button
                                onClick={() => handleSelect('')}
                                className={`w-full flex items-center px-3 py-2.5 text-sm rounded-lg transition-colors ${value === '' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                            >
                                <div className="w-5 h-5 flex items-center justify-center mr-3 opacity-50">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8l4 4-4 4M8 12h7" /></svg>
                                </div>
                                <span className="font-medium">General Default</span>
                            </button>
                        )}

                        {Object.entries(groupedModels).map(([provider, models]) => (
                            <div key={provider} className="mt-2 first:mt-0">
                                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                    {provider}
                                </div>
                                {models.map(model => (
                                    <button
                                        key={model.id}
                                        onClick={() => handleSelect(model.id)}
                                        className={`w-full flex items-center px-3 py-2.5 text-sm rounded-lg transition-colors ${value === model.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                                    >
                                        <div className="mr-3">
                                            <ProviderIcon providerId={model.provider} className="w-5 h-5" />
                                        </div>
                                        <div className="flex flex-col items-start overflow-hidden">
                                            <span className="font-medium truncate">{model.name}</span>
                                            <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate opacity-70">{model.id}</span>
                                        </div>
                                        {value === model.id && (
                                            <svg className="ml-auto w-4 h-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        )}
                                    </button>
                                ))}
                            </div>
                        ))}

                        {filteredModels.length === 0 && (
                            <div className="px-3 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                                No models found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ModelSelector;
