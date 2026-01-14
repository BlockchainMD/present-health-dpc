'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, AlertTriangle, Copy, Upload, Info, Wand2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function NewCampaignPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [complianceErrors, setComplianceErrors] = useState<string[]>([]);

    const [generating, setGenerating] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [showManual, setShowManual] = useState(false);
    const [manualJson, setManualJson] = useState('');
    const [importing, setImporting] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const [megaPrompt, setMegaPrompt] = useState('');

    const addLog = (message: string, type: 'info' | 'error' = 'info') => {
        const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
        const logEntry = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
        setLogs(prev => [...prev, logEntry]);
        if (type === 'error') console.error(message);
        else console.log(message);
    };

    useEffect(() => {
        addLog('Debug session started. Waiting for interaction...');
    }, []);

    async function handleAutoGenerate() {
        setGenerating(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/campaigns/suggest', { method: 'POST' });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            // Pre-fill form by setting inputs directly (simplest way without controlled state refactor)
            const setInputValue = (name: string, value: any) => {
                const input = document.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLTextAreaElement;
                if (input) {
                    if (Array.isArray(value)) {
                        input.value = value.join(name === 'seedKeywords' ? ', ' : '\n');
                    } else {
                        input.value = value;
                    }
                }
            };

            setInputValue('slug', data.slug);
            setInputValue('landingSlug', data.landingSlug);
            setInputValue('persona', data.persona);
            setInputValue('intent', data.intent);
            setInputValue('seedKeywords', data.seedKeywords);
            setInputValue('benefits', data.benefits);
            setInputValue('proofPoints', data.proofPoints);
            setInputValue('disclaimers', data.disclaimers);
            setInputValue('budgetDaily', data.budgetDaily);
            setInputValue('targetCpa', data.targetCpa);
            setInputValue('geo', data.geo);
            setInputValue('tone', data.tone);

        } catch (err: any) {
            setError(err.message || 'Failed to auto-generate campaign');
        } finally {
            setGenerating(false);
        }
    }

    function toggleManual() {
        if (!showManual) {
            // Generate a universal mega-prompt template if not already there
            const template = `
# MISSION
Act as a Senior Direct Response Copywriter and Healthcare Marketing Strategist for Present Health. Generate a high-performance ad campaign.

# CORE CONCEPT (Fill these in)
- Persona: <e.g., Remote Tech Worker with Back Pain>
- Intent: <e.g., Needs immediate expert consultation without leaving the home office>
- Seed Keywords: <e.g., virtual doctor, back pain relief, DPC physician>

# OUTPUT FORMAT (MANDATORY JSON)
Return ONLY a JSON object with this exact structure:

{
  "campaign": {
    "slug": "unique-slug-here",
    "persona": "Persona Name",
    "intent": "What they need",
    "landingSlug": "url-slug-here",
    "seedKeywords": ["kw1", "kw2"],
    "benefits": ["Benefit 1", "Benefit 2", "Benefit 3"],
    "proofPoints": ["Proof 1", "Proof 2"],
    "disclaimers": ["Not insurance", "Select states"],
    "budgetDaily": 50,
    "targetCpa": 30
  },
  "adPlan": {
    "rsa": {
      "headlines": ["H1", "H2", "H3..."],
      "descriptions": ["D1", "D2..."]
    },
    "keywords": [
      {"text": "keyword", "matchType": "PHRASE"}
    ]
  },
  "landingPageSpec": {
     "hero": { "headline": "...", "subheadline": "...", "cta": "..." },
     "howItWorks": [ { "title": "Step 1", "desc": "..." }, { "title": "Step 2", "desc": "..." }, { "title": "Step 3", "desc": "..." } ],
     "pricing": { "headline": "...", "subheadline": "..." },
     "faqs": [ { "question": "...", "answer": "..." } ],
     "ctaSection": { "headline": "...", "subheadline": "...", "buttonText": "..." }
  }
}
            `.trim();
            setMegaPrompt(template);
        }
        setShowManual(!showManual);
    }

    async function handleImport() {
        if (!manualJson) return;
        setImporting(true);
        setError(null);
        try {
            const parsed = JSON.parse(manualJson);
            const res = await fetch('/api/admin/campaigns/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(parsed)
            });

            if (res.ok) {
                const data = await res.json();
                router.push(`/admin/campaigns/${data.id}`);
            } else {
                const data = await res.json();
                throw new Error(data.error || 'Import failed');
            }
        } catch (err: any) {
            setError(err.message || 'Invalid JSON format');
        } finally {
            setImporting(false);
        }
    }

    async function handleCopyPrompt() {
        await navigator.clipboard.writeText(megaPrompt);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        addLog('[NewCampaignPage] handleSubmit triggered');
        setLoading(true);
        setError(null);
        setComplianceErrors([]);

        const formData = new FormData(e.currentTarget);
        addLog('[NewCampaignPage] FormData created');

        addLog(`[NewCampaignPage] Payload prepared: ${JSON.stringify({
            slug: formData.get('slug'),
            persona: formData.get('persona'),
            intent: formData.get('intent'),
            landingSlug: formData.get('landingSlug'),
            // truncated for log clarity
        }, null, 2)}`);

        try {
            // Parse array fields (comma-separated or newlines)
            // SAFELY handle nulls by defaulting to empty string before splitting
            const seedKeywords = (formData.get('seedKeywords') as string || '').split(',').map(s => s.trim()).filter(Boolean);
            const benefits = (formData.get('benefits') as string || '').split('\n').map(s => s.trim()).filter(Boolean);
            const proofPoints = (formData.get('proofPoints') as string || '').split('\n').map(s => s.trim()).filter(Boolean);
            const disclaimers = (formData.get('disclaimers') as string || '').split('\n').map(s => s.trim()).filter(Boolean);

            const data = {
                slug: formData.get('slug'),
                persona: formData.get('persona'),
                intent: formData.get('intent'),
                landingSlug: formData.get('landingSlug'),
                budgetDaily: formData.get('budgetDaily'),
                targetCpa: formData.get('targetCpa'),
                geo: formData.get('geo'),
                tone: formData.get('tone'),
                seedKeywords,
                benefits,
                proofPoints,
                disclaimers
            };

            addLog('[NewCampaignPage] Sending POST request to /api/admin/campaigns');
            const res = await fetch('/api/admin/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            addLog(`[NewCampaignPage] Response received. Status: ${res.status} ${res.statusText}`);

            const resultText = await res.text();
            addLog(`[NewCampaignPage] Raw response text: ${resultText}`);

            let result;
            try {
                result = JSON.parse(resultText);
                addLog(`[NewCampaignPage] Parsed JSON response: ${JSON.stringify(result)}`);
            } catch (jsonErr) {
                addLog(`[NewCampaignPage] Failed to parse JSON response: ${jsonErr}`, 'error');
                throw new Error(`Server returned invalid JSON: ${resultText.substring(0, 100)}...`);
            }

            if (!res.ok) {
                addLog(`[NewCampaignPage] Request failed with status: ${res.status}`, 'error');
                if (result.reasons) {
                    setComplianceErrors(result.reasons);
                    setError('Compliance check failed. Please fix the issues below.');
                } else {
                    setError(result.error || 'Failed to create campaign');
                }
            } else {
                addLog(`[NewCampaignPage] Campaign created successfully, redirecting to: /admin/campaigns/${result.id}`);
                router.push(`/admin/campaigns/${result.id}`);
            }
        } catch (err: any) {
            addLog(`[NewCampaignPage] Exception caught in handleSubmit: ${err}`, 'error');
            setError(err.message || 'An unexpected error occurred');
        } finally {
            addLog('[NewCampaignPage] handleSubmit finished, setLoading(false)');
            setLoading(false);
        }
    }

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/admin/campaigns">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">New Campaign</h1>
                        <p className="text-muted-foreground">Define your audience, intent, and safety guardrails.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        onClick={toggleManual}
                        className="text-primary hover:bg-primary/5"
                    >
                        <Copy className="mr-2 h-4 w-4" />
                        {showManual ? 'Back to Form' : 'ChatGPT Workflow'}
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={handleAutoGenerate}
                        disabled={generating}
                        className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 hover:from-indigo-500/20 hover:to-purple-500/20 text-indigo-700 border border-indigo-200/50"
                    >
                        {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                        Auto-Generate
                    </Button>
                </div>
            </div>

            {showManual && (
                <Card className="border-primary/50 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Info className="h-5 w-5 text-primary" />
                            ChatGPT Pro High Creator
                        </CardTitle>
                        <CardDescription>
                            Generate a full campaign structure including JSON for direct import.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">1. Copy the Mega-Prompt template</label>
                                <Button size="sm" variant="outline" onClick={handleCopyPrompt}>
                                    {copySuccess ? 'Copied!' : <><Copy className="mr-2 h-3 w-3" /> Copy Template</>}
                                </Button>
                            </div>
                            <div className="bg-muted p-4 rounded-md h-32 overflow-y-auto text-xs whitespace-pre-wrap font-mono border">
                                {megaPrompt}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">2. Paste ChatGPT JSON output here</label>
                            <textarea
                                className="w-full h-48 p-3 text-xs font-mono border rounded-md bg-background focus:ring-2 focus:ring-primary outline-none"
                                placeholder='{ "campaign": { ... }, "adPlan": { ... }, "landingPageSpec": { ... } }'
                                value={manualJson}
                                onChange={(e) => setManualJson(e.target.value)}
                            />
                        </div>

                        <Button className="w-full" size="lg" onClick={handleImport} disabled={importing || !manualJson}>
                            {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                            Create & Import Everything
                        </Button>
                    </CardContent>
                </Card>
            )}

            {!showManual && (
                <form onSubmit={handleSubmit} className="space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Core Strategy</CardTitle>
                            <CardDescription>Who are we targeting and what is their intent?</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="slug">Campaign Slug (ID)</Label>
                                    <Input id="slug" name="slug" placeholder="e.g., busy-exec-urgent-care" required />
                                    <p className="text-xs text-muted-foreground">Unique identifier for this campaign.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="landingSlug">Landing Page URL Slug</Label>
                                    <Input id="landingSlug" name="landingSlug" placeholder="e.g., executive-care" required />
                                    <p className="text-xs text-muted-foreground">Will live at /lp/[slug]</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="persona">Target Persona</Label>
                                <Input id="persona" name="persona" placeholder="e.g., Busy Executive Mom" required />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="intent">User Intent</Label>
                                <Textarea id="intent" name="intent" placeholder="e.g., Needs same-day sick visit for child but can't leave work." required />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Content & Keywords</CardTitle>
                            <CardDescription>Input seeds for generation. <span className="text-red-500 font-medium">Strictly no Rx terms.</span></CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="seedKeywords">Seed Keywords (Comma separated)</Label>
                                <Input id="seedKeywords" name="seedKeywords" placeholder="urgent care near me, same day doctor, concierge medicine" required />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="benefits">Key Benefits (One per line)</Label>
                                <Textarea id="benefits" name="benefits" placeholder="Same-day appointments&#10;Text your doctor directly&#10;No waiting rooms" rows={4} required />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="proofPoints">Proof Points (One per line)</Label>
                                <Textarea id="proofPoints" name="proofPoints" placeholder="Board-certified physicians&#10;5-star rated&#10;Open evenings and weekends" rows={3} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="disclaimers">Disclaimers (One per line)</Label>
                                <Textarea id="disclaimers" name="disclaimers" placeholder="Not insurance&#10;Available in select states" rows={2} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Budget & Settings</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="budgetDaily">Daily Budget ($)</Label>
                                    <Input id="budgetDaily" name="budgetDaily" type="number" min="1" defaultValue="50" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="targetCpa">Target CPA ($)</Label>
                                    <Input id="targetCpa" name="targetCpa" type="number" min="1" defaultValue="30" required />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="geo">Target Geo</Label>
                                    <Input id="geo" name="geo" defaultValue="US" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="tone">Tone</Label>
                                    <Input id="tone" name="tone" defaultValue="Professional & Empathetic" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-4">
                        <Button variant="outline" asChild>
                            <Link href="/admin/campaigns">Cancel</Link>
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Campaign
                        </Button>
                    </div>
                </form>
            )}

            <Card className="mt-8 bg-slate-950 text-slate-50 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-sm font-mono flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        Debug Logs
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="bg-slate-900 rounded p-4 h-64 overflow-y-auto font-mono text-xs space-y-1">
                        {logs.length === 0 ? (
                            <div className="text-slate-500 italic">No logs yet...</div>
                        ) : (
                            logs.map((log, i) => (
                                <div key={i} className={log.includes('ERROR') ? 'text-red-400' : 'text-slate-300'}>
                                    {log}
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
