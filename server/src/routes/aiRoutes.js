const express = require('express');
const { generateContent } = require('../controllers/aiController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Protect AI routes - only authenticated users can use the API
// router.use(authMiddleware);

router.post('/generate', generateContent);

module.exports = router;
