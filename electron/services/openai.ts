import { OpenAI } from 'openai';
import fs from 'fs';
import path from 'path';

interface OpenAIResponseResult {
    output_text: string;
    response_id?: string;
}

export async function getOpenAIResponse(
    apiKey: string,
    input: string,
    model: string = 'gpt-5-mini',
    instructions?: string,
    previousResponseId?: string
): Promise<OpenAIResponseResult> {
    try {
        console.log('--- OpenAI Request ---');
        console.log('Model:', model);
        console.log('Input:', input);
        if (previousResponseId) console.log('Previous Response ID:', previousResponseId);

        const client = new OpenAI({
            apiKey: apiKey,
            dangerouslyAllowBrowser: false
        });

        // Use 'any' type for params if 'responses.create' types are not fully defined for this beta feature in the current SDK version types
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

        // Assuming 'responses' property exists on client. If strict types fail, we might need cast.
        // @ts-ignore
        const response = await client.responses.create(params) as any;

        // Debug logging to file
        const logPath = path.resolve(__dirname, '../../openai_debug.log'); // adjusted path since we are in electron/services
        const debugInfo = {
            timestamp: new Date().toISOString(),
            responseKeys: Object.keys(response),
            responseId: response.response_id,
            id: response.id,
            output_text: response.output_text
        };
        fs.appendFileSync(logPath, JSON.stringify(debugInfo, null, 2) + '\n');

        console.log('--- OpenAI Response ---');
        console.log('ID:', response.response_id || response.id);
        console.log('Output:', response.output_text);

        return {
            output_text: response.output_text,
            response_id: response.response_id || response.id
        };
    } catch (error: any) {
        console.error('OpenAI API Error:', error);
        // adjusted path
        const logPath = path.resolve(__dirname, '../../openai_debug.log');
        fs.appendFileSync(logPath, `ERROR: ${error.message}\n${error.stack}\n`);
        throw new Error('Failed to fetch response from OpenAI');
    }
}
