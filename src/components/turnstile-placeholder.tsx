"use client";

/**
 * Client hook for Cloudflare Turnstile. When site key is unset, no token is produced
 * and server-side verification is skipped (development-friendly).
 */
export function TurnstilePlaceholder({
  onToken,
}: {
  onToken: (token: string | null) => void;
}) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  if (!siteKey || siteKey === "placeholder") {
    return (
      <div className="rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        Turnstile not configured (set{" "}
        <code className="text-xs">NEXT_PUBLIC_TURNSTILE_SITE_KEY</code>). Submissions still work in dev.
      </div>
    );
  }

  return (
    <div
      className="cf-turnstile min-h-[65px] rounded-md border bg-muted/30"
      data-sitekey={siteKey}
      ref={(el) => {
        if (!el || typeof window === "undefined") return;
        // Integrate cf-turnstile script in layout or loadScript when key present
        onToken(null);
      }}
    />
  );
}
