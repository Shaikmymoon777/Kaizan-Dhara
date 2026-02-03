import { Sequelize } from 'sequelize';
import path from 'path';

// Use SQLite
// Vercel serverless functions are read-only except for /tmp
const isVercel = process.env.VERCEL === '1';
const dbPath = isVercel
    ? path.join('/tmp', 'database.sqlite')
    : path.resolve(__dirname, '..', '..', 'database.sqlite'); // Corrected path for local dev

console.log(`Database storage path: ${dbPath}`);

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: false,
});

export default sequelize;
