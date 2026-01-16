import { OpenAI } from 'openai';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';

// Detect if we are in development
const isDev = !app.isPackaged;
const logFolder = isDev ? process.cwd() : app.getPath('userData');
const logPath = path.join(logFolder, 'openai_debug.log');

interface OpenAIResponseResult {
    output_text: string;
    response_id?: string;
    aborted?: boolean;
}

export async function getOpenAIResponse(
    apiKey: string,
    input: string,
    onChunk: (chunk: string) => void,
    model: string = 'gpt-5-mini',
    instructions?: string,
    previousResponseId?: string,
    abortSignal?: AbortSignal
): Promise<OpenAIResponseResult> {
    return new Promise((resolve, reject) => {
        try {
            console.log('--- OpenAI Streaming Request ---');
            console.log('Model:', model);
            console.log('Instructions:', instructions);
            console.log('Input:', input);
            if (previousResponseId) console.log('Previous Response ID:', previousResponseId);

            const client = new OpenAI({
                apiKey: apiKey,
                dangerouslyAllowBrowser: false
            });

            const params: any = {
                model: model,
                input: input,
                store: true,
            };

            if (instructions) {
                params.instructions = instructions;
            }

            if (previousResponseId) {
                params.previous_response_id = previousResponseId;
            }

            // Use the .stream() method
            // @ts-ignore
            const stream = client.responses.stream(params);

            // Handle cancellation
            if (abortSignal) {
                abortSignal.addEventListener('abort', () => {
                    console.log('Abort signal received, aborting stream...');
                    stream.controller.abort();
                    // Instead of rejecting, we resolve with what we have so far
                    // so it can be saved to the DB if needed.
                    resolve({
                        output_text: accumulatedText,
                        response_id: responseId,
                        aborted: true
                    });
                });
            }

            let accumulatedText = '';
            let responseId: string | undefined;

            // Listen for text delta chunks - CORRECT event name
            stream.on('response.output_text.delta', (event: any) => {
                const delta = event.delta || '';
                accumulatedText += delta;
                // Forward delta to callback for real-time UI updates
                onChunk(delta);
            });

            // Listen for completion - CORRECT event name
            stream.on('response.completed', async (event: any) => {
                console.log('Stream completed');
                responseId = event?.response?.id;

                console.log('--- OpenAI Response Complete ---');
                console.log('ID:', responseId);
                console.log('Total text length:', accumulatedText.length);
                console.log('Preview:', accumulatedText.substring(0, 100));

                // Debug logging to file
                const debugInfo = {
                    timestamp: new Date().toISOString(),
                    streaming: true,
                    responseId: responseId,
                    textLength: accumulatedText.length,
                    preview: accumulatedText.substring(0, 200)
                };

                try {
                    await fs.promises.appendFile(logPath, JSON.stringify(debugInfo, null, 2) + '\n');
                } catch (logError) {
                    console.error('Failed to write debug log:', logError);
                }

                resolve({
                    output_text: accumulatedText,
                    response_id: responseId
                });
            });

            // Listen for errors
            stream.on('error', async (error: any) => {
                console.error('OpenAI Streaming Error:', error);
                try {
                    await fs.promises.appendFile(logPath, `STREAMING ERROR: ${error.message}\n${error.stack}\n`);
                } catch (logError) {
                    console.error('Failed to write error log:', logError);
                }
                reject(new Error('Failed to fetch streaming response from OpenAI'));
            });

        } catch (error: any) {
            console.error('OpenAI API Error:', error);
            fs.promises.appendFile(logPath, `ERROR: ${error.message}\n${error.stack}\n`).catch(logError => {
                console.error('Failed to write error log:', logError);
            });
            reject(new Error('Failed to fetch response from OpenAI'));
        }
    });
}

export async function extractMemories(
    apiKey: string,
    userMessage: string,
    model: string = 'gpt-4o-mini'
): Promise<string[]> {
    try {
        const client = new OpenAI({
            apiKey: apiKey,
            dangerouslyAllowBrowser: false
        });

        const prompt = `You are a memory extraction assistant. Your job is to identify durable, long-term facts about the user from their message.

User Message: "${userMessage}"

Rules:
1. Extract facts like preferences, goals, locations, tools used, or personal background.
2. Ignore ephemeral information (emotions, current hunger, temporary tasks).
3. Do NOT extract sensitive info like passwords, API keys, or direct secrets.
4. Keep facts concise and atomic.
5. Identify if the fact is "General" (about the user's life/identity) or "Specific" (about a particular task/project).
6. Return a JSON object with a "facts" array, where each fact is an object: { "content": "fact text", "type": "general" | "specific" }.

Example Output:
{
  "facts": [
    { "content": "User prefers TypeScript over JavaScript", "type": "general" },
    { "content": "This project uses the OpenAI responses API", "type": "specific" }
  ]
}

If no new facts are found, return {"facts": []}.`;

        const response = await client.chat.completions.create({
            model: model,
            messages: [{ role: 'system', content: prompt }],
            response_format: { type: 'json_object' }
        });

        const content = response.choices[0].message.content;
        console.log('AI Memory Extraction RAW:', content);
        if (!content) return [];

        const parsed = JSON.parse(content);
        const facts = parsed.facts || [];
        console.log(`Extracted ${facts.length} facts`);
        return facts;
    } catch (error) {
        console.error('Error extracting memories:', error);
        return [];
    }
}
