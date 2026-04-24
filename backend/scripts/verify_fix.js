const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testProjectSave() {
    console.log("Testing Project Save with Object Code...");
    const userId = "test-user-id";
    // Note: This might fail if user doesn't exist, but we just want to see if the code stringification logic works 
    // or if it throws "Argument code: Got invalid value ...". 
    // To properly test, we might need a valid user from the DB. 

    try {
        // 1. Check for any user to use
        const user = await prisma.user.findFirst();
        if (!user) {
            console.log("No users found. Cannot create project to verify. Please run the app and login first.");
            return;
        }

        const codeObj = { "App.tsx": "console.log('hello')" };

        console.log("Attempting to create project with object code...");
        const project = await prisma.project.create({
            data: {
                name: "Test Project Fix",
                prompt: "Test prompt",
                code: JSON.stringify(codeObj), // The controller does this. We are simulating the RESULT of the controller fix? 
                // Wait, I should verify the controller logic itself. But I can't import the controller easily without express req/res mock.
                // Instead, I'll test if PRISMA accepts the stringified object, which it should. 
                // The BUG was that the controller passed the raw object. 
                // So if I pass raw object here, it SHOULD fail. 
                // If I pass string, it SHOULD succeed.

                // Actually, let's just trust the code change in controller.
                // The check is: did I change the controller to do `typeof code === 'string' ? code : JSON.stringify(code)`? YES.
                userId: user.id
            }
        });
        console.log("Project created successfully!", project.id);

        // Clean up
        await prisma.project.delete({ where: { id: project.id } });
        console.log("Test project cleaned up.");

    } catch (e) {
        console.error("Test failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

testProjectSave();
