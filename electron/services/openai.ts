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
            stream.on('response.completed', (event: any) => {
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
                fs.appendFileSync(logPath, JSON.stringify(debugInfo, null, 2) + '\n');

                resolve({
                    output_text: accumulatedText,
                    response_id: responseId
                });
            });

            // Listen for errors
            stream.on('error', (error: any) => {
                console.error('OpenAI Streaming Error:', error);
                fs.appendFileSync(logPath, `STREAMING ERROR: ${error.message}\n${error.stack}\n`);
                reject(new Error('Failed to fetch streaming response from OpenAI'));
            });

        } catch (error: any) {
            console.error('OpenAI API Error:', error);
            fs.appendFileSync(logPath, `ERROR: ${error.message}\n${error.stack}\n`);
            reject(new Error('Failed to fetch response from OpenAI'));
        }
    });
}
