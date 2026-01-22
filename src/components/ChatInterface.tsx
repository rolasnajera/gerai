import React, { useState, useEffect, useRef } from 'react';
import { useDataService } from '../core/hooks/useDataService';
import { marked } from 'marked';
import { Message, ProviderModel } from '../types';
import MessageItem from './MessageItem';
import ProviderIcon from './ProviderIcon';

interface ChatInterfaceProps {
    currentConversationId: number | null;
    messages: Message[];
    onSendMessage: (text: string, model: string, webSearch?: boolean) => void;
    onCancelMessage: () => void;
    isLoading: boolean;
    isStreaming: boolean;
    streamingMessage: string;
    model: string;
    setModel: (model: string) => void;
    enabledModels: ProviderModel[];
    title?: string;
    categoryName?: string;
    subcategoryName?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
    currentConversationId,
    messages,
    onSendMessage,
    onCancelMessage,
    isLoading,
    isStreaming,
    streamingMessage,
    model,
    setModel,
    enabledModels,
    title,
    categoryName,
    subcategoryName
}) => {
    const [input, setInput] = useState('');
    const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
    const [modelMenuOpen, setModelMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeProvider, setActiveProvider] = useState<'all' | 'openai' | 'anthropic' | 'gemini' | 'grok' | 'mistral' | 'mock'>('all');
    const [isMac, setIsMac] = useState(false);
    const dataService = useDataService();
    const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);
    const modelMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchPlatform = async () => {
            const platform = await dataService.getPlatform();
            setIsMac(platform === 'darwin');
        };
        fetchPlatform();
    }, []);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const lastMessageCountRef = useRef(messages.length);

    const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    };

    const handleScroll = () => {
        if (containerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
            // If we are within 100px of the bottom, we consider it "at the bottom"
            const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
            setShouldAutoScroll(isAtBottom);
        }
    };

    useEffect(() => {
        // Only scroll automatically when a new message is added (usually by the user)
        // or when the component first loads with messages.
        const messageCountIncreased = messages.length > lastMessageCountRef.current;

        if (messageCountIncreased) {
            const lastMessage = messages[messages.length - 1];
            // If the user sent a message, always scroll to the bottom.
            // If the assistant finished streaming, only scroll if we were already at the bottom (auto-scroll enabled).
            const isUserMessage = lastMessage?.role === 'user';

            if (isUserMessage || shouldAutoScroll) {
                scrollToBottom("auto");
                setShouldAutoScroll(true);
            }
        }

        lastMessageCountRef.current = messages.length;
    }, [messages, shouldAutoScroll]);

    useEffect(() => {
        // If loading starts (new request), ensure we scroll to start seeing the response
        if (isLoading && !isStreaming) {
            scrollToBottom("auto");
            setShouldAutoScroll(true);
        }
    }, [isLoading, isStreaming]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            const newHeight = Math.min(textareaRef.current.scrollHeight, 300);
            textareaRef.current.style.height = `${newHeight}px`;
        }
    }, [input]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modelMenuRef.current && !modelMenuRef.current.contains(event.target as Node)) {
                setModelMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);


    const filteredModels = enabledModels.filter(m => {
        const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesProvider = activeProvider === 'all' || m.provider_id === activeProvider;
        return matchesSearch && matchesProvider;
    });

    const selectedModelData = enabledModels.find(m => m.id === model) ||
        { id: model, name: model, provider_id: 'unknown' };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading || isStreaming) return;
        onSendMessage(input, model, isWebSearchEnabled);
        setInput('');
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'; // Reset height
        }
    };

    const handleCancel = () => {
        onCancelMessage();
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
        // If messages are empty, and we have an ID, it's a fresh chat.
        // If we don't have an ID, it's the welcome screen.
    }

    return (
        <main className="flex-1 flex flex-col h-full relative bg-white dark:bg-gray-900 overflow-hidden">
            {/* Header */}
            <header className={`flex items-center justify-between px-6 bg-white dark:bg-gray-900/80 backdrop-blur-md z-10 w-full border-b border-gray-100 dark:border-gray-800 drag ${isMac ? 'pt-10 h-24' : 'h-16'}`}>
                <div className="flex items-center gap-4">
                    <h2 className="font-bold text-lg text-gray-800 dark:text-gray-100 truncate max-w-[300px]" title={title || "New Chat"}>
                        {title || "New Chat"}
                    </h2>
                    <div className="h-4 w-[1px] bg-gray-200 dark:bg-gray-700"></div>
                    <div className="flex items-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                            {categoryName ? (
                                <>{categoryName} {'>'} {subcategoryName}</>
                            ) : (
                                "general conversation"
                            )}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3 no-drag">
                    <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
                    </button>
                </div>
            </header>

            {/* Messages Container */}
            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto pt-10 pb-10 px-4 sm:px-8 xl:px-20 scroll-smooth relative"
                id="chat-container"
            >
                <div className="max-w-3xl xl:max-w-4xl 2xl:max-w-5xl mx-auto w-full">
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
                            <MessageItem key={index} msg={msg} />
                        ))
                    )}

                    {/* Streaming Message */}
                    {isStreaming && streamingMessage && (
                        <div className="flex flex-col gap-1 items-start mb-6">
                            <div className="flex items-center justify-center w-6 h-6 rounded-lg shadow-sm bg-[#232d3d] text-white mx-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /><circle cx="19" cy="5" r="2" /><circle cx="5" cy="19" r="2" /></svg>
                            </div>
                            <div className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border-2 border-blue-400 dark:border-blue-600 px-4 py-3 rounded-2xl max-w-[90%] prose dark:prose-invert animate-pulse-border shadow-sm"
                                dangerouslySetInnerHTML={{ __html: marked.parse(streamingMessage) as string }}
                            />
                            <div className="flex items-center gap-2 mt-2 px-1 opacity-50 cursor-not-allowed">
                                <div className="p-1.5 text-gray-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                                </div>
                            </div>
                        </div>
                    )}

                    {isLoading && !streamingMessage && (
                        <div className="flex flex-col gap-1 items-start mb-6 transition-all duration-500 ease-in-out animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex items-center justify-center w-6 h-6 rounded-lg shadow-sm bg-[#232d3d] text-white mx-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /><circle cx="19" cy="5" r="2" /><circle cx="5" cy="19" r="2" /></svg>
                            </div>
                            <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 px-5 py-3 rounded-2xl shadow-sm">
                                <div className="relative flex items-center justify-center w-5 h-5">
                                    <div className="absolute inset-0 bg-blue-500/30 rounded-full animate-pulse-glow" />
                                    <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse" />
                                </div>
                                <div className="flex items-center h-5">
                                    <span className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400 tracking-wider animate-typewriter border-r-2 border-blue-500 dark:border-blue-400 pr-1">
                                        geraing...
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Scroll to Bottom Button */}
                {!shouldAutoScroll && (isStreaming || messages.length > 0) && (
                    <button
                        onClick={() => {
                            setShouldAutoScroll(true);
                            scrollToBottom();
                        }}
                        className="fixed bottom-32 right-8 z-20 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all transform hover:scale-110 text-blue-600 dark:text-blue-400"
                        title="Scroll to bottom"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
                        </svg>
                        {isStreaming && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                            </span>
                        )}
                    </button>
                )}
            </div>

            {/* Input Area */}
            <div className="p-6 pt-0 max-w-4xl mx-auto w-full relative">
                {modelMenuOpen && (
                    <div
                        ref={modelMenuRef}
                        className="absolute bottom-full left-8 mb-4 w-[580px] h-[480px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-[32px] shadow-2xl z-50 flex overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
                    >
                        {/* Sidebar */}
                        <div className="w-16 flex flex-col items-center py-6 gap-5 border-r border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                            <button
                                onClick={() => setActiveProvider('all')}
                                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${activeProvider === 'all' ? 'bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-100 dark:ring-gray-800 text-blue-600' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill={activeProvider === 'all' ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                            </button>
                            <div className="w-8 h-[1px] bg-gray-200 dark:bg-gray-700 mx-auto"></div>

                            <button
                                onClick={() => setActiveProvider('openai')}
                                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${activeProvider === 'openai' ? 'bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-100 dark:ring-gray-800 text-gray-800 dark:text-white' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-200'}`}
                            >
                                <ProviderIcon providerId="openai" className="w-6 h-6" />
                            </button>

                            <button
                                onClick={() => setActiveProvider('anthropic')}
                                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${activeProvider === 'anthropic' ? 'bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-100 dark:ring-gray-800 text-gray-800 dark:text-white' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-200'}`}
                            >
                                <ProviderIcon providerId="anthropic" className="w-6 h-6" />
                            </button>

                            <button
                                onClick={() => setActiveProvider('gemini')}
                                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${activeProvider === 'gemini' ? 'bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-100 dark:ring-gray-800' : 'grayscale opacity-50 hover:opacity-100 hover:grayscale-0'}`}
                            >
                                <ProviderIcon providerId="gemini" className="w-6 h-6" />
                            </button>


                            <button
                                onClick={() => setActiveProvider('grok')}
                                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${activeProvider === 'grok' ? 'bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-100 dark:ring-gray-800' : 'grayscale opacity-50 hover:opacity-100 hover:grayscale-0'}`}
                            >
                                <ProviderIcon providerId="grok" className="w-6 h-6" />
                            </button>

                            <button
                                onClick={() => setActiveProvider('mistral')}
                                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${activeProvider === 'mistral' ? 'bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-100 dark:ring-gray-800' : 'grayscale opacity-50 hover:opacity-100 hover:grayscale-0'}`}
                            >
                                <ProviderIcon providerId="mistral" className="w-6 h-6" />
                            </button>

                            <button
                                onClick={() => setActiveProvider('mock')}
                                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${activeProvider === 'mock' ? 'bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-100 dark:ring-gray-800 text-blue-600' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                            >
                                <ProviderIcon providerId="mock" className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 flex flex-col">
                            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                <input
                                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm placeholder:text-gray-400 text-gray-800 dark:text-gray-100"
                                    placeholder="Search models..."
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                                {filteredModels.map((m) => (
                                    <div
                                        key={m.id}
                                        onClick={() => { setModel(m.id); setModelMenuOpen(false); }}
                                        className={`group flex items-start gap-4 p-4 rounded-2xl cursor-pointer transition-colors ${m.id === model ? 'bg-gray-100/50 dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-100">{m.name}</h4>
                                            </div>
                                            <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1">
                                                {m.id === 'mock' ? 'Fast mock response for UI testing' : `${m.provider_id.toUpperCase()} language model`}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <ProviderIcon providerId={m.provider_id} className="w-5 h-5 opacity-80 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-[24px] blur opacity-0 group-focus-within:opacity-100 transition duration-500"></div>
                    <form
                        onSubmit={handleSubmit}
                        className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[20px] shadow-2xl shadow-gray-200/40 dark:shadow-none transition-all flex flex-col gap-1"
                    >
                        <div className="px-5 pt-5 pb-1">
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                disabled={enabledModels.length === 0}
                                className={`w-full bg-transparent border-none focus:ring-0 focus:outline-none text-gray-800 dark:text-gray-200 placeholder:text-gray-400 resize-none custom-scrollbar min-h-[44px] text-base leading-relaxed ${enabledModels.length === 0 ? 'cursor-not-allowed opacity-50' : ''}`}
                                placeholder={enabledModels.length === 0 ? "To start, a model provider must be configured." : "Type your message... (Shift+Enter for new line)"}
                                rows={1}
                            />
                        </div>

                        <div className="flex items-center justify-between px-3 pb-3">
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => setModelMenuOpen(!modelMenuOpen)}
                                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                                >
                                    <ProviderIcon providerId={selectedModelData.provider_id} className="w-4 h-4 grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all" />
                                    <span>{selectedModelData.name}</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="m6 9 6 6 6-6" /></svg>
                                </button>

                                <div className="w-px h-4 bg-gray-200 dark:bg-gray-800 mx-1"></div>

                                <button
                                    type="button"
                                    onClick={() => setIsWebSearchEnabled(!isWebSearchEnabled)}
                                    className={`p-2 rounded-full transition-all ${isWebSearchEnabled ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/40' : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
                                    title="Search the web"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                                </button>
                                <button
                                    type="button"
                                    className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-all cursor-default"
                                    title="activation soon"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.51a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
                                </button>
                            </div>

                            {isStreaming ? (
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    className="bg-red-500 hover:bg-red-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95"
                                    title="Cancel"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="6" y="6" width="12" height="12"></rect>
                                    </svg>
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={isLoading || !input.trim()}
                                    className="bg-blue-600 hover:bg-blue-700 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group-hover:shadow-blue-500/20"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="transform -translate-x-px translate-y-px"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                                </button>
                            )}
                        </div>
                    </form>
                </div>
                <p className="text-center text-[10px] text-gray-400 mt-2 px-10">
                    GERAI can make mistakes. Consider checking important information. By using this service, you agree to our
                    <a className="underline hover:text-blue-500 transition-colors ml-1" href="#">Terms</a> and
                    <a className="underline hover:text-blue-500 transition-colors ml-1" href="#">Privacy Policy</a>.
                </p>
            </div>
        </main>
    );
};

export default ChatInterface;
