console.log('Testing full dependency load...');
try {
    console.log('Loading bcryptjs...');
    const bcrypt = require('bcryptjs');
    console.log('Loading jsonwebtoken...');
    const jwt = require('jsonwebtoken');
    console.log('Loading prisma...');
    const { PrismaClient } = require('@prisma/client');
    console.log('Instantiating prisma...');
    const prisma = new PrismaClient();
    console.log('All loaded successfully');
    process.exit(0);
} catch (err) {
    console.error('Error loading dependencies:', err);
    process.exit(1);
}
