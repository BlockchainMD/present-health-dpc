'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Plus, Search, AlertTriangle, CheckCircle, PauseCircle, PlayCircle, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Campaign {
    id: string;
    slug: string;
    persona: string;
    intent: string;
    status: string;
    budgetDaily: number;
    updatedAt: string;
    runs: any[];
}

export default function CampaignsPage() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCampaigns();
    }, []);

    async function fetchCampaigns() {
        try {
            const res = await fetch('/api/admin/campaigns');
            if (res.ok) {
                const data = await res.json();
                setCampaigns(data);
            }
        } catch (error) {
            console.error('Failed to fetch campaigns', error);
        } finally {
            setLoading(false);
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'DEPLOYED': return 'bg-green-500/10 text-green-500 hover:bg-green-500/20';
            case 'READY': return 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20';
            case 'PAUSED': return 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20';
            case 'ERROR': return 'bg-red-500/10 text-red-500 hover:bg-red-500/20';
            default: return 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20';
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Ad Campaigns</h1>
                    <p className="text-muted-foreground">Manage your Google Search Ads and Landing Pages.</p>
                </div>
                <Button asChild>
                    <Link href="/admin/campaigns/new">
                        <Plus className="mr-2 h-4 w-4" />
                        New Campaign
                    </Link>
                </Button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-muted-foreground">Loading campaigns...</div>
            ) : campaigns.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
                        <p className="text-muted-foreground mb-6 max-w-sm">
                            Create your first campaign to start generating safe, compliant search ads and landing pages.
                        </p>
                        <Button asChild>
                            <Link href="/admin/campaigns/new">
                                Create Campaign
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {campaigns.map((campaign) => (
                        <Link key={campaign.id} href={`/admin/campaigns/${campaign.id}`}>
                            <Card className="hover:bg-muted/50 transition-colors">
                                <CardContent className="p-6 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-semibold text-lg">{campaign.slug}</h3>
                                            <Badge variant="secondary" className={getStatusColor(campaign.status)}>
                                                {campaign.status}
                                            </Badge>
                                        </div>
                                        <div className="text-sm text-muted-foreground flex items-center gap-4">
                                            <span>{campaign.persona} • {campaign.intent}</span>
                                            <span>${campaign.budgetDaily}/day</span>
                                            <span>Updated {new Date(campaign.updatedAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-muted-foreground">
                                        {/* Metrics Placeholder */}
                                        <div className="text-right hidden md:block">
                                            <div className="text-xs font-medium uppercase tracking-wider">Clicks</div>
                                            <div className="font-mono text-lg text-foreground">
                                                {campaign.runs?.[0]?.metrics?.clicks || 0}
                                            </div>
                                        </div>
                                        <div className="text-right hidden md:block">
                                            <div className="text-xs font-medium uppercase tracking-wider">Conv.</div>
                                            <div className="font-mono text-lg text-foreground">
                                                {campaign.runs?.[0]?.metrics?.conversions || 0}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
