import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import SettingsModal from './components/SettingsModal';
import { Message, Conversation } from './types';

import { DEFAULT_MODEL } from './constants/models';

function App() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentCid, setCurrentCid] = useState<number | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);

    // Streaming state
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingMessage, setStreamingMessage] = useState('');
    const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);

    // Settings State
    const [apiKey, setApiKey] = useState(localStorage.getItem('openai_key') || '');
    const [systemPrompt, setSystemPrompt] = useState(localStorage.getItem('system_prompt') || 'You are a helpful assistant.');
    const [model, setModel] = useState(DEFAULT_MODEL);

    // Load Conversations on Mount
    useEffect(() => {
        loadConversations();
    }, []);

    // Save Settings when changed
    useEffect(() => {
        localStorage.setItem('openai_key', apiKey);
        localStorage.setItem('system_prompt', systemPrompt);
    }, [apiKey, systemPrompt]);

    // Set up streaming event listeners
    useEffect(() => {
        if (!window.electron) return;

        const handleStreamChunk = (data: { requestId: string, chunk: string }) => {
            if (data.requestId === currentRequestId) {
                setStreamingMessage(prev => prev + data.chunk);
            }
        };

        const handleStreamComplete = (data: { requestId: string, conversationId: number, content: string }) => {
            if (data.requestId === currentRequestId) {
                setIsStreaming(false);
                setStreamingMessage('');
                setCurrentRequestId(null);
                setIsLoading(false);

                // Add the complete message to the messages list
                const aiMsg: Message = {
                    id: Date.now(),
                    conversation_id: data.conversationId,
                    role: 'assistant',
                    content: data.content,
                    created_at: new Date().toISOString()
                };
                setMessages(prev => [...prev, aiMsg]);

                // Reload conversations to update title if needed
                if (messages.length === 0) loadConversations();
            }
        };

        const handleStreamError = (data: { requestId: string, error: string }) => {
            if (data.requestId === currentRequestId) {
                setIsStreaming(false);
                setStreamingMessage('');
                setCurrentRequestId(null);
                setIsLoading(false);

                // Add error message
                const errorMsg: Message = {
                    id: Date.now(),
                    conversation_id: currentCid || 0,
                    role: 'assistant',
                    content: "Error: " + data.error,
                    created_at: new Date().toISOString()
                };
                setMessages(prev => [...prev, errorMsg]);
            }
        };

        const chunkListener = window.electron.on('stream-chunk', handleStreamChunk);
        const completeListener = window.electron.on('stream-complete', handleStreamComplete);
        const errorListener = window.electron.on('stream-error', handleStreamError);

        return () => {
            window.electron.removeListener('stream-chunk', chunkListener);
            window.electron.removeListener('stream-complete', completeListener);
            window.electron.removeListener('stream-error', errorListener);
        };
    }, [currentRequestId, currentCid, messages.length]);

    const loadConversations = async () => {
        if (window.electron) {
            try {
                const convs = await window.electron.invoke('get-conversations');
                setConversations(convs);
            } catch (err) {
                console.error("Failed to load conversations", err);
            }
        }
    };

    const loadMessages = async (cid: number) => {
        if (window.electron) {
            try {
                const msgs = await window.electron.invoke('get-messages', cid);
                setMessages(msgs);
            } catch (err) {
                console.error("Failed to load messages", err);
            }
        }
    };

    const handleSelectConversation = (cid: number) => {
        setCurrentCid(cid);
        loadMessages(cid);
    };

    const handleCreateNewChat = async () => {
        if (window.electron) {
            try {
                const newChat = await window.electron.invoke('create-conversation');
                await loadConversations();
                setCurrentCid(newChat.id);
                setMessages([]); // New chat empty
            } catch (err) {
                console.error("Failed to create chat", err);
            }
        } else {
            // Fallback for UIdev without Electron
            const fakeId = Date.now();
            const newChat: Conversation = {
                id: fakeId,
                title: 'New Chat',
                model: DEFAULT_MODEL,
                system_prompt: 'You are a helpful assistant.',
                created_at: new Date().toISOString()
            };
            setConversations([newChat, ...conversations]);
            setCurrentCid(fakeId);
            setMessages([]);
        }
    };

    const handleSendMessage = async (text: string, selectedModel: string) => {
        if (!apiKey) {
            setSettingsOpen(true);
            alert("Please set your API Key first.");
            return;
        }

        // Optimistic Update
        const userMsg: Message = {
            id: Date.now(), // Temp ID
            conversation_id: currentCid || 0,
            role: 'user',
            content: text,
            created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);
        setStreamingMessage(''); // Clear any previous streaming message

        if (window.electron) {
            try {
                // Start streaming
                const response = await window.electron.invoke('send-message', {
                    conversationId: currentCid,
                    message: text,
                    model: selectedModel,
                    apiKey,
                    systemPrompt
                });

                // Store request ID and start streaming state
                setCurrentRequestId(response.requestId);
                setIsStreaming(true);

                // Update conversation ID if it was a new chat
                if (!currentCid && response.conversationId) {
                    setCurrentCid(response.conversationId);
                    loadConversations();
                }

                // Note: The actual message will be added via stream-complete event listener
            } catch (err: any) {
                console.error(err);
                setIsLoading(false);
                setIsStreaming(false);
                setStreamingMessage('');
                setCurrentRequestId(null);

                const errorMsg: Message = {
                    id: Date.now(),
                    conversation_id: currentCid || 0,
                    role: 'assistant',
                    content: "Error: " + err.message,
                    created_at: new Date().toISOString()
                };
                setMessages(prev => [...prev, errorMsg]);
            }
        } else {
            // Mock for development without Electron
            setTimeout(() => {
                const mockMsg: Message = {
                    id: Date.now(),
                    conversation_id: currentCid || 0,
                    role: 'assistant',
                    content: "This is a mock response. Electron not detected.",
                    created_at: new Date().toISOString()
                };
                setMessages(prev => [...prev, mockMsg]);
                setIsLoading(false);
            }, 1000);
        }
    };

    const handleCancelMessage = async () => {
        if (!currentRequestId || !window.electron) return;

        try {
            await window.electron.invoke('cancel-message', currentRequestId);

            // Save the partial message if any
            if (streamingMessage) {
                const partialMsg: Message = {
                    id: Date.now(),
                    conversation_id: currentCid || 0,
                    role: 'assistant',
                    content: streamingMessage + "\n\n[Response canceled]",
                    created_at: new Date().toISOString()
                };
                setMessages(prev => [...prev, partialMsg]);
            }

            // Reset state
            setIsStreaming(false);
            setStreamingMessage('');
            setCurrentRequestId(null);
            setIsLoading(false);
        } catch (err: any) {
            console.error('Cancel error:', err);
        }
    };

    const handleDeleteChat = async (cid: number) => {
        if (!confirm("Are you sure?")) return;
        if (window.electron) {
            await window.electron.invoke('delete-conversation', cid);
            if (currentCid === cid) {
                setCurrentCid(null);
                setMessages([]);
            }
            loadConversations();
        }
    };

    const handleRenameChat = async (cid: number, oldTitle: string) => {
        const newTitle = prompt("Rename:", oldTitle);
        if (newTitle && newTitle !== oldTitle) {
            if (window.electron) {
                await window.electron.invoke('rename-conversation', { id: cid, title: newTitle });
                loadConversations();
            }
        }
    };

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 font-sans">
            <Sidebar
                conversations={conversations}
                currentCid={currentCid}
                onSelectConversation={handleSelectConversation}
                onCreateNewChat={handleCreateNewChat}
                onDeleteChat={handleDeleteChat}
                onRenameChat={handleRenameChat}
                onOpenSettings={() => setSettingsOpen(true)}
            />

            <ChatInterface
                currentConversationId={currentCid}
                messages={messages}
                onSendMessage={handleSendMessage}
                onCancelMessage={handleCancelMessage}
                isLoading={isLoading}
                isStreaming={isStreaming}
                streamingMessage={streamingMessage}
                model={model}
                setModel={setModel}
            />

            <SettingsModal
                isOpen={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                apiKey={apiKey}
                setApiKey={setApiKey}
                systemPrompt={systemPrompt}
                setSystemPrompt={setSystemPrompt}
            />
        </div>
    );
}

export default App;
