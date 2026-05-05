const { GoogleGenAI } = require('@google/genai');

// Fallback model chain: if primary is overloaded, try the next ones
const FALLBACK_MODELS = [
    'gemini-2.5-pro-preview-05-06',
    'gemini-1.5-pro',
    'gemini-1.5-flash'
];

const tryGenerateWithModel = async (ai, modelName, contents, config) => {
    console.log(`Forwarding AI request to ${modelName} via unified SDK...`);
    const response = await ai.models.generateContent({
        model: modelName,
        contents: contents,
        config: config || {}
    });
    console.log(`AI response received successfully from ${modelName}`);
    return response.text;
};

const generateContent = async (req, res) => {
    try {
        const { model, contents, config } = req.body;
        const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null;

        if (!apiKey || apiKey.includes('dummy')) {
            console.error('API Key is missing or invalid in backend env.');
            return res.status(500).json({ error: 'Server API key not configured correctly' });
        }

        console.log('Using API Key (trimmed) starting with:', apiKey.substring(0, 4), 'Length:', apiKey.length);

        const ai = new GoogleGenAI({ apiKey });
        const requestedModel = model || 'gemini-2.5-pro-preview-05-06';

        // Build the fallback chain: requested model first, then the fallbacks
        const modelsToTry = [requestedModel, ...FALLBACK_MODELS.filter(m => m !== requestedModel)];

        let lastError = null;
        for (const modelName of modelsToTry) {
            try {
                const text = await tryGenerateWithModel(ai, modelName, contents, config);
                return res.json({ text, modelUsed: modelName });
            } catch (err) {
                const is503 = err.status === 503 || (err.message && (err.message.includes('503') || err.message.includes('UNAVAILABLE') || err.message.includes('overloaded') || err.message.includes('high demand')));
                const is429 = err.status === 429 || (err.message && (err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED') || err.message.includes('quota')));

                if (is503 || is429) {
                    console.warn(`Model ${modelName} unavailable (${err.status || 'timeout'}), trying next fallback...`);
                    lastError = err;
                    continue; // Try next model
                }
                // Non-retryable error, throw immediately
                throw err;
            }
        }

        // All models exhausted
        console.error('All fallback models exhausted:', lastError);
        return res.status(503).json({ error: 'All AI models are currently overloaded. Please try again in a few minutes.' });

    } catch (error) {
        console.error('AI Generation Error:', error);
        if (error.message && error.message.includes('429')) {
            return res.status(429).json({ error: 'Rate limit exceeded' });
        }
        res.status(500).json({ error: 'AI Generation Failed: ' + error.message });
    }
};

module.exports = { generateContent };
