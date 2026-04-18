const express = require('express');
const router = express.Router();
const githubController = require('./githubController');                      // same folder
const authMiddleware = require('../../../server/src/middleware/authMiddleware'); // ../../.. → project root → server/src/middleware

// Protected route to deploy to GitHub
router.post('/deploy', authMiddleware, githubController.deployToGithub);

module.exports = router;
