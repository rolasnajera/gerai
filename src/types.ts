export interface Message {
    id: number;
    conversation_id: number;
    role: 'user' | 'assistant' | 'system';
    content: string;
    created_at: string;
}

export interface Conversation {
    id: number;
    title: string;
    model: string;
    system_prompt: string;
    created_at: string;
    last_response_id?: string;
}

export interface ElectronAPI {
    invoke<T = any>(channel: string, data?: any): Promise<T>;
}
