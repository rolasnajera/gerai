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
import { useDataService } from './core/hooks/useDataService';

function App() {
    const dataService = useDataService();
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
        const providers = await dataService.getProviders();
        const activeProviderIds = providers.filter((p: any) => p.is_active).map((p: any) => p.id);

        let allEnabledModels: ProviderModel[] = [];
        for (const pId of activeProviderIds) {
            const pModels = await dataService.getProviderModels(pId);
            allEnabledModels = [...allEnabledModels, ...pModels.filter((m: any) => m.is_enabled)];
        }
        setEnabledModels(allEnabledModels);

        // If the current model is not in enabled models, fallback
        if (allEnabledModels.length > 0 && !allEnabledModels.some(m => m.id === model)) {
            setModel(allEnabledModels[0].id);
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
        const removeListeners = dataService.onStreamEvent({
            onChunk: (data) => {
                if (data && data.requestId === currentRequestId) {
                    setStreamingMessage(prev => prev + data.chunk);
                }
            },
            onComplete: (data) => {
                if (data && data.requestId === currentRequestId) {
                    setIsStreaming(false);
                    setStreamingMessage('');
                    setCurrentRequestId(null);
                    setIsLoading(false);

                    const aiMsg: Message = {
                        id: Date.now(),
                        conversation_id: data.conversationId,
                        role: 'assistant',
                        content: data.content,
                        created_at: new Date().toISOString()
                    };
                    setMessages(prev => [...prev, aiMsg]);
                    loadConversations();
                }
            },
            onError: (data) => {
                if (data && data.requestId === currentRequestId) {
                    setIsStreaming(false);
                    setStreamingMessage('');
                    setCurrentRequestId(null);
                    setIsLoading(false);

                    if (data.error && data.error.includes('Aborted by user')) {
                        return;
                    }

                    const errorMsg: Message = {
                        id: Date.now(),
                        conversation_id: currentCid || 0,
                        role: 'assistant',
                        content: "Error: " + data.error,
                        created_at: new Date().toISOString()
                    };
                    setMessages(prev => [...prev, errorMsg]);
                }
            }
        });

        return () => {
            removeListeners();
        };
    }, [currentRequestId, currentCid, messages.length, conversations.length]);

    const loadCategories = React.useCallback(async () => {
        try {
            const cats = await dataService.getCategories();
            setCategories(cats);
        } catch (err) {
            console.error("Failed to load categories", err);
        }
    }, [dataService]);

    const loadSubcategories = React.useCallback(async () => {
        try {
            const subs = await dataService.getSubcategories();
            setSubcategories(subs);
        } catch (err) {
            console.error("Failed to load subcategories", err);
        }
    }, [dataService]);

    const loadConversations = React.useCallback(async () => {
        try {
            const convs = await dataService.getConversations();
            setConversations(convs);
        } catch (err) {
            console.error("Failed to load conversations", err);
        }
    }, [dataService]);

    const loadMessages = React.useCallback(async (cid: number) => {
        try {
            const msgs = await dataService.getMessages(cid);
            setMessages(msgs);
        } catch (err) {
            console.error("Failed to load messages", err);
        }
    }, [dataService]);

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

            const newChat = await dataService.createConversation({
                model: targetModel,
                subcategoryId
            });
            await loadConversations();
            setCurrentCid(newChat.id);
            setMessages([]); // New chat empty
        } catch (err) {
            console.error("Failed to create chat", err);
        }
    }, [model, subcategories, loadConversations, dataService]);

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

        try {
            const response = await dataService.sendMessage({
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
    };

    const handleCancelMessage = async () => {
        if (!currentRequestId) return;
        try {
            await dataService.cancelMessage(currentRequestId);
        } catch (err: any) {
            console.error('Cancel error:', err);
        }
    };

    const handleDeleteChat = React.useCallback(async (cid: number) => {
        if (!confirm("Are you sure you want to delete this chat?")) return;
        await dataService.deleteConversation(cid);
        if (currentCid === cid) {
            setCurrentCid(null);
            setMessages([]);
        }
        loadConversations();
    }, [currentCid, loadConversations]);

    const handleRenameChat = React.useCallback((cid: number, oldTitle: string) => {
        setRenameCid(cid);
        setRenameTitle(oldTitle);
        setRenameModalOpen(true);
    }, []);

    const handleFinishRename = async (newTitle: string) => {
        if (renameCid && newTitle) {
            try {
                await dataService.renameConversation({ id: renameCid, title: newTitle });
                await loadConversations();
            } catch (err) {
                console.error("Failed to rename conversation", err);
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
        if (moveCid) {
            try {
                await dataService.moveConversation({ id: moveCid, subcategoryId });
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

        const context = await dataService.getSubcategoryContext(subcategory.id);
        setSubcategoryInitialData({
            name: subcategory.name,
            description: subcategory.description || '',
            context: context.map((c: any) => c.content),
            default_model: subcategory.default_model,
            system_prompt: subcategory.system_prompt
        });
        setSubcategoryModalOpen(true);
    }, [categories]);

    const handleDeleteSubcategoryRequest = React.useCallback((subcategory: Subcategory) => {
        setDeletingSubcategory(subcategory);
        setDeleteSubcategoryModalOpen(true);
    }, []);

    const handleConfirmDeleteSubcategory = async () => {
        if (deletingSubcategory) {
            await dataService.deleteSubcategory(deletingSubcategory.id);
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
        let newSubId: number | null = null;

        if (editingSubcategory) {
            await dataService.updateSubcategory({
                id: editingSubcategory.id,
                name,
                description,
                context,
                defaultModel,
                systemPrompt
            });
        } else if (selectedCategory) {
            const result = await dataService.createSubcategory({
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
        if (deletingCategory) {
            await dataService.deleteCategory(deletingCategory.id);
            await loadData(); // Reload everything since deleting a category deletes subcategories and chats
            setCurrentCid(null);
            setMessages([]);
        }
    };

    const handleSaveCategory = async (name: string, icon: string, description: string) => {
        let newCat: Category | null = null;

        if (editingCategory) {
            await dataService.updateCategory({
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

            const result = await dataService.createCategory({
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

        await dataService.reorderCategories(newCategories.map(c => c.id));
        await loadCategories();
    };

    const handleSortCategoriesAlphabetically = async () => {
        await dataService.sortCategoriesAlphabetically();
        await loadCategories();
    };

    const handleReorderSubcategories = async (direction: 'up' | 'down', subcategory: Subcategory) => {
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

        await dataService.reorderSubcategories(newSiblings.map(s => s.id));
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

