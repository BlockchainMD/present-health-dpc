import { NextRequest, NextResponse } from 'next/server';
import { captureEmail, getSession } from '@/lib/assessment/session';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Honeypot check
  if (body.hp && typeof body.hp === 'string' && body.hp.trim() !== '') {
    return NextResponse.json({ ok: true });
  }

  const token = typeof body.token === 'string' ? body.token.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : undefined;

  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 });

  const session = await getSession(token);
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  if (session.status !== 'COMPLETED') {
    return NextResponse.json({ error: 'Session not completed' }, { status: 400 });
  }
  if (session.capturedAt) {
    return NextResponse.json({ error: 'Email already captured for this session' }, { status: 400 });
  }

  try {
    const { leadId, profileId } = await captureEmail(token, email, firstName);

    return NextResponse.json({
      ok: true,
      leadId,
      profileId,
      summary: session.aiSummary,
      doctorFlags: session.doctorFlags,
      recommendedSlugs: session.recommendedSlugs,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to capture email';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
