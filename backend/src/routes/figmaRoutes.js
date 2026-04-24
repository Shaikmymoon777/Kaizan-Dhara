const express = require('express');
const router = express.Router();
const figmaController = require('../controllers/figmaController');

router.get('/files/:fileKey', figmaController.getFigmaFile);

module.exports = router;
