import express, { Request, Response } from 'express';
import { Project, History, Preferences } from './models';

const router = express.Router();

// --- Projects ---
// Save current project (upsert)
router.post('/project/current', async (req: Request, res: Response) => {
    try {
        const { id, name, prompt, ...rest } = req.body;

        if (!id) {
            res.status(400).json({ error: 'Project ID is required' });
            return;
        }

        // We store the "rest" (design, code, etc) in the 'data' JSON field
        // But for the main 'Project' model we might just want to store it simply.
        // However, the frontend sends the whole SDLCProject object.

        // Check if exists
        let project = await Project.findByPk(id);
        const dataStr = JSON.stringify(rest); // requirements, design, code, tests...

        if (project) {
            project.name = name || project.name;
            project.prompt = prompt || project.prompt;
            project.data = dataStr;
            await project.save();
        } else {
            project = await Project.create({
                id,
                name: name || 'Untitled Project',
                prompt: prompt || '',
                data: dataStr
            });
        }

        // Also update "Current Project" pointer? 
        // Actually, the frontend just wants to "Save Current Project".
        // We can use a special ID or just rely on the client to send the ID.
        // The client uses `saveCurrentProject` which persists "current work in progress".
        // Let's treat this endpoint as "Save generic project state".

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to save project' });
    }
});

router.get('/project/:id', async (req: Request, res: Response) => {
    try {
        const project = await Project.findByPk(req.params.id);
        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        // Reconstruct SDLCProject
        const data = JSON.parse(project.data);
        const fullProject = {
            id: project.id,
            name: project.name,
            prompt: project.prompt,
            ...data
        };

        res.json(fullProject);
    } catch (e) {
        res.status(500).json({ error: 'Error fetching project' });
    }
});


// --- History ---
router.get('/history', async (req: Request, res: Response) => {
    try {
        const history = await History.findAll({ order: [['timestamp', 'DESC']], limit: 50 });
        const historyItems = history.map(h => ({
            id: h.id,
            projectId: h.projectId,
            prompt: h.prompt,
            name: h.name,
            preview: h.preview,
            timestamp: h.timestamp,
            project: JSON.parse(h.projectData)
        }));
        res.json(historyItems);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

router.post('/history', async (req: Request, res: Response) => {
    try {
        const item = req.body;
        // item matches HistoryItem interface
        await History.create({
            id: item.id,
            projectId: item.project.id,
            prompt: item.prompt,
            name: item.name,
            preview: item.preview,
            timestamp: item.timestamp,
            projectData: JSON.stringify(item.project)
        });
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to save history' });
    }
});

router.delete('/history/:id', async (req: Request, res: Response) => {
    try {
        await History.destroy({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete history item' });
    }
});

router.delete('/history', async (req: Request, res: Response) => {
    try {
        await History.destroy({ where: {}, truncate: true });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to clear history' });
    }
});


// --- Preferences ---
router.get('/preferences', async (req: Request, res: Response) => {
    try {
        const pref = await Preferences.findByPk('user_default');
        if (pref) {
            const settings = JSON.parse(pref.settings);
            res.json({ ...settings, theme: pref.theme });
        } else {
            // Default
            res.json({
                theme: 'ocean',
                historyLimit: 50,
                autoSave: true
            });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch preferences' });
    }
});

router.post('/preferences', async (req: Request, res: Response) => {
    try {
        const { theme, ...settings } = req.body;
        const [pref, created] = await Preferences.findOrCreate({
            where: { key: 'user_default' },
            defaults: { theme, settings: JSON.stringify(settings) }
        });

        if (!created) {
            pref.theme = theme;
            pref.settings = JSON.stringify(settings);
            await pref.save();
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save preferences' });
    }
});

export default router;
