import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Create Your Account | Present Health",
    description: "Sign up for a Present Health membership — text-first primary care starting at $99/month. No insurance required.",
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
    return children;
}
