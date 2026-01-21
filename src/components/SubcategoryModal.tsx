import React, { useState, useEffect } from 'react';
import ModelSelector from './ModelSelector';
import { ProviderModel } from '../types';

interface SubcategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string, description: string, context: string[], defaultModel?: string, systemPrompt?: string) => void;
    initialData?: {
        name: string;
        description: string;
        context: string[];
        default_model?: string;
        system_prompt?: string;
    };
    categoryName: string;
    enabledModels?: ProviderModel[];
}

const SubcategoryModal: React.FC<SubcategoryModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialData,
    categoryName,
    enabledModels
}) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [defaultModel, setDefaultModel] = useState('');
    const [systemPrompt, setSystemPrompt] = useState('');
    const [contextRows, setContextRows] = useState<string[]>(['']);

    useEffect(() => {
        if (initialData) {
            setName(initialData.name);
            setDescription(initialData.description);
            setDefaultModel(initialData.default_model || '');
            setSystemPrompt(initialData.system_prompt || '');
            setContextRows(initialData.context.length > 0 ? initialData.context : ['']);
        } else {
            setName('');
            setDescription('');
            setDefaultModel('');
            setSystemPrompt('');
            setContextRows(['']);
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleAddContext = () => {
        setContextRows([...contextRows, '']);
    };

    const handleRemoveContext = (index: number) => {
        const newRows = contextRows.filter((_, i) => i !== index);
        setContextRows(newRows.length > 0 ? newRows : ['']);
    };

    const handleContextChange = (index: number, value: string) => {
        const newRows = [...contextRows];
        newRows[index] = value;
        setContextRows(newRows);
    };

    const handleSave = () => {
        if (!name.trim()) return;
        onSave(name.trim(), description.trim(), contextRows.filter((r: string) => r.trim() !== ''), defaultModel || undefined, systemPrompt.trim() || undefined);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-810">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                            {initialData ? `Edit ${name}` : `New subcategory in: ${categoryName}`}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Add details about this {categoryName.toLowerCase()} to help organize your chats
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 overflow-y-auto">
                    {/* Name */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Name</label>
                        <input
                            autoFocus
                            type="text"
                            placeholder="Enter a concise name..."
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                    </div>

                    {/* Default Model */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Default Model</label>
                        <ModelSelector
                            value={defaultModel}
                            onChange={setDefaultModel}
                            models={enabledModels}
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400">Every new chat in this subcategory will start with this model</p>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Description</label>
                        <textarea
                            placeholder="Describe the intent and purpose of this subcategory..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={2}
                            className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                        />
                    </div>

                    {/* System Prompt (Custom Instructions) */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Custom Instructions</label>
                        <textarea
                            placeholder="e.g. You are a professional translator. Always respond in Spanish."
                            value={systemPrompt}
                            onChange={(e) => setSystemPrompt(e.target.value)}
                            rows={3}
                            className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400">These instructions will guide the AI behavior in every chat within this subcategory.</p>
                    </div>

                    {/* Context */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Context</label>
                            <button
                                onClick={handleAddContext}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                Add Context
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Add relevant context paragraphs to guide conversations</p>

                        <div className="space-y-2">
                            {contextRows.map((row, index) => (
                                <div key={index} className="relative group">
                                    <textarea
                                        placeholder={`Context paragraph ${index + 1}...`}
                                        value={row}
                                        onChange={(e) => handleContextChange(index, e.target.value)}
                                        rows={2}
                                        className="w-full p-2.5 pr-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                                    />
                                    <button
                                        onClick={() => handleRemoveContext(index)}
                                        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!name.trim()}
                        className="px-6 py-2 text-sm font-semibold text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {initialData ? 'Save Changes' : `Create`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SubcategoryModal;
