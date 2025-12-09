import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import SettingsModal from './components/SettingsModal';

function App() {
    const [conversations, setConversations] = useState([]);
    const [currentCid, setCurrentCid] = useState(null);
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);

    // Settings State
    const [apiKey, setApiKey] = useState(localStorage.getItem('openai_key') || '');
    const [systemPrompt, setSystemPrompt] = useState(localStorage.getItem('system_prompt') || 'You are a helpful assistant.');
    const [model, setModel] = useState('gpt-5-nano');

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

    const loadMessages = async (cid) => {
        if (window.electron) {
            try {
                const msgs = await window.electron.invoke('get-messages', cid);
                setMessages(msgs);
            } catch (err) {
                console.error("Failed to load messages", err);
            }
        }
    };

    const handleSelectConversation = (cid) => {
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
            const newChat = { id: fakeId, title: 'New Chat' };
            setConversations([newChat, ...conversations]);
            setCurrentCid(fakeId);
            setMessages([]);
        }
    };

    const handleSendMessage = async (text, selectedModel) => {
        if (!apiKey) {
            setSettingsOpen(true);
            alert("Please set your API Key first.");
            return;
        }

        // Optimistic Update
        const userMsg = { role: 'user', content: text };
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

                const aiMsg = { role: 'assistant', content: response.content };
                setMessages(prev => [...prev, aiMsg]);
            } catch (err) {
                console.error(err);
                setMessages(prev => [...prev, { role: 'assistant', content: "Error: " + err.message }]);
            } finally {
                setIsLoading(false);
            }
        } else {
            // Mock
            setTimeout(() => {
                setMessages(prev => [...prev, { role: 'assistant', content: "This is a mock response. Electron not detected." }]);
                setIsLoading(false);
            }, 1000);
        }
    };

    const handleDeleteChat = async (cid) => {
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

    const handleRenameChat = async (cid, oldTitle) => {
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
