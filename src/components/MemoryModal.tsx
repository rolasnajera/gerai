import React, { useState, useEffect } from 'react';
import { Context, Subcategory } from '../types';

interface MemoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    subcategories: Subcategory[];
    initialSubcategoryId?: number | null; // null for general
}

const MemoryModal: React.FC<MemoryModalProps> = ({ isOpen, onClose, subcategories, initialSubcategoryId }) => {
    const [memories, setMemories] = useState<Context[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editContent, setEditContent] = useState('');
    const [editSubcategoryId, setEditSubcategoryId] = useState<number | null>(null);
    const [filterId, setFilterId] = useState<number | null | 'all'>(null);

    const fetchMemories = async () => {
        setLoading(true);
        const data = await window.electron.invoke('get-all-context');
        setMemories(data);
        setLoading(false);
    };

    useEffect(() => {
        if (isOpen) {
            setFilterId(initialSubcategoryId === undefined ? 'all' : initialSubcategoryId);
            fetchMemories();
        }
    }, [isOpen, initialSubcategoryId]);

    const filteredMemories = memories.filter(m => {
        if (filterId === 'all') return true;
        return m.subcategory_id === filterId;
    });

    const handleDelete = async (id: number) => {
        if (confirm('Are you sure you want to delete this memory?')) {
            await window.electron.invoke('delete-context-item', id);
            fetchMemories();
        }
    };

    const handleSaveEdit = async () => {
        if (editingId) {
            await window.electron.invoke('update-context-item', {
                id: editingId,
                content: editContent,
                subcategoryId: editSubcategoryId
            });
            setEditingId(null);
            fetchMemories();
        }
    };

    const startEditing = (memory: Context) => {
        setEditingId(memory.id);
        setEditContent(memory.content);
        setEditSubcategoryId(memory.subcategory_id || null);
    };

    if (!isOpen) return null;

    const currentSubName = filterId && filterId !== 'all'
        ? subcategories.find(s => s.id === filterId)?.name
        : 'General';

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-900 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <svg className="w-6 h-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12s-3-7-10-7-10 7-10 7 3 7 10 7 10-7 10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                            {filterId === 'all' ? 'All Memories' : `${currentSubName} Memories`}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {filterId === 'all' ? 'Manage all stored knowledge.' : `Knowledge specific to ${currentSubName}.`}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Tab Switcher */}
                        <div className="bg-gray-200/50 dark:bg-gray-900 px-1 py-1 rounded-xl flex gap-1">
                            <button
                                onClick={() => setFilterId('all')}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${filterId === 'all' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setFilterId(null)}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${filterId === null ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                General
                            </button>
                            {initialSubcategoryId && filterId !== 'all' && filterId !== null && (
                                <button
                                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-gray-800 text-blue-600 shadow-sm"
                                    disabled
                                >
                                    {currentSubName}
                                </button>
                            )}
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    {loading ? (
                        <div className="flex items-center justify-center h-40">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        </div>
                    ) : filteredMemories.length === 0 ? (
                        <div className="text-center py-20 bg-gray-50 dark:bg-gray-900/20 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                            <p className="text-gray-500 dark:text-gray-400">No memories found for this view.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {filteredMemories.map((m) => (
                                <div key={m.id} className="group relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-2xl flex flex-col gap-3 hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-all hover:shadow-lg">
                                    {editingId === m.id ? (
                                        <div className="space-y-3">
                                            <textarea
                                                className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]"
                                                value={editContent}
                                                onChange={(e) => setEditContent(e.target.value)}
                                            />
                                            <div className="flex items-center justify-between gap-4">
                                                <select
                                                    className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg p-2 text-xs outline-none"
                                                    value={editSubcategoryId || ''}
                                                    onChange={(e) => setEditSubcategoryId(e.target.value ? Number(e.target.value) : null)}
                                                >
                                                    <option value="">General Memory</option>
                                                    {subcategories.map(s => (
                                                        <option key={s.id} value={s.id}>{s.name}</option>
                                                    ))}
                                                </select>
                                                <div className="flex gap-2">
                                                    <button onClick={() => setEditingId(null)} className="px-4 py-2 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">Cancel</button>
                                                    <button onClick={handleSaveEdit} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">Save Changes</button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${m.subcategory_id ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                                                            {m.subcategory_id ? `Specific: ${m.subcategory_name}` : 'General'}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400">
                                                            Last updated: {new Date(m.updated_at).toLocaleDateString()}
                                                        </span>
                                                        {m.source === 'ai' && (
                                                            <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full font-bold">AI</span>
                                                        )}
                                                    </div>
                                                    <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed">{m.content}</p>
                                                </div>
                                                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => startEditing(m)} className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 rounded-lg transition-colors" title="Edit">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                                    </button>
                                                    <button onClick={() => handleDelete(m.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 rounded-lg transition-colors" title="Delete">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MemoryModal;
