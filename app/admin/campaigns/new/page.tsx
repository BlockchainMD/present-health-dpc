'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { ArrowLeft, Loader2, AlertTriangle, Copy, Upload, Info, Wand2, User, LogOut } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function NewCampaignPage() {
    const router = useRouter();
    const { data: session } = useSession();
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
            setError(err.message || 'Failed to auto-generate');
        } finally {
            setGenerating(false);
        }
    }

    function toggleManual() {
        if (!showManual) {
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
     "howItWorks": [ { "title": "...", "desc": "..." }, { "title": "...", "desc": "..." }, { "title": "...", "desc": "..." } ],
     "pricing": { "headline": "...", "subheadline": "..." },
     "faqs": [ { "question": "...", "answer": "..." } ],
     "ctaSection": { "headline": "...", "subheadline": "...", "buttonText": "..." }
  }
}`.trim();
            setMegaPrompt(template);
        }
        setShowManual(!showManual);
    }

    async function handleImport() {
        if (!manualJson) {
            addLog('Import aborted: JSON input is empty.', 'error');
            return;
        }

        setImporting(true);
        setError(null);
        addLog('Starting manual import...');

        try {
            addLog('Parsing JSON input...');
            let parsed;
            try {
                parsed = JSON.parse(manualJson);
            } catch (pErr: any) {
                let helpfulMsg = 'Invalid JSON format. Please ensure you are pasting only the JSON object.';
                if (manualJson.trim().startsWith('Present Health') || manualJson.trim().includes('Admin Panel')) {
                    helpfulMsg = 'It looks like you accidentally pasted the entire webpage content. Please clear the box and paste ONLY the JSON output from ChatGPT.';
                }
                throw new Error(helpfulMsg);
            }
            addLog(`JSON parsed successfully. Campaign slug: ${parsed.campaign?.slug || 'unknown'}`);

            addLog('Sending POST request to /api/admin/campaigns/import...');
            const res = await fetch('/api/admin/campaigns/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(parsed)
            });

            addLog(`Response received. Status: ${res.status} ${res.statusText}`);

            let data;
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                data = await res.json();
            } else {
                const text = await res.text();
                addLog('Response is not JSON. Raw body: ' + text.slice(0, 200), 'error');
                throw new Error(`Server returned a ${res.status} error (non-JSON).`);
            }

            if (res.ok) {
                addLog('Import successful! Redirecting to campaign details...', 'info');
                router.push(`/admin/campaigns/${data.id}`);
            } else {
                addLog(`Import failed on server: ${data.error || 'Unknown error'}`, 'error');
                throw new Error(data.error || 'Import failed');
            }
        } catch (err: any) {
            const msg = err.message || 'Invalid JSON format';
            addLog(`Exception caught: ${msg}`, 'error');
            setError(msg);
            // Ensure error is visible by scrolling to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setImporting(false);
            addLog('Import process finished.');
        }
    }

    async function handleCopyPrompt() {
        await navigator.clipboard.writeText(megaPrompt);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setComplianceErrors([]);

        const formData = new FormData(e.currentTarget);
        const data = {
            slug: formData.get('slug'),
            persona: formData.get('persona'),
            intent: formData.get('intent'),
            landingSlug: formData.get('landingSlug'),
            budgetDaily: formData.get('budgetDaily'),
            targetCpa: formData.get('targetCpa'),
            geo: formData.get('geo'),
            geoStates: (formData.get('geoStates') as string || '').split(',').map(s => s.trim().toUpperCase()).filter(s => s.length === 2),
            tone: formData.get('tone'),
            seedKeywords: (formData.get('seedKeywords') as string || '').split(',').map(s => s.trim()).filter(Boolean),
            benefits: (formData.get('benefits') as string || '').split('\n').map(s => s.trim()).filter(Boolean),
            proofPoints: (formData.get('proofPoints') as string || '').split('\n').map(s => s.trim()).filter(Boolean),
            disclaimers: (formData.get('disclaimers') as string || '').split('\n').map(s => s.trim()).filter(Boolean),
        };

        try {
            const res = await fetch('/api/admin/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const result = await res.json();
            if (!res.ok) {
                if (result.reasons) {
                    setComplianceErrors(result.reasons);
                    setError('Compliance check failed.');
                } else {
                    setError(result.error || 'Failed to create campaign');
                }
            } else {
                router.push(`/admin/campaigns/${result.id}`);
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/admin/campaigns"><ArrowLeft className="h-4 w-4" /></Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">New Campaign</h1>
                        <p className="text-muted-foreground">Define your audience and intent.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={toggleManual} className="text-primary hover:bg-primary/5">
                        <Copy className="mr-2 h-4 w-4" />
                        {showManual ? 'Back to Form' : 'ChatGPT Workflow'}
                    </Button>
                    <Button variant="secondary" onClick={handleAutoGenerate} disabled={generating} className="bg-indigo-50 color-indigo-700">
                        {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                        Auto-Generate
                    </Button>
                </div>
            </div>

            {error && (
                <Alert variant="destructive" className="mb-6">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                        {error}
                        {complianceErrors.length > 0 && (
                            <ul className="list-disc list-inside mt-2 space-y-1">
                                {complianceErrors.map((err, i) => <li key={i}>{err}</li>)}
                            </ul>
                        )}
                    </AlertDescription>
                </Alert>
            )}

            {showManual ? (
                <Card className="border-primary/50 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Info className="h-5 w-5 text-primary" /> ChatGPT Pro High Creator</CardTitle>
                        <CardDescription>Generate and import JSON directly.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">1. Copy the Mega-Prompt template</label>
                                <Button size="sm" variant="outline" onClick={handleCopyPrompt}>{copySuccess ? 'Copied!' : <><Copy className="mr-2 h-3 w-3" /> Copy Template</>}</Button>
                            </div>
                            <div className="bg-muted p-4 rounded-md h-32 overflow-y-auto text-xs whitespace-pre-wrap font-mono border">{megaPrompt}</div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">2. Paste ChatGPT JSON output here</label>
                            <textarea className="w-full h-48 p-3 text-xs font-mono border rounded-md bg-background" placeholder='{ "campaign": { ... }, "adPlan": { ... }, "landingPageSpec": { ... } }' value={manualJson} onChange={(e) => setManualJson(e.target.value)} />
                        </div>
                        {error && (
                            <Alert variant="destructive" className="border-destructive/50">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Import Error</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        <Button className="w-full" size="lg" onClick={handleImport} disabled={importing || !manualJson}>
                            {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                            Create & Import Everything
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-8">
                    <Card>
                        <CardHeader><CardTitle>Core Strategy</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="slug">Campaign Slug (ID)</Label>
                                    <Input id="slug" name="slug" placeholder="e.g., busy-exec" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="landingSlug">Landing Page Slug</Label>
                                    <Input id="landingSlug" name="landingSlug" placeholder="e.g., medical-care" required />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="persona">Target Persona</Label>
                                <Input id="persona" name="persona" placeholder="e.g., Remote Tech Worker" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="intent">User Intent</Label>
                                <Textarea id="intent" name="intent" placeholder="e.g., Needs doctor today." required />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Keywords & Benefits</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="seedKeywords">Seeds (Comma separated)</Label>
                                <Input id="seedKeywords" name="seedKeywords" placeholder="doctor, medicine" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="geoStates">Licensed States (Comma separated, e.g. NY, CA, TX)</Label>
                                <Input id="geoStates" name="geoStates" placeholder="NY, CA, TX" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="benefits">Benefits (One per line)</Label>
                                <Textarea id="benefits" name="benefits" placeholder="No wait" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="proofPoints">Proof Points (One per line)</Label>
                                <Textarea id="proofPoints" name="proofPoints" placeholder="Board-certified doctors" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="disclaimers">Disclaimers (One per line)</Label>
                                <Textarea id="disclaimers" name="disclaimers" placeholder="Not insurance" />
                            </div>
                        </CardContent>
                    </Card>
                    <div className="flex justify-end gap-4">
                        <Button variant="outline" asChild><Link href="/admin/campaigns">Cancel</Link></Button>
                        <Button type="submit" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Campaign</Button>
                    </div>
                </form>
            )}

            <Card className="mt-8 bg-slate-950 text-slate-50 border-slate-800">
                <CardHeader><CardTitle className="text-xs font-mono">Debug Logs</CardTitle></CardHeader>
                <CardContent>
                    <div className="bg-slate-900 p-2 h-32 overflow-y-auto font-mono text-[10px] space-y-1">
                        {logs.map((log, i) => <div key={i}>{log}</div>)}
                    </div>
                </CardContent>
            </Card>

            <Card className="mt-8 border-dashed bg-muted/30">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <User className="h-4 w-4" /> Session Diagnostics
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between text-xs">
                    <div className="space-y-1">
                        <p>Logged in as: <span className="font-semibold">{session?.user?.email || 'Not logged in'}</span></p>
                        <p>Role: <span className={`px-2 py-0.5 rounded-full ${(session?.user as any)?.role === 'ADMIN' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{(session?.user as any)?.role || 'None'}</span></p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: '/login' })} className="text-muted-foreground hover:text-destructive">
                        <LogOut className="mr-2 h-3 w-3" /> Sign Out
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
