import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { GA4Script } from "@/components/analytics/GA4Script";

export const metadata: Metadata = {
  metadataBase: new URL("https://presenthealthmd.com"),
  title: "Present Health | Virtual Primary Care for Heart Health — $99/mo, HSA-Eligible",
  description:
    "Michigan's cardiovascular-prevention membership. A board-certified physician tracks your ApoB, blood pressure, and calcium score — and helps you lower them. $99/month. No insurance needed. HSA-eligible.",
  openGraph: {
    siteName: "Present Health",
    type: "website",
    title: "Present Health | Virtual Primary Care for Heart Health — $99/mo, HSA-Eligible",
    description:
      "Michigan's cardiovascular-prevention membership. A board-certified physician tracks your ApoB, blood pressure, and calcium score — and helps you lower them. $99/month. No insurance needed. HSA-eligible.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Present Health — Cardiovascular Prevention Membership",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Present Health | Virtual Primary Care for Heart Health — $99/mo, HSA-Eligible",
    description:
      "Know your heart numbers — then actually lower them. Physician-led cardiovascular prevention, $99/month, no insurance needed.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head />
      <GA4Script />
      <body className="antialiased min-h-screen flex flex-col bg-background text-foreground bg-noise">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
