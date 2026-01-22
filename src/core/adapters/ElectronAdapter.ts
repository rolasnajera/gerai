import { IDataProvider } from '../services/IDataProvider';
import {
    Category,
    Subcategory,
    Conversation,
    Message,
    Context,
    ModelProvider,
    ProviderModel,
    SearchResult
} from '../../types';
import {
    SendMessageParams,
    MessageResponse,
    UpdateSubcategoryParams,
    CreateSubcategoryParams,
    UpdateCategoryParams,
    CreateCategoryParams,
    StreamEventHandlers
} from '../types/service-types';

// No need to redefine window.electron if it's already in vite-env.d.ts
// But if we need it to be more specific here, we can just use the existing one.

export class ElectronAdapter implements IDataProvider {
    // Categories
    async getCategories(): Promise<Category[]> {
        return window.electron.invoke('get-categories');
    }

    async createCategory(params: CreateCategoryParams): Promise<{ id: number }> {
        return window.electron.invoke('create-category', params);
    }

    async updateCategory(params: UpdateCategoryParams): Promise<void> {
        return window.electron.invoke('update-category', params);
    }

    async deleteCategory(id: number): Promise<void> {
        return window.electron.invoke('delete-category', id);
    }

    async reorderCategories(ids: number[]): Promise<void> {
        return window.electron.invoke('reorder-categories', ids);
    }

    async sortCategoriesAlphabetically(): Promise<void> {
        return window.electron.invoke('sort-categories-alphabetically');
    }

    // Subcategories
    async getSubcategories(): Promise<Subcategory[]> {
        return window.electron.invoke('get-subcategories');
    }

    async createSubcategory(params: CreateSubcategoryParams): Promise<{ id: number }> {
        return window.electron.invoke('create-subcategory', params);
    }

    async updateSubcategory(params: UpdateSubcategoryParams): Promise<void> {
        return window.electron.invoke('update-subcategory', {
            id: params.id,
            name: params.name,
            description: params.description,
            context: params.context,
            defaultModel: params.defaultModel,
            systemPrompt: params.systemPrompt
        });
    }

    async deleteSubcategory(id: number): Promise<void> {
        return window.electron.invoke('delete-subcategory', id);
    }

    async getSubcategoryContext(id: number): Promise<Context[]> {
        return window.electron.invoke('get-subcategory-context', id);
    }

    async reorderSubcategories(ids: number[]): Promise<void> {
        return window.electron.invoke('reorder-subcategories', ids);
    }

    // Conversations
    async getConversations(): Promise<Conversation[]> {
        return window.electron.invoke('get-conversations');
    }

    async createConversation(params: { model: string; subcategoryId?: number }): Promise<Conversation> {
        return window.electron.invoke('create-conversation', params);
    }

    async deleteConversation(id: number): Promise<void> {
        return window.electron.invoke('delete-conversation', id);
    }

    async renameConversation(params: { id: number; title: string }): Promise<void> {
        return window.electron.invoke('rename-conversation', params);
    }

    async moveConversation(params: { id: number; subcategoryId: number | null }): Promise<void> {
        return window.electron.invoke('move-conversation', params);
    }

    async searchConversations(query: string): Promise<SearchResult[]> {
        return window.electron.searchConversations(query);
    }

    // Messages
    async getMessages(conversationId: number): Promise<Message[]> {
        return window.electron.invoke('get-messages', conversationId);
    }

    async sendMessage(params: SendMessageParams): Promise<MessageResponse> {
        return window.electron.invoke('send-message', params);
    }

    async cancelMessage(requestId: string): Promise<void> {
        return window.electron.invoke('cancel-message', requestId);
    }

    // Models & Providers
    async getProviders(): Promise<ModelProvider[]> {
        return window.electron.invoke('get-providers');
    }

    async getProviderModels(providerId: string): Promise<ProviderModel[]> {
        return window.electron.invoke('get-provider-models', providerId);
    }

    async toggleProviderModel(params: { id: string; isEnabled: boolean }): Promise<boolean> {
        return window.electron.invoke('toggle-provider-model', params);
    }

    async updateProvider(params: { id: string; apiKey: string | null; isActive: boolean }): Promise<boolean> {
        return window.electron.invoke('update-provider', params);
    }

    async fetchRemoteModels(providerId: string): Promise<void> {
        return window.electron.invoke('fetch-remote-models', providerId);
    }

    // Context / Memory
    async getGeneralContext(): Promise<Context[]> {
        return window.electron.invoke('get-general-context');
    }

    async getAllContext(): Promise<Context[]> {
        return window.electron.invoke('get-all-context');
    }

    async updateGeneralContext(context: string[]): Promise<void> {
        return window.electron.invoke('update-general-context', context);
    }

    async updateContextItem(params: { id: number; content: string; subcategoryId: number | null }): Promise<void> {
        return window.electron.invoke('update-context-item', params);
    }

    async deleteContextItem(id: number): Promise<void> {
        return window.electron.invoke('delete-context-item', id);
    }

    // Auto-update
    async getAppVersion(): Promise<string> {
        return window.electron.getAppVersion();
    }

    async getPlatform(): Promise<string> {
        return window.electron.platform;
    }

    async checkForUpdates(): Promise<{ success: boolean; updateInfo?: any; message?: string }> {
        return window.electron.checkForUpdates();
    }

    async installUpdate(): Promise<{ success: boolean; message?: string }> {
        return window.electron.installUpdate();
    }

    async openReleasesPage(): Promise<void> {
        return window.electron.openReleasesPage();
    }

    onUpdateEvent(handlers: {
        onChecking?: () => void;
        onAvailable?: (info: any) => void;
        onProgress?: (progress: any) => void;
        onDownloaded?: (info: any) => void;
        onError?: (error: { message: string, isSignatureError?: boolean }) => void;
    }): () => void {
        if (handlers.onChecking) window.electron.onUpdateChecking(handlers.onChecking);
        if (handlers.onAvailable) window.electron.onUpdateAvailable(handlers.onAvailable);
        if (handlers.onProgress) window.electron.onUpdateDownloadProgress(handlers.onProgress);
        if (handlers.onDownloaded) window.electron.onUpdateDownloaded(handlers.onDownloaded);
        if (handlers.onError) window.electron.onUpdateError(handlers.onError);

        return () => {
            // Electron API doesn't seem to have removeListener for these specific ones in the interface, 
            // but we should probably add them if needed. 
            // For now, we'll just return a dummy cleanup or implement properly if possible.
        };
    }

    // Streaming
    onStreamEvent(handlers: StreamEventHandlers): () => void {
        const chunkListener = (data: any) => handlers.onChunk(data);
        const completeListener = (data: any) => handlers.onComplete(data);
        const errorListener = (data: any) => handlers.onError(data);

        const removeChunk = window.electron.on('stream-chunk', chunkListener);
        const removeComplete = window.electron.on('stream-complete', completeListener);
        const removeError = window.electron.on('stream-error', errorListener);

        return () => {
            window.electron.removeListener('stream-chunk', removeChunk);
            window.electron.removeListener('stream-complete', removeComplete);
            window.electron.removeListener('stream-error', removeError);
        };
    }
}
