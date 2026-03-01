import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateSession, saveProgress, completeSession, computeSignals } from '@/lib/assessment/session';
import { getQuestionsForCluster } from '@/lib/assessment/questions';
import { synthesizeAssessment } from '@/lib/assessment/engine';

export const runtime = 'nodejs';

function computeNextQuestions(
  cluster: string | null,
  answers: Record<string, string[]>,
  emittedSignals: string[]
) {
  const allForCluster = getQuestionsForCluster(cluster);
  const answered = new Set(Object.keys(answers));

  return allForCluster.filter((q) => {
    if (answered.has(q.id)) return false;
    if (q.followUpForSignal && !emittedSignals.includes(q.followUpForSignal)) return false;
    return true;
  });
}

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

  const action = typeof body.action === 'string' ? body.action : '';

  // ── start ──────────────────────────────────────────────────────────────────
  if (action === 'start') {
    try {
      const cluster = typeof body.cluster === 'string' && body.cluster ? body.cluster : null;
      const articleSlug = typeof body.articleSlug === 'string' && body.articleSlug ? body.articleSlug : null;

      const session = await getOrCreateSession();

      if (cluster || articleSlug) {
        await prisma.assessmentSession.update({
          where: { token: session.token },
          data: {
            ...(cluster ? { cluster } : {}),
            ...(articleSlug ? { articleSlug } : {}),
          },
        });
      }

      const questions = getQuestionsForCluster(cluster);

      return NextResponse.json({ token: session.token, questions });
    } catch (err) {
      console.error('[Assessment] start error:', err);
      return NextResponse.json({ error: 'Failed to start assessment' }, { status: 500 });
    }
  }

  // ── answer ─────────────────────────────────────────────────────────────────
  if (action === 'answer') {
    try {
      const token = typeof body.token === 'string' ? body.token : null;
      if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

      const rawAnswers = body.answers;
      if (!rawAnswers || typeof rawAnswers !== 'object' || Array.isArray(rawAnswers)) {
        return NextResponse.json({ error: 'Invalid answers' }, { status: 400 });
      }

      const answers: Record<string, string[]> = {};
      for (const [k, v] of Object.entries(rawAnswers as Record<string, unknown>)) {
        if (Array.isArray(v)) {
          answers[k] = v.filter((x): x is string => typeof x === 'string');
        }
      }

      const signals = computeSignals(answers);
      await saveProgress(token, answers, signals);

      const session = await prisma.assessmentSession.findUnique({
        where: { token },
        select: { cluster: true },
      });

      const nextQuestions = computeNextQuestions(session?.cluster ?? null, answers, signals);

      return NextResponse.json({ signals, nextQuestions });
    } catch (err) {
      console.error('[Assessment] answer error:', err);
      return NextResponse.json({ error: 'Failed to save answers' }, { status: 500 });
    }
  }

  // ── complete ───────────────────────────────────────────────────────────────
  if (action === 'complete') {
    try {
      const token = typeof body.token === 'string' ? body.token : null;
      if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

      const session = await prisma.assessmentSession.findUnique({ where: { token } });

      if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      if (session.status === 'CAPTURED') {
        return NextResponse.json({ error: 'Session already captured' }, { status: 400 });
      }

      // Return existing preview if already completed
      if (session.status === 'COMPLETED' && session.aiSummary) {
        return NextResponse.json({
          preview: session.aiSummary.slice(0, 80),
          doctorFlagCount: session.doctorFlags.length,
        });
      }

      const result = await synthesizeAssessment({
        signals: session.signals,
        cluster: session.cluster,
        articleSlug: session.articleSlug,
      });

      await completeSession(token, result);

      return NextResponse.json({
        preview: result.summary.slice(0, 80),
        doctorFlagCount: result.doctorFlags.length,
      });
    } catch (err) {
      console.error('[Assessment] complete error:', err);
      return NextResponse.json({ error: 'Failed to complete assessment' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
