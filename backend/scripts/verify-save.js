const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifySave() {
    const userId = "d614fc6f-db0a-4aaf-b40e-75d69c92af6c";
    console.log('Attempting to save mock project for user:', userId);

    try {
        const project = await prisma.project.create({
            data: {
                name: "Test History Project",
                prompt: "A test project to verify history fetching",
                currentStep: 5,
                status: "active",
                requirements: JSON.stringify({ userStories: ["Story 1", "Story 2"], scope: "Test Scope" }),
                design: JSON.stringify({ architecture: "Test Architecture" }),
                code: "// Test Code",
                tests: JSON.stringify({ testCases: ["Test Case 1"] }),
                userId: userId
            }
        });
        console.log('Successfully saved test project:', project.id);

        const count = await prisma.project.count({ where: { userId } });
        console.log('New project count for user:', count);
    } catch (err) {
        console.error('Failed to save test project:', err);
    }
}

verifySave()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
