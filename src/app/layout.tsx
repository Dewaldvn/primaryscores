import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers";
import { SiteHeaderAsync } from "@/components/site-header-async";
import { SiteHeaderSkeleton } from "@/components/site-header-skeleton";
import { AdminBar } from "@/components/admin-bar";
import { FavouritesBar } from "@/components/favourites-bar";

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "Primary Rugby Scores SA",
    template: "%s · Primary Rugby Scores SA",
  },
  description:
    "Historical U13 primary school rugby results for South Africa — browse verified scores, seasons, and schools.",
  icons: {
    icon: [{ url: "/brand/site-logo.png", type: "image/png" }],
    apple: "/brand/site-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(GeistSans.variable, GeistMono.variable, "min-h-screen antialiased font-sans")}>
        <Providers>
          <Suspense fallback={<SiteHeaderSkeleton />}>
            <SiteHeaderAsync />
          </Suspense>
          <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
            <Suspense fallback={null}>
              <AdminBar />
            </Suspense>
            <Suspense fallback={null}>
              <FavouritesBar />
            </Suspense>
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
