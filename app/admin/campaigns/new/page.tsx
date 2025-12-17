'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, AlertTriangle } from 'lucide-react';
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

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setComplianceErrors([]);

        const formData = new FormData(e.currentTarget);

        // Parse array fields (comma-separated)
        const seedKeywords = (formData.get('seedKeywords') as string).split(',').map(s => s.trim()).filter(Boolean);
        const benefits = (formData.get('benefits') as string).split('\n').map(s => s.trim()).filter(Boolean);
        const proofPoints = (formData.get('proofPoints') as string).split('\n').map(s => s.trim()).filter(Boolean);
        const disclaimers = (formData.get('disclaimers') as string).split('\n').map(s => s.trim()).filter(Boolean);

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
                    setError('Compliance check failed. Please fix the issues below.');
                } else {
                    setError(result.error || 'Failed to create campaign');
                }
            } else {
                router.push(`/admin/campaigns/${result.id}`);
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-3xl mx-auto space-y-8">
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

            {error && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                        {error}
                        {complianceErrors.length > 0 && (
                            <ul className="list-disc list-inside mt-2 space-y-1">
                                {complianceErrors.map((err, i) => (
                                    <li key={i}>{err}</li>
                                ))}
                            </ul>
                        )}
                    </AlertDescription>
                </Alert>
            )}

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
        </div>
    );
}
