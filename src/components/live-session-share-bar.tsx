"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageSquare, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LiveSessionClientRow } from "@/lib/live-session-types";

/** WhatsApp logomark (monochrome + brand tint via parent `text-*`). */
function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

function buildSharePayload(session: LiveSessionClientRow) {
  const scoreLine = session.majority
    ? `${session.majority.homeScore}–${session.majority.awayScore}`
    : "No score yet";
  const title = `${session.homeTeamName} vs ${session.awayTeamName}`;
  const text = `${session.homeTeamName} ${scoreLine} ${session.awayTeamName}`;
  return { title, text };
}

export function LiveSessionShareBar({ session }: { session: LiveSessionClientRow }) {
  const [pageUrl, setPageUrl] = useState("");

  useEffect(() => {
    setPageUrl(`${window.location.origin}/live/${session.id}`);
  }, [session.id]);

  const { title, text } = buildSharePayload(session);
  const combined = pageUrl ? `${text}\n${pageUrl}` : "";

  const onNativeShare = useCallback(async () => {
    if (!pageUrl) return;
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url: pageUrl });
      } catch (e) {
        const name = e instanceof Error ? e.name : "";
        if (name !== "AbortError") toast.error("Could not open share sheet.");
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(combined);
      toast.success("Copied score and link.");
    } catch {
      toast.error("Copy not supported in this browser.");
    }
  }, [combined, pageUrl, text, title]);

  const copyLink = useCallback(async () => {
    if (!pageUrl) return;
    try {
      await navigator.clipboard.writeText(pageUrl);
      toast.success("Link copied.");
    } catch {
      toast.error("Could not copy.");
    }
  }, [pageUrl]);

  const waHref = `https://wa.me/?text=${encodeURIComponent(combined)}`;
  const smsHref = `sms:?&body=${encodeURIComponent(combined)}`;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
      {!pageUrl ? (
        <p className="text-xs text-muted-foreground">Preparing share links…</p>
      ) : null}
      <Button
        type="button"
        size="icon-sm"
        variant="default"
        disabled={!pageUrl}
        onClick={() => void onNativeShare()}
        aria-label="Share score (opens share sheet or copies score and link)"
        title="Share"
      >
        <Share2 className="size-4" aria-hidden />
      </Button>
      {combined ? (
        <>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "outline", size: "icon-sm" }),
              "inline-flex items-center justify-center text-[#25D366] hover:text-[#20BD5A] dark:text-[#25D366]"
            )}
            aria-label="Share via WhatsApp"
            title="WhatsApp"
          >
            <WhatsAppGlyph className="size-4" />
          </a>
          <a
            href={smsHref}
            className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }), "inline-flex items-center justify-center")}
            aria-label="Share via SMS or Messages"
            title="Messages / SMS"
          >
            <MessageSquare className="size-4" aria-hidden />
          </a>
        </>
      ) : null}
      <Button type="button" size="sm" variant="outline" onClick={() => void copyLink()} disabled={!pageUrl}>
        Copy link
      </Button>
    </div>
  );
}
