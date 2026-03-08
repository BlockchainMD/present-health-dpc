import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://presenthealthmd.com"),
  title: "Present Health | Messaging-First Primary Care",
  description:
    "Full-service primary care by message, phone, or video. One plan: $99/month. Everything included. Adults 18+.",
  openGraph: {
    siteName: "Present Health",
    type: "website",
    title: "Present Health | Messaging-First Primary Care",
    description:
      "Full-service primary care by message, phone, or video. One plan: $99/month. Everything included. Adults 18+.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Present Health — Messaging-First Primary Care",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Present Health | Messaging-First Primary Care",
    description:
      "Full-service primary care by message, phone, or video. One plan: $99/month. Everything included. Adults 18+.",
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col bg-background text-foreground bg-noise`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
