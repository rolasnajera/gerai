import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import { AVAILABLE_MODELS } from '../constants/models';
import { Message } from '../types';
import MessageItem from './MessageItem';

interface ChatInterfaceProps {
    currentConversationId: number | null;
    messages: Message[];
    onSendMessage: (text: string, model: string) => void;
    onCancelMessage: () => void;
    isLoading: boolean;
    isStreaming: boolean;
    streamingMessage: string;
    model: string;
    setModel: (model: string) => void;
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
    title,
    categoryName,
    subcategoryName
}) => {
    const [input, setInput] = useState('');
    const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
    const [modelMenuOpen, setModelMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeProvider, setActiveProvider] = useState<'all' | 'openai' | 'gemini' | 'ollama' | 'mock'>('all');
    const modelMenuRef = useRef<HTMLDivElement>(null);

    const isMac = window.electron?.platform === 'darwin';
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

    const filteredModels = AVAILABLE_MODELS.filter(m => {
        const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesProvider = activeProvider === 'all' || m.provider === activeProvider;
        return matchesSearch && matchesProvider;
    });

    const selectedModelData = AVAILABLE_MODELS.find(m => m.id === model) || AVAILABLE_MODELS[0];

    const OpenAIProviderIcon = ({ className }: { className?: string }) => (
        <svg viewBox="0 0 721 721" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M304.246 294.611V249.028C304.246 245.189 305.687 242.309 309.044 240.392L400.692 187.612C413.167 180.415 428.042 177.058 443.394 177.058C500.971 177.058 537.44 221.682 537.44 269.182C537.44 272.54 537.44 276.379 536.959 280.218L441.954 224.558C436.197 221.201 430.437 221.201 424.68 224.558L304.246 294.611ZM518.245 472.145V363.224C518.245 356.505 515.364 351.707 509.608 348.349L389.174 278.296L428.519 255.743C431.877 253.826 434.757 253.826 438.115 255.743L529.762 308.523C556.154 323.879 573.905 356.505 573.905 388.171C573.905 424.636 552.315 458.225 518.245 472.141V472.145ZM275.937 376.182L236.592 353.152C233.235 351.235 231.794 348.354 231.794 344.515V238.956C231.794 187.617 271.139 148.749 324.4 148.749C344.555 148.749 363.264 155.468 379.102 167.463L284.578 222.164C278.822 225.521 275.942 230.319 275.942 237.039V376.186L275.937 376.182ZM360.626 425.122L304.246 393.455V326.283L360.626 294.616L417.002 326.283V393.455L360.626 425.122ZM396.852 570.989C376.698 570.989 357.989 564.27 342.151 552.276L436.674 497.574C442.431 494.217 445.311 489.419 445.311 482.699V343.552L485.138 366.582C488.495 368.499 489.936 371.379 489.936 375.219V480.778C489.936 532.117 450.109 570.985 396.852 570.985V570.989ZM283.134 463.99L191.486 411.211C165.094 395.854 147.343 363.229 147.343 331.562C147.343 294.616 169.415 261.509 203.48 247.593V356.991C203.48 363.71 206.361 368.508 212.117 371.866L332.074 441.437L292.729 463.99C289.372 465.907 286.491 465.907 283.134 463.99ZM277.859 542.68C223.639 542.68 183.813 501.895 183.813 451.514C183.813 447.675 184.294 443.836 184.771 439.997L279.295 494.698C285.051 498.056 290.812 498.056 296.568 494.698L417.002 425.127V470.71C417.002 474.549 415.562 477.429 412.204 479.346L320.557 532.126C308.081 539.323 293.206 542.68 277.854 542.68H277.859ZM396.852 599.776C454.911 599.776 503.37 558.513 514.41 503.812C568.149 489.896 602.696 439.515 602.696 388.176C602.696 354.587 588.303 321.962 562.392 298.45C564.791 288.373 566.231 278.296 566.231 268.224C566.231 199.611 510.571 148.267 446.274 148.267C433.322 148.267 420.846 150.184 408.37 154.505C386.775 133.392 357.026 119.958 324.4 119.958C266.342 119.958 217.883 161.22 206.843 215.921C153.104 229.837 118.557 280.218 118.557 331.557C118.557 365.146 132.95 397.771 158.861 421.283C156.462 431.36 155.022 441.437 155.022 451.51C155.022 520.123 210.682 571.466 274.978 571.466C287.931 571.466 300.407 569.549 312.883 565.228C334.473 586.341 364.222 599.776 396.852 599.776Z" />
        </svg>
    );

    const GeminiProviderIcon = ({ className }: { className?: string }) => (
        <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
            <path d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z" fill="#3186FF" />
            <path d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z" fill="url(#gemini-gradient)" />
            <defs>
                <linearGradient id="gemini-gradient" x1="7" x2="17.5" y1="15.5" y2="12" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#08B962" />
                    <stop offset="0.5" stop-color="#3186FF" />
                    <stop offset="1" stop-color="#F94543" />
                </linearGradient>
            </defs>
        </svg>
    );

    const OllamaProviderIcon = ({ className }: { className?: string }) => (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M7.905 1.09c.216.085.411.225.588.41.295.306.544.744.734 1.263.191.522.315 1.1.362 1.68a5.054 5.054 0 012.049-.636l.051-.004c.87-.07 1.73.087 2.48.474.101.053.2.11.297.17.05-.569.172-1.134.36-1.644.19-.52.439-.957.733-1.264a1.67 1.67 0 01.589-.41c.257-.1.53-.118.796-.042.401.114.745.368 1.016.737.248.337.434.769.561 1.287.23.934.27 2.163.115 3.645l.053.04.026.019c.757.576 1.284 1.397 1.563 2.35.435 1.487.216 3.155-.534 4.088l-.018.021.002.003c.417.762.67 1.567.724 2.4l.002.03c.064 1.065-.2 2.137-.814 3.19l-.007.01.01.024c.472 1.157.62 2.322.438 3.486l-.006.039a.651.651 0 01-.747.536.648.648 0 01-.54-.742c.167-1.033.01-2.069-.48-3.123a.643.643 0 01.04-.617l.004-.006c.604-.924.854-1.83.8-2.72-.046-.779-.325-1.544-.8-2.273a.644.644 0 01.18-.886l.009-.006c.243-.159.467-.565.58-1.12a4.229 4.229 0 00-.095-1.974c-.205-.7-.58-1.284-1.105-1.683-.595-.454-1.383-.673-2.38-.61a.653.653 0 01-.632-.371c-.314-.665-.772-1.141-1.343-1.436a3.288 3.288 0 00-1.772-.332c-1.245.099-2.343.801-2.67 1.686a.652.652 0 01-.61.425c-1.067.002-1.893.252-2.497.703-.522.39-.878.935-1.066 1.588a4.07 4.07 0 00-.068 1.886c.112.558.331 1.02.582 1.269l.008.007c.212.207.257.53.109.785-.36.622-.629 1.549-.673 2.44-.05 1.018.186 1.902.719 2.536l.016.019a.643.643 0 01.095.69c-.576 1.236-.753 2.252-.562 3.052a.652.652 0 01-1.269.298c-.243-1.018-.078-2.184.473-3.498l.014-.035-.008-.012a4.339 4.339 0 01-.598-1.309l-.005-.019a5.764 5.764 0 01-.177-1.785c.044-.91.278-1.842.622-2.59l.012-.026-.002-.002c-.293-.418-.51-.953-.63-1.545l-.005-.024a5.352 5.352 0 01.093-2.49c.262-.915.777-1.701 1.536-2.269.06-.045.123-.09.186-.132-.159-1.493-.119-2.73.112-3.67.127-.518.314-.95.562-1.287.27-.368.614-.622 1.015-.737.266-.076.54-.059.797.042zm4.116 9.09c.936 0 1.8.313 2.446.855.63.527 1.005 1.235 1.005 1.94 0 .888-.406 1.58-1.133 2.022-.62.375-1.451.557-2.403.557-1.009 0-1.871-.259-2.493-.734-.617-.47-.963-1.13-.963-1.845 0-.707.398-1.417 1.056-1.946.668-.537 1.55-.849 2.485-.849zm0 .896a3.07 3.07 0 00-1.916.65c-.461.37-.722.835-.722 1.25 0 .428.21.829.61 1.134.455.347 1.124.548 1.943.548.799 0 1.473-.147 1.932-.426.463-.28.7-.686.7-1.257 0-.423-.246-.89-.683-1.256-.484-.405-1.14-.643-1.864-.643zm.662 1.21l.004.004c.12.151.095.37-.056.49l-.292.23v.446a.375.375 0 01-.376.373.375.375 0 01-.376-.373v-.46l-.271-.218a.347.347 0 01-.052-.49.353.353 0 01.494-.051l.215.172.22-.174a.353.353 0 01.49.051zm-5.04-1.919c.478 0 .867.39.867.871a.87.87 0 01-.868.871.87.87 0 01-.867-.87.87.87 0 01.867-.872zm8.706 0c.48 0 .868.39.868.871a.87.87 0 01-.868.871.87.87 0 01-.867-.87.87.87 0 01.867-.872zM7.44 2.3l-.003.002a.659.659 0 00-.285.238l-.005.006c-.138.189-.258.467-.348.832-.17.692-.216 1.631-.124 2.782.43-.128.899-.208 1.404-.237l.01-.001.019-.034c.046-.082.095-.161.148-.239.123-.771.022-1.692-.253-2.444-.134-.364-.297-.65-.453-.813a.628.628 0 00-.107-.09L7.44 2.3zm9.174.04l-.002.001a.628.628 0 00-.107.09c-.156.163-.32.45-.453.814-.29.794-.387 1.776-.23 2.572l.058.097.008.014h.03a5.184 5.184 0 011.466.212c.086-1.124.038-2.043-.128-2.722-.09-.365-.21-.643-.349-.832l-.004-.006a.659.659 0 00-.285-.239h-.004z" />
        </svg>
    );

    const getProviderIcon = (provider?: string, className: string = "w-4 h-4") => {
        switch (provider) {
            case 'openai': return <OpenAIProviderIcon className={className} />;
            case 'gemini': return <GeminiProviderIcon className={className} />;
            case 'ollama': return <OllamaProviderIcon className={className} />;
            default: return (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    <circle cx="12" cy="12" r="4"></circle>
                </svg>
            );
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading || isStreaming) return;
        onSendMessage(input, model);
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
                className="flex-1 overflow-y-auto pt-10 pb-32 px-4 sm:px-8 xl:px-20 scroll-smooth relative"
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
                            <div className="text-xs text-gray-400 uppercase font-semibold mx-1">assistant</div>
                            <div className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border-2 border-blue-400 dark:border-blue-600 px-4 py-3 rounded-2xl max-w-[90%] prose dark:prose-invert animate-pulse-border"
                                dangerouslySetInnerHTML={{ __html: marked.parse(streamingMessage) as string }}
                            />
                        </div>
                    )}

                    {isLoading && !streamingMessage && (
                        <div className="flex flex-col gap-1 items-start mb-6 transition-all duration-500 ease-in-out animate-in fade-in slide-in-from-bottom-2">
                            <div className="text-xs text-gray-400 uppercase font-semibold mx-1">assistant</div>
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
            <div className="p-8 pt-0 max-w-4xl mx-auto w-full relative">
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
                                <OpenAIProviderIcon className="w-6 h-6" />
                            </button>

                            <button
                                onClick={() => setActiveProvider('gemini')}
                                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${activeProvider === 'gemini' ? 'bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-100 dark:ring-gray-800' : 'grayscale opacity-50 hover:opacity-100 hover:grayscale-0'}`}
                            >
                                <GeminiProviderIcon className="w-6 h-6" />
                            </button>

                            <button
                                onClick={() => setActiveProvider('ollama')}
                                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${activeProvider === 'ollama' ? 'bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-100 dark:ring-gray-800 text-gray-800 dark:text-white' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-200'}`}
                            >
                                <OllamaProviderIcon className="w-6 h-6" />
                            </button>

                            <button
                                onClick={() => setActiveProvider('mock')}
                                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${activeProvider === 'mock' ? 'bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-100 dark:ring-gray-800 text-blue-600' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="15" x2="23" y2="15"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="15" x2="4" y2="15"></line></svg>
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
                                                {m.id === 'mock' ? 'Fast mock response for UI testing' : `${m.provider?.toUpperCase()} language model`}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {getProviderIcon(m.provider, "w-5 h-5 opacity-80 group-hover:opacity-100 transition-opacity")}
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
                                className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-gray-800 dark:text-gray-200 placeholder:text-gray-400 resize-none custom-scrollbar min-h-[44px] text-base leading-relaxed"
                                placeholder="Type your message... (Shift+Enter for new line)"
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
                                    {getProviderIcon(selectedModelData.provider, "w-4 h-4 grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all")}
                                    <span>{selectedModelData.name}</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="m6 9 6 6 6-6" /></svg>
                                </button>

                                <div className="w-px h-4 bg-gray-200 dark:bg-gray-800 mx-1"></div>

                                <button
                                    type="button"
                                    className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-all cursor-default"
                                    title="activation soon"
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
                <p className="text-center text-[10px] text-gray-400 mt-4 px-10">
                    GERAI can make mistakes. Consider checking important information. By using this service, you agree to our
                    <a className="underline hover:text-blue-500 transition-colors ml-1" href="#">Terms</a> and
                    <a className="underline hover:text-blue-500 transition-colors ml-1" href="#">Privacy Policy</a>.
                </p>
            </div>
        </main>
    );
};

export default ChatInterface;
