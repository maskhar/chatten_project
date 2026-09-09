import type { Metadata } from "next";
import "./globals.css";
const appUrl = process.env.NEXT_PUBLIC_APP_URL;
export const metadata: Metadata = { title: "Chatten Cafe", description: "A place to eat, talk, and experience Batu.", ...(appUrl ? { metadataBase: new URL(appUrl), openGraph: { title: "Chatten Cafe", description: "A place to eat, talk, and experience Batu.", type: "website" as const, images: [{ url: "/og.svg", width: 1200, height: 630, alt: "Chatten Cafe" }] } } : {}) };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { const jsonLd = { "@context": "https://schema.org", "@type": "WebSite", name: "Chatten Cafe", description: "A place to eat, talk, and experience Batu.", url: process.env.NEXT_PUBLIC_APP_URL || undefined }; return <html lang="en"><body>{children}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></body></html>; }
