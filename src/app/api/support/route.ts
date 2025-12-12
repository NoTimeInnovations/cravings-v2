import { NextResponse } from 'next/server';
import { sendSupportEmail } from '@/lib/email';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, email, subject, message } = body;

        if (!name || !email || !subject || !message) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        await sendSupportEmail({ name, email, subject, message });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Support email API error:', error);
        return NextResponse.json(
            { error: 'Failed to send message' },
            { status: 500 }
        );
    }
}
