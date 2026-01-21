import React, { memo } from 'react';
import { marked } from 'marked';
import { Message } from '../types';
import CitationsList from './CitationsList';

interface MessageItemProps {
    msg: Message;
}

const MessageItem: React.FC<MessageItemProps> = ({ msg }) => {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(msg.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    return (
        <div className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'} mb-4 group`}>
            <div className={`flex items-center gap-2 mx-1 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center justify-center w-6 h-6 rounded-lg shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-[#232d3d] text-white'}`}>
                    {msg.role === 'user' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /><circle cx="19" cy="5" r="2" /><circle cx="5" cy="19" r="2" /></svg>
                    )}
                </div>
                {msg.model && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-medium">
                        {msg.model}
                    </span>
                )}
            </div>
            <div
                className={`${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700'} px-4 py-3 rounded-2xl max-w-[90%] prose dark:prose-invert shadow-sm`}
                dangerouslySetInnerHTML={{ __html: marked.parse(msg.content) as string }}
            />
            {msg.role === 'assistant' && msg.citations && msg.citations.length > 0 && (
                <div className="max-w-[90%] w-full">
                    <CitationsList citations={msg.citations} />
                </div>
            )}
            {msg.role === 'assistant' && (
                <div className="flex items-center gap-2 mt-2 px-1">
                    <button
                        onClick={handleCopy}
                        className={`p-1.5 rounded-lg transition-all duration-200 ${copied ? 'text-green-500 bg-green-50 dark:bg-green-900/20' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/30'}`}
                        title={copied ? "Copied!" : "Copy response"}
                    >
                        {copied ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

export default memo(MessageItem);
