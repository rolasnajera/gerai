import React from 'react';
import { Conversation } from '../types';

interface SidebarProps {
    conversations: Conversation[];
    currentCid: number | null;
    onSelectConversation: (cid: number) => void;
    onCreateNewChat: () => void;
    onDeleteChat: (cid: number) => void;
    onRenameChat: (cid: number, currentTitle: string) => void;
    onOpenSettings: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
    conversations,
    currentCid,
    onSelectConversation,
    onCreateNewChat,
    onDeleteChat,
    onRenameChat,
    onOpenSettings
}) => {
    return (
        <aside className="w-[260px] bg-gray-50 dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full flex-shrink-0 relative">
            <div className="p-3">
                <button
                    onClick={onCreateNewChat}
                    className="w-full flex items-center justify-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity shadow-sm"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    <span>New Chat</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
                {conversations.length === 0 && (
                    <div className="text-center text-sm text-gray-400 mt-4">No conversations</div>
                )}

                {conversations.map(c => (
                    <div
                        key={c.id}
                        onClick={() => onSelectConversation(c.id)}
                        className={`group flex items-center gap-2 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors border-l-4 ${currentCid === c.id ? 'bg-gray-100 dark:bg-gray-800 border-black dark:border-white' : 'border-transparent'}`}
                    >
                        <div className="flex-1 truncate text-sm text-gray-700 dark:text-gray-300 font-medium">
                            {c.title}
                        </div>
                        <div className={`flex gap-1 ${currentCid === c.id ? '' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                            {/* Edit Button */}
                            <button
                                className="p-1 text-gray-400 hover:text-blue-500"
                                onClick={(e) => { e.stopPropagation(); onRenameChat(c.id, c.title); }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                            </button>
                            {/* Delete Button */}
                            <button
                                className="p-1 text-gray-400 hover:text-red-500"
                                onClick={(e) => { e.stopPropagation(); onDeleteChat(c.id); }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* User Settings / Bottom Action */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                <button
                    onClick={onOpenSettings}
                    className="flex items-center gap-3 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 w-full p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                    <span>Settings</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
