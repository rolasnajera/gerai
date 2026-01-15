import React, { memo } from 'react';
import { marked } from 'marked';
import { Message } from '../types';

interface MessageItemProps {
    msg: Message;
}

const MessageItem: React.FC<MessageItemProps> = ({ msg }) => {
    return (
        <div className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'} mb-6`}>
            <div className="flex items-center gap-2 mx-1">
                <span className="text-xs text-gray-400 uppercase font-semibold">{msg.role}</span>
                {msg.model && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-medium">
                        {msg.model}
                    </span>
                )}
            </div>
            <div
                className={`${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700'} px-4 py-3 rounded-2xl max-w-[90%] prose dark:prose-invert`}
                // marked.parse returns string | Promise<string>. In sync mode it's string.
                dangerouslySetInnerHTML={{ __html: marked.parse(msg.content) as string }}
            />
        </div>
    );
};

export default memo(MessageItem);
