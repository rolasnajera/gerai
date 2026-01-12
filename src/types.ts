export interface Message {
    id: number;
    conversation_id: number;
    role: 'user' | 'assistant' | 'system';
    content: string;
    model?: string;
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
    created_at: string;
    updated_at: string;
}

export interface Context {
    id: number;
    category_id?: number;
    subcategory_id?: number;
    conversation_id?: number;
    content: string;
    created_at: string;
}

export interface ElectronAPI {
    invoke<T = any>(channel: string, data?: any): Promise<T>;
}
