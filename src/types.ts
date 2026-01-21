export interface Citation {
    url: string;
    title: string;
    start_index: number;
    end_index: number;
}

export interface Message {
    id: number;
    conversation_id: number;
    role: 'user' | 'assistant' | 'system';
    content: string;
    model?: string;
    citations?: Citation[];
    created_at: string;
}

export interface Conversation {
    id: number;
    title: string;
    model: string;
    system_prompt: string;
    subcategory_id?: number | null;
    created_at: string;
    last_response_id?: string;
}

export interface Category {
    id: number;
    name: string;
    icon?: string;
    description?: string;
    sort_order: number;
}

export interface Subcategory {
    id: number;
    category_id: number;
    name: string;
    description?: string;
    default_model?: string;
    system_prompt?: string;
    created_at: string;
    updated_at: string;
}

export interface Context {
    id: number;
    category_id?: number | null;
    subcategory_id?: number | null;
    conversation_id?: number | null;
    content: string;
    source: 'manual' | 'ai';
    created_at: string;
    updated_at: string;
    // Joined fields
    subcategory_name?: string;
    category_name?: string;
}

export interface ElectronAPI {
    invoke<T = any>(channel: string, data?: any): Promise<T>;
}

export interface SearchResult {
    id: number;
    title: string;
    subcategory_id?: number | null;
    subcategory_name?: string;
    category_name?: string;
    snippet?: string;
}

export interface ModelProvider {
    id: string;
    name: string;
    api_key?: string;
    is_active: boolean;
    config?: string;
}

export interface ProviderModel {
    id: string;
    provider_id: string;
    name: string;
    is_enabled: boolean;
    capabilities?: string;
    description?: string;
}
