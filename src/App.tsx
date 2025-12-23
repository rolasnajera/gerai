import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import SettingsModal from './components/SettingsModal';
import RenameModal from './components/RenameModal';
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

    // Rename State
    const [renameModalOpen, setRenameModalOpen] = useState(false);
    const [renameCid, setRenameCid] = useState<number | null>(null);
    const [renameTitle, setRenameTitle] = useState('');

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

                // Ignore if aborted by user
                if (data.error && data.error.includes('Aborted by user')) {
                    return;
                }

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

        // Update UI settings from the selected conversation
        const selected = conversations.find(c => c.id === cid);
        if (selected) {
            if (selected.model) setModel(selected.model);
            if (selected.system_prompt) setSystemPrompt(selected.system_prompt);
        }
    };

    const handleCreateNewChat = async () => {
        if (window.electron) {
            try {
                const newChat = await window.electron.invoke('create-conversation', { model, systemPrompt });
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

        // Generate Request ID on frontend to track streaming immediately
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setCurrentRequestId(requestId);
        setIsStreaming(true);
        setIsLoading(true);
        setStreamingMessage('');

        // Optimistic Update
        const userMsg: Message = {
            id: Date.now(), // Temp ID
            conversation_id: currentCid || 0,
            role: 'user',
            content: text,
            created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, userMsg]);

        if (window.electron) {
            try {
                const response = await window.electron.invoke('send-message', {
                    requestId, // Pass ID to backend
                    conversationId: currentCid,
                    message: text,
                    model: selectedModel,
                    apiKey,
                    systemPrompt
                });

                // Update conversation ID if it was a new chat
                if (!currentCid && response.conversationId) {
                    setCurrentCid(response.conversationId);
                    loadConversations();
                }

                if (response.aborted) {
                    setIsLoading(false);
                    setIsStreaming(false);
                    setStreamingMessage('');
                    setCurrentRequestId(null);
                    return;
                }

                // Note: The actual message will be added via stream-complete event listener
            } catch (err: any) {
                console.error(err);
                setIsLoading(false);
                setIsStreaming(false);
                setStreamingMessage('');
                setCurrentRequestId(null);

                // Add error message
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
                setIsStreaming(false);
                setStreamingMessage('');
                setCurrentRequestId(null);
            }, 1000);
        }
    };

    const handleCancelMessage = async () => {
        if (!currentRequestId || !window.electron) return;

        try {
            await window.electron.invoke('cancel-message', currentRequestId);
            // Note: We don't reset state here anymore. 
            // The backend will now resolve the 'send-message' call and emit 'stream-complete'
            // even when aborted, which will handle the UI cleanup and persistence.
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

    const handleRenameChat = (cid: number, oldTitle: string) => {
        setRenameCid(cid);
        setRenameTitle(oldTitle);
        setRenameModalOpen(true);
    };

    const handleFinishRename = async (newTitle: string) => {
        if (renameCid && newTitle) {
            if (window.electron) {
                try {
                    await window.electron.invoke('rename-conversation', { id: renameCid, title: newTitle });
                    await loadConversations();
                } catch (err) {
                    console.error("Failed to rename conversation", err);
                }
            }
        }
        setRenameModalOpen(false);
        setRenameCid(null);
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

            <RenameModal
                isOpen={renameModalOpen}
                onClose={() => setRenameModalOpen(false)}
                onSave={handleFinishRename}
                initialTitle={renameTitle}
            />
        </div>
    );
}

export default App;
