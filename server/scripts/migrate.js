require('dotenv').config();
const { execSync } = require('child_process');

try {
    console.log('Running prisma db push...');
    // Pass process.env to the child process
    execSync('npx prisma db push', { stdio: 'inherit', env: process.env });
    console.log('Running prisma generate...');
    execSync('npx prisma generate', { stdio: 'inherit', env: process.env });
} catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
}
