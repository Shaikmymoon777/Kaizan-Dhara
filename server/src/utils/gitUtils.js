const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const util = require("util");

const execPromise = util.promisify(exec);

// Helper to run command and capture output/error
const runGit = async (command, cwd) => {
    try {
        const { stdout, stderr } = await execPromise(command, {
            cwd,
            env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
        });
        return stdout;
    } catch (error) {
        // Enriched error message with stderr
        const stderrMsg = error.stderr ? error.stderr.toString().trim() : '';
        const stdoutMsg = error.stdout ? error.stdout.toString().trim() : '';
        throw new Error(`Command failed: ${command}\nError: ${stderrMsg || error.message}\nOutput: ${stdoutMsg}`);
    }
};

const setupGitRepo = async (repoPath, repoUrl, githubToken = null) => {
    try {
        if (!fs.existsSync(repoPath)) {
            fs.mkdirSync(repoPath, { recursive: true });
        }

        // Construct authenticated URL if token is present
        let authUrl = repoUrl;
        if (githubToken) {
            // Clean up the URL to handle various formats (HTTPS, SSH, etc.)
            let cleanUrl = repoUrl.trim();

            // Remove protocol prefixes
            cleanUrl = cleanUrl.replace(/^https?:\/\//, '');
            cleanUrl = cleanUrl.replace(/^git@/, '');

            // Converts SSH format (github.com:user/repo) to slash format (github.com/user/repo)
            // But only if it looks like domain:path
            if (cleanUrl.includes(':') && !cleanUrl.includes('://')) {
                cleanUrl = cleanUrl.replace(':', '/');
            }

            authUrl = `https://${githubToken}@${cleanUrl}`;
        }

        // Initialize git if not present
        if (!fs.existsSync(path.join(repoPath, ".git"))) {
            await runGit("git init", repoPath);
            await runGit(`git remote add origin ${authUrl}`, repoPath);
        } else {
            // Ensure remote url is correct
            try {
                await runGit(`git remote set-url origin ${authUrl}`, repoPath);
            } catch (e) {
                await runGit(`git remote add origin ${authUrl}`, repoPath);
            }
        }

        // Configure git user if not set
        try {
            await runGit("git config user.name", repoPath);
        } catch {
            await runGit('git config user.name "Kaizen Dhara Agent"', repoPath);
            await runGit('git config user.email "agent@kaizendhara.com"', repoPath);
        }

        // Fetch to ensure we have latest history
        try {
            await runGit("git fetch origin", repoPath);
            // Try to pull if branch exists, otherwise ignore
            try {
                // Check if main or master exists
                const stdout = await runGit("git ls-remote --heads origin", repoPath);
                if (stdout.includes("refs/heads/main")) {
                    await runGit("git pull origin main --rebase", repoPath);
                } else if (stdout.includes("refs/heads/master")) {
                    await runGit("git pull origin master --rebase", repoPath);
                }
            } catch (pullError) {
                console.warn("Git pull failed (might be empty repo):", pullError.message);
            }

        } catch (fetchError) {
            console.warn("Git fetch failed (might be new repo):", fetchError.message);
        }

    } catch (error) {
        throw new Error(`Git setup failed: ${error.message}`);
    }
};

const commitAndPush = async (repoPath, message) => {
    try {
        await runGit("git add .", repoPath);

        // Check if there are changes to commit
        try {
            await runGit('git diff-index --quiet HEAD', repoPath);
            console.log("No changes to commit.");
            return "No changes";
        } catch (e) {
            // Changes exist, proceed to commit
        }

        await runGit(`git commit -m "${message}"`, repoPath);

        // Determine branch name (main or master)
        let branch = "main";
        try {
            const stdout = await runGit("git branch --show-current", repoPath);
            branch = stdout.trim() || "main";
        } catch (e) {
            // fallback
        }

        // Push
        await runGit(`git push -u origin ${branch}`, repoPath);

        // Get commit hash
        const stdout = await runGit("git rev-parse HEAD", repoPath);
        return stdout.trim();

    } catch (error) {
        throw new Error(`Git commit/push failed: ${error.message}`);
    }
};

module.exports = { setupGitRepo, commitAndPush };
