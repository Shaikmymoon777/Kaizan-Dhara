const { GoogleGenAI } = require('@google/genai');
const dotenv = require('dotenv');
dotenv.config();

async function test() {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log('API Key present:', !!apiKey);

    try {
        const client = new GoogleGenAI({ apiKey });
        console.log('Client keys:', Object.keys(client));
        if (client.models) {
            console.log('client.models keys:', Object.keys(client.models));
        }
    } catch (err) {
        console.error('Error during init:', err);
    }
}

test();
