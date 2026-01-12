import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import SettingsModal from './components/SettingsModal';
import RenameModal from './components/RenameModal';
import SubcategoryModal from './components/SubcategoryModal';
import DeleteSubcategoryModal from './components/DeleteSubcategoryModal';
import { Message, Conversation, Category, Subcategory } from './types';

import { DEFAULT_MODEL } from './constants/models';

function App() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
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
    const [model, setModel] = useState(localStorage.getItem('global_model') || DEFAULT_MODEL);

    // Rename State
    const [renameModalOpen, setRenameModalOpen] = useState(false);
    const [renameCid, setRenameCid] = useState<number | null>(null);
    const [renameTitle, setRenameTitle] = useState('');

    // Subcategory Modal State
    const [subcategoryModalOpen, setSubcategoryModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
    const [subcategoryInitialData, setSubcategoryInitialData] = useState<{ name: string; description: string; context: string[]; default_model?: string } | undefined>(undefined);

    // Delete Subcategory Modal State
    const [deleteSubcategoryModalOpen, setDeleteSubcategoryModalOpen] = useState(false);
    const [deletingSubcategory, setDeletingSubcategory] = useState<Subcategory | null>(null);

    // Load Data on Mount
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        await Promise.all([
            loadCategories(),
            loadSubcategories(),
            loadConversations()
        ]);
    };

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
                loadConversations();
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
    }, [currentRequestId, currentCid, messages.length, conversations.length]);

    const loadCategories = async () => {
        if (window.electron) {
            try {
                const cats = await window.electron.invoke('get-categories');
                setCategories(cats);
            } catch (err) {
                console.error("Failed to load categories", err);
            }
        }
    };

    const loadSubcategories = async () => {
        if (window.electron) {
            try {
                const subs = await window.electron.invoke('get-subcategories');
                setSubcategories(subs);
            } catch (err) {
                console.error("Failed to load subcategories", err);
            }
        }
    };

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

    const handleSetModel = (newModel: string) => {
        setModel(newModel);

        // If we are in a global chat (or no chat), persist as global preference
        const currentConv = conversations.find(c => c.id === currentCid);
        if (!currentCid || (currentConv && !currentConv.subcategory_id)) {
            localStorage.setItem('global_model', newModel);
        }
    };

    const handleCreateNewChat = async (subcategoryId?: number) => {
        if (window.electron) {
            try {
                // If in a subcategory, check if it has a default model
                let targetModel = model;
                if (subcategoryId) {
                    const sub = subcategories.find(s => s.id === subcategoryId);
                    if (sub && sub.default_model) {
                        targetModel = sub.default_model;
                        setModel(targetModel); // Sync UI
                    }
                } else {
                    // Global chat: use persisted preference
                    targetModel = localStorage.getItem('global_model') || DEFAULT_MODEL;
                    setModel(targetModel);
                }

                const newChat = await window.electron.invoke('create-conversation', {
                    model: targetModel,
                    systemPrompt,
                    subcategoryId
                });
                await loadConversations();
                setCurrentCid(newChat.id);
                setMessages([]); // New chat empty
            } catch (err) {
                console.error("Failed to create chat", err);
            }
        }
    };

    const handleSendMessage = async (text: string, selectedModel: string) => {
        if (!apiKey && selectedModel !== 'mock') {
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
        }
    };

    const handleCancelMessage = async () => {
        if (!currentRequestId || !window.electron) return;
        try {
            await window.electron.invoke('cancel-message', currentRequestId);
        } catch (err: any) {
            console.error('Cancel error:', err);
        }
    };

    const handleDeleteChat = async (cid: number) => {
        if (!confirm("Are you sure you want to delete this chat?")) return;
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

    // Subcategory Handlers
    const handleAddSubcategory = (category: Category) => {
        setSelectedCategory(category);
        setEditingSubcategory(null);
        setSubcategoryInitialData(undefined);
        setSubcategoryModalOpen(true);
    };

    const handleEditSubcategory = async (subcategory: Subcategory) => {
        setEditingSubcategory(subcategory);
        setSelectedCategory(categories.find(c => c.id === subcategory.category_id) || null);

        if (window.electron) {
            const context = await window.electron.invoke('get-subcategory-context', subcategory.id);
            setSubcategoryInitialData({
                name: subcategory.name,
                description: subcategory.description || '',
                context: context.map((c: any) => c.content),
                default_model: subcategory.default_model
            });
        }
        setSubcategoryModalOpen(true);
    };

    const handleDeleteSubcategoryRequest = (subcategory: Subcategory) => {
        setDeletingSubcategory(subcategory);
        setDeleteSubcategoryModalOpen(true);
    };

    const handleConfirmDeleteSubcategory = async () => {
        if (deletingSubcategory && window.electron) {
            await window.electron.invoke('delete-subcategory', deletingSubcategory.id);
            await loadSubcategories();
            await loadConversations();
            // If the current chat was in this subcategory, it's gone
            const stillExists = conversations.some(c => c.id === currentCid);
            if (!stillExists) {
                setCurrentCid(null);
                setMessages([]);
            }
        }
    };

    const handleSaveSubcategory = async (name: string, description: string, context: string[], defaultModel?: string) => {
        if (!window.electron) return;

        if (editingSubcategory) {
            await window.electron.invoke('update-subcategory', {
                id: editingSubcategory.id,
                name,
                description,
                context,
                defaultModel
            });
        } else if (selectedCategory) {
            await window.electron.invoke('create-subcategory', {
                categoryId: selectedCategory.id,
                name,
                description,
                context,
                defaultModel
            });
        }
        await loadSubcategories();
    };

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 font-sans">
            <Sidebar
                categories={categories}
                subcategories={subcategories}
                conversations={conversations}
                currentCid={currentCid}
                onSelectConversation={handleSelectConversation}
                onCreateNewChat={handleCreateNewChat}
                onDeleteChat={handleDeleteChat}
                onRenameChat={handleRenameChat}
                onOpenSettings={() => setSettingsOpen(true)}
                onAddSubcategory={handleAddSubcategory}
                onEditSubcategory={handleEditSubcategory}
                onDeleteSubcategory={handleDeleteSubcategoryRequest}
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
                setModel={handleSetModel}
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

            <SubcategoryModal
                isOpen={subcategoryModalOpen}
                onClose={() => setSubcategoryModalOpen(false)}
                onSave={handleSaveSubcategory}
                categoryName={selectedCategory?.name || ''}
                initialData={subcategoryInitialData}
            />

            <DeleteSubcategoryModal
                isOpen={deleteSubcategoryModalOpen}
                onClose={() => setDeleteSubcategoryModalOpen(false)}
                onConfirm={handleConfirmDeleteSubcategory}
                subcategoryName={deletingSubcategory?.name || ''}
            />
        </div>
    );
}

export default App;

