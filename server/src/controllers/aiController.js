const { GoogleGenAI } = require('@google/genai');

const generateContent = async (req, res) => {
    try {
        const { model, contents, config } = req.body;
        const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null;

        if (!apiKey || apiKey.includes('dummy')) {
            console.error('API Key is missing or invalid in backend env. Current key starts with:', apiKey ? apiKey.substring(0, 4) : 'null');
            return res.status(500).json({ error: 'Server API key not configured correctly' });
        }

        console.log('Using API Key (trimmed) starting with:', apiKey.substring(0, 4), 'Length:', apiKey.length);

        const ai = new GoogleGenAI({ apiKey });
        // Revert to stable gemini-2.5-flash as gemini-1.5-flash is not found in this environment
        const modelName = model || 'gemini-2.5-flash';

        console.log(`Forwarding AI request to ${modelName} via unified SDK...`);

        const response = await ai.models.generateContent({
            model: modelName,
            contents: contents,
            config: config || {}
        });

        console.log('AI response received successfully');
        res.json({ text: response.text });




    } catch (error) {
        console.error('AI Generation Error:', error);
        // Handle overload/429 specifically if possible
        if (error.message && error.message.includes('429')) {
            return res.status(429).json({ error: 'Rate limit exceeded' });
        }
        res.status(500).json({ error: 'AI Generation Failed: ' + error.message });
    }
};

module.exports = { generateContent };
