"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, FileText, Loader2, WandSparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  buildHealthbookBriefSeed,
  formatHealthbookAbsoluteTimestamp,
  formatHealthbookRelativeTimestamp,
  type HealthbookBriefIntent,
  type HealthbookFeedItem,
} from "@/lib/healthbook";

type HealthbookSeoWorkspaceProps = {
  items: HealthbookFeedItem[];
  generatedAt: number;
};

const INTENT_OPTIONS: Array<{ value: HealthbookBriefIntent; label: string }> = [
  { value: "INFORMATIONAL", label: "Informational" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "TRANSACTIONAL", label: "Transactional" },
  { value: "NAVIGATIONAL", label: "Navigational" },
];

const signalStyles: Record<HealthbookFeedItem["signal"], string> = {
  Lead: "border-primary/20 bg-primary/10 text-primary",
  High: "border-emerald-600/20 bg-emerald-600/10 text-emerald-700",
  Watch: "border-border bg-muted text-muted-foreground",
};

export function HealthbookSeoWorkspace({
  items,
  generatedAt,
}: HealthbookSeoWorkspaceProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? "");
  const [now, setNow] = useState(generatedAt);
  const [targetKeyword, setTargetKeyword] = useState("");
  const [searchIntent, setSearchIntent] = useState<HealthbookBriefIntent>("INFORMATIONAL");
  const [targetAudience, setTargetAudience] = useState("");
  const [contextNotes, setContextNotes] = useState("");
  const [evergreenAngle, setEvergreenAngle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const selectedItem = useMemo(() => {
    if (!items.length) return null;
    return items.find((item) => item.id === selectedId) || items[0];
  }, [items, selectedId]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!selectedItem) return;

    const seed = buildHealthbookBriefSeed(selectedItem);
    setTargetKeyword(seed.targetKeyword);
    setSearchIntent(seed.searchIntent);
    setTargetAudience(seed.targetAudience);
    setContextNotes(seed.notes);
    setEvergreenAngle(seed.evergreenAngle);
    setError(null);
  }, [selectedItem]);

  async function handleGenerateBrief() {
    if (!selectedItem) return;
    if (!targetKeyword.trim()) {
      setError("Target keyword is required.");
      return;
    }
    if (!targetAudience.trim()) {
      setError("Target audience is required.");
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/content-briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetKeyword,
          searchIntent,
          targetAudience,
          notes: contextNotes,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success || !data?.brief?.id) {
        throw new Error(data?.error || "Failed to generate content brief");
      }

      router.push(`/admin/content-briefs?brief=${data.brief.id}`);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Failed to generate content brief");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Healthbook SEO Driver</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Use live signal sources to find timely health topics, then turn them into evergreen
            content briefs instead of chasing the news cycle directly.
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <a href={selectedItem?.url || "/admin/content-briefs"} target="_blank" rel="noreferrer">
              Open source
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href="/admin/content-briefs">
              Open briefs
              <FileText className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">Live signal queue</CardTitle>
            <CardDescription>
              Select a signal to prefill a content brief with source context and an evergreen angle.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {items.length ? (
              <div className="grid max-h-[72vh] gap-3 overflow-y-auto pr-1">
                {items.map((item) => {
                  const isSelected = item.id === selectedItem?.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                        isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-foreground">
                          {formatHealthbookRelativeTimestamp(item.publishedAt, now)} ago
                        </p>
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${signalStyles[item.signal]}`}
                        >
                          {item.signal}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="secondary">{item.category}</Badge>
                        <Badge variant="outline">{item.sourceType}</Badge>
                      </div>
                      <h2 className="mt-3 text-base font-semibold leading-6 tracking-tight text-foreground">
                        {item.title}
                      </h2>
                      <p className="mt-2 text-sm text-muted-foreground">{item.takeaway}</p>
                      <p className="mt-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        {item.source} · {formatHealthbookAbsoluteTimestamp(item.publishedAt)}
                      </p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-sm text-muted-foreground">
                No live Healthbook items are available right now. The workspace only uses upstream
                live sources and stays empty instead of inventing content.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-lg">Selected signal</CardTitle>
              <CardDescription>
                This context stays admin-side and is meant to feed the SEO/content workflow, not the
                member experience.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedItem ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge>{selectedItem.category}</Badge>
                    <Badge variant="outline">{selectedItem.sourceType}</Badge>
                    <Badge variant="outline">{selectedItem.signal}</Badge>
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                      {selectedItem.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {selectedItem.summary}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted/30 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Evergreen framing
                    </p>
                    <p className="mt-2 text-sm leading-6 text-foreground">{evergreenAngle}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Select a signal to begin.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <CardTitle className="text-lg">Generate content brief</CardTitle>
              <CardDescription>
                Prefill the brief, edit the search framing, then send it into the existing content
                brief workflow.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="healthbook-keyword">Target keyword</Label>
                <Input
                  id="healthbook-keyword"
                  value={targetKeyword}
                  onChange={(e) => setTargetKeyword(e.target.value)}
                  placeholder="wearable health trackers"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="healthbook-intent">Search intent</Label>
                <select
                  id="healthbook-intent"
                  value={searchIntent}
                  onChange={(e) => setSearchIntent(e.target.value as HealthbookBriefIntent)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {INTENT_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="healthbook-audience">Target audience</Label>
                <Textarea
                  id="healthbook-audience"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="healthbook-context">SEO/source context</Label>
                <Textarea
                  id="healthbook-context"
                  value={contextNotes}
                  onChange={(e) => setContextNotes(e.target.value)}
                  rows={10}
                />
              </div>

              <Button onClick={() => void handleGenerateBrief()} disabled={generating || !selectedItem}>
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <WandSparkles className="h-4 w-4" />
                    Generate brief from signal
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
