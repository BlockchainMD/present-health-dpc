import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { cleanupExpiredChatbotLogs } from "@/lib/chatbot-server";
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

export default async function AdminChatbotLogsPage({ searchParams }: { searchParams: SearchParamsInput }) {
    await cleanupExpiredChatbotLogs();

    const params = await searchParams;
    const stateFilter = firstParam(params.state).trim();
    const dateFromRaw = firstParam(params.dateFrom).trim();
    const dateToRaw = firstParam(params.dateTo).trim();
    const sessionIdFilter = firstParam(params.sessionId).trim();
    const query = firstParam(params.q).trim();

    const dateFrom = parseDateStart(dateFromRaw);
    const dateTo = parseDateEnd(dateToRaw);

    const where: any = {};
    if (sessionIdFilter) where.sessionId = sessionIdFilter;
    if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = dateFrom;
        if (dateTo) where.createdAt.lte = dateTo;
    }
    if (stateFilter) {
        where.lead = {
            is: { state: stateFilter },
        };
    }
    if (query) {
        where.OR = [
            { userMessage: { contains: query, mode: "insensitive" } },
            { assistantMessage: { contains: query, mode: "insensitive" } },
            { sessionId: { contains: query, mode: "insensitive" } },
            { lead: { is: { email: { contains: query, mode: "insensitive" } } } },
        ];
    }

    const [states, logs] = await Promise.all([
        prisma.chatbotLead.findMany({
            distinct: ["state"],
            orderBy: { state: "asc" },
            select: { state: true },
        }),
        prisma.chatbotConversationLog.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: 300,
            select: {
                id: true,
                sessionId: true,
                pagePath: true,
                userMessage: true,
                assistantMessage: true,
                isMedicalRedirect: true,
                createdAt: true,
                lead: {
                    select: {
                        id: true,
                        firstName: true,
                        email: true,
                        state: true,
                    },
                },
            },
        }),
    ]);

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Chatbot conversation logs</h1>
                    <p className="text-sm text-muted-foreground">
                        Logs are retained for 30 days for quality review, then auto-deleted.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button asChild variant="outline">
                        <Link href="/admin/chatbot">Chatbot settings</Link>
                    </Button>
                    <Button asChild variant="outline">
                        <Link href="/admin/chatbot/leads">View leads</Link>
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
                            <label htmlFor="state" className="text-sm font-medium text-foreground">Lead state</label>
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
                            <label htmlFor="sessionId" className="text-sm font-medium text-foreground">Session ID</label>
                            <input
                                id="sessionId"
                                name="sessionId"
                                defaultValue={sessionIdFilter}
                                placeholder="Exact session id"
                                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                            />
                        </div>
                        <div className="grid gap-1 md:col-span-4">
                            <label htmlFor="q" className="text-sm font-medium text-foreground">Search</label>
                            <input
                                id="q"
                                name="q"
                                defaultValue={query}
                                placeholder="Search message text or lead email..."
                                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                            />
                        </div>
                        <div className="md:col-span-5 flex gap-2">
                            <Button type="submit">Apply filters</Button>
                            <Button asChild variant="outline">
                                <Link href="/admin/chatbot/logs">Reset</Link>
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <div className="text-sm text-muted-foreground">{logs.length} log entr{logs.length === 1 ? "y" : "ies"}</div>

            {logs.length ? (
                <div className="grid gap-4">
                    {logs.map((log) => {
                        const isRedacted = log.userMessage.startsWith("[REDACTED");
                        return (
                            <Card key={log.id} className="border-border/60">
                                <CardHeader className="flex-row items-start justify-between gap-4 flex-wrap">
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap gap-2 items-center">
                                            <Badge variant="outline" className="font-mono">{log.sessionId}</Badge>
                                            {log.pagePath ? <Badge variant="outline">{log.pagePath}</Badge> : null}
                                            {log.isMedicalRedirect ? <Badge className="bg-amber-600">Medical redirect</Badge> : null}
                                            {isRedacted ? <Badge variant="outline">Redacted user input</Badge> : null}
                                        </div>
                                        <div className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</div>
                                        {log.lead ? (
                                            <div className="text-xs text-muted-foreground">
                                                Lead:{" "}
                                                <a className="text-primary hover:underline" href={`mailto:${log.lead.email}`}>
                                                    {log.lead.firstName} ({log.lead.email})
                                                </a>{" "}
                                                • {log.lead.state}
                                            </div>
                                        ) : null}
                                    </div>
                                </CardHeader>
                                <CardContent className="grid gap-3 text-sm text-muted-foreground">
                                    <div className="rounded-md border border-border bg-muted/10 p-3 whitespace-pre-wrap">
                                        <span className="font-medium text-foreground">User:</span>{" "}
                                        {log.userMessage}
                                    </div>
                                    <div className="rounded-md border border-border bg-background p-3 whitespace-pre-wrap">
                                        <span className="font-medium text-foreground">Assistant:</span>{" "}
                                        {log.assistantMessage}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <div className="rounded-2xl border border-border bg-muted/20 p-8 text-muted-foreground">
                    No conversation logs found for the selected filters.
                </div>
            )}
        </div>
    );
}
