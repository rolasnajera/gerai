import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import { AVAILABLE_MODELS } from '../constants/models';
import { Message } from '../types';

interface ChatInterfaceProps {
    currentConversationId: number | null;
    messages: Message[];
    onSendMessage: (text: string, model: string) => void;
    isLoading: boolean;
    model: string;
    setModel: (model: string) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
    currentConversationId,
    messages,
    onSendMessage,
    isLoading,
    model,
    setModel
}) => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        onSendMessage(input, model);
        setInput('');
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'; // Reset height
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    if (!currentConversationId && messages.length === 0) {
        // Empty state for "No chat selected" or "Start new chat"
        // But typically, "New Chat" creates an ID, or we show an empty state.
        // If messages are empty and we have an ID, it's a fresh chat.
        // If we don't have an ID, it's the welcome screen.
    }

    return (
        <main className="flex-1 flex flex-col h-full relative bg-white dark:bg-gray-900">
            {/* Header */}
            <header className="h-16 flex items-center justify-between px-6 bg-white dark:bg-gray-900 z-10 w-full border-b border-gray-100 dark:border-gray-800">
                <h2 className="font-bold text-lg text-gray-800 dark:text-gray-100">AI Chat Interface</h2>

                {/* Model Selector */}
                <div className="relative">
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-4 py-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Model:</span>
                        <select
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            className="bg-transparent text-sm font-bold text-gray-900 dark:text-white focus:outline-none cursor-pointer appearance-none pr-4"
                        >
                            {AVAILABLE_MODELS.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.name}
                                </option>
                            ))}
                        </select>
                        <svg className="absolute right-3 pointer-events-none text-gray-500" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 9l6 6 6-6" />
                        </svg>
                    </div>
                </div>
            </header>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto pt-10 pb-32 px-4 sm:px-10 lg:px-40 scroll-smooth" id="chat-container">
                <div className="max-w-3xl mx-auto w-full">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center mt-32 text-center opacity-80">
                            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-6">
                                <svg className="text-gray-400" xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                </svg>
                            </div>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Start a conversation</h2>
                            <p className="text-gray-500 dark:text-gray-400">Ask me anything or select a previous chat</p>
                        </div>
                    ) : (
                        messages.map((msg, index) => (
                            <div key={index} className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'} mb-6`}>
                                <div className="text-xs text-gray-400 uppercase font-semibold mx-1">{msg.role}</div>
                                <div
                                    className={`${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700'} px-4 py-3 rounded-2xl max-w-[85%] prose dark:prose-invert`}
                                    // marked.parse returns string | Promise<string>. In sync mode it's string.
                                    dangerouslySetInnerHTML={{ __html: marked.parse(msg.content) as string }}
                                />
                            </div>
                        ))
                    )}

                    {isLoading && (
                        <div className="flex gap-2 items-center text-gray-400 text-sm animate-pulse ml-4 mb-6">
                            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animation-delay-200"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animation-delay-400"></div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input Area */}
            <div className="absolute bottom-0 w-full bg-white dark:bg-gray-900 pb-8 pt-6 px-4 border-t border-transparent">
                <div className="max-w-3xl mx-auto w-full relative">
                    <form onSubmit={handleSubmit} className="relative shadow-sm hover:shadow-md transition-shadow rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="w-full max-h-48 p-4 pr-14 bg-transparent resize-none focus:outline-none text-base text-gray-700 dark:text-gray-200 placeholder-gray-400"
                            placeholder="Type your message... (Shift+Enter for new line)"
                            rows={1}
                            required
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            className="absolute right-2 bottom-2 p-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:opacity-80 transition-opacity disabled:opacity-50"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                        </button>
                    </form>
                </div>
            </div>
        </main>
    );
};

export default ChatInterface;
