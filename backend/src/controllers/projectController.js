const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createProject = async (req, res) => {
    try {
        console.log('Received createProject request body:', JSON.stringify(req.body, null, 2));
        const { name, prompt, requirements, design, code, tests } = req.body;
        const userId = req.user.userId;

        if (!name || !prompt) {
            console.error('Validation failed: Name and prompt are required. Received:', { name, prompt });
            return res.status(400).json({ error: 'Name and prompt are required' });
        }

        const project = await prisma.project.create({
            data: {
                name,
                prompt,
                requirements: requirements ? (typeof requirements === 'string' ? requirements : JSON.stringify(requirements)) : null,
                design: design ? (typeof design === 'string' ? design : JSON.stringify(design)) : null,
                code: code ? (typeof code === 'string' ? code : JSON.stringify(code)) : null,
                tests: tests ? (typeof tests === 'string' ? tests : JSON.stringify(tests)) : null,
                userId,
            },
        });

        res.status(201).json(project);
    } catch (error) {
        console.error('Create project error:', error);
        res.status(500).json({ error: 'Failed to create project' });
    }
};

const getProjects = async (req, res) => {
    try {
        const userId = req.user.userId;
        const projects = await prisma.project.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
        });
        res.json(projects);
    } catch (error) {
        console.error('Get projects error:', error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
};

const getProject = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        const project = await prisma.project.findFirst({
            where: { id, userId },
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json(project);
    } catch (error) {
        console.error('Get project error:', error);
        res.status(500).json({ error: 'Failed to fetch project' });
    }
};

const updateProject = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const { currentStep, requirements, design, code, tests, status } = req.body;

        const project = await prisma.project.updateMany({
            where: { id, userId },
            data: {
                currentStep,
                requirements: requirements ? (typeof requirements === 'string' ? requirements : JSON.stringify(requirements)) : undefined,
                design: design ? (typeof design === 'string' ? design : JSON.stringify(design)) : undefined,
                code: code ? (typeof code === 'string' ? code : JSON.stringify(code)) : undefined,
                tests: tests ? (typeof tests === 'string' ? tests : JSON.stringify(tests)) : undefined,
                status,
            },
        });

        if (project.count === 0) {
            return res.status(404).json({ error: 'Project not found or not authorized' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Update project error:', error);
        res.status(500).json({ error: 'Failed to update project' });
    }
};

module.exports = { createProject, getProjects, getProject, updateProject };
