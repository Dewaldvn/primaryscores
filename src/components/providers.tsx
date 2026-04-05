"use client";

import { ThemeProvider } from "next-themes";
import { GlobalSearchProvider } from "@/components/global-search";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <GlobalSearchProvider>
        {children}
        <Toaster />
      </GlobalSearchProvider>
    </ThemeProvider>
  );
}
