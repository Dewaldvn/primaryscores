"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const FEEDBACK_ISSUE_OPTIONS = [
  { value: "Bug", label: "Bug" },
  {
    value: "There is an issue with the logical flow",
    label: "There is an issue with the logical flow",
  },
  { value: "Suggestion", label: "Suggestion" },
  { value: "I don't like", label: "I don't like" },
] as const;

export function FeedbackForm() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [queued, setQueued] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(false);
    setQueued(false);
    const formEl = e.currentTarget;
    const fd = new FormData(formEl);

    start(async () => {
      const res = await fetch("/api/feedback", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        queued?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Could not send feedback right now.");
        return;
      }
      formEl.reset();
      setOk(true);
      setQueued(Boolean(data.queued));
    });
  }

  return (
    <form className="grid gap-4 text-sm" onSubmit={onSubmit}>
      <div className="space-y-1">
        <Label htmlFor="feedback-name">Name</Label>
        <Input id="feedback-name" name="name" required maxLength={120} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="feedback-cell">Cell no</Label>
        <Input id="feedback-cell" name="cellNo" type="tel" required maxLength={40} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="feedback-email">Email address</Label>
        <Input id="feedback-email" name="email" type="email" required maxLength={200} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="feedback-issue">Issue</Label>
        <select
          id="feedback-issue"
          name="issue"
          className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
          defaultValue=""
          required
        >
          <option value="" disabled>
            Select issue type
          </option>
          {FEEDBACK_ISSUE_OPTIONS.map((issue) => (
            <option key={issue.value} value={issue.value}>
              {issue.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="feedback-detail">Detail</Label>
        <Textarea id="feedback-detail" name="detail" required maxLength={5000} rows={6} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="feedback-screenshot">Screenshot (optional)</Label>
        <Input
          id="feedback-screenshot"
          name="screenshot"
          type="file"
          accept="image/*"
          capture="environment"
        />
        <p className="text-xs text-muted-foreground">You can upload from phone photo library or your computer.</p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {ok ? (
        <p className="text-sm text-green-700">
          {queued
            ? "Thank you, your feedback was saved and queued for delivery."
            : "Thank you, your feedback was sent."}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Sending..." : "Send feedback"}
      </Button>
    </form>
  );
}
