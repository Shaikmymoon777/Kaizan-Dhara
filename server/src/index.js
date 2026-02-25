console.log('Loading environment...');
require('dotenv').config();
console.log('Loading express...');
const express = require('express');
console.log('Loading cors...');
const cors = require('cors');
console.log('Loading auth routes...');
const authRoutes = require('./routes/authRoutes');
console.log('Loading project routes...');
const projectRoutes = require('./routes/projectRoutes');
const githubRoutes = require('./routes/githubRoutes');

const app = express();
console.log('Middleware setup...');
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const aiRoutes = require('./routes/aiRoutes');

// Routes
app.use('/auth', authRoutes);
app.use('/api', projectRoutes);
app.use('/ai', aiRoutes);
app.use('/github', githubRoutes);

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

app.get('/debug/env', (req, res) => {
    const key = process.env.GEMINI_API_KEY;
    res.json({
        keyPresent: !!key,
        keyPrefix: key ? key.substring(0, 4) : 'none',
        keyLength: key ? key.length : 0,
        charCodes: key ? Array.from(key).map(c => c.charCodeAt(0)) : [],
        envPath: process.cwd()
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
}).on('error', (err) => {
    console.error('Server startup error:', err);
});
