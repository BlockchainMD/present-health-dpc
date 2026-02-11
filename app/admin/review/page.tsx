"use client";

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, Loader2, ExternalLink } from 'lucide-react';
import { Markdown } from '@/components/markdown';
import { normalizeMarkdownForRender } from '@/lib/markdown-utils';

interface Article {
    id: string;
    title: string;
    content: string;
    status: 'DRAFT' | 'PUBLISHED' | 'DISCARDED';
    sourceUrl?: string | null;
    createdAt: string;
    angle?: string | null;
    intent?: string | null;
    cluster?: string | null;
    riskLevel?: string | null;
    reviewType?: string | null;
    reviewedByDisplayName?: string | null;
}

export default function ReviewPage() {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [errorIssues, setErrorIssues] = useState<string[]>([]);
    const [blockedById, setBlockedById] = useState<Record<string, string>>({});
    const [fixingId, setFixingId] = useState<string | null>(null);
    const [proofreadingId, setProofreadingId] = useState<string | null>(null);
    const [revisePromptById, setRevisePromptById] = useState<Record<string, string>>({});
    const [revisingId, setRevisingId] = useState<string | null>(null);
    const [editingById, setEditingById] = useState<Record<string, boolean>>({});
    const [draftEditsById, setDraftEditsById] = useState<Record<string, { title: string; content: string }>>({});
    const editorRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

    useEffect(() => {
        fetchArticles();
    }, []);

    const fetchArticles = async () => {
        try {
            const res = await fetch('/api/admin/articles?status=DRAFT');
            const data = await res.json();
            if (data.success) {
                setArticles(data.articles);
            }
        } catch (error) {
            console.error('Failed to fetch articles', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (
        id: string,
        newStatus: 'PUBLISHED' | 'DISCARDED',
        options?: { forcePublish?: boolean }
    ) => {
        setProcessingId(id);
        setErrorMessage(null);
        setErrorIssues([]);
        setBlockedById((prev) => {
            if (!prev[id]) return prev;
            const next = { ...prev };
            delete next[id];
            return next;
        });
        try {
            const draft = draftEditsById[id];
            if (newStatus === 'PUBLISHED' && draft && !draft.title.trim()) {
                setErrorMessage('Title cannot be empty.');
                setProcessingId(null);
                return;
            }
            const res = await fetch(`/api/admin/articles/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: newStatus,
                    forcePublish: options?.forcePublish,
                    ...(newStatus === 'PUBLISHED' && draft
                        ? { title: draft.title, content: draft.content }
                        : {})
                })
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                setErrorMessage(data?.error || `Failed to update article (${res.status}).`);
                if (Array.isArray(data?.issues)) {
                    setErrorIssues(data.issues);
                }
                if (res.status === 423 && newStatus === 'PUBLISHED') {
                    setBlockedById(prev => ({ ...prev, [id]: data?.error || 'Publishing blocked by SEO Health.' }));
                }
                return;
            }
            // Remove from list
            setArticles(prev => prev.filter(a => a.id !== id));
            setDraftEditsById(prev => {
                if (!prev[id]) return prev;
                const next = { ...prev };
                delete next[id];
                return next;
            });
            setEditingById(prev => {
                if (!prev[id]) return prev;
                const next = { ...prev };
                delete next[id];
                return next;
            });
        } catch (error) {
            console.error('Failed to update status', error);
            setErrorMessage('Failed to update article. Please try again.');
        } finally {
            setProcessingId(null);
        }
    };

    const hasUnsavedChanges = (id: string) => {
        const article = articles.find(item => item.id === id);
        const draft = draftEditsById[id];
        if (!article || !draft) return false;
        return draft.title !== article.title || draft.content !== article.content;
    };

    const updateDraft = (article: Article, updates: Partial<{ title: string; content: string }>) => {
        setDraftEditsById(prev => {
            const current = prev[article.id] || { title: article.title || '', content: article.content || '' };
            return {
                ...prev,
                [article.id]: {
                    ...current,
                    ...updates
                }
            };
        });
    };

    const handleToggleEditor = (article: Article) => {
        const isEditing = !!editingById[article.id];
        if (isEditing) {
            if (hasUnsavedChanges(article.id)) {
                setErrorMessage('Save or discard your edits before closing the editor.');
                return;
            }
            setEditingById(prev => ({ ...prev, [article.id]: false }));
            setDraftEditsById(prev => {
                if (!prev[article.id]) return prev;
                const next = { ...prev };
                delete next[article.id];
                return next;
            });
            return;
        }
        setEditingById(prev => ({ ...prev, [article.id]: true }));
        updateDraft(article, {});
    };

    const handleDiscardEdits = (article: Article) => {
        setDraftEditsById(prev => {
            if (!prev[article.id]) return prev;
            const next = { ...prev };
            delete next[article.id];
            return next;
        });
        setEditingById(prev => ({ ...prev, [article.id]: false }));
    };

    const handleSaveEdits = async (article: Article) => {
        const draft = draftEditsById[article.id];
        if (!draft) return;
        if (!draft.title.trim()) {
            setErrorMessage('Title cannot be empty.');
            return;
        }
        setSavingId(article.id);
        setErrorMessage(null);
        setErrorIssues([]);
        try {
            const res = await fetch(`/api/admin/articles/${article.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: draft.title, content: draft.content })
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                setErrorMessage(data?.error || 'Failed to save changes.');
                return;
            }
            const updated = data.article as Article;
            setArticles(prev => prev.map(item => (item.id === article.id ? { ...item, ...updated } : item)));
            setDraftEditsById(prev => ({
                ...prev,
                [article.id]: { title: updated.title, content: updated.content }
            }));
        } catch (error) {
            console.error('Failed to save edits', error);
            setErrorMessage('Failed to save changes.');
        } finally {
            setSavingId(null);
        }
    };

    const applyInlineFormat = (
        article: Article,
        prefix: string,
        suffix = prefix,
        placeholder = 'text'
    ) => {
        const textarea = editorRefs.current[article.id];
        if (!textarea) return;
        const draft = draftEditsById[article.id] || { title: article.title || '', content: article.content || '' };
        const { selectionStart, selectionEnd } = textarea;
        const selected = draft.content.slice(selectionStart, selectionEnd);
        const insertion = `${prefix}${selected || placeholder}${suffix}`;
        const nextContent =
            draft.content.slice(0, selectionStart) +
            insertion +
            draft.content.slice(selectionEnd);
        updateDraft(article, { content: nextContent });
        const selectionStartNext = selectionStart + prefix.length;
        const selectionEndNext = selectionStartNext + (selected ? selected.length : placeholder.length);
        requestAnimationFrame(() => {
            textarea.focus();
            textarea.setSelectionRange(selectionStartNext, selectionEndNext);
        });
    };

    const applyLinePrefix = (article: Article, prefix: string) => {
        const textarea = editorRefs.current[article.id];
        if (!textarea) return;
        const draft = draftEditsById[article.id] || { title: article.title || '', content: article.content || '' };
        const { selectionStart, selectionEnd } = textarea;
        const value = draft.content;
        const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
        const lineEnd = value.indexOf('\n', selectionEnd);
        const endIndex = lineEnd === -1 ? value.length : lineEnd;
        const selectedText = value.slice(lineStart, endIndex);
        const lines = selectedText.split('\n');
        const prefixed = lines.map(line => (line.trim().length ? `${prefix}${line}` : line));
        const updatedSelection = prefixed.join('\n');
        const nextContent = value.slice(0, lineStart) + updatedSelection + value.slice(endIndex);
        updateDraft(article, { content: nextContent });
        const newSelectionEnd = lineStart + updatedSelection.length;
        requestAnimationFrame(() => {
            textarea.focus();
            textarea.setSelectionRange(lineStart, newSelectionEnd);
        });
    };

    const applyNumberedList = (article: Article) => {
        const textarea = editorRefs.current[article.id];
        if (!textarea) return;
        const draft = draftEditsById[article.id] || { title: article.title || '', content: article.content || '' };
        const { selectionStart, selectionEnd } = textarea;
        const value = draft.content;
        const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
        const lineEnd = value.indexOf('\n', selectionEnd);
        const endIndex = lineEnd === -1 ? value.length : lineEnd;
        const selectedText = value.slice(lineStart, endIndex);
        const lines = selectedText.split('\n');
        let counter = 1;
        const numbered = lines.map(line => {
            if (!line.trim().length) return line;
            const entry = `${counter}. ${line}`;
            counter += 1;
            return entry;
        });
        const updatedSelection = numbered.join('\n');
        const nextContent = value.slice(0, lineStart) + updatedSelection + value.slice(endIndex);
        updateDraft(article, { content: nextContent });
        const newSelectionEnd = lineStart + updatedSelection.length;
        requestAnimationFrame(() => {
            textarea.focus();
            textarea.setSelectionRange(lineStart, newSelectionEnd);
        });
    };

    const insertLink = (article: Article) => {
        const textarea = editorRefs.current[article.id];
        if (!textarea) return;
        const draft = draftEditsById[article.id] || { title: article.title || '', content: article.content || '' };
        const { selectionStart, selectionEnd } = textarea;
        const selected = draft.content.slice(selectionStart, selectionEnd) || 'link text';
        const urlPlaceholder = 'https://';
        const insertion = `[${selected}](${urlPlaceholder})`;
        const nextContent =
            draft.content.slice(0, selectionStart) +
            insertion +
            draft.content.slice(selectionEnd);
        updateDraft(article, { content: nextContent });
        const urlStart = selectionStart + selected.length + 2;
        const urlEnd = urlStart + urlPlaceholder.length;
        requestAnimationFrame(() => {
            textarea.focus();
            textarea.setSelectionRange(urlStart, urlEnd);
        });
    };

    const insertCodeBlock = (article: Article) => {
        const textarea = editorRefs.current[article.id];
        if (!textarea) return;
        const draft = draftEditsById[article.id] || { title: article.title || '', content: article.content || '' };
        const { selectionStart, selectionEnd } = textarea;
        const selected = draft.content.slice(selectionStart, selectionEnd) || 'code';
        const insertion = `\n\`\`\`\n${selected}\n\`\`\`\n`;
        const nextContent =
            draft.content.slice(0, selectionStart) +
            insertion +
            draft.content.slice(selectionEnd);
        updateDraft(article, { content: nextContent });
        const codeStart = selectionStart + 4;
        const codeEnd = codeStart + selected.length;
        requestAnimationFrame(() => {
            textarea.focus();
            textarea.setSelectionRange(codeStart, codeEnd);
        });
    };

    const handleFixFormatting = async (id: string) => {
        if (hasUnsavedChanges(id)) {
            setErrorMessage('Save or discard your edits before fixing formatting.');
            return;
        }
        setFixingId(id);
        setErrorMessage(null);
        setErrorIssues([]);
        try {
            const res = await fetch(`/api/admin/articles/${id}/normalize`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok || !data?.success) {
                setErrorMessage(data?.error || 'Failed to fix formatting.');
                return;
            }
            setArticles(prev => prev.map(article => (article.id === id ? { ...article, content: data.article.content } : article)));
            setDraftEditsById(prev => {
                if (!prev[id]) return prev;
                return { ...prev, [id]: { ...prev[id], content: data.article.content } };
            });
        } catch (error) {
            console.error('Failed to normalize article', error);
            setErrorMessage('Failed to fix formatting.');
        } finally {
            setFixingId(null);
        }
    };

    const handleProofread = async (id: string) => {
        if (hasUnsavedChanges(id)) {
            setErrorMessage('Save or discard your edits before proofreading.');
            return;
        }
        setProofreadingId(id);
        setErrorMessage(null);
        setErrorIssues([]);
        try {
            const res = await fetch(`/api/admin/articles/${id}/proofread`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok || !data?.success) {
                setErrorMessage(data?.error || 'Failed to proofread article.');
                return;
            }
            setArticles(prev => prev.map(article => (article.id === id ? { ...article, content: data.article.content } : article)));
            setDraftEditsById(prev => {
                if (!prev[id]) return prev;
                return { ...prev, [id]: { ...prev[id], content: data.article.content } };
            });
        } catch (error) {
            console.error('Failed to proofread article', error);
            setErrorMessage('Failed to proofread article.');
        } finally {
            setProofreadingId(null);
        }
    };

    const handleRevise = async (id: string) => {
        if (hasUnsavedChanges(id)) {
            setErrorMessage('Save or discard your edits before applying a revision prompt.');
            return;
        }
        const prompt = (revisePromptById[id] || '').trim();
        if (!prompt) {
            setErrorMessage('Please enter revision instructions.');
            return;
        }
        setRevisingId(id);
        setErrorMessage(null);
        setErrorIssues([]);
        try {
            const res = await fetch(`/api/admin/articles/${id}/revise`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });
            const data = await res.json();
            if (!res.ok || !data?.success) {
                setErrorMessage(data?.error || 'Failed to revise article.');
                return;
            }
            setArticles(prev => prev.map(article => (article.id === id ? { ...article, content: data.article.content } : article)));
            setDraftEditsById(prev => {
                if (!prev[id]) return prev;
                return { ...prev, [id]: { ...prev[id], content: data.article.content } };
            });
        } catch (error) {
            console.error('Failed to revise article', error);
            setErrorMessage('Failed to revise article.');
        } finally {
            setRevisingId(null);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Review Drafts</h2>
                <p className="text-muted-foreground">Approve or discard AI-generated content.</p>
            </div>
            {errorMessage && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive space-y-2">
                    <div>{errorMessage}</div>
                    {errorIssues.length > 0 && (
                        <ul className="list-disc list-inside text-xs text-destructive/90">
                            {errorIssues.map((issue) => (
                                <li key={issue}>{issue}</li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {articles.length === 0 ? (
                <div className="text-center p-12 border border-dashed rounded-lg">
                    <p className="text-muted-foreground">No drafts pending review.</p>
                    <Button variant="link" asChild className="mt-2">
                        <a href="/admin">Go to Generator</a>
                    </Button>
                </div>
            ) : (
                <div className="grid gap-6">
                    {articles.map((article) => {
                        const draft = draftEditsById[article.id];
                        const hasDraftChanges = !!draft && (draft.title !== article.title || draft.content !== article.content);
                        return (
                        <Card key={article.id} className="overflow-hidden">
                            <CardHeader className="bg-muted/30 pb-4">
                                <div className="flex justify-between items-start gap-4">
                                    <CardTitle className="text-xl leading-tight">{draft?.title ?? article.title}</CardTitle>
                                    <Badge variant="outline">AI Draft</Badge>
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-2">
                                    {article.cluster && <span className="rounded-full border px-2 py-0.5">Cluster: {article.cluster}</span>}
                                    {article.angle && <span className="rounded-full border px-2 py-0.5">Angle: {article.angle}</span>}
                                    {article.intent && <span className="rounded-full border px-2 py-0.5">Intent: {article.intent}</span>}
                                    {article.riskLevel && <span className="rounded-full border px-2 py-0.5">Risk: {article.riskLevel}</span>}
                                    {article.reviewType && <span className="rounded-full border px-2 py-0.5">Review: {article.reviewType}</span>}
                                    {article.reviewedByDisplayName && <span className="rounded-full border px-2 py-0.5">Label: {article.reviewedByDisplayName}</span>}
                                </div>
                                {article.sourceUrl && (
                                    <a
                                        href={article.sourceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                                    >
                                        Source: {(() => {
                                            try {
                                                return new URL(article.sourceUrl).hostname;
                                            } catch {
                                                return article.sourceUrl;
                                            }
                                        })()} <ExternalLink className="h-3 w-3" />
                                    </a>
                                )}
                            </CardHeader>
                            <CardContent className="pt-6 space-y-6">
                                {editingById[article.id] ? (
                                    <div className="space-y-4">
                                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                                            <span>Editing mode: Markdown supported with live preview.</span>
                                            <div className="flex flex-wrap gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleSaveEdits(article)}
                                                    disabled={
                                                        savingId === article.id ||
                                                        !hasDraftChanges
                                                    }
                                                >
                                                    {savingId === article.id ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                                                    Save draft
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDiscardEdits(article)}
                                                >
                                                    Discard changes
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-muted-foreground">Title</label>
                                            <input
                                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                value={(draft?.title ?? article.title) || ''}
                                                onChange={(event) => updateDraft(article, { title: event.target.value })}
                                            />
                                        </div>

                                        <div className="rounded-lg border bg-background">
                                            <div className="flex flex-wrap gap-2 border-b px-3 py-2 text-xs">
                                                <Button variant="ghost" size="sm" onClick={() => applyInlineFormat(article, '**', '**', 'bold text')}>
                                                    Bold
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => applyInlineFormat(article, '_', '_', 'italic text')}>
                                                    Italic
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => applyLinePrefix(article, '## ')}>
                                                    H2
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => applyLinePrefix(article, '- ')}>
                                                    Bullets
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => applyNumberedList(article)}>
                                                    Numbered
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => applyLinePrefix(article, '> ')}>
                                                    Quote
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => insertLink(article)}>
                                                    Link
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => insertCodeBlock(article)}>
                                                    Code block
                                                </Button>
                                            </div>
                                            <div className="grid gap-4 p-3 md:grid-cols-2">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-muted-foreground">Markdown</label>
                                                    <textarea
                                                        ref={(el) => {
                                                            editorRefs.current[article.id] = el;
                                                        }}
                                                        className="min-h-[280px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                        value={draft?.content ?? article.content ?? ''}
                                                        onChange={(event) => updateDraft(article, { content: event.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <span className="text-xs font-medium text-muted-foreground">Preview</span>
                                                    <div className="min-h-[280px] rounded-md border bg-muted/30 p-3 overflow-y-auto">
                                                        <div className="prose prose-sm dark:prose-invert max-w-none">
                                                            <Markdown content={normalizeMarkdownForRender(draft?.content ?? article.content)} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="max-h-64 overflow-y-auto prose prose-sm dark:prose-invert max-w-none">
                                        <Markdown content={normalizeMarkdownForRender(article.content)} />
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground">Custom revision instructions</label>
                                    <textarea
                                        className="w-full min-h-[90px] rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        placeholder="Example: tighten the TL;DR, make the FAQ more specific, remove any repetition, and keep the tone professional."
                                        value={revisePromptById[article.id] || ''}
                                        onChange={(event) => setRevisePromptById(prev => ({ ...prev, [article.id]: event.target.value }))}
                                    />
                                </div>
                            </CardContent>
                            <CardFooter className="bg-muted/10 flex justify-end gap-3 pt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => handleToggleEditor(article)}
                                    disabled={!!processingId || savingId === article.id}
                                >
                                    {editingById[article.id] ? 'Close editor' : 'Edit draft'}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => handleRevise(article.id)}
                                    disabled={!!processingId || revisingId === article.id || hasDraftChanges || savingId === article.id}
                                >
                                    {revisingId === article.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                    Apply prompt
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => handleProofread(article.id)}
                                    disabled={!!processingId || proofreadingId === article.id || hasDraftChanges || savingId === article.id}
                                >
                                    {proofreadingId === article.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                    AI proofread
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => handleFixFormatting(article.id)}
                                    disabled={!!processingId || fixingId === article.id || hasDraftChanges || savingId === article.id}
                                >
                                    {fixingId === article.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                    Fix formatting
                                </Button>
                                {blockedById[article.id] && (
                                    <div className="mr-auto flex items-center gap-3 text-sm text-amber-700">
                                        <span>{blockedById[article.id]}</span>
                                        <Button
                                            variant="outline"
                                            className="border-amber-400 text-amber-700 hover:bg-amber-50"
                                            onClick={() => handleStatusUpdate(article.id, 'PUBLISHED', { forcePublish: true })}
                                            disabled={!!processingId}
                                        >
                                            Publish anyway
                                        </Button>
                                    </div>
                                )}
                                <Button
                                    variant="outline"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => handleStatusUpdate(article.id, 'DISCARDED')}
                                    disabled={!!processingId || savingId === article.id}
                                >
                                    {processingId === article.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 mr-2" />}
                                    Discard
                                </Button>
                                <Button
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => handleStatusUpdate(article.id, 'PUBLISHED')}
                                    disabled={!!processingId || savingId === article.id}
                                >
                                    {processingId === article.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                                    Publish
                                </Button>
                            </CardFooter>
                        </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
