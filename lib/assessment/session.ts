import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { notifyUnifiedLeadCreated } from '@/lib/notify';
import { recordConversionEvent } from '@/lib/conversion';
import type { AssessmentSession } from '@prisma/client';
import type { SynthesisResult } from './engine';
import { SIGNAL_MAP } from './signals';
import { QUESTIONS } from './questions';

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export async function getOrCreateSession(token?: string): Promise<AssessmentSession> {
  if (token) {
    const existing = await prisma.assessmentSession.findUnique({ where: { token } });
    if (existing) return existing;
  }

  return prisma.assessmentSession.create({ data: {} });
}

export async function getSession(token: string): Promise<AssessmentSession | null> {
  return prisma.assessmentSession.findUnique({ where: { token } });
}

/**
 * Compute signals from a flat answers map { questionId: [selectedOptionLabels] }
 */
export function computeSignals(answers: Record<string, string[]>): string[] {
  const signalSet = new Set<string>();

  for (const question of QUESTIONS) {
    const selectedLabels = answers[question.id];
    if (!selectedLabels || selectedLabels.length === 0) continue;

    for (const option of question.options) {
      if (selectedLabels.includes(option.label)) {
        for (const sig of option.signals) {
          signalSet.add(sig);
        }
      }
    }
  }

  return [...signalSet];
}

export async function saveProgress(
  token: string,
  answers: Record<string, string[]>,
  signals: string[]
): Promise<void> {
  await prisma.assessmentSession.update({
    where: { token },
    data: { answers, signals },
  });
}

export async function completeSession(
  token: string,
  result: SynthesisResult
): Promise<AssessmentSession> {
  const session = await prisma.assessmentSession.update({
    where: { token },
    data: {
      status: 'COMPLETED',
      aiSummary: result.summary,
      doctorFlags: result.doctorFlags,
      recommendedSlugs: result.recommendedSlugs,
      completedAt: new Date(),
    },
  });

  void recordConversionEvent({
    type: 'ASSESSMENT_COMPLETED',
    metadata: { token, cluster: session.cluster, signalCount: session.signals.length },
  });

  return session;
}

export async function captureEmail(
  token: string,
  email: string,
  firstName?: string
): Promise<{ leadId: string; profileId: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!isValidEmail(cleanEmail)) {
    throw new Error('Invalid email address');
  }

  const session = await prisma.assessmentSession.findUnique({ where: { token } });
  if (!session) throw new Error('Session not found');
  if (session.status === 'CAPTURED') throw new Error('Email already captured');
  if (session.status !== 'COMPLETED') throw new Error('Session not completed');

  // Derive clusters from signals
  const activeClusters = [
    ...new Set(session.signals.map((key) => SIGNAL_MAP[key]?.cluster).filter(Boolean)),
  ] as string[];

  // Upsert HealthProfile by email
  const profile = await prisma.healthProfile.upsert({
    where: { email: cleanEmail },
    create: {
      email: cleanEmail,
      firstName: firstName?.trim() || null,
      signals: session.signals,
      activeClusters,
      sessionCount: 1,
    },
    update: {
      firstName: firstName?.trim() || null,
      signals: { set: [...new Set([...([] as string[]), ...session.signals])] },
      activeClusters: { set: [...new Set(activeClusters)] },
      sessionCount: { increment: 1 },
    },
  });

  // Create UnifiedLead with source=ASSESSMENT
  const lead = await prisma.unifiedLead.upsert({
    where: {
      source_sourceRecordId: {
        source: 'ASSESSMENT',
        sourceRecordId: session.token,
      },
    },
    create: {
      email: cleanEmail,
      firstName: firstName?.trim() || null,
      source: 'ASSESSMENT',
      sourceRecordType: 'AssessmentSession',
      sourceRecordId: session.token,
      sourcePage: session.articleSlug || null,
      sourceMeta: {
        cluster: session.cluster,
        signalCount: session.signals.length,
        activeClusters,
      },
    },
    update: {},
  });

  // Update session
  await prisma.assessmentSession.update({
    where: { token },
    data: {
      status: 'CAPTURED',
      email: cleanEmail,
      firstName: firstName?.trim() || null,
      leadId: lead.id,
      profileId: profile.id,
      capturedAt: new Date(),
    },
  });

  // Update profile with leadId if not set
  if (!profile.leadId) {
    await prisma.healthProfile.update({
      where: { id: profile.id },
      data: { leadId: lead.id },
    });
  }

  // Send welcome email (fire-and-forget)
  void sendWelcomeEmail({
    email: cleanEmail,
    firstName: firstName?.trim() || null,
    summary: session.aiSummary || '',
    doctorFlags: session.doctorFlags,
    recommendedSlugs: session.recommendedSlugs,
  });

  // Record conversion event (also forwards to GA4 via Measurement Protocol)
  void recordConversionEvent({
    type: 'ASSESSMENT_LEAD_CAPTURED',
    leadId: lead.id,
    metadata: { token, cluster: session.cluster, signalCount: session.signals.length },
  });

  // Admin notification
  void notifyUnifiedLeadCreated(lead as any).catch(() => {});

  return { leadId: lead.id, profileId: profile.id };
}

