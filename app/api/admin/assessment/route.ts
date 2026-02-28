import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/authz';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

function clampInt(value: unknown, fallback: number, min: number, max: number) {
  const n = typeof value === 'string' ? Number.parseInt(value, 10) : Number.isFinite(value) ? (value as number) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function maskEmail(email: string | null | undefined) {
  if (!email) return null;
  const [user, domain] = email.split('@');
  if (!domain) return email;
  return `${user.slice(0, 2)}***@${domain}`;
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const view = searchParams.get('view') || 'sessions';
  const page = clampInt(searchParams.get('page'), 1, 1, 1000);
  const pageSize = 25;
  const skip = (page - 1) * pageSize;

  try {
    if (view === 'sessions') {
      const [total, rows] = await Promise.all([
        prisma.assessmentSession.count(),
        prisma.assessmentSession.findMany({
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            token: true,
            cluster: true,
            status: true,
            signals: true,
            email: true,
            firstName: true,
            leadId: true,
            createdAt: true,
            completedAt: true,
            capturedAt: true,
          },
        }),
      ]);

      return NextResponse.json({
        view: 'sessions',
        total,
        page,
        pageSize,
        rows: rows.map((r) => ({
          ...r,
          email: maskEmail(r.email),
          token: r.token.slice(0, 8) + '…',
          signalCount: r.signals.length,
          signals: undefined,
        })),
      });
    }

    if (view === 'profiles') {
      const [total, rows] = await Promise.all([
        prisma.healthProfile.count(),
        prisma.healthProfile.findMany({
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            firstName: true,
            leadId: true,
            signals: true,
            activeClusters: true,
            sessionCount: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
      ]);

      return NextResponse.json({
        view: 'profiles',
        total,
        page,
        pageSize,
        rows: rows.map((r) => ({
          ...r,
          email: maskEmail(r.email),
          signalCount: r.signals.length,
          signals: undefined,
        })),
      });
    }

    return NextResponse.json({ error: 'Invalid view' }, { status: 400 });
  } catch (error) {
    console.error('[AdminAssessmentAPI] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch assessment data' }, { status: 500 });
  }
}
