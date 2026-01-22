import {
  Message,
  Conversation,
  Category,
  Subcategory,
  Context,
  ProviderModel,
  ModelProvider,
  SearchResult,
} from '../../types';
import {
  SendMessageParams,
  MessageResponse,
  UpdateSubcategoryParams,
  CreateSubcategoryParams,
  UpdateCategoryParams,
  CreateCategoryParams,
  StreamEventHandlers,
} from '../types/service-types';

export interface IDataProvider {
  // Categories
  getCategories(): Promise<Category[]>;
  createCategory(params: CreateCategoryParams): Promise<{ id: number }>;
  updateCategory(params: UpdateCategoryParams): Promise<void>;
  deleteCategory(id: number): Promise<void>;
  reorderCategories(ids: number[]): Promise<void>;
  sortCategoriesAlphabetically(): Promise<void>;

  // Subcategories
  getSubcategories(): Promise<Subcategory[]>;
  createSubcategory(params: CreateSubcategoryParams): Promise<{ id: number }>;
  updateSubcategory(params: UpdateSubcategoryParams): Promise<void>;
  deleteSubcategory(id: number): Promise<void>;
  getSubcategoryContext(id: number): Promise<Context[]>;
  reorderSubcategories(ids: number[]): Promise<void>;

  // Conversations
  getConversations(): Promise<Conversation[]>;
  createConversation(params: {
    model: string;
    subcategoryId?: number;
  }): Promise<Conversation>;
  deleteConversation(id: number): Promise<void>;
  renameConversation(params: { id: number; title: string }): Promise<void>;
  moveConversation(params: {
    id: number;
    subcategoryId: number | null;
  }): Promise<void>;
  searchConversations(query: string): Promise<SearchResult[]>;

  // Messages
  getMessages(conversationId: number): Promise<Message[]>;
  sendMessage(params: SendMessageParams): Promise<MessageResponse>;
  cancelMessage(requestId: string): Promise<void>;

  // Models & Providers
  getProviders(): Promise<ModelProvider[]>;
  getProviderModels(providerId: string): Promise<ProviderModel[]>;
  toggleProviderModel(params: {
    id: string;
    isEnabled: boolean;
  }): Promise<boolean>;
  updateProvider(params: {
    id: string;
    apiKey: string | null;
    isActive: boolean;
  }): Promise<boolean>;
  fetchRemoteModels(providerId: string): Promise<void>;

  // Context / Memory
  getGeneralContext(): Promise<Context[]>;
  getAllContext(): Promise<Context[]>;
  updateGeneralContext(context: string[]): Promise<void>;
  updateContextItem(params: {
    id: number;
    content: string;
    subcategoryId: number | null;
  }): Promise<void>;
  deleteContextItem(id: number): Promise<void>;

  // Auto-update
  getAppVersion(): Promise<string>;
  getPlatform(): Promise<string>;
  checkForUpdates(): Promise<{
    success: boolean;
    updateInfo?: any;
    message?: string;
  }>;
  installUpdate(): Promise<{ success: boolean; message?: string }>;
  openReleasesPage(): Promise<void>;
  onUpdateEvent(handlers: {
    onChecking?: () => void;
    onAvailable?: (info: any) => void;
    onProgress?: (progress: any) => void;
    onDownloaded?: (info: any) => void;
    onError?: (error: { message: string; isSignatureError?: boolean }) => void;
  }): () => void;

  // Streaming
  onStreamEvent(handlers: StreamEventHandlers): () => void;
}
