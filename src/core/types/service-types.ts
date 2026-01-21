// No imports needed here if they are not used in this file

export interface SendMessageParams {
    requestId: string;
    conversationId: number | null;
    message: string;
    model: string;
}

export interface MessageResponse {
    conversationId: number;
    aborted?: boolean;
}

export interface UpdateSubcategoryParams {
    id: number;
    name: string;
    description: string;
    context: string[];
    defaultModel?: string;
    systemPrompt?: string;
}

export interface CreateSubcategoryParams {
    categoryId: number;
    name: string;
    description: string;
    context: string[];
    defaultModel?: string;
    systemPrompt?: string;
}

export interface UpdateCategoryParams {
    id: number;
    name: string;
    icon: string;
    description: string;
    sortOrder: number;
}

export interface CreateCategoryParams {
    name: string;
    icon: string;
    description: string;
    sortOrder: number;
}

export interface StreamEventHandlers {
    onChunk: (data: { requestId: string; chunk: string }) => void;
    onComplete: (data: { requestId: string; conversationId: number; content: string }) => void;
    onError: (data: { requestId: string; conversationId: number | null; error: string }) => void;
}
