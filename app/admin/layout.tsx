import Link from 'next/link';
import { LayoutDashboard, FileText, Settings, ExternalLink } from 'lucide-react';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-muted/20">
            {/* Sidebar */}
            <aside className="w-64 bg-card border-r border-border hidden md:flex flex-col">
                <div className="p-6 border-b border-border">
                    <h1 className="text-xl font-bold text-primary">Present Health</h1>
                    <p className="text-xs text-muted-foreground">Admin Panel</p>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <Link
                        href="/admin"
                        className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
                    >
                        <LayoutDashboard className="h-4 w-4" />
                        Dashboard
                    </Link>
                    <Link
                        href="/admin/review"
                        className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
                    >
                        <FileText className="h-4 w-4" />
                        Review Drafts
                    </Link>
                    <Link
                        href="/admin/campaigns"
                        className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
                    >
                        <LayoutDashboard className="h-4 w-4" />
                        Campaigns
                    </Link>
                    <Link
                        href="/admin/published"
                        className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
                    >
                        <FileText className="h-4 w-4" />
                        Published Articles
                    </Link>
                    <Link
                        href="/blog"
                        target="_blank"
                        className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors mt-8"
                    >
                        <ExternalLink className="h-4 w-4" />
                        View Live Blog
                    </Link>
                </nav>

                {/* Version Info */}
                <div className="p-4 border-t border-border text-xs text-muted-foreground/60">
                    <p>Build: {process.env.NEXT_PUBLIC_BUILD_ID?.slice(0, 7) || 'dev'}</p>
                    <p>{process.env.NEXT_PUBLIC_BUILD_TIME || 'Local'}</p>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
