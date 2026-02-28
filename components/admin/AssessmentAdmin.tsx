'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

type SessionRow = {
  id: string;
  token: string;
  cluster: string | null;
  status: string;
  signalCount: number;
  email: string | null;
  firstName: string | null;
  leadId: string | null;
  createdAt: string;
  completedAt: string | null;
  capturedAt: string | null;
};

type ProfileRow = {
  id: string;
  email: string | null;
  firstName: string | null;
  leadId: string | null;
  signalCount: number;
  activeClusters: string[];
  sessionCount: number;
  createdAt: string;
  updatedAt: string;
};

type ApiResponse = {
  view: string;
  total: number;
  page: number;
  pageSize: number;
  rows: SessionRow[] | ProfileRow[];
};

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    STARTED: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-emerald-100 text-emerald-800',
    CAPTURED: 'bg-purple-100 text-purple-800',
  };
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${variants[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}

export function AssessmentAdmin() {
  const [view, setView] = useState<'sessions' | 'profiles'>('sessions');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/assessment?view=${view}&page=${page}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [view, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Assessment Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sessions and health profiles from the assessment widget
          </p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </Button>
      </div>

      {/* View toggle */}
      <div className="flex gap-2">
        <Button
          variant={view === 'sessions' ? 'default' : 'outline'}
          size="sm"
          onClick={() => { setView('sessions'); setPage(1); }}
        >
          Sessions
        </Button>
        <Button
          variant={view === 'profiles' ? 'default' : 'outline'}
          size="sm"
          onClick={() => { setView('profiles'); setPage(1); }}
        >
          Health Profiles
        </Button>
      </div>

      {error ? (
        <Card>
          <CardContent className="pt-6 text-red-600">{error}</CardContent>
        </Card>
      ) : null}

      {data ? (
        <>
          <p className="text-sm text-muted-foreground">
            {data.total} total {view} · page {data.page} of {totalPages}
          </p>

          {view === 'sessions' ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Assessment Sessions</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground text-left">
                      <th className="py-2 pr-4 font-medium">Token</th>
                      <th className="py-2 pr-4 font-medium">Cluster</th>
                      <th className="py-2 pr-4 font-medium">Status</th>
                      <th className="py-2 pr-4 font-medium">Signals</th>
                      <th className="py-2 pr-4 font-medium">Email</th>
                      <th className="py-2 pr-4 font-medium">Lead</th>
                      <th className="py-2 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.rows as SessionRow[]).map((row) => (
                      <tr key={row.id} className="border-b hover:bg-muted/30">
                        <td className="py-2 pr-4 font-mono text-xs">{row.token}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{row.cluster || '—'}</td>
                        <td className="py-2 pr-4"><StatusBadge status={row.status} /></td>
                        <td className="py-2 pr-4">
                          <Badge variant="secondary">{row.signalCount}</Badge>
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">{row.email || '—'}</td>
                        <td className="py-2 pr-4">
                          {row.leadId ? (
                            <a href="/admin/leads" className="text-blue-600 hover:underline text-xs">
                              View lead
                            </a>
                          ) : '—'}
                        </td>
                        <td className="py-2 text-muted-foreground text-xs">
                          {format(new Date(row.createdAt), 'MMM d, h:mm a')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.rows.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">No sessions yet</p>
                ) : null}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Health Profiles</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground text-left">
                      <th className="py-2 pr-4 font-medium">Email</th>
                      <th className="py-2 pr-4 font-medium">Name</th>
                      <th className="py-2 pr-4 font-medium">Signals</th>
                      <th className="py-2 pr-4 font-medium">Clusters</th>
                      <th className="py-2 pr-4 font-medium">Sessions</th>
                      <th className="py-2 pr-4 font-medium">Lead</th>
                      <th className="py-2 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.rows as ProfileRow[]).map((row) => (
                      <tr key={row.id} className="border-b hover:bg-muted/30">
                        <td className="py-2 pr-4 text-muted-foreground">{row.email || '—'}</td>
                        <td className="py-2 pr-4">{row.firstName || '—'}</td>
                        <td className="py-2 pr-4">
                          <Badge variant="secondary">{row.signalCount}</Badge>
                        </td>
                        <td className="py-2 pr-4">
                          <div className="flex flex-wrap gap-1">
                            {row.activeClusters.slice(0, 3).map((c) => (
                              <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                            ))}
                            {row.activeClusters.length > 3 ? (
                              <span className="text-xs text-muted-foreground">+{row.activeClusters.length - 3}</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="py-2 pr-4">{row.sessionCount}</td>
                        <td className="py-2 pr-4">
                          {row.leadId ? (
                            <a href="/admin/leads" className="text-blue-600 hover:underline text-xs">
                              View lead
                            </a>
                          ) : '—'}
                        </td>
                        <td className="py-2 text-muted-foreground text-xs">
                          {format(new Date(row.createdAt), 'MMM d, h:mm a')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.rows.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">No profiles yet</p>
                ) : null}
              </CardContent>
            </Card>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
            >
              Next
            </Button>
          </div>
        </>
      ) : loading ? (
        <p className="text-center text-muted-foreground py-8">Loading…</p>
      ) : null}
    </div>
  );
}
