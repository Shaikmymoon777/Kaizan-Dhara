const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { setupGitRepo, commitAndPush } = require("../utils/gitUtils");
const prisma = new PrismaClient();

const deployToGithub = async (req, res) => {
    const { projectId, repoUrl, deployScope = 'project', commitMessage, githubToken } = req.body;

    if (!projectId || !repoUrl) {
        return res.status(400).json({ error: "Missing required deployment parameters" });
    }

    let tempDir = null;

    try {
        // 1. Fetch project from database
        const project = await prisma.project.findUnique({
            where: { id: projectId },
        });

        if (!project) {
            return res.status(404).json({ error: "Project not found" });
        }

        // 2. Prepare Code/Files based on Scope
        let filesToWrite = {};

        // ... (existing logic for file preparation) ...
        const safeParse = (data) => {
            try { return typeof data === 'string' ? JSON.parse(data) : data; } catch (e) { return null; }
        };

        const requirements = safeParse(project.requirements);
        const design = safeParse(project.design);
        const tests = safeParse(project.tests);

        if (deployScope === 'project') {
            // ...
            if (requirements) {
                filesToWrite["artifacts/requirements.json"] = JSON.stringify(requirements, null, 2);
                if (requirements.userStories) {
                    const storiesMd = requirements.userStories.map(s => `- ${s}`).join("\n");
                    filesToWrite["docs/USER_STORIES.md"] = `# User Stories\n\n${storiesMd}`;
                }
            }
            if (design) {
                filesToWrite["artifacts/design.json"] = JSON.stringify(design, null, 2);
                if (design.architecture) filesToWrite["docs/ARCHITECTURE.md"] = design.architecture;
            }
            if (tests) filesToWrite["artifacts/tests.json"] = JSON.stringify(tests, null, 2);
            if (project.code) {
                if (typeof project.code === 'string') {
                    try { Object.assign(filesToWrite, JSON.parse(project.code)); } catch { filesToWrite["App.tsx"] = project.code; }
                } else { Object.assign(filesToWrite, project.code); }
            } else {
                return res.status(400).json({ error: "Project has no code to deploy" });
            }

        } else if (deployScope === 'stage') {
            const currentStep = project.currentStep;
            // ... existing stage logic (omitted for brevity, assume unchanged unless we want to copy it all)
            // Actually I should copy it all to be safe or use a smarter replace. 
            // Since I can't use "..." in replacement, I will try to target just the start and end of the function or the relevant block.

            // RE-WRITING THE TARGET BLOCK ONLY
            if (currentStep === 1 && requirements) {
                filesToWrite["requirements.json"] = JSON.stringify(requirements, null, 2);
                const storiesMd = requirements.userStories?.map(s => `- ${s}`).join("\n") || "";
                filesToWrite["USER_STORIES.md"] = `# User Stories\n\n${storiesMd}`;
            } else if (currentStep === 2 && design) {
                filesToWrite["design.json"] = JSON.stringify(design, null, 2);
                if (design.architecture) filesToWrite["ARCHITECTURE.md"] = design.architecture;
            } else if (currentStep === 3 && project.code) {
                if (typeof project.code === 'string') {
                    try { Object.assign(filesToWrite, JSON.parse(project.code)); } catch { filesToWrite["App.tsx"] = project.code; }
                } else { Object.assign(filesToWrite, project.code); }
            } else if (currentStep === 4 && tests) {
                filesToWrite["tests.json"] = JSON.stringify(tests, null, 2);
                if (tests.testCases) {
                    filesToWrite["TEST_REPORT.md"] = `# Test Report\n\n${tests.testCases.map(t => `- [x] ${t}`).join('\n')}`;
                }
            } else if (currentStep === 5) {
                if (requirements) filesToWrite["requirements.json"] = JSON.stringify(requirements, null, 2);
                if (design) filesToWrite["design.json"] = JSON.stringify(design, null, 2);
                if (tests) filesToWrite["tests.json"] = JSON.stringify(tests, null, 2);
                if (project.code) {
                    if (typeof project.code === 'string') {
                        try { Object.assign(filesToWrite, JSON.parse(project.code)); } catch { filesToWrite["App.tsx"] = project.code; }
                    } else { Object.assign(filesToWrite, project.code); }
                }
            } else {
                return res.status(400).json({ error: "Nothing to deploy for current stage" });
            }
        }

        if (Object.keys(filesToWrite).length === 0) {
            return res.status(400).json({ error: "No files generated to deploy." });
        }

        // 3. Create Temp Directory and Setup Git
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kaizen-deploy-'));
        await setupGitRepo(tempDir, repoUrl, githubToken);

        // 4. Write files
        for (const [filePath, content] of Object.entries(filesToWrite)) {
            const fullPath = path.join(tempDir, filePath);
            const dir = path.dirname(fullPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(fullPath, content);
        }

        // 5. Commit and Push
        const finalMessage = commitMessage || `Deploying ${deployScope} from Kaizen Dhara (Step ${project.currentStep})`;
        const commitSha = await commitAndPush(tempDir, finalMessage);

        // 6. Update project in DB
        await prisma.project.update({
            where: { id: projectId },
            data: { githubUrl: repoUrl },
        });

        // Cleanup
        try {
            fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (e) {
            console.warn("Failed to clean up temp dir:", e.message);
        }

        res.json({ success: true, url: repoUrl, commit: commitSha });

    } catch (error) {
        console.error("GitHub Deployment Error:", error);
        // Attempt cleanup
        if (tempDir) {
            try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch { }
        }
        res.status(500).json({
            error: "GitHub Deployment Failed",
            details: error.message
        });
    }
};

module.exports = { deployToGithub };
