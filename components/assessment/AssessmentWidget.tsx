'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { Question } from '@/lib/assessment/questions';

type Step = 'IDLE' | 'STARTING' | 'ANSWERING' | 'COMPLETING' | 'GATING' | 'CAPTURED';

type CaptureResult = {
  summary: string;
  doctorFlags: string[];
  recommendedSlugs: string[];
};

const STORAGE_KEY = 'ph_assess_token';

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeToken(token: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, token);
  } catch {}
}

export function AssessmentWidget({
  articleSlug,
  cluster,
  compact = false,
}: {
  articleSlug?: string;
  cluster?: string;
  compact?: boolean;
}) {
  const [step, setStep] = useState<Step>('IDLE');
  const [token, setToken] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [preview, setPreview] = useState('');
  const [doctorFlagCount, setDoctorFlagCount] = useState(0);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [captureResult, setCaptureResult] = useState<CaptureResult | null>(null);
  const [error, setError] = useState('');

  // Auto-resume if a token is stored and was already completed
  useEffect(() => {
    const stored = getStoredToken();
    if (stored && step === 'IDLE') {
      // Don't auto-resume — let user start fresh
    }
  }, [step]);

  const startAssessment = useCallback(async () => {
    setStep('STARTING');
    setError('');
    try {
      const res = await fetch('/api/assessment/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', cluster, articleSlug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start');
      storeToken(data.token);
      setToken(data.token);
      setQuestions(data.questions || []);
      setCurrentIndex(0);
      setAnswers({});
      setStep('ANSWERING');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStep('IDLE');
    }
  }, [cluster, articleSlug]);

  const currentQuestion = questions[currentIndex] ?? null;
  const isMulti = currentQuestion?.type === 'multi';
  const currentAnswers = currentQuestion ? (answers[currentQuestion.id] ?? []) : [];
  const isAnswered = currentAnswers.length > 0;

  function toggleOption(label: string) {
    if (!currentQuestion) return;
    const id = currentQuestion.id;
    setAnswers((prev) => {
      const existing = prev[id] ?? [];
      if (isMulti) {
        return {
          ...prev,
          [id]: existing.includes(label)
            ? existing.filter((l) => l !== label)
            : [...existing, label],
        };
      }
      return { ...prev, [id]: [label] };
    });
  }

  async function handleNext() {
    if (!token || !currentQuestion) return;
    const nextIndex = currentIndex + 1;

    if (nextIndex < questions.length) {
      setCurrentIndex(nextIndex);
      return;
    }

    // All questions answered — save and complete
    setStep('COMPLETING');
    setError('');
    try {
      // Save final answers
      await fetch('/api/assessment/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'answer', token, answers }),
      });

      // Request synthesis
      const completeRes = await fetch('/api/assessment/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete', token }),
      });
      const completeData = await completeRes.json();
      if (!completeRes.ok) throw new Error(completeData.error || 'Failed to complete');

      setPreview(completeData.preview || '');
      setDoctorFlagCount(completeData.doctorFlagCount || 0);
      setStep('GATING');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStep('ANSWERING');
    }
  }

  async function handleCapture(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !email.trim()) return;
    setError('');

    try {
      const res = await fetch('/api/assessment/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email: email.trim(), firstName: firstName.trim(), hp: '' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit');
      setCaptureResult({
        summary: data.summary || '',
        doctorFlags: data.doctorFlags || [],
        recommendedSlugs: data.recommendedSlugs || [],
      });
      setStep('CAPTURED');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  const progress = questions.length > 0 ? Math.round((currentIndex / questions.length) * 100) : 0;

  // ── IDLE ──────────────────────────────────────────────────────────────────
  if (step === 'IDLE') {
    return (
      <Card className="border-emerald-200 bg-emerald-50/40 dark:border-emerald-800/40 dark:bg-emerald-950/20">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-emerald-900 dark:text-emerald-100">
                Get your personalized health insights
              </p>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                {compact ? 'A quick 2-minute health check — tailored to you.' : 'Answer a few questions and get a personalized summary of topics to explore with your doctor.'}
              </p>
            </div>
            <Button onClick={startAssessment} className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white">
              Start free assessment
            </Button>
          </div>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </CardContent>
      </Card>
    );
  }

  // ── STARTING ──────────────────────────────────────────────────────────────
  if (step === 'STARTING') {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          Loading your assessment...
        </CardContent>
      </Card>
    );
  }

  // ── ANSWERING ─────────────────────────────────────────────────────────────
  if (step === 'ANSWERING' && currentQuestion) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-4 mb-1">
            <span className="text-xs text-muted-foreground">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <Badge variant="outline" className="text-xs">
              {Math.round(((currentIndex + 1) / questions.length) * 100)}% complete
            </Badge>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-1.5">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <CardTitle className="text-lg mt-3">{currentQuestion.text}</CardTitle>
          {currentQuestion.subtext ? (
            <p className="text-sm text-muted-foreground">{currentQuestion.subtext}</p>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-2">
          {currentQuestion.options.map((option) => {
            const selected = currentAnswers.includes(option.label);
            return (
              <button
                key={option.label}
                onClick={() => {
                  toggleOption(option.label);
                  if (!isMulti) {
                    // Auto-advance for single-select after brief delay
                    setTimeout(() => {
                      setCurrentIndex((prev) => prev + 1);
                      if (currentIndex + 1 >= questions.length) {
                        handleNext();
                      }
                    }, 150);
                  }
                }}
                className={`w-full text-left rounded-lg border px-4 py-3 text-sm transition-colors ${
                  selected
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100'
                    : 'border-border hover:border-emerald-300 hover:bg-muted/50'
                }`}
              >
                {option.label}
              </button>
            );
          })}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          {isMulti ? (
            <Button
              onClick={handleNext}
              disabled={!isAnswered}
              className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
            >
              {currentIndex + 1 < questions.length ? 'Next' : 'Get my insights'}
            </Button>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  // ── COMPLETING ────────────────────────────────────────────────────────────
  if (step === 'COMPLETING') {
    return (
      <Card>
        <CardContent className="pt-8 pb-8 text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <div className="h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-muted-foreground">Generating your personalized insights...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── GATING ────────────────────────────────────────────────────────────────
  if (step === 'GATING') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Your health insights are ready</CardTitle>
          <p className="text-sm text-muted-foreground">
            We found {doctorFlagCount > 0 ? `${doctorFlagCount} topic${doctorFlagCount !== 1 ? 's' : ''} to discuss with your doctor and ` : ''}personalized article recommendations for you.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Blurred preview */}
          <div className="relative rounded-lg border bg-muted/30 p-4 overflow-hidden">
            <p className="text-sm text-muted-foreground line-clamp-2 select-none">
              {preview}...
            </p>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/95 flex items-end justify-center pb-3">
              <span className="text-xs text-muted-foreground font-medium">Enter your email to unlock your full report</span>
            </div>
          </div>

          <form onSubmit={handleCapture} className="space-y-3">
            {/* Honeypot */}
            <input name="hp" type="text" className="hidden" tabIndex={-1} autoComplete="off" />

            <div>
              <Input
                type="text"
                placeholder="First name (optional)"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mb-2"
              />
              <Input
                type="email"
                placeholder="Your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <Button
              type="submit"
              disabled={!email.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
            >
              Get my full report
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              No spam. Unsubscribe anytime.
            </p>
          </form>
        </CardContent>
      </Card>
    );
  }

  // ── CAPTURED ──────────────────────────────────────────────────────────────
  if (step === 'CAPTURED' && captureResult) {
    const { summary, doctorFlags, recommendedSlugs } = captureResult;
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 mb-1">
            <svg className="h-5 w-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <CardTitle className="text-lg">Your personalized health summary</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">Check your email — we sent you a copy too.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {summary ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 dark:border-emerald-800/40 dark:bg-emerald-950/20 p-4 text-sm">
              {summary.split('\n').map((line, i) => (
                line.trim() ? <p key={i} className="mb-2 last:mb-0">{line}</p> : null
              ))}
            </div>
          ) : null}

          {doctorFlags.length > 0 ? (
            <div>
              <p className="text-sm font-medium mb-2">Topics to discuss with your doctor</p>
              <ul className="space-y-1">
                {doctorFlags.map((flag, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-0.5 shrink-0 h-4 w-4 rounded-full border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                      <svg className="h-2.5 w-2.5 text-emerald-600" fill="none" viewBox="0 0 8 8">
                        <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" d="M1.5 4h5M4 1.5v5" />
                      </svg>
                    </span>
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {recommendedSlugs.length > 0 ? (
            <div>
              <p className="text-sm font-medium mb-2">Recommended reading for you</p>
              <ul className="space-y-1">
                {recommendedSlugs.map((slug, i) => (
                  <li key={i}>
                    <a
                      href={`/learn/${slug}`}
                      className="text-sm text-emerald-600 hover:underline"
                    >
                      {slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-sm font-medium mb-1">Ready for healthcare that has time for you?</p>
            <p className="text-xs text-muted-foreground mb-3">
              Present Health DPC offers same-day appointments, transparent pricing, and direct physician access.
            </p>
            <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <a href="/join">Join Present Health</a>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            This is not medical advice. Please consult your physician before making any health decisions.
          </p>
        </CardContent>
      </Card>
    );
  }

  return null;
}
