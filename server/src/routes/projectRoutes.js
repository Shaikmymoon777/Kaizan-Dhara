const express = require('express');
const { createProject, getProjects, getProject, updateProject } = require('../controllers/projectController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.post('/projects', createProject);
router.get('/history', getProjects); // Mapping to /history as per requirements kind of, but RESTful standard is often /projects
router.get('/projects/:id', getProject);
router.put('/projects/:id', updateProject);

module.exports = router;
