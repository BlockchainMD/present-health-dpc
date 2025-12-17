import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
    try {
        console.log('Starting migration...');
        const { stdout, stderr } = await execAsync('npx prisma migrate deploy');
        console.log('Migration output:', stdout);
        if (stderr) console.error('Migration stderr:', stderr);

        return NextResponse.json({
            status: 'success',
            output: stdout,
            error: stderr
        });
    } catch (error: any) {
        console.error('Migration failed:', error);
        return NextResponse.json({
            status: 'error',
            message: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
