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

        if (window.electron) {
            try {
                const response = await window.electron.invoke('send-message', {
                    conversationId: currentCid,
                    message: text,
                    model: selectedModel,
                    apiKey,
                    systemPrompt // Send system prompt so backend can use it for context
                });

                // If it was a new chat, the backend might have updated the ID or we just reload
                // If currentCid is null, backend handles creation, but we need the new ID back.
                // My 'send-message' handler should return: { content: string, conversationId: number, ... }

                if (!currentCid && response.conversationId) {
                    setCurrentCid(response.conversationId);
                    loadConversations(); // Title might have changed or list needs update
                } else {
                    // Refresh title if it changed (usually specifically on first message)
                    // For simplicity, reload conversations could be done lazily
                    if (messages.length === 0) loadConversations();
                }

                const aiMsg: Message = {
                    id: Date.now() + 1, // Temp ID
                    conversation_id: response.conversationId || currentCid || 0,
                    role: 'assistant',
                    content: response.content,
                    created_at: new Date().toISOString()
                };
                setMessages(prev => [...prev, aiMsg]);
            } catch (err: any) {
                console.error(err);
                const errorMsg: Message = {
                    id: Date.now(),
                    conversation_id: currentCid || 0,
                    role: 'assistant',
                    content: "Error: " + err.message,
                    created_at: new Date().toISOString()
                };
                setMessages(prev => [...prev, errorMsg]);
            } finally {
                setIsLoading(false);
            }
        } else {
            // Mock
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
                isLoading={isLoading}
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
