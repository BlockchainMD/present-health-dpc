"use client";

import { useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    CalendarClock,
    ClipboardCopy,
    Loader2,
    Megaphone,
    Plus,
    RefreshCw,
    Sparkles,
    Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type PressReleaseStatus = "DRAFT" | "APPROVED" | "SUBMITTED" | "PUBLISHED";
type PrOpportunityType = "PODCAST" | "INTERVIEW" | "GUEST_POST" | "MEDIA_MENTION" | "AWARD";
type PrPitchStatus = "IDENTIFIED" | "PITCHED" | "ACCEPTED" | "COMPLETED" | "DECLINED";
type PrMentionType = "MEDIA_MENTION" | "BACKLINK" | "PODCAST_APPEARANCE" | "PRESS_RELEASE_PICKUP";

type BoilerplateSnippet = {
    id: string;
    name: string;
    snippet: string;
};

type PrBoilerplate = {
    id: string;
    key: string;
    aboutBoilerplate: string;
    physicianBioSnippets: BoilerplateSnippet[];
    mediaContactName: string | null;
    mediaContactEmail: string | null;
    mediaContactPhone: string | null;
    logoUrl: string | null;
    headshotUrl: string | null;
    updatedAt: string;
};

type PressRelease = {
    id: string;
    headlineTopic: string;
    targetAngle: string | null;
    keyFacts: string | null;
    headline: string;
    subheadline: string | null;
    datelineCity: string | null;
    datelineDate: string | null;
    leadParagraph: string | null;
    body: string;
    physicianQuote: string | null;
    boilerplate: string | null;
    mediaContactName: string | null;
    mediaContactEmail: string | null;
    mediaContactPhone: string | null;
    status: PressReleaseStatus;
    submittedOutlets: string[];
    publishedUrls: string[];
    scheduledFor: string | null;
    submittedAt: string | null;
    publishedAt: string | null;
    llmProvider: string | null;
    llmModel: string | null;
    llmPrompt: string | null;
    llmResponse: string | null;
    createdAt: string;
    updatedAt: string;
    _count?: { mentions: number };
};

type PrOpportunity = {
    id: string;
    opportunityType: PrOpportunityType;
    outletName: string;
    contactName: string | null;
    contactEmail: string | null;
    pitchStatus: PrPitchStatus;
    pitchText: string | null;
    resultUrl: string | null;
    date: string | null;
    notes: string | null;
    llmProvider: string | null;
    llmModel: string | null;
    llmPrompt: string | null;
    llmResponse: string | null;
    createdAt: string;
    updatedAt: string;
    _count?: { mentions: number };
};

type PrMention = {
    id: string;
    mentionType: PrMentionType;
    title: string;
    sourceName: string | null;
    url: string;
    mentionDate: string;
    notes: string | null;
    pressReleaseId: string | null;
    opportunityId: string | null;
    createdAt: string;
    updatedAt: string;
    pressRelease?: { id: string; headline: string; status: PressReleaseStatus } | null;
    opportunity?: { id: string; outletName: string; opportunityType: PrOpportunityType } | null;
};

type PrDashboard = {
    generatedAt: string;
    efforts: {
        pressReleasesSent: number;
        pitchesMade: number;
        opportunitiesIdentified: number;
    };
    results: {
        mentions: number;
        backlinks: number;
        podcastAppearances: number;
    };
    noPressReleaseScheduledThisMonth: boolean;
    currentMonthScheduledCount: number;
    pressReleaseMentionRollup: Array<{
        id: string;
        headline: string;
        status: PressReleaseStatus;
        mentionCount: number;
        submittedOutletsCount: number;
        publishedUrlsCount: number;
    }>;
    suggestions: Array<{ month: string; topics: string[] }>;
    brandedSearch: {
        source: string;
        current: { clicks: number; impressions: number };
        previous: { clicks: number; impressions: number };
        clicksDelta: number;
        impressionsDelta: number;
        clicksDeltaPct: number | null;
        impressionsDeltaPct: number | null;
        window: {
            currentStart: string;
            currentEnd: string;
            previousStart: string;
            previousEnd: string;
        };
    } | null;
    calendar: {
        pressReleases: Array<{
            id: string;
            headline: string;
            status: PressReleaseStatus;
            date: string;
            submittedOutletsCount: number;
            publishedUrlsCount: number;
        }>;
        opportunities: Array<{
            id: string;
            outletName: string;
            opportunityType: PrOpportunityType;
            pitchStatus: PrPitchStatus;
            date: string | null;
        }>;
    };
};

type PrReference = {
    pressReleases: Array<{
        id: string;
        headline: string;
        status: PressReleaseStatus;
        datelineDate: string | null;
        scheduledFor: string | null;
    }>;
    opportunities: Array<{
        id: string;
        outletName: string;
        opportunityType: PrOpportunityType;
        pitchStatus: PrPitchStatus;
        date: string | null;
    }>;
    enums: {
        pressReleaseStatus: PressReleaseStatus[];
        opportunityType: PrOpportunityType[];
        pitchStatus: PrPitchStatus[];
        mentionType: PrMentionType[];
    };
    labels: {
        pressReleaseStatus: Record<string, string>;
        opportunityType: Record<string, string>;
        pitchStatus: Record<string, string>;
        mentionType: Record<string, string>;
    };
};

type PressReleaseDraftResponse = {
    headlineTopic: string;
    targetAngle: string | null;
    keyFacts: string | null;
    headline: string;
    subheadline: string | null;
    datelineCity: string | null;
    datelineDate: string;
    leadParagraph: string | null;
    body: string;
    physicianQuote: string | null;
    boilerplate: string | null;
    mediaContactName: string | null;
    mediaContactEmail: string | null;
    mediaContactPhone: string | null;
    llmProvider: string;
    llmModel: string;
    llmPrompt: string;
    llmResponse: string;
};

type OpportunityPitchResponse = {
    subject: string;
    emailBody: string;
    followUpSubject: string;
    followUpBody: string;
    llmProvider: string;
    llmModel: string;
    llmPrompt: string;
    llmResponse: string;
};

type PressReleaseForm = {
    id: string;
    headlineTopic: string;
    targetAngle: string;
    keyFacts: string;
    headline: string;
    subheadline: string;
    datelineCity: string;
    datelineDate: string;
    leadParagraph: string;
    body: string;
    physicianQuote: string;
    boilerplate: string;
    mediaContactName: string;
    mediaContactEmail: string;
    mediaContactPhone: string;
    status: PressReleaseStatus;
    submittedOutlets: string;
    publishedUrls: string;
    scheduledFor: string;
    submittedAt: string;
    publishedAt: string;
    llmProvider: string;
    llmModel: string;
    llmPrompt: string;
    llmResponse: string;
};

type OpportunityForm = {
    id: string;
    opportunityType: PrOpportunityType;
    outletName: string;
    contactName: string;
    contactEmail: string;
    pitchStatus: PrPitchStatus;
    pitchText: string;
    resultUrl: string;
    date: string;
    notes: string;
    storyAngle: string;
    keyContext: string;
    llmProvider: string;
    llmModel: string;
    llmPrompt: string;
    llmResponse: string;
};

type MentionForm = {
    id: string;
    mentionType: PrMentionType;
    title: string;
    sourceName: string;
    url: string;
    mentionDate: string;
    notes: string;
    pressReleaseId: string;
    opportunityId: string;
};

const DEFAULT_PR_FORM: PressReleaseForm = {
    id: "",
    headlineTopic: "",
    targetAngle: "",
    keyFacts: "",
    headline: "",
    subheadline: "",
    datelineCity: "",
    datelineDate: "",
    leadParagraph: "",
    body: "",
    physicianQuote: "",
    boilerplate: "",
    mediaContactName: "",
    mediaContactEmail: "",
    mediaContactPhone: "",
    status: "DRAFT",
    submittedOutlets: "",
    publishedUrls: "",
    scheduledFor: "",
    submittedAt: "",
    publishedAt: "",
    llmProvider: "",
    llmModel: "",
    llmPrompt: "",
    llmResponse: "",
};

const DEFAULT_OPPORTUNITY_FORM: OpportunityForm = {
    id: "",
    opportunityType: "PODCAST",
    outletName: "",
    contactName: "",
    contactEmail: "",
    pitchStatus: "IDENTIFIED",
    pitchText: "",
    resultUrl: "",
    date: "",
    notes: "",
    storyAngle: "",
    keyContext: "",
    llmProvider: "",
    llmModel: "",
    llmPrompt: "",
    llmResponse: "",
};

const DEFAULT_MENTION_FORM: MentionForm = {
    id: "",
    mentionType: "MEDIA_MENTION",
    title: "",
    sourceName: "",
    url: "",
    mentionDate: new Date().toISOString().slice(0, 10),
    notes: "",
    pressReleaseId: "",
    opportunityId: "",
};

const EMPTY_DASHBOARD: PrDashboard = {
    generatedAt: new Date().toISOString(),
    efforts: {
        pressReleasesSent: 0,
        pitchesMade: 0,
        opportunitiesIdentified: 0,
    },
    results: {
        mentions: 0,
        backlinks: 0,
        podcastAppearances: 0,
    },
    noPressReleaseScheduledThisMonth: true,
    currentMonthScheduledCount: 0,
    pressReleaseMentionRollup: [],
    suggestions: [],
    brandedSearch: null,
    calendar: {
        pressReleases: [],
        opportunities: [],
    },
};

const EMPTY_REFERENCE: PrReference = {
    pressReleases: [],
    opportunities: [],
    enums: {
        pressReleaseStatus: ["DRAFT", "APPROVED", "SUBMITTED", "PUBLISHED"],
        opportunityType: ["PODCAST", "INTERVIEW", "GUEST_POST", "MEDIA_MENTION", "AWARD"],
        pitchStatus: ["IDENTIFIED", "PITCHED", "ACCEPTED", "COMPLETED", "DECLINED"],
        mentionType: ["MEDIA_MENTION", "BACKLINK", "PODCAST_APPEARANCE", "PRESS_RELEASE_PICKUP"],
    },
    labels: {
        pressReleaseStatus: {},
        opportunityType: {},
        pitchStatus: {},
        mentionType: {},
    },
};

function formatDate(value: string | null | undefined) {
    if (!value) return "-";
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "-";
    return date.toLocaleDateString();
}

function formatDateTime(value: string | null | undefined) {
    if (!value) return "-";
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "-";
    return date.toLocaleString();
}

function toDateInput(value: string | null | undefined) {
    if (!value) return "";
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
}

function toDateTimeInput(value: string | null | undefined) {
    if (!value) return "";
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "";
    const tzOffset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}

function statusBadge(status: PressReleaseStatus) {
    if (status === "PUBLISHED") return <Badge className="bg-emerald-600">Published</Badge>;
    if (status === "SUBMITTED") return <Badge className="bg-sky-600">Submitted</Badge>;
    if (status === "APPROVED") return <Badge className="bg-amber-600">Approved</Badge>;
    return <Badge variant="secondary">Draft</Badge>;
}

function pitchStatusBadge(status: PrPitchStatus) {
    if (status === "COMPLETED") return <Badge className="bg-emerald-600">Completed</Badge>;
    if (status === "ACCEPTED") return <Badge className="bg-sky-600">Accepted</Badge>;
    if (status === "PITCHED") return <Badge className="bg-amber-600">Pitched</Badge>;
    if (status === "DECLINED") return <Badge variant="outline">Declined</Badge>;
    return <Badge variant="secondary">Identified</Badge>;
}

function copyIconButton(onClick: () => void, disabled = false) {
    return (
        <Button type="button" variant="outline" size="sm" onClick={onClick} disabled={disabled}>
            <ClipboardCopy className="h-4 w-4 mr-2" />
            Copy
        </Button>
    );
}

export function PrManager() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const [dashboard, setDashboard] = useState<PrDashboard>(EMPTY_DASHBOARD);
    const [reference, setReference] = useState<PrReference>(EMPTY_REFERENCE);
    const [boilerplate, setBoilerplate] = useState<PrBoilerplate | null>(null);

    const [releases, setReleases] = useState<PressRelease[]>([]);
    const [opportunities, setOpportunities] = useState<PrOpportunity[]>([]);
    const [mentions, setMentions] = useState<PrMention[]>([]);

    const [releaseForm, setReleaseForm] = useState<PressReleaseForm>(DEFAULT_PR_FORM);
    const [opportunityForm, setOpportunityForm] = useState<OpportunityForm>(DEFAULT_OPPORTUNITY_FORM);
    const [mentionForm, setMentionForm] = useState<MentionForm>(DEFAULT_MENTION_FORM);

    const [generatingRelease, setGeneratingRelease] = useState(false);
    const [savingRelease, setSavingRelease] = useState(false);
    const [deletingReleaseId, setDeletingReleaseId] = useState<string | null>(null);

    const [generatingPitch, setGeneratingPitch] = useState(false);
    const [savingOpportunity, setSavingOpportunity] = useState(false);
    const [deletingOpportunityId, setDeletingOpportunityId] = useState<string | null>(null);

    const [savingMention, setSavingMention] = useState(false);
    const [deletingMentionId, setDeletingMentionId] = useState<string | null>(null);

    const [savingBoilerplate, setSavingBoilerplate] = useState(false);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    const calendarRows = useMemo(() => {
        const rows: Array<{
            id: string;
            kind: "PRESS_RELEASE" | "OPPORTUNITY";
            date: string;
            title: string;
            status: string;
            metadata?: string;
        }> = [];

        for (const release of dashboard.calendar.pressReleases || []) {
            rows.push({
                id: `pr-${release.id}`,
                kind: "PRESS_RELEASE",
                date: release.date,
                title: release.headline,
                status: release.status,
                metadata: `${release.submittedOutletsCount} outlets · ${release.publishedUrlsCount} published links`,
            });
        }

        for (const opportunity of dashboard.calendar.opportunities || []) {
            if (!opportunity.date) continue;
            rows.push({
                id: `opp-${opportunity.id}`,
                kind: "OPPORTUNITY",
                date: opportunity.date,
                title: opportunity.outletName,
                status: opportunity.pitchStatus,
                metadata: reference.labels.opportunityType[opportunity.opportunityType] || opportunity.opportunityType,
            });
        }

        return rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [dashboard.calendar.opportunities, dashboard.calendar.pressReleases, reference.labels.opportunityType]);

    async function copyText(key: string, value: string) {
        const text = String(value || "").trim();
        if (!text) return;

        try {
            await navigator.clipboard.writeText(text);
            setCopiedKey(key);
            setMessage("Copied to clipboard.");
            setTimeout(() => {
                setCopiedKey((prev) => (prev === key ? null : prev));
            }, 1400);
        } catch {
            setError("Copy failed in this browser context.");
        }
    }

    function normalizeSnippetList(input: unknown): BoilerplateSnippet[] {
        if (!Array.isArray(input)) return [];
        return input
            .filter((item) => item && typeof item === "object")
            .map((item, index) => {
                const obj = item as Record<string, unknown>;
                return {
                    id: String(obj.id || `snippet-${index + 1}`),
                    name: String(obj.name || "").trim(),
                    snippet: String(obj.snippet || "").trim(),
                };
            })
            .filter((item) => item.name || item.snippet);
    }

    function hydrateBoilerplate(raw: any): PrBoilerplate {
        return {
            id: String(raw?.id || ""),
            key: String(raw?.key || "default"),
            aboutBoilerplate: String(raw?.aboutBoilerplate || ""),
            physicianBioSnippets: normalizeSnippetList(raw?.physicianBioSnippets),
            mediaContactName: raw?.mediaContactName ? String(raw.mediaContactName) : null,
            mediaContactEmail: raw?.mediaContactEmail ? String(raw.mediaContactEmail) : null,
            mediaContactPhone: raw?.mediaContactPhone ? String(raw.mediaContactPhone) : null,
            logoUrl: raw?.logoUrl ? String(raw.logoUrl) : null,
            headshotUrl: raw?.headshotUrl ? String(raw.headshotUrl) : null,
            updatedAt: String(raw?.updatedAt || new Date().toISOString()),
        };
    }

    function patchBoilerplate(patch: Partial<PrBoilerplate>) {
        setBoilerplate((prev) => {
            if (!prev) return prev;
            return { ...prev, ...patch };
        });
    }

    function applyReleaseToForm(release: PressRelease) {
        setReleaseForm({
            id: release.id,
            headlineTopic: release.headlineTopic || "",
            targetAngle: release.targetAngle || "",
            keyFacts: release.keyFacts || "",
            headline: release.headline || "",
            subheadline: release.subheadline || "",
            datelineCity: release.datelineCity || "",
            datelineDate: toDateInput(release.datelineDate),
            leadParagraph: release.leadParagraph || "",
            body: release.body || "",
            physicianQuote: release.physicianQuote || "",
            boilerplate: release.boilerplate || boilerplate?.aboutBoilerplate || "",
            mediaContactName: release.mediaContactName || boilerplate?.mediaContactName || "",
            mediaContactEmail: release.mediaContactEmail || boilerplate?.mediaContactEmail || "",
            mediaContactPhone: release.mediaContactPhone || boilerplate?.mediaContactPhone || "",
            status: release.status,
            submittedOutlets: (release.submittedOutlets || []).join("\n"),
            publishedUrls: (release.publishedUrls || []).join("\n"),
            scheduledFor: toDateTimeInput(release.scheduledFor),
            submittedAt: toDateTimeInput(release.submittedAt),
            publishedAt: toDateTimeInput(release.publishedAt),
            llmProvider: release.llmProvider || "",
            llmModel: release.llmModel || "",
            llmPrompt: release.llmPrompt || "",
            llmResponse: release.llmResponse || "",
        });
    }

    function applyDraftToReleaseForm(draft: PressReleaseDraftResponse) {
        setReleaseForm((prev) => ({
            ...prev,
            id: "",
            headlineTopic: draft.headlineTopic || prev.headlineTopic,
            targetAngle: draft.targetAngle || "",
            keyFacts: draft.keyFacts || "",
            headline: draft.headline || "",
            subheadline: draft.subheadline || "",
            datelineCity: draft.datelineCity || "",
            datelineDate: toDateInput(draft.datelineDate),
            leadParagraph: draft.leadParagraph || "",
            body: draft.body || "",
            physicianQuote: draft.physicianQuote || "",
            boilerplate: draft.boilerplate || boilerplate?.aboutBoilerplate || "",
            mediaContactName: draft.mediaContactName || boilerplate?.mediaContactName || "",
            mediaContactEmail: draft.mediaContactEmail || boilerplate?.mediaContactEmail || "",
            mediaContactPhone: draft.mediaContactPhone || boilerplate?.mediaContactPhone || "",
            status: "DRAFT",
            llmProvider: draft.llmProvider || "",
            llmModel: draft.llmModel || "",
            llmPrompt: draft.llmPrompt || "",
            llmResponse: draft.llmResponse || "",
        }));
    }

    function applyOpportunityToForm(opportunity: PrOpportunity) {
        setOpportunityForm({
            id: opportunity.id,
            opportunityType: opportunity.opportunityType,
            outletName: opportunity.outletName || "",
            contactName: opportunity.contactName || "",
            contactEmail: opportunity.contactEmail || "",
            pitchStatus: opportunity.pitchStatus,
            pitchText: opportunity.pitchText || "",
            resultUrl: opportunity.resultUrl || "",
            date: toDateInput(opportunity.date),
            notes: opportunity.notes || "",
            storyAngle: "",
            keyContext: "",
            llmProvider: opportunity.llmProvider || "",
            llmModel: opportunity.llmModel || "",
            llmPrompt: opportunity.llmPrompt || "",
            llmResponse: opportunity.llmResponse || "",
        });
    }

    function applyMentionToForm(mention: PrMention) {
        setMentionForm({
            id: mention.id,
            mentionType: mention.mentionType,
            title: mention.title,
            sourceName: mention.sourceName || "",
            url: mention.url,
            mentionDate: toDateInput(mention.mentionDate),
            notes: mention.notes || "",
            pressReleaseId: mention.pressReleaseId || "",
            opportunityId: mention.opportunityId || "",
        });
    }

    async function loadAll() {
        setLoading(true);
        setError(null);

        try {
            const [
                dashboardRes,
                referenceRes,
                boilerplateRes,
                releasesRes,
                opportunitiesRes,
                mentionsRes,
            ] = await Promise.all([
                fetch("/api/admin/pr/dashboard", { cache: "no-store" }),
                fetch("/api/admin/pr/reference", { cache: "no-store" }),
                fetch("/api/admin/pr/boilerplate", { cache: "no-store" }),
                fetch("/api/admin/pr/press-releases?limit=250", { cache: "no-store" }),
                fetch("/api/admin/pr/opportunities?limit=250", { cache: "no-store" }),
                fetch("/api/admin/pr/mentions?limit=300", { cache: "no-store" }),
            ]);

            const [
                dashboardData,
                referenceData,
                boilerplateData,
                releasesData,
                opportunitiesData,
                mentionsData,
            ] = await Promise.all([
                dashboardRes.json().catch(() => null),
                referenceRes.json().catch(() => null),
                boilerplateRes.json().catch(() => null),
                releasesRes.json().catch(() => null),
                opportunitiesRes.json().catch(() => null),
                mentionsRes.json().catch(() => null),
            ]);

            if (!dashboardRes.ok || !dashboardData?.success) {
                throw new Error(dashboardData?.error || "Failed to load PR dashboard");
            }
            if (!referenceRes.ok || !referenceData?.success) {
                throw new Error(referenceData?.error || "Failed to load PR reference");
            }
            if (!boilerplateRes.ok || !boilerplateData?.success) {
                throw new Error(boilerplateData?.error || "Failed to load PR boilerplate");
            }
            if (!releasesRes.ok || !releasesData?.success) {
                throw new Error(releasesData?.error || "Failed to load press releases");
            }
            if (!opportunitiesRes.ok || !opportunitiesData?.success) {
                throw new Error(opportunitiesData?.error || "Failed to load opportunities");
            }
            if (!mentionsRes.ok || !mentionsData?.success) {
                throw new Error(mentionsData?.error || "Failed to load mentions");
            }

            setDashboard((dashboardData.dashboard as PrDashboard) || EMPTY_DASHBOARD);
            setReference((referenceData.reference as PrReference) || EMPTY_REFERENCE);
            const nextBoilerplate = hydrateBoilerplate(boilerplateData.boilerplate);
            setBoilerplate(nextBoilerplate);
            setReleases((Array.isArray(releasesData.releases) ? releasesData.releases : []) as PressRelease[]);
            setOpportunities((Array.isArray(opportunitiesData.opportunities)
                ? opportunitiesData.opportunities
                : []) as PrOpportunity[]);
            setMentions((Array.isArray(mentionsData.mentions) ? mentionsData.mentions : []) as PrMention[]);

            setReleaseForm((prev) => ({
                ...prev,
                boilerplate: prev.boilerplate || nextBoilerplate.aboutBoilerplate,
                mediaContactName: prev.mediaContactName || nextBoilerplate.mediaContactName || "",
                mediaContactEmail: prev.mediaContactEmail || nextBoilerplate.mediaContactEmail || "",
                mediaContactPhone: prev.mediaContactPhone || nextBoilerplate.mediaContactPhone || "",
            }));
        } catch (e: any) {
            setError(e?.message || "Failed to load PR manager");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function refreshData() {
        setRefreshing(true);
        setMessage(null);
        await loadAll();
        setRefreshing(false);
    }

    async function generatePressReleaseDraft() {
        if (!releaseForm.headlineTopic.trim()) {
            setError("Headline topic is required to generate a draft.");
            return;
        }

        setGeneratingRelease(true);
        setError(null);

        try {
            const res = await fetch("/api/admin/pr/press-releases/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    headlineTopic: releaseForm.headlineTopic,
                    keyFacts: releaseForm.keyFacts,
                    targetAngle: releaseForm.targetAngle,
                }),
            });

            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Failed to generate draft");
            }

            applyDraftToReleaseForm(data.draft as PressReleaseDraftResponse);
            setMessage(
                `Press release draft generated via ${(data.generation?.provider || "LLM").toString()}.`
            );
        } catch (e: any) {
            setError(e?.message || "Failed to generate press release draft");
        } finally {
            setGeneratingRelease(false);
        }
    }

    async function savePressRelease() {
        if (!releaseForm.headlineTopic.trim() || !releaseForm.headline.trim() || !releaseForm.body.trim()) {
            setError("Headline topic, headline, and body are required.");
            return;
        }

        setSavingRelease(true);
        setError(null);

        try {
            const payload = {
                headlineTopic: releaseForm.headlineTopic,
                targetAngle: releaseForm.targetAngle || null,
                keyFacts: releaseForm.keyFacts || null,
                headline: releaseForm.headline,
                subheadline: releaseForm.subheadline || null,
                datelineCity: releaseForm.datelineCity || null,
                datelineDate: releaseForm.datelineDate || null,
                leadParagraph: releaseForm.leadParagraph || null,
                body: releaseForm.body,
                physicianQuote: releaseForm.physicianQuote || null,
                boilerplate: releaseForm.boilerplate || null,
                mediaContactName: releaseForm.mediaContactName || null,
                mediaContactEmail: releaseForm.mediaContactEmail || null,
                mediaContactPhone: releaseForm.mediaContactPhone || null,
                status: releaseForm.status,
                submittedOutlets: releaseForm.submittedOutlets,
                publishedUrls: releaseForm.publishedUrls,
                scheduledFor: releaseForm.scheduledFor || null,
                submittedAt: releaseForm.submittedAt || null,
                publishedAt: releaseForm.publishedAt || null,
                llmProvider: releaseForm.llmProvider || null,
                llmModel: releaseForm.llmModel || null,
                llmPrompt: releaseForm.llmPrompt || null,
                llmResponse: releaseForm.llmResponse || null,
            };

            const isUpdate = Boolean(releaseForm.id);
            const endpoint = isUpdate
                ? `/api/admin/pr/press-releases/${releaseForm.id}`
                : "/api/admin/pr/press-releases";
            const method = isUpdate ? "PATCH" : "POST";

            const res = await fetch(endpoint, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Failed to save press release");
            }

            const saved = (data.release || data.pressRelease) as PressRelease;
            if (!saved?.id) {
                await refreshData();
            } else {
                setReleases((prev) => {
                    if (isUpdate) {
                        return prev.map((item) => (item.id === saved.id ? { ...item, ...saved } : item));
                    }
                    return [saved, ...prev];
                });
                applyReleaseToForm(saved);
                await refreshData();
            }

            setMessage(isUpdate ? "Press release updated." : "Press release created.");
        } catch (e: any) {
            setError(e?.message || "Failed to save press release");
        } finally {
            setSavingRelease(false);
        }
    }

    async function deletePressRelease(id: string) {
        if (!confirm("Delete this press release? This cannot be undone.")) return;

        setDeletingReleaseId(id);
        setError(null);

        try {
            const res = await fetch(`/api/admin/pr/press-releases/${id}`, { method: "DELETE" });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Failed to delete press release");
            }

            setReleases((prev) => prev.filter((item) => item.id !== id));
            if (releaseForm.id === id) {
                setReleaseForm({
                    ...DEFAULT_PR_FORM,
                    boilerplate: boilerplate?.aboutBoilerplate || "",
                    mediaContactName: boilerplate?.mediaContactName || "",
                    mediaContactEmail: boilerplate?.mediaContactEmail || "",
                    mediaContactPhone: boilerplate?.mediaContactPhone || "",
                });
            }
            setMessage("Press release deleted.");
            await refreshData();
        } catch (e: any) {
            setError(e?.message || "Failed to delete press release");
        } finally {
            setDeletingReleaseId(null);
        }
    }

    async function generatePitch() {
        if (!opportunityForm.outletName.trim()) {
            setError("Outlet name is required to draft a pitch.");
            return;
        }

        setGeneratingPitch(true);
        setError(null);

        try {
            const res = await fetch("/api/admin/pr/opportunities/generate-pitch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    outletName: opportunityForm.outletName,
                    opportunityType: opportunityForm.opportunityType,
                    contactName: opportunityForm.contactName || undefined,
                    storyAngle: opportunityForm.storyAngle || undefined,
                    keyContext: opportunityForm.keyContext || opportunityForm.notes || undefined,
                }),
            });

            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Failed to generate pitch");
            }

            const pitch = data.pitch as OpportunityPitchResponse;
            const mergedPitchText = [
                `Subject: ${pitch.subject}`,
                "",
                pitch.emailBody,
                "",
                `Follow-up subject: ${pitch.followUpSubject}`,
                "",
                pitch.followUpBody,
            ]
                .filter(Boolean)
                .join("\n");

            setOpportunityForm((prev) => ({
                ...prev,
                pitchText: mergedPitchText,
                llmProvider: pitch.llmProvider || "",
                llmModel: pitch.llmModel || "",
                llmPrompt: pitch.llmPrompt || "",
                llmResponse: pitch.llmResponse || "",
            }));

            setMessage(`Pitch draft generated via ${(pitch.llmProvider || "LLM").toString()}.`);
        } catch (e: any) {
            setError(e?.message || "Failed to generate pitch");
        } finally {
            setGeneratingPitch(false);
        }
    }

    async function saveOpportunity() {
        if (!opportunityForm.outletName.trim()) {
            setError("Outlet name is required.");
            return;
        }

        setSavingOpportunity(true);
        setError(null);

        try {
            const payload = {
                opportunityType: opportunityForm.opportunityType,
                outletName: opportunityForm.outletName,
                contactName: opportunityForm.contactName || null,
                contactEmail: opportunityForm.contactEmail || null,
                pitchStatus: opportunityForm.pitchStatus,
                pitchText: opportunityForm.pitchText || null,
                resultUrl: opportunityForm.resultUrl || null,
                date: opportunityForm.date || null,
                notes: opportunityForm.notes || null,
                llmProvider: opportunityForm.llmProvider || null,
                llmModel: opportunityForm.llmModel || null,
                llmPrompt: opportunityForm.llmPrompt || null,
                llmResponse: opportunityForm.llmResponse || null,
            };

            const isUpdate = Boolean(opportunityForm.id);
            const endpoint = isUpdate
                ? `/api/admin/pr/opportunities/${opportunityForm.id}`
                : "/api/admin/pr/opportunities";
            const method = isUpdate ? "PATCH" : "POST";

            const res = await fetch(endpoint, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Failed to save opportunity");
            }

            const saved = data.opportunity as PrOpportunity;
            if (!saved?.id) {
                await refreshData();
            } else {
                setOpportunities((prev) => {
                    if (isUpdate) {
                        return prev.map((item) => (item.id === saved.id ? { ...item, ...saved } : item));
                    }
                    return [saved, ...prev];
                });
                applyOpportunityToForm(saved);
                await refreshData();
            }

            setMessage(isUpdate ? "Opportunity updated." : "Opportunity created.");
        } catch (e: any) {
            setError(e?.message || "Failed to save opportunity");
        } finally {
            setSavingOpportunity(false);
        }
    }

    async function deleteOpportunity(id: string) {
        if (!confirm("Delete this opportunity? This cannot be undone.")) return;

        setDeletingOpportunityId(id);
        setError(null);

        try {
            const res = await fetch(`/api/admin/pr/opportunities/${id}`, { method: "DELETE" });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Failed to delete opportunity");
            }

            setOpportunities((prev) => prev.filter((item) => item.id !== id));
            if (opportunityForm.id === id) {
                setOpportunityForm(DEFAULT_OPPORTUNITY_FORM);
            }
            setMessage("Opportunity deleted.");
            await refreshData();
        } catch (e: any) {
            setError(e?.message || "Failed to delete opportunity");
        } finally {
            setDeletingOpportunityId(null);
        }
    }

    async function saveMention() {
        if (!mentionForm.title.trim() || !mentionForm.url.trim()) {
            setError("Title and URL are required.");
            return;
        }

        setSavingMention(true);
        setError(null);

        try {
            const payload = {
                mentionType: mentionForm.mentionType,
                title: mentionForm.title,
                sourceName: mentionForm.sourceName || null,
                url: mentionForm.url,
                mentionDate: mentionForm.mentionDate || null,
                notes: mentionForm.notes || null,
                pressReleaseId: mentionForm.pressReleaseId || null,
                opportunityId: mentionForm.opportunityId || null,
            };

            const isUpdate = Boolean(mentionForm.id);
            const endpoint = isUpdate ? `/api/admin/pr/mentions/${mentionForm.id}` : "/api/admin/pr/mentions";
            const method = isUpdate ? "PATCH" : "POST";

            const res = await fetch(endpoint, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Failed to save mention");
            }

            const saved = data.mention as PrMention;
            if (!saved?.id) {
                await refreshData();
            } else {
                setMentions((prev) => {
                    if (isUpdate) {
                        return prev.map((item) => (item.id === saved.id ? { ...item, ...saved } : item));
                    }
                    return [saved, ...prev];
                });
                applyMentionToForm(saved);
                await refreshData();
            }

            setMessage(isUpdate ? "Mention updated." : "Mention created.");
        } catch (e: any) {
            setError(e?.message || "Failed to save mention");
        } finally {
            setSavingMention(false);
        }
    }

    async function deleteMention(id: string) {
        if (!confirm("Delete this mention? This cannot be undone.")) return;

        setDeletingMentionId(id);
        setError(null);

        try {
            const res = await fetch(`/api/admin/pr/mentions/${id}`, { method: "DELETE" });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Failed to delete mention");
            }

            setMentions((prev) => prev.filter((item) => item.id !== id));
            if (mentionForm.id === id) {
                setMentionForm(DEFAULT_MENTION_FORM);
            }
            setMessage("Mention deleted.");
            await refreshData();
        } catch (e: any) {
            setError(e?.message || "Failed to delete mention");
        } finally {
            setDeletingMentionId(null);
        }
    }

    async function saveBoilerplate() {
        if (!boilerplate) return;

        setSavingBoilerplate(true);
        setError(null);

        try {
            const res = await fetch("/api/admin/pr/boilerplate", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    aboutBoilerplate: boilerplate.aboutBoilerplate,
                    physicianBioSnippets: boilerplate.physicianBioSnippets,
                    mediaContactName: boilerplate.mediaContactName,
                    mediaContactEmail: boilerplate.mediaContactEmail,
                    mediaContactPhone: boilerplate.mediaContactPhone,
                    logoUrl: boilerplate.logoUrl,
                    headshotUrl: boilerplate.headshotUrl,
                }),
            });

            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Failed to update boilerplate");
            }

            const saved = hydrateBoilerplate(data.boilerplate);
            setBoilerplate(saved);
            setMessage("Boilerplate updated.");
        } catch (e: any) {
            setError(e?.message || "Failed to update boilerplate");
        } finally {
            setSavingBoilerplate(false);
        }
    }

    const activePressReleases = releases.filter((item) => item.status !== "DRAFT").length;

    if (loading) {
        return (
            <div className="flex justify-center p-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Megaphone className="h-7 w-7 text-primary" />
                        PR Management
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Draft press releases, manage PR opportunities, track mentions/backlinks, and plan monthly PR cadence.
                    </p>
                </div>
                <Button variant="outline" onClick={() => void refreshData()} disabled={refreshing}>
                    {refreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    Refresh
                </Button>
            </div>

            {error ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div>
            ) : null}
            {message ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{message}</div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Press Releases Sent</CardTitle>
                        <CardDescription>{activePressReleases} active records</CardDescription>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold">{dashboard.efforts.pressReleasesSent}</CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Pitches Made</CardTitle>
                        <CardDescription>{dashboard.efforts.opportunitiesIdentified} identified opportunities</CardDescription>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold">{dashboard.efforts.pitchesMade}</CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Mentions</CardTitle>
                        <CardDescription>{dashboard.results.backlinks} backlinks tracked</CardDescription>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold">{dashboard.results.mentions}</CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Podcast Appearances</CardTitle>
                        <CardDescription>Public speaking footprint</CardDescription>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold">{dashboard.results.podcastAppearances}</CardContent>
                </Card>
            </div>

            {dashboard.noPressReleaseScheduledThisMonth ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    No press release scheduled for this month.
                </div>
            ) : null}

            <Tabs defaultValue="press" className="space-y-4">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="press">Press Releases</TabsTrigger>
                    <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
                    <TabsTrigger value="mentions">Mentions + ROI</TabsTrigger>
                    <TabsTrigger value="calendar">Monthly Calendar</TabsTrigger>
                    <TabsTrigger value="boilerplate">Boilerplate</TabsTrigger>
                </TabsList>

                <TabsContent value="press" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-primary" />
                                New Press Release Drafting
                            </CardTitle>
                            <CardDescription>
                                Enter topic, key facts, and angle to draft a release. Edit before saving and updating status.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2 md:col-span-2">
                                    <Label htmlFor="prHeadlineTopic">Headline topic</Label>
                                    <Input
                                        id="prHeadlineTopic"
                                        value={releaseForm.headlineTopic}
                                        onChange={(e) =>
                                            setReleaseForm((prev) => ({ ...prev, headlineTopic: e.target.value }))
                                        }
                                        placeholder="Announce a new state launch, employer milestone, or practice update"
                                    />
                                </div>
                                <div className="grid gap-2 md:col-span-2">
                                    <Label htmlFor="prKeyFacts">Key facts / announcements</Label>
                                    <Textarea
                                        id="prKeyFacts"
                                        value={releaseForm.keyFacts}
                                        onChange={(e) =>
                                            setReleaseForm((prev) => ({ ...prev, keyFacts: e.target.value }))
                                        }
                                        rows={4}
                                        placeholder="Bullet-style facts, metrics, and launch details"
                                    />
                                </div>
                                <div className="grid gap-2 md:col-span-2">
                                    <Label htmlFor="prTargetAngle">Target angle</Label>
                                    <Input
                                        id="prTargetAngle"
                                        value={releaseForm.targetAngle}
                                        onChange={(e) =>
                                            setReleaseForm((prev) => ({ ...prev, targetAngle: e.target.value }))
                                        }
                                        placeholder="What should media care about most?"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                <Button type="button" variant="outline" onClick={() => void generatePressReleaseDraft()} disabled={generatingRelease}>
                                    {generatingRelease ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Sparkles className="h-4 w-4 mr-2" />
                                    )}
                                    Generate Draft
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() =>
                                        setReleaseForm({
                                            ...DEFAULT_PR_FORM,
                                            boilerplate: boilerplate?.aboutBoilerplate || "",
                                            mediaContactName: boilerplate?.mediaContactName || "",
                                            mediaContactEmail: boilerplate?.mediaContactEmail || "",
                                            mediaContactPhone: boilerplate?.mediaContactPhone || "",
                                        })
                                    }
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    New Blank Draft
                                </Button>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2 md:col-span-2">
                                    <Label htmlFor="prHeadline">Headline</Label>
                                    <Input
                                        id="prHeadline"
                                        value={releaseForm.headline}
                                        onChange={(e) =>
                                            setReleaseForm((prev) => ({ ...prev, headline: e.target.value }))
                                        }
                                    />
                                </div>
                                <div className="grid gap-2 md:col-span-2">
                                    <Label htmlFor="prSubheadline">Subheadline</Label>
                                    <Input
                                        id="prSubheadline"
                                        value={releaseForm.subheadline}
                                        onChange={(e) =>
                                            setReleaseForm((prev) => ({ ...prev, subheadline: e.target.value }))
                                        }
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="prDatelineCity">Dateline city</Label>
                                    <Input
                                        id="prDatelineCity"
                                        value={releaseForm.datelineCity}
                                        onChange={(e) =>
                                            setReleaseForm((prev) => ({ ...prev, datelineCity: e.target.value }))
                                        }
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="prDatelineDate">Dateline date</Label>
                                    <Input
                                        id="prDatelineDate"
                                        type="date"
                                        value={releaseForm.datelineDate}
                                        onChange={(e) =>
                                            setReleaseForm((prev) => ({ ...prev, datelineDate: e.target.value }))
                                        }
                                    />
                                </div>
                                <div className="grid gap-2 md:col-span-2">
                                    <Label htmlFor="prLeadParagraph">Lead paragraph</Label>
                                    <Textarea
                                        id="prLeadParagraph"
                                        value={releaseForm.leadParagraph}
                                        onChange={(e) =>
                                            setReleaseForm((prev) => ({ ...prev, leadParagraph: e.target.value }))
                                        }
                                        rows={4}
                                    />
                                </div>
                                <div className="grid gap-2 md:col-span-2">
                                    <Label htmlFor="prBody">Body (rich text/long-form)</Label>
                                    <Textarea
                                        id="prBody"
                                        value={releaseForm.body}
                                        onChange={(e) =>
                                            setReleaseForm((prev) => ({ ...prev, body: e.target.value }))
                                        }
                                        rows={14}
                                    />
                                </div>
                                <div className="grid gap-2 md:col-span-2">
                                    <Label htmlFor="prQuote">Physician quote</Label>
                                    <Textarea
                                        id="prQuote"
                                        value={releaseForm.physicianQuote}
                                        onChange={(e) =>
                                            setReleaseForm((prev) => ({ ...prev, physicianQuote: e.target.value }))
                                        }
                                        rows={3}
                                    />
                                </div>
                                <div className="grid gap-2 md:col-span-2">
                                    <Label htmlFor="prBoilerplate">About Present Health boilerplate</Label>
                                    <Textarea
                                        id="prBoilerplate"
                                        value={releaseForm.boilerplate}
                                        onChange={(e) =>
                                            setReleaseForm((prev) => ({ ...prev, boilerplate: e.target.value }))
                                        }
                                        rows={5}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="prStatus">Status</Label>
                                    <select
                                        id="prStatus"
                                        value={releaseForm.status}
                                        onChange={(e) =>
                                            setReleaseForm((prev) => ({
                                                ...prev,
                                                status: e.target.value as PressReleaseStatus,
                                            }))
                                        }
                                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                    >
                                        {reference.enums.pressReleaseStatus.map((status) => (
                                            <option key={status} value={status}>
                                                {reference.labels.pressReleaseStatus[status] || status}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="prScheduledFor">Scheduled for</Label>
                                    <Input
                                        id="prScheduledFor"
                                        type="datetime-local"
                                        value={releaseForm.scheduledFor}
                                        onChange={(e) =>
                                            setReleaseForm((prev) => ({ ...prev, scheduledFor: e.target.value }))
                                        }
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="prSubmittedAt">Submitted at</Label>
                                    <Input
                                        id="prSubmittedAt"
                                        type="datetime-local"
                                        value={releaseForm.submittedAt}
                                        onChange={(e) =>
                                            setReleaseForm((prev) => ({ ...prev, submittedAt: e.target.value }))
                                        }
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="prPublishedAt">Published at</Label>
                                    <Input
                                        id="prPublishedAt"
                                        type="datetime-local"
                                        value={releaseForm.publishedAt}
                                        onChange={(e) =>
                                            setReleaseForm((prev) => ({ ...prev, publishedAt: e.target.value }))
                                        }
                                    />
                                </div>
                                <div className="grid gap-2 md:col-span-2">
                                    <Label htmlFor="prSubmittedOutlets">Submitted outlets (one per line)</Label>
                                    <Textarea
                                        id="prSubmittedOutlets"
                                        value={releaseForm.submittedOutlets}
                                        onChange={(e) =>
                                            setReleaseForm((prev) => ({ ...prev, submittedOutlets: e.target.value }))
                                        }
                                        rows={3}
                                    />
                                </div>
                                <div className="grid gap-2 md:col-span-2">
                                    <Label htmlFor="prPublishedUrls">Published URLs (one per line)</Label>
                                    <Textarea
                                        id="prPublishedUrls"
                                        value={releaseForm.publishedUrls}
                                        onChange={(e) =>
                                            setReleaseForm((prev) => ({ ...prev, publishedUrls: e.target.value }))
                                        }
                                        rows={3}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="prMediaContactName">Media contact name</Label>
                                    <Input
                                        id="prMediaContactName"
                                        value={releaseForm.mediaContactName}
                                        onChange={(e) =>
                                            setReleaseForm((prev) => ({ ...prev, mediaContactName: e.target.value }))
                                        }
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="prMediaContactEmail">Media contact email</Label>
                                    <Input
                                        id="prMediaContactEmail"
                                        type="email"
                                        value={releaseForm.mediaContactEmail}
                                        onChange={(e) =>
                                            setReleaseForm((prev) => ({ ...prev, mediaContactEmail: e.target.value }))
                                        }
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="prMediaContactPhone">Media contact phone</Label>
                                    <Input
                                        id="prMediaContactPhone"
                                        value={releaseForm.mediaContactPhone}
                                        onChange={(e) =>
                                            setReleaseForm((prev) => ({ ...prev, mediaContactPhone: e.target.value }))
                                        }
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>LLM source</Label>
                                    <div className="h-10 rounded-md border border-input bg-muted/30 px-3 text-sm flex items-center">
                                        {releaseForm.llmProvider || "-"} {releaseForm.llmModel ? `(${releaseForm.llmModel})` : ""}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                <Button type="button" onClick={() => void savePressRelease()} disabled={savingRelease}>
                                    {savingRelease ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                    {releaseForm.id ? "Update Press Release" : "Create Press Release"}
                                </Button>
                                {releaseForm.id ? (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => void deletePressRelease(releaseForm.id)}
                                        disabled={deletingReleaseId === releaseForm.id}
                                    >
                                        {deletingReleaseId === releaseForm.id ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-4 w-4 mr-2" />
                                        )}
                                        Delete
                                    </Button>
                                ) : null}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Press Releases</CardTitle>
                            <CardDescription>Track draft, approved, submitted, and published releases.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {releases.length ? (
                                <div className="overflow-x-auto rounded-lg border">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/40 text-left">
                                            <tr>
                                                <th className="px-3 py-2">Headline</th>
                                                <th className="px-3 py-2">Status</th>
                                                <th className="px-3 py-2">Scheduled</th>
                                                <th className="px-3 py-2">Mentions</th>
                                                <th className="px-3 py-2">Submitted/Picked up</th>
                                                <th className="px-3 py-2 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {releases.map((release) => (
                                                <tr key={release.id} className="border-t">
                                                    <td className="px-3 py-2 align-top">
                                                        <div className="font-medium">{release.headline || "(untitled)"}</div>
                                                        <div className="text-xs text-muted-foreground line-clamp-1">
                                                            {release.headlineTopic}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2 align-top">{statusBadge(release.status)}</td>
                                                    <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                                                        {formatDateTime(release.scheduledFor || release.datelineDate)}
                                                    </td>
                                                    <td className="px-3 py-2 align-top">{release._count?.mentions || 0}</td>
                                                    <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                                                        {(release.submittedOutlets || []).length} outlets / {(release.publishedUrls || []).length} urls
                                                    </td>
                                                    <td className="px-3 py-2 align-top text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => applyReleaseToForm(release)}
                                                            >
                                                                Edit
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                className="text-red-600"
                                                                onClick={() => void deletePressRelease(release.id)}
                                                                disabled={deletingReleaseId === release.id}
                                                            >
                                                                {deletingReleaseId === release.id ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    "Delete"
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                                    No press releases yet.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="opportunities" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>PR Opportunity Tracker</CardTitle>
                            <CardDescription>
                                Track outreach by outlet, generate personalized pitches, and manage pitch status.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="oppType">Opportunity type</Label>
                                    <select
                                        id="oppType"
                                        value={opportunityForm.opportunityType}
                                        onChange={(e) =>
                                            setOpportunityForm((prev) => ({
                                                ...prev,
                                                opportunityType: e.target.value as PrOpportunityType,
                                            }))
                                        }
                                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                    >
                                        {reference.enums.opportunityType.map((value) => (
                                            <option key={value} value={value}>
                                                {reference.labels.opportunityType[value] || value}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="oppStatus">Pitch status</Label>
                                    <select
                                        id="oppStatus"
                                        value={opportunityForm.pitchStatus}
                                        onChange={(e) =>
                                            setOpportunityForm((prev) => ({
                                                ...prev,
                                                pitchStatus: e.target.value as PrPitchStatus,
                                            }))
                                        }
                                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                    >
                                        {reference.enums.pitchStatus.map((value) => (
                                            <option key={value} value={value}>
                                                {reference.labels.pitchStatus[value] || value}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid gap-2 md:col-span-2">
                                    <Label htmlFor="oppOutlet">Outlet name</Label>
                                    <Input
                                        id="oppOutlet"
                                        value={opportunityForm.outletName}
                                        onChange={(e) =>
                                            setOpportunityForm((prev) => ({ ...prev, outletName: e.target.value }))
                                        }
                                        placeholder="Podcast or publication name"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="oppContactName">Contact name</Label>
                                    <Input
                                        id="oppContactName"
                                        value={opportunityForm.contactName}
                                        onChange={(e) =>
                                            setOpportunityForm((prev) => ({ ...prev, contactName: e.target.value }))
                                        }
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="oppContactEmail">Contact email</Label>
                                    <Input
                                        id="oppContactEmail"
                                        type="email"
                                        value={opportunityForm.contactEmail}
                                        onChange={(e) =>
                                            setOpportunityForm((prev) => ({ ...prev, contactEmail: e.target.value }))
                                        }
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="oppDate">Opportunity date / deadline</Label>
                                    <Input
                                        id="oppDate"
                                        type="date"
                                        value={opportunityForm.date}
                                        onChange={(e) =>
                                            setOpportunityForm((prev) => ({ ...prev, date: e.target.value }))
                                        }
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="oppResultUrl">Result URL</Label>
                                    <Input
                                        id="oppResultUrl"
                                        value={opportunityForm.resultUrl}
                                        onChange={(e) =>
                                            setOpportunityForm((prev) => ({ ...prev, resultUrl: e.target.value }))
                                        }
                                        placeholder="https://..."
                                    />
                                </div>
                                <div className="grid gap-2 md:col-span-2">
                                    <Label htmlFor="oppNotes">Notes</Label>
                                    <Textarea
                                        id="oppNotes"
                                        value={opportunityForm.notes}
                                        onChange={(e) =>
                                            setOpportunityForm((prev) => ({ ...prev, notes: e.target.value }))
                                        }
                                        rows={3}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="oppStoryAngle">Story angle for AI pitch</Label>
                                    <Input
                                        id="oppStoryAngle"
                                        value={opportunityForm.storyAngle}
                                        onChange={(e) =>
                                            setOpportunityForm((prev) => ({ ...prev, storyAngle: e.target.value }))
                                        }
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="oppKeyContext">Additional context for AI pitch</Label>
                                    <Input
                                        id="oppKeyContext"
                                        value={opportunityForm.keyContext}
                                        onChange={(e) =>
                                            setOpportunityForm((prev) => ({ ...prev, keyContext: e.target.value }))
                                        }
                                    />
                                </div>
                                <div className="grid gap-2 md:col-span-2">
                                    <Label htmlFor="oppPitchText">Pitch text</Label>
                                    <Textarea
                                        id="oppPitchText"
                                        value={opportunityForm.pitchText}
                                        onChange={(e) =>
                                            setOpportunityForm((prev) => ({ ...prev, pitchText: e.target.value }))
                                        }
                                        rows={12}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>LLM source</Label>
                                    <div className="h-10 rounded-md border border-input bg-muted/30 px-3 text-sm flex items-center">
                                        {opportunityForm.llmProvider || "-"} {opportunityForm.llmModel ? `(${opportunityForm.llmModel})` : ""}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                <Button type="button" variant="outline" onClick={() => void generatePitch()} disabled={generatingPitch}>
                                    {generatingPitch ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Sparkles className="h-4 w-4 mr-2" />
                                    )}
                                    Generate Pitch
                                </Button>
                                <Button type="button" onClick={() => void saveOpportunity()} disabled={savingOpportunity}>
                                    {savingOpportunity ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                    {opportunityForm.id ? "Update Opportunity" : "Create Opportunity"}
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setOpportunityForm(DEFAULT_OPPORTUNITY_FORM)}
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    New Opportunity
                                </Button>
                                {opportunityForm.pitchText ? copyIconButton(() => void copyText("opp-pitch", opportunityForm.pitchText)) : null}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Outreach Pipeline</CardTitle>
                            <CardDescription>Calendar-friendly list of media opportunities and pitch progress.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {opportunities.length ? (
                                <div className="overflow-x-auto rounded-lg border">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/40 text-left">
                                            <tr>
                                                <th className="px-3 py-2">Outlet</th>
                                                <th className="px-3 py-2">Type</th>
                                                <th className="px-3 py-2">Status</th>
                                                <th className="px-3 py-2">Date</th>
                                                <th className="px-3 py-2">Mentions</th>
                                                <th className="px-3 py-2 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {opportunities.map((opportunity) => (
                                                <tr key={opportunity.id} className="border-t">
                                                    <td className="px-3 py-2 align-top">
                                                        <div className="font-medium">{opportunity.outletName}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {opportunity.contactName || "-"}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2 align-top text-xs">
                                                        {reference.labels.opportunityType[opportunity.opportunityType] ||
                                                            opportunity.opportunityType}
                                                    </td>
                                                    <td className="px-3 py-2 align-top">{pitchStatusBadge(opportunity.pitchStatus)}</td>
                                                    <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                                                        {formatDate(opportunity.date)}
                                                    </td>
                                                    <td className="px-3 py-2 align-top">{opportunity._count?.mentions || 0}</td>
                                                    <td className="px-3 py-2 align-top text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => applyOpportunityToForm(opportunity)}
                                                            >
                                                                Edit
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                className="text-red-600"
                                                                onClick={() => void deleteOpportunity(opportunity.id)}
                                                                disabled={deletingOpportunityId === opportunity.id}
                                                            >
                                                                {deletingOpportunityId === opportunity.id ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    "Delete"
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                                    No opportunities tracked yet.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="mentions" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">Effort</CardTitle>
                                <CardDescription>Press + outreach volume</CardDescription>
                            </CardHeader>
                            <CardContent className="text-sm space-y-1">
                                <div>{dashboard.efforts.pressReleasesSent} releases submitted/published</div>
                                <div>{dashboard.efforts.pitchesMade} pitches made</div>
                                <div>{dashboard.efforts.opportunitiesIdentified} opportunities identified</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">Results</CardTitle>
                                <CardDescription>Mentions and links</CardDescription>
                            </CardHeader>
                            <CardContent className="text-sm space-y-1">
                                <div>{dashboard.results.mentions} mentions</div>
                                <div>{dashboard.results.backlinks} backlinks</div>
                                <div>{dashboard.results.podcastAppearances} podcast appearances</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">Branded Search</CardTitle>
                                <CardDescription>PR impact signal</CardDescription>
                            </CardHeader>
                            <CardContent className="text-sm space-y-1">
                                {dashboard.brandedSearch ? (
                                    <>
                                        <div>
                                            Clicks: {dashboard.brandedSearch.current.clicks} ({dashboard.brandedSearch.clicksDelta >= 0 ? "+" : ""}
                                            {dashboard.brandedSearch.clicksDelta})
                                        </div>
                                        <div>
                                            Impressions: {dashboard.brandedSearch.current.impressions} ({dashboard.brandedSearch.impressionsDelta >= 0 ? "+" : ""}
                                            {dashboard.brandedSearch.impressionsDelta})
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-muted-foreground">Connect Search Console to track branded search lift.</div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Mentions Tracker</CardTitle>
                            <CardDescription>
                                Connect mentions/backlinks to the originating press release or opportunity.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="mentionType">Mention type</Label>
                                    <select
                                        id="mentionType"
                                        value={mentionForm.mentionType}
                                        onChange={(e) =>
                                            setMentionForm((prev) => ({ ...prev, mentionType: e.target.value as PrMentionType }))
                                        }
                                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                    >
                                        {reference.enums.mentionType.map((value) => (
                                            <option key={value} value={value}>
                                                {reference.labels.mentionType[value] || value}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="mentionDate">Mention date</Label>
                                    <Input
                                        id="mentionDate"
                                        type="date"
                                        value={mentionForm.mentionDate}
                                        onChange={(e) => setMentionForm((prev) => ({ ...prev, mentionDate: e.target.value }))}
                                    />
                                </div>
                                <div className="grid gap-2 md:col-span-2">
                                    <Label htmlFor="mentionTitle">Title</Label>
                                    <Input
                                        id="mentionTitle"
                                        value={mentionForm.title}
                                        onChange={(e) => setMentionForm((prev) => ({ ...prev, title: e.target.value }))}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="mentionSource">Source</Label>
                                    <Input
                                        id="mentionSource"
                                        value={mentionForm.sourceName}
                                        onChange={(e) => setMentionForm((prev) => ({ ...prev, sourceName: e.target.value }))}
                                        placeholder="Outlet or publication"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="mentionUrl">URL</Label>
                                    <Input
                                        id="mentionUrl"
                                        value={mentionForm.url}
                                        onChange={(e) => setMentionForm((prev) => ({ ...prev, url: e.target.value }))}
                                        placeholder="https://..."
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="mentionRelease">Related press release</Label>
                                    <select
                                        id="mentionRelease"
                                        value={mentionForm.pressReleaseId}
                                        onChange={(e) =>
                                            setMentionForm((prev) => ({ ...prev, pressReleaseId: e.target.value }))
                                        }
                                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                    >
                                        <option value="">(none)</option>
                                        {reference.pressReleases.map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {item.headline}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="mentionOpp">Related opportunity</Label>
                                    <select
                                        id="mentionOpp"
                                        value={mentionForm.opportunityId}
                                        onChange={(e) =>
                                            setMentionForm((prev) => ({ ...prev, opportunityId: e.target.value }))
                                        }
                                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                    >
                                        <option value="">(none)</option>
                                        {reference.opportunities.map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {item.outletName}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid gap-2 md:col-span-2">
                                    <Label htmlFor="mentionNotes">Notes</Label>
                                    <Textarea
                                        id="mentionNotes"
                                        value={mentionForm.notes}
                                        onChange={(e) => setMentionForm((prev) => ({ ...prev, notes: e.target.value }))}
                                        rows={3}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button type="button" onClick={() => void saveMention()} disabled={savingMention}>
                                    {savingMention ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                    {mentionForm.id ? "Update Mention" : "Create Mention"}
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setMentionForm(DEFAULT_MENTION_FORM)}
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    New Mention
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Mentions and Backlinks</CardTitle>
                            <CardDescription>Track earned media and tie outcomes back to PR effort.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {mentions.length ? (
                                <div className="overflow-x-auto rounded-lg border">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/40 text-left">
                                            <tr>
                                                <th className="px-3 py-2">Title</th>
                                                <th className="px-3 py-2">Type</th>
                                                <th className="px-3 py-2">Date</th>
                                                <th className="px-3 py-2">Attribution</th>
                                                <th className="px-3 py-2 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {mentions.map((mention) => (
                                                <tr key={mention.id} className="border-t">
                                                    <td className="px-3 py-2 align-top">
                                                        <div className="font-medium line-clamp-1">{mention.title}</div>
                                                        <a
                                                            href={mention.url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-xs text-primary hover:underline"
                                                        >
                                                            {mention.sourceName || mention.url}
                                                        </a>
                                                    </td>
                                                    <td className="px-3 py-2 align-top text-xs">
                                                        {reference.labels.mentionType[mention.mentionType] || mention.mentionType}
                                                    </td>
                                                    <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                                                        {formatDate(mention.mentionDate)}
                                                    </td>
                                                    <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                                                        {mention.pressRelease?.headline
                                                            ? `PR: ${mention.pressRelease.headline}`
                                                            : mention.opportunity?.outletName
                                                                ? `Opportunity: ${mention.opportunity.outletName}`
                                                                : "-"}
                                                    </td>
                                                    <td className="px-3 py-2 align-top text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => applyMentionToForm(mention)}
                                                            >
                                                                Edit
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                className="text-red-600"
                                                                onClick={() => void deleteMention(mention.id)}
                                                                disabled={deletingMentionId === mention.id}
                                                            >
                                                                {deletingMentionId === mention.id ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    "Delete"
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                                    No mentions logged yet.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="calendar" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CalendarClock className="h-5 w-5 text-primary" />
                                Monthly PR Calendar
                            </CardTitle>
                            <CardDescription>
                                Upcoming press release slots, opportunity deadlines, and suggested monthly topic themes.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {calendarRows.length ? (
                                <div className="overflow-x-auto rounded-lg border">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/40 text-left">
                                            <tr>
                                                <th className="px-3 py-2">Date</th>
                                                <th className="px-3 py-2">Type</th>
                                                <th className="px-3 py-2">Title</th>
                                                <th className="px-3 py-2">Status</th>
                                                <th className="px-3 py-2">Meta</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {calendarRows.map((row) => (
                                                <tr key={row.id} className="border-t">
                                                    <td className="px-3 py-2 text-xs text-muted-foreground">{formatDate(row.date)}</td>
                                                    <td className="px-3 py-2 text-xs">
                                                        {row.kind === "PRESS_RELEASE" ? "Press Release" : "Opportunity"}
                                                    </td>
                                                    <td className="px-3 py-2 font-medium">{row.title}</td>
                                                    <td className="px-3 py-2 text-xs">{row.status}</td>
                                                    <td className="px-3 py-2 text-xs text-muted-foreground">{row.metadata || "-"}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                                    No calendar events yet. Add press release schedules and opportunity dates.
                                </div>
                            )}

                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold">Suggested Monthly Topics</h3>
                                {dashboard.suggestions.length ? (
                                    <div className="grid gap-3 md:grid-cols-2">
                                        {dashboard.suggestions.map((item) => (
                                            <div key={item.month} className="rounded-lg border p-4 space-y-2">
                                                <div className="font-medium">{item.month}</div>
                                                <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                                                    {item.topics.map((topic) => (
                                                        <li key={topic}>{topic}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-sm text-muted-foreground">No suggestions available yet.</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="boilerplate" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Boilerplate Manager</CardTitle>
                            <CardDescription>
                                Manage standard About text, physician quote snippets, and media assets for press kits.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {!boilerplate ? (
                                <div className="text-sm text-muted-foreground">Boilerplate not loaded.</div>
                            ) : (
                                <>
                                    <div className="grid gap-2">
                                        <Label htmlFor="boilerplateAbout">About Present Health</Label>
                                        <Textarea
                                            id="boilerplateAbout"
                                            value={boilerplate.aboutBoilerplate}
                                            onChange={(e) =>
                                                patchBoilerplate({ aboutBoilerplate: e.target.value })
                                            }
                                            rows={6}
                                        />
                                        <div className="flex items-center gap-2">
                                            {copyIconButton(() => void copyText("about-boilerplate", boilerplate.aboutBoilerplate))}
                                            {copiedKey === "about-boilerplate" ? (
                                                <span className="text-xs text-emerald-700">Copied</span>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="grid gap-2">
                                            <Label htmlFor="mediaContactName">Media contact name</Label>
                                            <Input
                                                id="mediaContactName"
                                                value={boilerplate.mediaContactName || ""}
                                                onChange={(e) => patchBoilerplate({ mediaContactName: e.target.value || null })}
                                            />
                                            {copyIconButton(() => void copyText("media-name", boilerplate.mediaContactName || ""))}
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="mediaContactEmail">Media contact email</Label>
                                            <Input
                                                id="mediaContactEmail"
                                                value={boilerplate.mediaContactEmail || ""}
                                                onChange={(e) => patchBoilerplate({ mediaContactEmail: e.target.value || null })}
                                            />
                                            {copyIconButton(() => void copyText("media-email", boilerplate.mediaContactEmail || ""))}
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="mediaContactPhone">Media contact phone</Label>
                                            <Input
                                                id="mediaContactPhone"
                                                value={boilerplate.mediaContactPhone || ""}
                                                onChange={(e) => patchBoilerplate({ mediaContactPhone: e.target.value || null })}
                                            />
                                            {copyIconButton(() => void copyText("media-phone", boilerplate.mediaContactPhone || ""))}
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="logoUrl">Logo URL</Label>
                                            <Input
                                                id="logoUrl"
                                                value={boilerplate.logoUrl || ""}
                                                onChange={(e) => patchBoilerplate({ logoUrl: e.target.value || null })}
                                                placeholder="https://..."
                                            />
                                            <div className="flex items-center gap-2">
                                                {copyIconButton(() => void copyText("logo-url", boilerplate.logoUrl || ""))}
                                                {boilerplate.logoUrl ? (
                                                    <a
                                                        href={boilerplate.logoUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-xs text-primary hover:underline"
                                                    >
                                                        Open
                                                    </a>
                                                ) : null}
                                            </div>
                                        </div>
                                        <div className="grid gap-2 md:col-span-2">
                                            <Label htmlFor="headshotUrl">Headshot URL</Label>
                                            <Input
                                                id="headshotUrl"
                                                value={boilerplate.headshotUrl || ""}
                                                onChange={(e) => patchBoilerplate({ headshotUrl: e.target.value || null })}
                                                placeholder="https://..."
                                            />
                                            <div className="flex items-center gap-2">
                                                {copyIconButton(() => void copyText("headshot-url", boilerplate.headshotUrl || ""))}
                                                {boilerplate.headshotUrl ? (
                                                    <a
                                                        href={boilerplate.headshotUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-xs text-primary hover:underline"
                                                    >
                                                        Open
                                                    </a>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <h3 className="text-sm font-semibold">Physician Bio Snippets</h3>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    patchBoilerplate({
                                                        physicianBioSnippets: [
                                                            ...(boilerplate.physicianBioSnippets || []),
                                                            {
                                                                id: `snippet-${Date.now()}`,
                                                                name: "",
                                                                snippet: "",
                                                            },
                                                        ],
                                                    })
                                                }
                                            >
                                                <Plus className="h-4 w-4 mr-2" />
                                                Add Snippet
                                            </Button>
                                        </div>

                                        {(boilerplate.physicianBioSnippets || []).length ? (
                                            <div className="space-y-3">
                                                {boilerplate.physicianBioSnippets.map((snippet, index) => (
                                                    <div key={snippet.id} className="rounded-lg border p-3 space-y-2">
                                                        <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
                                                            <Input
                                                                value={snippet.name}
                                                                onChange={(e) => {
                                                                    const next = [...boilerplate.physicianBioSnippets];
                                                                    next[index] = {
                                                                        ...next[index],
                                                                        name: e.target.value,
                                                                    };
                                                                    patchBoilerplate({ physicianBioSnippets: next });
                                                                }}
                                                                placeholder="Physician name"
                                                            />
                                                            <div className="flex items-center gap-2">
                                                                {copyIconButton(() => void copyText(`snippet-${snippet.id}`, snippet.snippet))}
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="text-red-600"
                                                                    onClick={() => {
                                                                        const next = [...boilerplate.physicianBioSnippets];
                                                                        next.splice(index, 1);
                                                                        patchBoilerplate({ physicianBioSnippets: next });
                                                                    }}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        <Textarea
                                                            value={snippet.snippet}
                                                            onChange={(e) => {
                                                                const next = [...boilerplate.physicianBioSnippets];
                                                                next[index] = {
                                                                    ...next[index],
                                                                    snippet: e.target.value,
                                                                };
                                                                patchBoilerplate({ physicianBioSnippets: next });
                                                            }}
                                                            rows={3}
                                                            placeholder="Quote-ready physician bio snippet"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                                                No physician snippets yet.
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 pt-2">
                                        <Button type="button" onClick={() => void saveBoilerplate()} disabled={savingBoilerplate}>
                                            {savingBoilerplate ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                            Save Boilerplate
                                        </Button>
                                        <div className="text-xs text-muted-foreground">
                                            Last updated: {formatDateTime(boilerplate.updatedAt)}
                                        </div>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
