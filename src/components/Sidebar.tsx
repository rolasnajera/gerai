import React, { useState } from 'react';
import { Conversation, Category, Subcategory } from '../types';

interface SidebarProps {
    categories: Category[];
    subcategories: Subcategory[];
    conversations: Conversation[];
    currentCid: number | null;
    onSelectConversation: (cid: number) => void;
    onCreateNewChat: (subcategoryId?: number) => void;
    onDeleteChat: (cid: number) => void;
    onRenameChat: (cid: number, currentTitle: string) => void;
    onMoveChat: (cid: number) => void;
    onOpenSettings: () => void;
    onAddSubcategory: (category: Category) => void;
    onEditSubcategory: (subcategory: Subcategory) => void;
    onDeleteSubcategory: (subcategory: Subcategory) => void;
    onOpenMemory: (subcategoryId?: number | null) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
    categories,
    subcategories,
    conversations,
    currentCid,
    onSelectConversation,
    onCreateNewChat,
    onDeleteChat,
    onRenameChat,
    onMoveChat,
    onOpenSettings,
    onAddSubcategory,
    onEditSubcategory,
    onDeleteSubcategory,
    onOpenMemory
}) => {
    const [expandedCategories, setExpandedCategories] = useState<Record<number, boolean>>({ 1: true });
    const [expandedSubcategories, setExpandedSubcategories] = useState<Record<number, boolean>>({});
    const [appVersion, setAppVersion] = useState<string>('');

    React.useEffect(() => {
        const fetchVersion = async () => {
            if (window.electron) {
                const version = await window.electron.getAppVersion();
                setAppVersion(version);
            }
        };
        fetchVersion();
    }, []);

    const isMac = window.electron?.platform === 'darwin';

    const toggleCategory = (id: number) => {
        setExpandedCategories(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const toggleSubcategory = (id: number) => {
        setExpandedSubcategories(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const getIcon = (iconName?: string) => {
        switch (iconName) {
            case 'briefcase':
                return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>;
            case 'grid':
                return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>;
            case 'book':
                return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>;
            case 'archive':
                return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>;
            default:
                return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>;
        }
    };

    return (
        <aside className="w-[280px] bg-gray-50 dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full flex-shrink-0 relative overflow-hidden">
            {/* Header / New Chat */}
            <div className={`p-4 border-b border-gray-100 dark:border-gray-900 drag ${isMac ? 'pt-10' : ''}`}>
                <button
                    onClick={() => onCreateNewChat()}
                    className="w-full flex items-center justify-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-all shadow-sm active:scale-[0.98] no-drag"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    <span>New Global Chat</span>
                </button>
            </div>

            {/* Tree Section */}
            <div className="flex-1 overflow-y-auto px-2 py-4 space-y-4 custom-scrollbar">
                {categories.map(cat => (
                    <div key={cat.id} className="space-y-1">
                        {/* Category Row */}
                        <div
                            onClick={() => toggleCategory(cat.id)}
                            className="group flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 cursor-pointer text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                        >
                            <svg
                                className={`w-3 h-3 transition-transform ${expandedCategories[cat.id] ? 'rotate-90' : ''}`}
                                xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                            >
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                            <div className="flex-shrink-0 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300">
                                {getIcon(cat.icon)}
                            </div>
                            <span className="flex-1 font-bold text-sm tracking-tight truncate" title={cat.name}>{cat.name}</span>

                            {/* New Subcategory Button (Hover) */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedCategories(prev => ({ ...prev, [cat.id]: true }));
                                    onAddSubcategory(cat);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            </button>
                        </div>

                        {/* Subcategories (Expanded) */}
                        {expandedCategories[cat.id] && (
                            <div className="pl-4 space-y-0.5">
                                {subcategories
                                    .filter(sub => sub.category_id === cat.id)
                                    .map(sub => (
                                        <div key={sub.id} className="space-y-0.5">
                                            {/* Subcategory Row */}
                                            <div
                                                onClick={() => toggleSubcategory(sub.id)}
                                                className="group/sub flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                                            >
                                                <svg
                                                    className={`w-3 h-3 transition-transform ${expandedSubcategories[sub.id] ? 'rotate-90' : ''}`}
                                                    xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                                                >
                                                    <polyline points="9 18 15 12 9 6"></polyline>
                                                </svg>
                                                <svg className="w-4 h-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                                                <span className="flex-1 text-sm font-medium truncate" title={sub.name}>{sub.name}</span>
                                                <span className="text-[10px] text-gray-400 font-mono">
                                                    ({conversations.filter(c => c.subcategory_id === sub.id).length})
                                                </span>

                                                {/* Subcategory Actions */}
                                                <div className="flex items-center gap-0.5 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onOpenMemory(sub.id);
                                                        }}
                                                        className="p-1 hover:text-blue-500"
                                                        title="Memory Bank"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12s-3-7-10-7-10 7-10 7 3 7 10 7 10-7 10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setExpandedSubcategories(prev => ({ ...prev, [sub.id]: true }));
                                                            onCreateNewChat(sub.id);
                                                        }}
                                                        className="p-1 hover:text-blue-500"
                                                        title="New Chat"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onEditSubcategory(sub); }}
                                                        className="p-1 hover:text-blue-500"
                                                        title="Edit"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onDeleteSubcategory(sub); }}
                                                        className="p-1 hover:text-red-500"
                                                        title="Delete"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Conversations within Subcategory */}
                                            {expandedSubcategories[sub.id] && (
                                                <div className="pl-8 space-y-0.5">
                                                    {conversations
                                                        .filter(c => c.subcategory_id === sub.id)
                                                        .map(c => (
                                                            <div
                                                                key={c.id}
                                                                onClick={() => onSelectConversation(c.id)}
                                                                className={`group/chat flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs font-medium transition-all ${currentCid === c.id ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800 border-l-4 border-black dark:border-white' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900'}`}
                                                            >
                                                                <div className="flex items-center gap-2 truncate">
                                                                    <svg className="w-3.5 h-3.5 flex-shrink-0 opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                                                    <span className="truncate" title={c.title}>{c.title}</span>
                                                                </div>

                                                                <div className={`flex items-center gap-1 transition-opacity ${currentCid === c.id ? '' : 'opacity-0 group-hover/chat:opacity-100'}`}>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); onRenameChat(c.id, c.title); }}
                                                                        className="p-0.5 hover:text-blue-500"
                                                                        title="Rename"
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); onMoveChat(c.id); }}
                                                                        className="p-0.5 hover:text-blue-500"
                                                                        title="Move"
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><path d="M12 11v6"></path><path d="M9 14l3 3 3-3"></path></svg>
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); onDeleteChat(c.id); }}
                                                                        className="p-0.5 hover:text-red-500"
                                                                        title="Delete"
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                ))}

                {/* Uncategorized Chats */}
                <div className="space-y-1 mt-4">
                    <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Global Conversations</div>
                    <div className="space-y-0.5">
                        {conversations.filter(c => !c.subcategory_id).map(c => (
                            <div
                                key={c.id}
                                onClick={() => onSelectConversation(c.id)}
                                className={`group/chat flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs font-medium transition-all ${currentCid === c.id ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800 border-l-4 border-black dark:border-white' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900'}`}
                            >
                                <div className="flex items-center gap-2 truncate">
                                    <svg className="w-3.5 h-3.5 flex-shrink-0 opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                    <span className="truncate" title={c.title}>{c.title}</span>
                                </div>
                                <div className={`flex items-center gap-1 transition-opacity ${currentCid === c.id ? '' : 'opacity-0 group-hover/chat:opacity-100'}`}>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onRenameChat(c.id, c.title); }}
                                        className="p-0.5 hover:text-blue-500"
                                        title="Rename"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onMoveChat(c.id); }}
                                        className="p-0.5 hover:text-blue-500"
                                        title="Move"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><path d="M12 11v6"></path><path d="M9 14l3 3 3-3"></path></svg>
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDeleteChat(c.id); }}
                                        className="p-0.5 hover:text-red-500"
                                        title="Delete"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* User Settings */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-900 bg-gray-50/50 dark:bg-gray-950/50">
                <div className="flex items-center gap-2">
                    <button
                        onClick={onOpenSettings}
                        className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 p-2.5 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-900 transition-all active:scale-[0.98]"
                        title="Settings"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                    </button>
                    <button
                        onClick={() => onOpenMemory(null)}
                        className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 p-2.5 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-900 transition-all active:scale-[0.98]"
                        title="Global Memory Bank"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12s-3-7-10-7-10 7-10 7 3 7 10 7 10-7 10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                    </button>
                </div>
                {appVersion && (
                    <div className="mt-2 px-2.5 text-[10px] text-gray-400 dark:text-gray-600 font-medium">
                        v{appVersion}
                    </div>
                )}
            </div>
        </aside>
    );
};

export default Sidebar;
