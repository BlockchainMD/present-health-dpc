import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchParamsInput = Promise<Record<string, string | string[] | undefined>>;

function firstParam(value: string | string[] | undefined) {
    if (Array.isArray(value)) return value[0] || "";
    return value || "";
}

function parseDateStart(value: string) {
    const raw = String(value || "").trim();
    if (!raw) return null;
    const date = new Date(`${raw}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) ? date : null;
}

function parseDateEnd(value: string) {
    const raw = String(value || "").trim();
    if (!raw) return null;
    const date = new Date(`${raw}T23:59:59.999Z`);
    return Number.isFinite(date.getTime()) ? date : null;
}

export default async function AdminChatbotLeadsPage({ searchParams }: { searchParams: SearchParamsInput }) {
    const params = await searchParams;
    const stateFilter = firstParam(params.state).trim();
    const dateFromRaw = firstParam(params.dateFrom).trim();
    const dateToRaw = firstParam(params.dateTo).trim();
    const query = firstParam(params.q).trim();

    const dateFrom = parseDateStart(dateFromRaw);
    const dateTo = parseDateEnd(dateToRaw);

    const where: any = {};
    if (stateFilter) where.state = stateFilter;
    if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = dateFrom;
        if (dateTo) where.createdAt.lte = dateTo;
    }
    if (query) {
        where.OR = [
            { firstName: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { heardAboutUs: { contains: query, mode: "insensitive" } },
            { conversationSummary: { contains: query, mode: "insensitive" } },
        ];
    }

    const [states, leads] = await Promise.all([
        prisma.chatbotLead.findMany({
            distinct: ["state"],
            orderBy: { state: "asc" },
            select: { state: true },
        }),
        prisma.chatbotLead.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: 250,
            select: {
                id: true,
                firstName: true,
                email: true,
                state: true,
                heardAboutUs: true,
                source: true,
                conversationSummary: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: { conversations: true },
                },
                conversations: {
                    select: { sessionId: true, createdAt: true },
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
            },
        }),
    ]);

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Chatbot leads</h1>
                    <p className="text-sm text-muted-foreground">
                        Leads captured by the marketing chatbot on <span className="font-mono">/join</span> and enabled public pages.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button asChild variant="outline">
                        <Link href="/admin/chatbot">Chatbot settings</Link>
                    </Button>
                    <Button asChild variant="outline">
                        <Link href="/admin/chatbot/logs">Conversation logs</Link>
                    </Button>
                </div>
            </div>

            <Card className="border-border/60">
                <CardHeader>
                    <CardTitle className="text-lg">Filters</CardTitle>
                </CardHeader>
                <CardContent>
                    <form className="grid gap-4 md:grid-cols-5 items-end">
                        <div className="grid gap-1">
                            <label htmlFor="state" className="text-sm font-medium text-foreground">State</label>
                            <select
                                id="state"
                                name="state"
                                defaultValue={stateFilter}
                                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                            >
                                <option value="">All</option>
                                {states.map((x) => (
                                    <option key={x.state} value={x.state}>
                                        {x.state}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="grid gap-1">
                            <label htmlFor="dateFrom" className="text-sm font-medium text-foreground">Date from</label>
                            <input
                                id="dateFrom"
                                name="dateFrom"
                                type="date"
                                defaultValue={dateFromRaw}
                                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                            />
                        </div>
                        <div className="grid gap-1">
                            <label htmlFor="dateTo" className="text-sm font-medium text-foreground">Date to</label>
                            <input
                                id="dateTo"
                                name="dateTo"
                                type="date"
                                defaultValue={dateToRaw}
                                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                            />
                        </div>
                        <div className="grid gap-1 md:col-span-2">
                            <label htmlFor="q" className="text-sm font-medium text-foreground">Search</label>
                            <input
                                id="q"
                                name="q"
                                defaultValue={query}
                                placeholder="Name, email, source details..."
                                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                            />
                        </div>
                        <div className="md:col-span-5 flex gap-2">
                            <Button type="submit">Apply filters</Button>
                            <Button asChild variant="outline">
                                <Link href="/admin/chatbot/leads">Reset</Link>
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <div className="text-sm text-muted-foreground">{leads.length} lead(s)</div>

            {leads.length ? (
                <div className="grid gap-4">
                    {leads.map((lead) => {
                        const latestSession = lead.conversations[0]?.sessionId || null;
                        return (
                            <Card key={lead.id} className="border-border/60">
                                <CardHeader className="flex-row items-start justify-between gap-4 flex-wrap">
                                    <div className="space-y-2">
                                        <CardTitle className="text-lg">
                                            {lead.firstName} <span className="text-base text-muted-foreground">({lead.state})</span>
                                        </CardTitle>
                                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                            <a className="text-primary hover:underline" href={`mailto:${lead.email}`}>
                                                {lead.email}
                                            </a>
                                            <Badge variant="outline">{lead.source}</Badge>
                                            <Badge variant="outline">{lead._count.conversations} log(s)</Badge>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {latestSession ? (
                                            <Button asChild size="sm" variant="outline">
                                                <Link href={`/admin/chatbot/logs?sessionId=${encodeURIComponent(latestSession)}`}>View logs</Link>
                                            </Button>
                                        ) : null}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm text-muted-foreground">
                                    <div>
                                        <span className="font-medium text-foreground">How they heard about us:</span>{" "}
                                        {lead.heardAboutUs || "(not provided)"}
                                    </div>
                                    <div className="rounded-md border border-border bg-muted/10 p-3 whitespace-pre-wrap">
                                        <span className="font-medium text-foreground">Conversation summary:</span>{" "}
                                        {lead.conversationSummary || "(not available)"}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        Created {new Date(lead.createdAt).toLocaleString()} • Updated {new Date(lead.updatedAt).toLocaleString()}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <div className="rounded-2xl border border-border bg-muted/20 p-8 text-muted-foreground">
                    No chatbot leads found for the selected filters.
                </div>
            )}
        </div>
    );
}