async function sendWelcomeEmail(params: {
  email: string;
  firstName: string | null;
  summary: string;
  doctorFlags: string[];
  recommendedSlugs: string[];
}) {
  const { email, firstName, summary, doctorFlags, recommendedSlugs } = params;
  const greeting = firstName ? `Hi ${firstName},` : 'Hi there,';

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://presenthealthmd.com';
  const articleLinks = recommendedSlugs
    .map((slug) => `  - ${baseUrl}/learn/${slug}`)
    .join('\n');

  const flagLines = doctorFlags.map((f) => `  • ${f}`).join('\n');

  const textBody = `${greeting}

Welcome to your personalized health insights from Present Health.

You've already seen your full report — now we'll keep the insights coming. As we publish new articles matched to your health profile, we'll send them straight to your inbox so you stay informed on the topics that matter most to you.

Here's a recap of your assessment results:

${summary}

${doctorFlags.length > 0 ? `Topics to consider discussing with your doctor:\n${flagLines}\n` : ''}
${recommendedSlugs.length > 0 ? `Articles we've matched to your profile:\n${articleLinks}\n` : ''}

Ready to experience healthcare that actually has time for you?

Present Health DPC offers telehealth-first Direct Primary Care with:
  • Same-day and next-day appointments
  • Transparent flat-fee pricing
  • Direct access to your physician via text, phone, and video
  • No surprise bills

Learn more or join at: ${baseUrl}/join

To your health,
The Present Health Team

---
This email was sent because you signed up for personalized health insights at ${baseUrl}. This is not medical advice.`;

  const htmlBody = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:system-ui,sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto;padding:24px">
  <img src="${baseUrl}/logo.png" alt="Present Health" style="height:40px;margin-bottom:24px" onerror="this.style.display='none'" />
  <p>${greeting}</p>
  <p>Welcome to your personalized health insights from Present Health.</p>
  <p>You've already seen your full report — now we'll keep the insights coming. As we publish new articles matched to your health profile, we'll send them straight to your inbox.</p>
  <p>Here's a recap of your assessment results:</p>
  <div style="background:#f8fafc;border-left:4px solid #10b981;padding:16px;border-radius:4px;margin:16px 0">
    ${summary.replace(/\n/g, '<br />').replace(/---[\s\S]*$/, '')}
  </div>
  ${
    doctorFlags.length > 0
      ? `<h3 style="font-size:16px">Topics to consider discussing with your doctor</h3>
  <ul>${doctorFlags.map((f) => `<li>${f}</li>`).join('')}</ul>`
      : ''
  }
  ${
    recommendedSlugs.length > 0
      ? `<h3 style="font-size:16px">Recommended reading for you</h3>
  <ul>${recommendedSlugs.map((s) => `<li><a href="${baseUrl}/learn/${s}" style="color:#10b981">${s.replace(/-/g, ' ')}</a></li>`).join('')}</ul>`
      : ''
  }
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />
  <div style="background:#ecfdf5;border-radius:8px;padding:20px">
    <h3 style="margin-top:0">Ready for healthcare that actually has time for you?</h3>
    <p>Present Health DPC offers telehealth-first Direct Primary Care with transparent flat-fee pricing and direct physician access.</p>
    <a href="${baseUrl}/join" style="display:inline-block;background:#10b981;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">Join Present Health</a>
  </div>
  <p style="font-size:12px;color:#6b7280;margin-top:24px">You signed up for personalized health insights at ${baseUrl}. This is not medical advice. Please consult your physician before making health decisions.</p>
</body>
</html>`;

  await sendEmail({
    to: email,
    subject: 'Welcome to your personalized health insights',
    text: textBody,
    html: htmlBody,
  }).catch((err: unknown) => {
    console.error('[Assessment] Welcome email failed', err);
  });
}
