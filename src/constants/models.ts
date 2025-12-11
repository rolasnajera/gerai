export interface Model {
    id: string;
    name: string;
}

export const AVAILABLE_MODELS: Model[] = [
    { id: 'gpt-5-nano', name: 'gpt-5-nano (OpenAI)' },
    { id: 'gpt-5-mini', name: 'gpt-5-mini (OpenAI)' },
    { id: 'gpt-5', name: 'gpt-5 (OpenAI)' },
];

export const DEFAULT_MODEL = 'gpt-5-nano';
