"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { slugify } from "@/lib/slug";
import { ABFM_VERIFICATION_URL, npiRegistryProviderUrl } from "@/lib/verification-links";
import { stateCode, stateFromNameOrCode } from "@/lib/us-states";
import { normalizeMarkdownForRender } from "@/lib/markdown-utils";
import { Markdown } from "@/components/markdown";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type PhysicianFormValue = {
    id?: string;
    name: string;
    slug: string;
    credentials: string;
    boardCertification: string;
    bio: string;
    photoUrl: string;
    statesLicensed: string[];
    npiNumber: string;
    yearsExperience: string;
    isActive: boolean;
};

function normalizeStatesInput(value: string) {
    const tokens = value
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

    const normalized: string[] = [];
    for (const t of tokens) {
        const s = stateFromNameOrCode(t);
        if (s) {
            normalized.push(s.code);
            continue;
        }
        const code = stateCode(t);
        if (code) {
            normalized.push(code);
            continue;
        }
        normalized.push(t);
    }

    return Array.from(new Set(normalized));
}

export function PhysicianEditor({ initial }: { initial?: Partial<PhysicianFormValue> }) {
    const router = useRouter();

    const [name, setName] = useState(initial?.name || "");
    const [slug, setSlug] = useState(initial?.slug || "");
    const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));

    const [credentials, setCredentials] = useState(initial?.credentials || "");
    const [boardCertification, setBoardCertification] = useState(initial?.boardCertification || "");
    const [npiNumber, setNpiNumber] = useState(initial?.npiNumber || "");
    const [yearsExperience, setYearsExperience] = useState(initial?.yearsExperience || "");
    const [isActive, setIsActive] = useState(Boolean(initial?.isActive));

    const [bio, setBio] = useState(initial?.bio || "");
    const [photoUrl, setPhotoUrl] = useState(initial?.photoUrl || "");

    const [statesLicensedInput, setStatesLicensedInput] = useState((initial?.statesLicensed || []).join(", "));

    const [status, setStatus] = useState<{ type: "idle" } | { type: "saving" } | { type: "error"; message: string } | { type: "success" }>({
        type: "idle",
    });

    const isEdit = Boolean(initial?.id);

    const normalizedBio = useMemo(() => normalizeMarkdownForRender(bio || ""), [bio]);

    function onNameChange(nextName: string) {
        setName(nextName);
        if (!slugTouched) {
            setSlug(slugify(nextName));
        }
    }

    async function save() {
        setStatus({ type: "saving" });

        const payload = {
            name: name.trim(),
            slug: slug.trim(),
            credentials: credentials.trim(),
            boardCertification: boardCertification.trim(),
            bio,
            photoUrl: photoUrl.trim(),
            statesLicensed: normalizeStatesInput(statesLicensedInput),
            npiNumber: npiNumber.trim(),
            yearsExperience: yearsExperience.trim(),
            isActive,
        };

        try {
            const res = await fetch(isEdit ? `/api/admin/physicians/${initial!.id}` : "/api/admin/physicians", {
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
                router.push(`/admin/physicians/${data.physician.id}`);
            } else {
                router.refresh();
            }
        } catch (error: any) {
            setStatus({ type: "error", message: error?.message || "Save failed" });
        }
    }

    async function remove() {
        if (!isEdit) return;
        if (!confirm("Delete this physician profile? This cannot be undone.")) return;

        setStatus({ type: "saving" });
        try {
            const res = await fetch(`/api/admin/physicians/${initial!.id}`, { method: "DELETE" });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Delete failed");
            }
            router.push("/admin/physicians");
        } catch (error: any) {
            setStatus({ type: "error", message: error?.message || "Delete failed" });
        }
    }

    async function uploadPhoto(file: File) {
        if (!isEdit) return;

        setStatus({ type: "saving" });
        try {
            const formData = new FormData();
            formData.set("file", file);
            const res = await fetch(`/api/admin/physicians/${initial!.id}/photo`, { method: "POST", body: formData });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Upload failed");
            }
            setPhotoUrl(data.physician.photoUrl || "");
            setStatus({ type: "success" });
            router.refresh();
        } catch (error: any) {
            setStatus({ type: "error", message: error?.message || "Upload failed" });
        }
    }

    return (
        <div className="max-w-5xl space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{isEdit ? "Edit physician" : "New physician"}</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage public physician profiles used in <Link href="/our-physicians" className="text-primary hover:underline">/our-physicians</Link> and the Trust Hub.
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
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                    Saved.
                </div>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-[1fr_320px] items-start">
                <Card className="border-border/60">
                    <CardHeader>
                        <CardTitle>Profile</CardTitle>
                        <CardDescription>Public-facing profile fields and verification links.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-5">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" value={name} onChange={(e) => onNameChange(e.target.value)} placeholder="Dr. Jane Doe" />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="slug">Slug</Label>
                            <Input
                                id="slug"
                                value={slug}
                                onChange={(e) => {
                                    setSlugTouched(true);
                                    setSlug(e.target.value);
                                }}
                                placeholder="jane-doe"
                            />
                            <div className="text-xs text-muted-foreground">
                                Public URL: <span className="font-mono">/our-physicians/{slug || "..."}</span>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="credentials">Credentials</Label>
                                <Input
                                    id="credentials"
                                    value={credentials}
                                    onChange={(e) => setCredentials(e.target.value)}
                                    placeholder="MD, FAAFP"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="boardCertification">Board certification</Label>
                                <Input
                                    id="boardCertification"
                                    value={boardCertification}
                                    onChange={(e) => setBoardCertification(e.target.value)}
                                    placeholder="Board-Certified Family Medicine"
                                />
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="npi">NPI number</Label>
                                <Input id="npi" value={npiNumber} onChange={(e) => setNpiNumber(e.target.value)} placeholder="10-digit NPI" />
                                <div className="text-xs text-muted-foreground">
                                    {npiNumber.trim() ? (
                                        <a href={npiRegistryProviderUrl(npiNumber)} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                            Verify via NPI registry
                                        </a>
                                    ) : (
                                        <a href={npiRegistryProviderUrl(null)} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                            Open NPI registry
                                        </a>
                                    )}
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="years">Years of experience</Label>
                                <Input id="years" value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} placeholder="10" inputMode="numeric" />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="states">States licensed (comma-separated)</Label>
                            <Input
                                id="states"
                                value={statesLicensedInput}
                                onChange={(e) => setStatesLicensedInput(e.target.value)}
                                placeholder="MI, TX, FL"
                            />
                            <div className="text-xs text-muted-foreground">
                                Use 2-letter codes when possible. These are shown as links to <span className="font-mono">/states/[state]</span>.
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3">
                            <div>
                                <div className="font-medium text-foreground">Public listing</div>
                                <div className="text-xs text-muted-foreground">Toggle off to hide from /our-physicians and /about.</div>
                            </div>
                            <Switch checked={isActive} onCheckedChange={setIsActive} />
                        </div>

                        <Card className="border-border/60">
                            <CardHeader className="pb-0">
                                <CardTitle className="text-base">Bio (rich text)</CardTitle>
                                <CardDescription>Markdown supported. This renders on the physician profile page.</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <Tabs defaultValue="edit">
                                    <TabsList>
                                        <TabsTrigger value="edit">Edit</TabsTrigger>
                                        <TabsTrigger value="preview">Preview</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="edit">
                                        <Textarea
                                            value={bio}
                                            onChange={(e) => setBio(e.target.value)}
                                            rows={12}
                                            placeholder="Write a short personal statement, approach to care, background, etc."
                                        />
                                    </TabsContent>
                                    <TabsContent value="preview">
                                        <div className="prose dark:prose-invert max-w-none rounded-md border border-border bg-background p-4">
                                            {normalizedBio.trim() ? <Markdown content={normalizedBio} /> : <p className="text-muted-foreground">Nothing to preview yet.</p>}
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle>Photo</CardTitle>
                            <CardDescription>Upload an image for the physician profile.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {photoUrl ? (
                                <div className="rounded-xl overflow-hidden border border-border bg-muted">
                                    <img src={photoUrl} alt="Physician" className="w-full h-auto object-cover" />
                                </div>
                            ) : (
                                <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground text-center">
                                    No photo uploaded.
                                </div>
                            )}

                            <div className="grid gap-2">
                                <Label htmlFor="photoUrl">Photo URL (optional)</Label>
                                <Input id="photoUrl" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="/uploads/physicians/..." />
                                <div className="text-xs text-muted-foreground">
                                    You can use a local <span className="font-mono">/uploads/...</span> path or a remote URL.
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="photoUpload">Upload (admin)</Label>
                                <Input
                                    id="photoUpload"
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    disabled={!isEdit || status.type === "saving"}
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) void uploadPhoto(file);
                                    }}
                                />
                                {!isEdit ? (
                                    <div className="text-xs text-muted-foreground">Save the physician first to enable uploads.</div>
                                ) : null}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle>External verification</CardTitle>
                            <CardDescription>Links open in a new tab.</CardDescription>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground space-y-3">
                            <div>
                                <a href={ABFM_VERIFICATION_URL} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                    ABFM verification tool
                                </a>
                            </div>
                            <div>
                                <a href="https://npiregistry.cms.hhs.gov/" target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                    NPI Registry
                                </a>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

