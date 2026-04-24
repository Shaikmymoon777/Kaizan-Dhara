const axios = require('axios');

const getFigmaFile = async (req, res) => {
    try {
        const { fileKey } = req.params;
        const accessToken = process.env.FIGMA_PERSONAL_ACCESS_TOKEN;

        if (!accessToken) {
            return res.status(500).json({ error: 'Figma Access Token not configured on server' });
        }

        console.log(`Fetching Figma file: ${fileKey}`);

        const response = await axios.get(`https://api.figma.com/v1/files/${fileKey}`, {
            headers: {
                'X-Figma-Token': accessToken
            }
        });

        res.json(response.data);
    } catch (error) {
        const status = error.response?.status || 500;
        const apiError = error.response?.data?.message || error.message;
        
        console.error(`[Figma API Error] Status: ${status} | Message: ${apiError}`);
        
        let userMessage = 'Failed to fetch Figma file';
        if (status === 401) userMessage = 'Invalid Figma Access Token. Please check your .env file.';
        if (status === 404) userMessage = 'Figma file not found. Check if the URL is correct and the file is public or shared with your token.';
        if (status === 403) userMessage = 'Forbidden: Your token doesn\'t have access to this Figma file.';
        
        res.status(status).json({ 
            error: userMessage,
            details: apiError
        });
    }
};

module.exports = { getFigmaFile };
