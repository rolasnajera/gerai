import React, { useState, useEffect, useRef } from 'react';

interface RenameModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (newTitle: string) => void;
    initialTitle: string;
}

const RenameModal: React.FC<RenameModalProps> = ({ isOpen, onClose, onSave, initialTitle }) => {
    const [title, setTitle] = useState(initialTitle);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setTitle(initialTitle);
            // Focus input after modal opens
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, initialTitle]);

    const handleSave = () => {
        if (title.trim()) {
            onSave(title.trim());
            onClose();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl transform transition-all scale-100">
                <h2 className="text-xl font-bold dark:text-white mb-4">Rename Chat</h2>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Title</label>
                    <input
                        ref={inputRef}
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter chat title..."
                    />
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!title.trim()}
                        className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-2 rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RenameModal;
