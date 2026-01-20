import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import SettingsModal from './components/SettingsModal';
import ModelManagementModal from './components/ModelManagementModal';
import RenameModal from './components/RenameModal';
import MoveChatModal from './components/MoveChatModal';
import SubcategoryModal from './components/SubcategoryModal';
import DeleteSubcategoryModal from './components/DeleteSubcategoryModal';
import CategoryModal from './components/CategoryModal';
import DeleteCategoryModal from './components/DeleteCategoryModal';
import MemoryModal from './components/MemoryModal';
import SearchModal from './components/SearchModal';
import UpdateNotification from './components/UpdateNotification';
import { Message, Conversation, Category, Subcategory, ProviderModel } from './types';

import { DEFAULT_MODEL } from './constants/models';

function App() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentCid, setCurrentCid] = useState<number | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [memoryOpen, setMemoryOpen] = useState(false);
    const [memoryFilterId, setMemoryFilterId] = useState<number | null | undefined>(undefined);
    const [searchModalOpen, setSearchModalOpen] = useState(false);
    const [currentSearchQuery, setCurrentSearchQuery] = useState('');

    // Streaming state
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingMessage, setStreamingMessage] = useState('');
    const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);

    // Settings State
    const [modelManagementOpen, setModelManagementOpen] = useState(false);
    const [model, setModel] = useState(localStorage.getItem('general_model') || DEFAULT_MODEL);
    const [enabledModels, setEnabledModels] = useState<ProviderModel[]>([]);

    // Rename State
    const [renameModalOpen, setRenameModalOpen] = useState(false);
    const [renameCid, setRenameCid] = useState<number | null>(null);
    const [renameTitle, setRenameTitle] = useState('');

    // Move State
    const [moveModalOpen, setMoveModalOpen] = useState(false);
    const [moveCid, setMoveCid] = useState<number | null>(null);
    const [moveCurrentSubId, setMoveCurrentSubId] = useState<number | null>(null);

    // Subcategory Modal State
    const [subcategoryModalOpen, setSubcategoryModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
    const [subcategoryInitialData, setSubcategoryInitialData] = useState<{ name: string; description: string; context: string[]; default_model?: string; system_prompt?: string } | undefined>(undefined);

    const [deleteSubcategoryModalOpen, setDeleteSubcategoryModalOpen] = useState(false);
    const [deletingSubcategory, setDeletingSubcategory] = useState<Subcategory | null>(null);

    // Category Modal State
    const [categoryModalOpen, setCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [categoryInitialData, setCategoryInitialData] = useState<{ name: string; icon: string; description: string; sort_order: number } | undefined>(undefined);

    const [deleteCategoryModalOpen, setDeleteCategoryModalOpen] = useState(false);
    const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

    // Fast-track state (Category -> Subcategory -> Chat)
    const [isFastTrack, setIsFastTrack] = useState(false);

    // Sidebar Expansion State
    const [expandedCategories, setExpandedCategories] = useState<Record<number, boolean>>({ 0: true, 1: true });
    const [expandedSubcategories, setExpandedSubcategories] = useState<Record<number, boolean>>({});

    // Theme state
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const savedTheme = localStorage.getItem('theme');
        return savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    });

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    const toggleDarkMode = () => setIsDarkMode(prev => !prev);

    // Load Data on Mount
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        await Promise.all([
            loadCategories(),
            loadSubcategories(),
            loadConversations(),
            loadEnabledModels()
        ]);
    };

    const loadEnabledModels = async () => {
        if (window.electron) {
            const providers = await window.electron.invoke('get-providers');
            const activeProviderIds = providers.filter((p: any) => p.is_active).map((p: any) => p.id);

            let allEnabledModels: ProviderModel[] = [];
            for (const pId of activeProviderIds) {
                const pModels = await window.electron.invoke('get-provider-models', pId);
                allEnabledModels = [...allEnabledModels, ...pModels.filter((m: any) => m.is_enabled)];
            }
            setEnabledModels(allEnabledModels);

            // If current model is not in enabled models, fallback
            if (allEnabledModels.length > 0 && !allEnabledModels.some(m => m.id === model)) {
                setModel(allEnabledModels[0].id);
            }
        }
    };

    // Refresh models when modal closes
    useEffect(() => {
        if (!modelManagementOpen) {
            loadEnabledModels();
        }
    }, [modelManagementOpen]);

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

                // Ignore if aborted by the user
                if (data.error && data.error.includes('Aborted by user')) {
                    return;
                }

                // Add an error message
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

    const loadCategories = React.useCallback(async () => {
        if (window.electron) {
            try {
                const cats = await window.electron.invoke('get-categories');
                setCategories(cats);
            } catch (err) {
                console.error("Failed to load categories", err);
            }
        }
    }, []);

    const loadSubcategories = React.useCallback(async () => {
        if (window.electron) {
            try {
                const subs = await window.electron.invoke('get-subcategories');
                setSubcategories(subs);
            } catch (err) {
                console.error("Failed to load subcategories", err);
            }
        }
    }, []);

    const loadConversations = React.useCallback(async () => {
        if (window.electron) {
            try {
                const convs = await window.electron.invoke('get-conversations');
                setConversations(convs);
            } catch (err) {
                console.error("Failed to load conversations", err);
            }
        }
    }, []);

    const loadMessages = React.useCallback(async (cid: number) => {
        if (window.electron) {
            try {
                const msgs = await window.electron.invoke('get-messages', cid);
                setMessages(msgs);
            } catch (err) {
                console.error("Failed to load messages", err);
            }
        }
    }, []);

    const handleSelectConversation = React.useCallback((cid: number) => {
        setCurrentCid(cid);
        loadMessages(cid);

        // Update UI settings from the selected conversation
        const selected = conversations.find(c => c.id === cid);
        if (selected) {
            if (selected.model) setModel(selected.model);
        }
    }, [conversations, loadMessages]);

    const handleSetModel = (newModel: string) => {
        setModel(newModel);

        // If we are in a general chat (or no chat), persist as the general preference
        const currentConv = conversations.find(c => c.id === currentCid);
        if (!currentCid || (currentConv && !currentConv.subcategory_id)) {
            localStorage.setItem('general_model', newModel);
        }
    };

    const handleCreateNewChat = React.useCallback(async (subcategoryId?: number) => {
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
                    // General chat: use persisted preference
                    targetModel = localStorage.getItem('general_model') || DEFAULT_MODEL;
                    setModel(targetModel);
                }

                const newChat = await window.electron.invoke('create-conversation', {
                    model: targetModel,
                    subcategoryId
                });
                await loadConversations();
                setCurrentCid(newChat.id);
                setMessages([]); // New chat empty
            } catch (err) {
                console.error("Failed to create chat", err);
            }
        }
    }, [model, subcategories, loadConversations]);

    const handleSendMessage = async (text: string, selectedModel: string) => {
        // Validation check for model availability happens in the UI
        // or the backend will throw if no key is found.

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
                    requestId, // Pass ID to the backend
                    conversationId: currentCid,
                    message: text,
                    model: selectedModel
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

    const handleDeleteChat = React.useCallback(async (cid: number) => {
        if (!confirm("Are you sure you want to delete this chat?")) return;
        if (window.electron) {
            await window.electron.invoke('delete-conversation', cid);
            if (currentCid === cid) {
                setCurrentCid(null);
                setMessages([]);
            }
            loadConversations();
        }
    }, [currentCid, loadConversations]);

    const handleRenameChat = React.useCallback((cid: number, oldTitle: string) => {
        setRenameCid(cid);
        setRenameTitle(oldTitle);
        setRenameModalOpen(true);
    }, []);

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

    const handleMoveChat = React.useCallback((cid: number) => {
        const conv = conversations.find(c => c.id === cid);
        if (conv) {
            setMoveCid(cid);
            setMoveCurrentSubId(conv.subcategory_id ?? null);
            setMoveModalOpen(true);
        }
    }, [conversations]);

    const handleConfirmMove = async (subcategoryId: number | null) => {
        if (moveCid && window.electron) {
            try {
                await window.electron.invoke('move-conversation', { id: moveCid, subcategoryId });
                await loadConversations();
            } catch (err) {
                console.error("Failed to move conversation", err);
            }
        }
        setMoveModalOpen(false);
        setMoveCid(null);
    };

    // Subcategory Handlers
    const handleAddSubcategory = React.useCallback((category: Category, fastTrack: boolean = false) => {
        setSelectedCategory(category);
        setEditingSubcategory(null);
        setSubcategoryInitialData(undefined);
        setIsFastTrack(fastTrack);
        setSubcategoryModalOpen(true);
    }, []);

    const handleEditSubcategory = React.useCallback(async (subcategory: Subcategory) => {
        setEditingSubcategory(subcategory);
        setSelectedCategory(categories.find(c => c.id === subcategory.category_id) || null);

        if (window.electron) {
            const context = await window.electron.invoke('get-subcategory-context', subcategory.id);
            setSubcategoryInitialData({
                name: subcategory.name,
                description: subcategory.description || '',
                context: context.map((c: any) => c.content),
                default_model: subcategory.default_model,
                system_prompt: subcategory.system_prompt
            });
        }
        setSubcategoryModalOpen(true);
    }, [categories]);

    const handleDeleteSubcategoryRequest = React.useCallback((subcategory: Subcategory) => {
        setDeletingSubcategory(subcategory);
        setDeleteSubcategoryModalOpen(true);
    }, []);

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

    const handleSaveSubcategory = async (name: string, description: string, context: string[], defaultModel?: string, systemPrompt?: string) => {
        if (!window.electron) return;

        let newSubId: number | null = null;

        if (editingSubcategory) {
            await window.electron.invoke('update-subcategory', {
                id: editingSubcategory.id,
                name,
                description,
                context,
                defaultModel,
                systemPrompt
            });
        } else if (selectedCategory) {
            const result = await window.electron.invoke('create-subcategory', {
                categoryId: selectedCategory.id,
                name,
                description,
                context,
                defaultModel,
                systemPrompt
            });
            newSubId = result.id;
        }
        await loadSubcategories();

        if (newSubId) {
            setExpandedCategories(prev => ({ ...prev, [selectedCategory!.id]: true }));
            setExpandedSubcategories(prev => ({ ...prev, [newSubId]: true }));
            handleCreateNewChat(newSubId);
            setIsFastTrack(false);
        }
    };

    const handleSaveGeneralContext = async (context: string[]) => {
        if (!window.electron) return;
        await window.electron.invoke('update-general-context', context);
    };

    // Category Handlers
    const handleAddCategory = React.useCallback(() => {
        setEditingCategory(null);
        setCategoryInitialData(undefined);
        setIsFastTrack(true);
        setCategoryModalOpen(true);
    }, []);

    const handleEditCategory = React.useCallback((category: Category) => {
        setEditingCategory(category);
        setCategoryInitialData({
            name: category.name,
            icon: category.icon || 'folder',
            description: category.description || '',
            sort_order: category.sort_order
        });
        setCategoryModalOpen(true);
    }, []);

    const handleDeleteCategoryRequest = React.useCallback((category: Category) => {
        setDeletingCategory(category);
        setDeleteCategoryModalOpen(true);
    }, []);

    const handleConfirmDeleteCategory = async () => {
        if (deletingCategory && window.electron) {
            await window.electron.invoke('delete-category', deletingCategory.id);
            await loadData(); // Reload everything since deleting a category deletes subcategories and chats
            setCurrentCid(null);
            setMessages([]);
        }
    };

    const handleSaveCategory = async (name: string, icon: string, description: string) => {
        if (!window.electron) return;

        let newCat: Category | null = null;

        if (editingCategory) {
            await window.electron.invoke('update-category', {
                id: editingCategory.id,
                name,
                icon,
                description,
                sortOrder: editingCategory.sort_order
            });
        } else {
            // Get max sort order to append
            const maxSort = categories.length > 0 ? Math.max(...categories.map(c => c.sort_order)) : 0;
            const sortOrder = maxSort + 1;

            const result = await window.electron.invoke('create-category', {
                name,
                icon,
                description,
                sortOrder
            });
            newCat = { id: result.id, name, icon, description, sort_order: sortOrder };
        }
        await loadCategories();

        if (isFastTrack && newCat) {
            handleAddSubcategory(newCat, true);
        }
    };

    const handleReorderCategories = async (direction: 'up' | 'down', category: Category) => {
        if (!window.electron) return;
        const index = categories.findIndex(c => c.id === category.id);
        if (index === -1) return;

        const newCategories = [...categories];
        if (direction === 'up' && index > 0) {
            [newCategories[index - 1], newCategories[index]] = [newCategories[index], newCategories[index - 1]];
        } else if (direction === 'down' && index < newCategories.length - 1) {
            [newCategories[index], newCategories[index + 1]] = [newCategories[index + 1], newCategories[index]];
        } else {
            return;
        }

        await window.electron.invoke('reorder-categories', newCategories.map(c => c.id));
        await loadCategories();
    };

    const handleSortCategoriesAlphabetically = async () => {
        if (!window.electron) return;
        await window.electron.invoke('sort-categories-alphabetically');
        await loadCategories();
    };

    const handleReorderSubcategories = async (direction: 'up' | 'down', subcategory: Subcategory) => {
        if (!window.electron) return;
        const subId = subcategory.id;
        const catId = subcategory.category_id;
        const siblings = subcategories.filter(s => s.category_id === catId);
        const index = siblings.findIndex(s => s.id === subId);
        if (index === -1) return;

        const newSiblings = [...siblings];
        if (direction === 'up' && index > 0) {
            [newSiblings[index - 1], newSiblings[index]] = [newSiblings[index], newSiblings[index - 1]];
        } else if (direction === 'down' && index < newSiblings.length - 1) {
            [newSiblings[index], newSiblings[index + 1]] = [newSiblings[index + 1], newSiblings[index]];
        } else {
            return;
        }

        await window.electron.invoke('reorder-subcategories', newSiblings.map(s => s.id));
        await loadSubcategories();
    };

    const handleOpenSettings = React.useCallback(() => setSettingsOpen(true), []);
    const handleOpenMemory = React.useCallback((id: number | null | undefined) => {
        setMemoryFilterId(id);
        setMemoryOpen(true);
    }, []);

    const handleShowSearchResults = React.useCallback((query: string) => {
        setCurrentSearchQuery(query);
        setSearchModalOpen(true);
    }, []);

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 font-sans">
            <Sidebar
                categories={categories}
                subcategories={subcategories}
                conversations={conversations}
                currentCid={currentCid}
                isDarkMode={isDarkMode}
                onToggleDarkMode={toggleDarkMode}
                onSelectConversation={handleSelectConversation}
                onCreateNewChat={handleCreateNewChat}
                onDeleteChat={handleDeleteChat}
                onRenameChat={handleRenameChat}
                onMoveChat={handleMoveChat}
                onOpenSettings={handleOpenSettings}
                onOpenModelManagement={() => setModelManagementOpen(true)}
                onAddSubcategory={handleAddSubcategory}
                onEditSubcategory={handleEditSubcategory}
                onDeleteSubcategory={handleDeleteSubcategoryRequest}
                onAddCategory={handleAddCategory}
                onEditCategory={handleEditCategory}
                onDeleteCategory={handleDeleteCategoryRequest}
                onOpenMemory={handleOpenMemory}
                onShowSearchResults={handleShowSearchResults}
                expandedCategories={expandedCategories}
                setExpandedCategories={setExpandedCategories}
                expandedSubcategories={expandedSubcategories}
                setExpandedSubcategories={setExpandedSubcategories}
                onReorderCategory={handleReorderCategories}
                onSortCategoriesAlphabetically={handleSortCategoriesAlphabetically}
                onReorderSubcategory={handleReorderSubcategories}
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
                enabledModels={enabledModels}
                title={conversations.find(c => c.id === currentCid)?.title}
                categoryName={(() => {
                    const conv = conversations.find(c => c.id === currentCid);
                    if (!conv?.subcategory_id) return undefined;
                    const sub = subcategories.find(s => s.id === conv.subcategory_id);
                    if (!sub) return undefined;
                    return categories.find(cat => cat.id === sub.category_id)?.name;
                })()}
                subcategoryName={(() => {
                    const conv = conversations.find(c => c.id === currentCid);
                    if (!conv?.subcategory_id) return undefined;
                    return subcategories.find(s => s.id === conv.subcategory_id)?.name;
                })()}
            />

            <SettingsModal
                isOpen={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                onSaveGeneralContext={handleSaveGeneralContext}
            />

            <ModelManagementModal
                isOpen={modelManagementOpen}
                onClose={() => setModelManagementOpen(false)}
            />

            <RenameModal
                isOpen={renameModalOpen}
                onClose={() => setRenameModalOpen(false)}
                onSave={handleFinishRename}
                initialTitle={renameTitle}
            />

            <MoveChatModal
                isOpen={moveModalOpen}
                onClose={() => setMoveModalOpen(false)}
                onConfirm={handleConfirmMove}
                categories={categories}
                subcategories={subcategories}
                currentSubcategoryId={moveCurrentSubId}
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

            <CategoryModal
                isOpen={categoryModalOpen}
                onClose={() => setCategoryModalOpen(false)}
                onSave={handleSaveCategory}
                initialData={categoryInitialData}
            />

            <DeleteCategoryModal
                isOpen={deleteCategoryModalOpen}
                onClose={() => setDeleteCategoryModalOpen(false)}
                onConfirm={handleConfirmDeleteCategory}
                categoryName={deletingCategory?.name || ''}
            />

            <MemoryModal
                isOpen={memoryOpen}
                onClose={() => setMemoryOpen(false)}
                subcategories={subcategories}
                initialSubcategoryId={memoryFilterId}
            />

            <SearchModal
                isOpen={searchModalOpen}
                onClose={() => setSearchModalOpen(false)}
                query={currentSearchQuery}
                onSelectConversation={handleSelectConversation}
            />

            <UpdateNotification />
        </div>
    );
}

export default App;

