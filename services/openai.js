const OpenAI = require('openai');

async function getOpenAIResponse(apiKey, messages, model = 'gpt-5-mini') {
    try {
        console.log('--- OpenAI Request ---');
        console.log('Model:', model);
        console.log('Messages:', JSON.stringify(messages, null, 2));

        const openai = new OpenAI({
            apiKey: apiKey,
            dangerouslyAllowBrowser: false
        });

        const completion = await openai.chat.completions.create({
            model: model,
            messages: messages,
        });

        console.log('--- OpenAI Response ---');
        console.log('ID:', completion.id);
        console.log('Usage:', completion.usage);

        return completion.choices[0].message.content;
    } catch (error) {
        console.error('OpenAI API Error:', error);
        throw new Error('Failed to fetch response from OpenAI');
    }
}

module.exports = { getOpenAIResponse };
