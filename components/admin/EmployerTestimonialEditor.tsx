"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export type EmployerTestimonialFormValue = {
    id?: string;
    companyName: string;
    quote: string;
    personName: string;
    personTitle: string;
    logoUrl: string;
    sortOrder: string;
    isActive: boolean;
};

function coerceSortOrder(value: string) {
    const n = Number.parseInt(String(value || "0"), 10);
    if (!Number.isFinite(n)) return 0;
    return Math.max(-9999, Math.min(9999, n));
}

export function EmployerTestimonialEditor({ initial }: { initial?: Partial<EmployerTestimonialFormValue> }) {
    const router = useRouter();

    const isEdit = Boolean(initial?.id);

    const [companyName, setCompanyName] = useState(initial?.companyName || "");
    const [quote, setQuote] = useState(initial?.quote || "");
    const [personName, setPersonName] = useState(initial?.personName || "");
    const [personTitle, setPersonTitle] = useState(initial?.personTitle || "");
    const [logoUrl, setLogoUrl] = useState(initial?.logoUrl || "");
    const [sortOrder, setSortOrder] = useState(initial?.sortOrder || "0");
    const [isActive, setIsActive] = useState(Boolean(initial?.isActive));

    const [status, setStatus] = useState<{ type: "idle" } | { type: "saving" } | { type: "error"; message: string } | { type: "success" }>({
        type: "idle",
    });

    async function save() {
        setStatus({ type: "saving" });

        const payload = {
            companyName: companyName.trim(),
            quote: quote.trim(),
            personName: personName.trim(),
            personTitle: personTitle.trim(),
            logoUrl: logoUrl.trim(),
            sortOrder: coerceSortOrder(sortOrder),
            isActive,
        };

        try {
            const res = await fetch(isEdit ? `/api/admin/employer-testimonials/${initial!.id}` : "/api/admin/employer-testimonials", {
                method: isEdit ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Save failed");
            }

            setStatus({ type: "success" });

            if (!isEdit) {
                router.push(`/admin/employers/testimonials/${data.testimonial.id}`);
            } else {
                router.refresh();
            }
        } catch (error: any) {
            setStatus({ type: "error", message: error?.message || "Save failed" });
        }
    }

    async function remove() {
        if (!isEdit) return;
        if (!confirm("Delete this testimonial? This cannot be undone.")) return;

        setStatus({ type: "saving" });
        try {
            const res = await fetch(`/api/admin/employer-testimonials/${initial!.id}`, { method: "DELETE" });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) throw new Error(data?.error || "Delete failed");
            router.push("/admin/employers/testimonials");
        } catch (error: any) {
            setStatus({ type: "error", message: error?.message || "Delete failed" });
        }
    }

    return (
        <div className="max-w-5xl space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{isEdit ? "Edit testimonial" : "New testimonial"}</h1>
                    <p className="text-sm text-muted-foreground">
                        Testimonials render on{" "}
                        <Link href="/for-employers" target="_blank" className="text-primary hover:underline">
                            /for-employers
                        </Link>
                        .
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button onClick={save} disabled={status.type === "saving"}>
                        {status.type === "saving" ? "Saving..." : "Save"}
                    </Button>
                    {isEdit ? (
                        <Button variant="destructive" onClick={remove} disabled={status.type === "saving"}>
                            Delete
                        </Button>
                    ) : null}
                </div>
            </div>

            {status.type === "error" ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{status.message}</div>
            ) : null}
            {status.type === "success" ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Saved.</div>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-[1fr_320px] items-start">
                <Card className="border-border/60">
                    <CardHeader>
                        <CardTitle>Details</CardTitle>
                        <CardDescription>Public-facing testimonial content.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-5">
                        <div className="grid gap-2">
                            <Label htmlFor="companyName">Company name</Label>
                            <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme, Inc." />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="quote">Quote</Label>
                            <Textarea
                                id="quote"
                                value={quote}
                                onChange={(e) => setQuote(e.target.value)}
                                rows={5}
                                placeholder="What did they say about Present Health?"
                            />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="personName">Person name (optional)</Label>
                                <Input id="personName" value={personName} onChange={(e) => setPersonName(e.target.value)} placeholder="Jane Doe" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="personTitle">Person title (optional)</Label>
                                <Input id="personTitle" value={personTitle} onChange={(e) => setPersonTitle(e.target.value)} placeholder="HR Director" />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="logoUrl">Logo URL (optional)</Label>
                            <Input id="logoUrl" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://... or /uploads/..." />
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle>Publishing</CardTitle>
                            <CardDescription>Control ordering and visibility.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="sortOrder">Sort order</Label>
                                <Input
                                    id="sortOrder"
                                    inputMode="numeric"
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value)}
                                    placeholder="0"
                                />
                                <div className="text-xs text-muted-foreground">Lower numbers appear first.</div>
                            </div>

                            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3">
                                <div>
                                    <div className="font-medium text-foreground">Active</div>
                                    <div className="text-xs text-muted-foreground">Toggle off to hide from the public page.</div>
                                </div>
                                <Switch checked={isActive} onCheckedChange={setIsActive} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle>Preview</CardTitle>
                            <CardDescription>Quick rendering check.</CardDescription>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground space-y-3">
                            <div className="text-foreground font-medium">{companyName.trim() || "(Company name)"}</div>
                            <blockquote className="border-l-2 border-border pl-4 italic text-foreground">
                                "{quote.trim() || "Quote..."}"
                            </blockquote>
                            {personName.trim() ? (
                                <div className="text-xs text-muted-foreground">
                                    {personName.trim()}
                                    {personTitle.trim() ? `, ${personTitle.trim()}` : ""}
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
