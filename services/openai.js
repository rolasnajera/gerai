const { OpenAI } = require('openai');

const fs = require('fs');
const path = require('path');

async function getOpenAIResponse(apiKey, input, model = 'gpt-5-mini', instructions, previousResponseId) {
    try {
        console.log('--- OpenAI Request ---');
        console.log('Model:', model);
        console.log('Input:', input);
        if (previousResponseId) console.log('Previous Response ID:', previousResponseId);

        const client = new OpenAI({
            apiKey: apiKey,
            dangerouslyAllowBrowser: false
        });

        const params = {
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

        const response = await client.responses.create(params);

        // Debug logging to file
        const logPath = path.resolve(__dirname, '../openai_debug.log');
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
    } catch (error) {
        console.error('OpenAI API Error:', error);
        const logPath = path.resolve(__dirname, '../openai_debug.log');
        fs.appendFileSync(logPath, `ERROR: ${error.message}\n${error.stack}\n`);
        throw new Error('Failed to fetch response from OpenAI');
    }
}

module.exports = { getOpenAIResponse };
