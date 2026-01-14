import React, { useState } from 'react';
import { Category, Subcategory } from '../types';

interface MoveChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (subcategoryId: number | null) => void;
    categories: Category[];
    subcategories: Subcategory[];
    currentSubcategoryId: number | null | undefined;
}

const MoveChatModal: React.FC<MoveChatModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    categories,
    subcategories,
    currentSubcategoryId
}) => {
    const [selectedSubId, setSelectedSubId] = useState<number | null>(currentSubcategoryId ?? null);

    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm(selectedSubId);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl transform transition-all scale-100 flex flex-col max-h-[80vh]">
                <h2 className="text-xl font-bold dark:text-white mb-4">Move Chat</h2>

                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Select a destination subcategory for this chat.
                </p>

                <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                    {/* Global Option */}
                    <div
                        onClick={() => setSelectedSubId(null)}
                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedSubId === null ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-700' : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                        <div className="font-bold text-sm dark:text-white">Global Conversations</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">No subcategory</div>
                    </div>

                    {/* Categories and Subcategories */}
                    {categories.map(cat => (
                        <div key={cat.id} className="space-y-2">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">
                                {cat.name}
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {subcategories
                                    .filter(sub => sub.category_id === cat.id)
                                    .map(sub => (
                                        <div
                                            key={sub.id}
                                            onClick={() => setSelectedSubId(sub.id)}
                                            className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedSubId === sub.id ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-700' : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                        >
                                            <div className="font-bold text-sm dark:text-white">{sub.name}</div>
                                            {sub.description && (
                                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{sub.description}</div>
                                            )}
                                        </div>
                                    ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-2 rounded-xl font-medium hover:opacity-90 transition-all shadow-sm active:scale-[0.98]"
                    >
                        Move Chat
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MoveChatModal;
