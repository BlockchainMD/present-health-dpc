import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { GA4Script } from "@/components/analytics/GA4Script";

export const metadata: Metadata = {
  metadataBase: new URL("https://presenthealthmd.com"),
  title: "Present Health | Virtual Primary Care — We Accept Insurance",
  description:
    "Board-certified physicians managing your chronic conditions through convenient video visits. We accept most major insurance plans. No insurance? Visits start at $29.",
  openGraph: {
    siteName: "Present Health",
    type: "website",
    title: "Present Health | Virtual Primary Care — We Accept Insurance",
    description:
      "Board-certified physicians managing your chronic conditions through convenient video visits. We accept most major insurance plans. No insurance? Visits start at $29.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Present Health — Virtual Primary Care with Insurance",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Present Health | Virtual Primary Care — We Accept Insurance",
    description:
      "Virtual primary care that works with your insurance. Convenient video visits, chronic condition management. We accept most major plans.",
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
