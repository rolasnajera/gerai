import React, { useState, useEffect } from 'react';
import { SearchResult } from '../types';

interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    query: string;
    onSelectConversation: (cid: number) => void;
}

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, query, onSelectConversation }) => {
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchResults = async () => {
            if (!isOpen || !query) return;
            setLoading(true);
            try {
                // We use the same 'search-conversations' but we know the backend currently limits to 20.
                // If we want more, we could update the backend, but 20 is a good start for the modal too.
                const data = await window.electron.searchConversations(query);
                setResults(data);
            } catch (err) {
                console.error("Failed to fetch search results", err);
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [isOpen, query]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-900 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <svg className="w-6 h-6 text-indigo-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                            Search Results
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Found {results.length} results for "{query}"
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                    {loading ? (
                        <div className="flex items-center justify-center h-40">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="text-center py-20 bg-gray-50 dark:bg-gray-900/20 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                            <p className="text-gray-500 dark:text-gray-400">No results found for "{query}"</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {results.map((result) => (
                                <button
                                    key={result.id}
                                    onClick={() => {
                                        onSelectConversation(result.id);
                                        onClose();
                                    }}
                                    className="w-full text-left p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl hover:border-indigo-500 dark:hover:border-indigo-500/50 hover:shadow-lg transition-all group"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                            {result.title}
                                        </span>
                                        {result.category_name && (
                                            <span className="text-[10px] font-black font-sans bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-1 rounded-lg uppercase tracking-wider">
                                                {result.category_name} {result.subcategory_name ? `> ${result.subcategory_name}` : ''}
                                            </span>
                                        )}
                                    </div>
                                    {result.snippet && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3 italic">
                                            "{result.snippet.split(new RegExp(`(${query})`, 'gi')).map((part, i) =>
                                                part.toLowerCase() === query.toLowerCase() ? (
                                                    <span key={i} className="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold rounded-sm px-0.5">{part}</span>
                                                ) : part
                                            )}"
                                        </p>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SearchModal;
