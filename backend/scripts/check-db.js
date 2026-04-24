const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Database Check ---');
    const userCount = await prisma.user.count();
    console.log('Total Users:', userCount);

    const projectCount = await prisma.project.count();
    console.log('Total Projects:', projectCount);

    const users = await prisma.user.findMany({
        include: { _count: { select: { projects: true } } }
    });
    console.log('Users and project counts:', JSON.stringify(users, null, 2));

    const projects = await prisma.project.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' }
    });
    console.log('Recent projects:', JSON.stringify(projects, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
