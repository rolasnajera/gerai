const axios = require('axios');

async function getOpenAIResponse(apiKey, messages, model = 'gpt-5-mini') {
    try {
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
        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('OpenAI API Error:', error.response?.data || error.message);
        throw new Error('Failed to fetch response from OpenAI');
    }
}

module.exports = { getOpenAIResponse };
