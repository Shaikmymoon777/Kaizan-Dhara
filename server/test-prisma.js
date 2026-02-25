console.log('Testing Prisma load...');
try {
    const { PrismaClient } = require('@prisma/client');
    console.log('PrismaClient found, instantiating...');
    const prisma = new PrismaClient();
    console.log('Prisma instantiated successfully');
    process.exit(0);
} catch (err) {
    console.error('Error loading Prisma:', err);
    process.exit(1);
}
