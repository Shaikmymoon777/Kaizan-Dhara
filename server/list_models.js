
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error('Missing API Key');
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function list() {
    try {
        const models = await ai.models.list();
        // Iterate through the async iterator for models
        for await (const model of models) {
            // Assuming model has a property 'name' - check docs or log keys if this fails
            const name = model.name;
            if (name.includes('2.5')) {
                console.log(name);
            }
            if (name.includes('lite')) {
                console.log(name);
            }
        }
    } catch (e) {
        console.error(e);
    }
}

list();
