const express = require('express');
const router = express.Router();
const githubController = require('../controllers/githubController');
const authMiddleware = require('../middleware/authMiddleware');

// Protected route to deploy to GitHub
router.post('/deploy', authMiddleware, githubController.deployToGithub);

module.exports = router;
