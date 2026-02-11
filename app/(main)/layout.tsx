import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PublicChatbotMount } from "@/components/chatbot/PublicChatbotMount";
import { NativePageTracker } from "@/components/analytics/NativePageTracker";

export default function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <Header />
            <main className="flex-1 pt-20">
                {children}
            </main>
            <Footer />
            <PublicChatbotMount />
            <NativePageTracker />
        </>
    );
}
