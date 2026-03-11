import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Start Membership | Present Health",
    description: "Start your Present Health membership checkout and set your password after payment. Messaging-first primary care for adults 18+.",
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
    return children;
}
