export default function LandingPageLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <main className="flex-1">
            {children}
        </main>
    );
}
