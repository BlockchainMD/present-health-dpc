const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Starting registration test...');

        const email = `test-${Date.now()}@example.com`;
        const password = 'password123';
        const firstName = 'Test';
        const lastName = 'User';

        console.log('Hashing password...');
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('Password hashed.');

        console.log('Creating user...');
        const user = await prisma.user.create({
            data: {
                name: `${firstName} ${lastName}`,
                email,
                password: hashedPassword,
            },
        });

        console.log('User created successfully:', user.id);
    } catch (e) {
        console.error('Registration test failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
