const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

async function testGit() {
    console.log("Testing Git execution...");
    try {
        const { stdout } = await execPromise("git --version");
        console.log("Git Version:", stdout.trim());
    } catch (e) {
        console.error("Git not found or failed:", e.message);
        return;
    }

    console.log("Testing Auth Failure handling...");
    try {
        // Try to list refs from a non-existent or private repo with bad token
        // Using a known public repo but with bad auth in URL to see behavior
        const badUrl = "https://badtoken@github.com/github/gitignore.git";
        // Set timeout to prevent indefinitely hanging
        const { stdout } = await execPromise(`git ls-remote ${badUrl}`, {
            env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
            timeout: 5000
        });
        console.log("Unexpected Success:", stdout);
    } catch (e) {
        console.log("Expected Failure caught.");
        console.log("Error Message:", e.message);
        console.log("Stderr:", e.stderr ? e.stderr.toString() : "null");
    }
}

testGit();
