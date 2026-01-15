export interface Model {
    id: string;
    name: string;
    provider?: 'openai' | 'gemini' | 'ollama' | 'mock';
}

const ALL_MODELS: Model[] = [
    { id: 'mock', name: 'Mock Model (Development)', provider: 'mock' },
    { id: 'gpt-5-nano', name: 'gpt-5-nano', provider: 'openai' },
    { id: 'gpt-5-mini', name: 'gpt-5-mini', provider: 'openai' },
    { id: 'gpt-5', name: 'gpt-5', provider: 'openai' },
];

export const AVAILABLE_MODELS: Model[] = import.meta.env.DEV
    ? ALL_MODELS
    : ALL_MODELS.filter(m => m.id !== 'mock');

export const DEFAULT_MODEL = import.meta.env.DEV ? 'mock' : 'gpt-5-nano';
