import { generateJson } from '@/lib/content-engine/gemini';
import { prisma } from '@/lib/prisma';
import { SIGNAL_MAP } from './signals';

export type SynthesisResult = {
  summary: string;
  doctorFlags: string[];
  recommendedSlugs: string[];
};

type GeminiSynthesisResponse = {
  summary?: string;
  doctorFlags?: string[];
  recommendedSlugs?: string[];
};

const DISCLAIMER =
  '\n\n---\n*This is not medical advice. Please consult your physician before making any health decisions.*';

export async function synthesizeAssessment(params: {
  signals: string[];
  cluster?: string | null;
  articleSlug?: string | null;
}): Promise<SynthesisResult> {
  const { signals, cluster, articleSlug } = params;

  // Resolve signal labels for context
  const signalLabels = signals
    .map((key) => SIGNAL_MAP[key]?.label)
    .filter(Boolean);

  // Collect doctor-flagged signals
  const flaggedSignals = signals
    .map((key) => SIGNAL_MAP[key])
    .filter((s) => s && (s.severity === 'FLAG' || s.severity === 'URGENT') && s.doctorText)
    .map((s) => s!.doctorText!);

  // Query articles matching signal clusters for recommendations
  const signalClusters = [...new Set(signals.map((key) => SIGNAL_MAP[key]?.cluster).filter(Boolean))];
  const clusterFilter = cluster ? [...new Set([cluster, ...signalClusters])] : signalClusters;

  let recommendedSlugs: string[] = [];
  if (clusterFilter.length > 0) {
    const now = new Date();
    const articles = await prisma.article.findMany({
      where: {
        status: 'PUBLISHED',
        cluster: { in: clusterFilter },
        OR: [{ publishedAt: null }, { publishedAt: { lte: now } }],
        slug: { not: articleSlug || undefined },
      },
      select: { slug: true, id: true },
      take: 6,
      orderBy: { publishedAt: { sort: 'desc', nulls: 'last' } },
    });

    recommendedSlugs = articles
      .map((a) => a.slug || a.id)
      .slice(0, 3);
  }

  // If no Gemini API key, return a graceful fallback
  const prompt = buildPrompt(signalLabels, flaggedSignals, cluster, articleSlug);
  const result = await generateJson<GeminiSynthesisResponse>(prompt, 0.4);

  if (!result) {
    return buildFallback(signals, flaggedSignals, recommendedSlugs);
  }

  const summary = typeof result.summary === 'string' && result.summary.trim()
    ? result.summary.trim() + DISCLAIMER
    : buildFallbackSummary(signalLabels) + DISCLAIMER;

  const doctorFlags = Array.isArray(result.doctorFlags)
    ? result.doctorFlags.filter((f): f is string => typeof f === 'string').slice(0, 5)
    : flaggedSignals.slice(0, 5).map((t) => `Consider discussing ${t} with your doctor`);

  const aiSlugs = Array.isArray(result.recommendedSlugs)
    ? result.recommendedSlugs.filter((s): s is string => typeof s === 'string')
    : [];

  const mergedSlugs = [...new Set([...recommendedSlugs, ...aiSlugs])].slice(0, 3);

  return { summary, doctorFlags, recommendedSlugs: mergedSlugs };
}

function buildPrompt(
  signalLabels: string[],
  flaggedSignals: string[],
  cluster?: string | null,
  articleSlug?: string | null
): string {
  const context = [
    cluster ? `Health cluster focus: ${cluster}` : '',
    articleSlug ? `Article context: ${articleSlug}` : '',
  ]
    .filter(Boolean)
    .join('. ');

  return `You are a health content assistant at a Direct Primary Care medical practice. Your role is to help people understand health topics they might want to explore — NOT to diagnose conditions or replace medical care.

${context ? `Context: ${context}` : ''}

A person completed a health questionnaire and indicated they are concerned about or experiencing:
${signalLabels.length > 0 ? signalLabels.map((l) => `- ${l}`).join('\n') : '- General health improvement'}

${flaggedSignals.length > 0 ? `Topics that may warrant professional discussion:\n${flaggedSignals.map((t) => `- ${t}`).join('\n')}` : ''}

Generate a personalized health summary for this person. The summary should:
1. Acknowledge their specific health interests and concerns
2. Frame everything as "topics to explore" or "areas that might benefit from attention" — NEVER as diagnoses
3. Be warm, encouraging, and actionable
4. Be 3–4 sentences (100–150 words)

Also generate a list of doctor discussion points phrased as "Consider discussing X with your doctor" — use the flagged topics above if relevant. Maximum 5 items.

Return valid JSON in exactly this format:
{
  "summary": "...",
  "doctorFlags": ["Consider discussing ... with your doctor", ...],
  "recommendedSlugs": []
}

IMPORTANT: Never diagnose. Never say someone "has" a condition. Use phrases like "may want to explore," "might benefit from discussing," or "could be worth understanding." The summary will be shown before an email is collected — it must be appropriate for any audience.`;
}

function buildFallbackSummary(signalLabels: string[]): string {
  if (signalLabels.length === 0) {
    return 'Based on your responses, here are some health topics that may be worth exploring with a primary care physician. Staying proactive about your health is one of the best investments you can make.';
  }
  const topics = signalLabels.slice(0, 3).join(', ').toLowerCase();
  return `Based on your responses, you may want to explore topics related to ${topics}. These are common areas where a primary care physician can offer personalized guidance and help you build a proactive health plan.`;
}

function buildFallback(
  signals: string[],
  flaggedSignals: string[],
  recommendedSlugs: string[]
): SynthesisResult {
  const signalLabels = signals.map((key) => SIGNAL_MAP[key]?.label).filter(Boolean);
  const summary = buildFallbackSummary(signalLabels) + DISCLAIMER;
  const doctorFlags = flaggedSignals
    .slice(0, 5)
    .map((t) => `Consider discussing ${t} with your doctor`);

  return { summary, doctorFlags, recommendedSlugs };
}
