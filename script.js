require('dotenv').config();
const axios = require('axios');

console.log("API Key:", process.env.OPENAI_API_KEY);

async function translateText(text, targetLanguage) {
    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-3.5-turbo-0125',
                messages: [
                    { role: 'system', content: `You are a helpful assistant that translates text to ${targetLanguage}.` },
                    { role: 'user', content: `Translate the following text to ${targetLanguage}: "${text}"` },
                ],
                max_tokens: 100,
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const translation = response.data.choices[0].message.content.trim();
        console.log('Translation:', translation);
        return translation;
    } catch (error) {
        console.error('Error translating text:', error.response?.data || error.message);
        return text; // Return original text on error
    }
}

// Test the function
translateText("I am so happy today!", "French");
