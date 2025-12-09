const axios = require('axios');

async function getOpenAIResponse(apiKey, messages, model = 'gpt-5-mini') {
    try {
        console.log('--- OpenAI Request ---');
        console.log('Model:', model);
        console.log('Messages:', JSON.stringify(messages, null, 2));

        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: model,
                messages: messages,
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        console.log('--- OpenAI Response ---');
        console.log('Status:', response.status);
        console.log('Data:', JSON.stringify(response.data, null, 2));

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('OpenAI API Error:', error.response?.data || error.message);
        throw new Error('Failed to fetch response from OpenAI');
    }
}

module.exports = { getOpenAIResponse };
