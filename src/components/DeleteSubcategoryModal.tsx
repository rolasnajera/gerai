import React, { useState } from 'react';

interface DeleteSubcategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    subcategoryName: string;
}

const DeleteSubcategoryModal: React.FC<DeleteSubcategoryModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    subcategoryName
}) => {
    const [confirmName, setConfirmName] = useState('');

    if (!isOpen) return null;

    const isConfirmed = confirmName.trim() === subcategoryName.trim();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
                <div className="p-6 space-y-4">
                    <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                        <h2 className="text-xl font-bold">Delete Subcategory</h2>
                    </div>

                    <p className="text-gray-600 dark:text-gray-400">
                        Are you sure you want to delete <span className="font-bold text-gray-900 dark:text-gray-100">"{subcategoryName}"</span>?
                        This action CANNOT be undone and <span className="font-bold text-red-600 dark:text-red-400">ALL conversations</span> within this subcategory will be permanently removed.
                    </p>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Type <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">{subcategoryName}</span> to confirm:
                        </label>
                        <input
                            autoFocus
                            type="text"
                            value={confirmName}
                            onChange={(e) => setConfirmName(e.target.value)}
                            placeholder="Type subcategory name here"
                            className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            if (isConfirmed) {
                                onConfirm();
                                setConfirmName('');
                                onClose();
                            }
                        }}
                        disabled={!isConfirmed}
                        className="px-6 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Permanently Delete
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteSubcategoryModal;
