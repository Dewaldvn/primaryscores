import { NextResponse } from "next/server";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { feedbackSubmissions } from "@/db/schema";

const TO_EMAIL = "dewaldvn@gmail.com";
const SUBJECT = "SSS Beta1 Errors";
const MAX_SCREENSHOT_BYTES = 8 * 1024 * 1024;
/** Submitted <select> value must match one of these. */
const ISSUE_VALUES = new Set([
  "Bug",
  "There is an issue with the logical flow",
  "Suggestion",
  "I don't like",
]);

function cleanText(value: FormDataEntryValue | null, maxLen: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLen) : "";
}

function toIssueEnum(value: string): "BUG" | "LOGIC" | "SUGGESTION" | "DONT_LIKE" {
  if (value === "Bug") return "BUG";
  if (value === "There is an issue with the logical flow") return "LOGIC";
  if (value === "I don't like") return "DONT_LIKE";
  return "SUGGESTION";
}

async function queueFeedbackFallback(input: {
  name: string;
  cellNo: string;
  email: string;
  issue: string;
  detail: string;
  screenshot: File | null;
  emailError?: string | null;
}) {
  const screenshotBase64 =
    input.screenshot != null ? Buffer.from(await input.screenshot.arrayBuffer()).toString("base64") : null;

  await db.insert(feedbackSubmissions).values({
    name: input.name,
    cellNo: input.cellNo,
    email: input.email,
    issue: toIssueEnum(input.issue),
    detail: input.detail,
    screenshotFileName: input.screenshot?.name || null,
    screenshotMimeType: input.screenshot?.type || null,
    screenshotSizeBytes: input.screenshot ? input.screenshot.size : null,
    screenshotBase64,
    emailDeliveryStatus: input.emailError ? "FAILED" : "QUEUED",
    emailError: input.emailError ?? null,
  });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const name = cleanText(form.get("name"), 120);
  const cellNo = cleanText(form.get("cellNo"), 40);
  const email = cleanText(form.get("email"), 200);
  const issue = cleanText(form.get("issue"), 64);
  const detail = cleanText(form.get("detail"), 5000);
  const screenshotRaw = form.get("screenshot");
  const screenshot = screenshotRaw instanceof File && screenshotRaw.size > 0 ? screenshotRaw : null;

  if (!name || !cellNo || !email || !detail || !ISSUE_VALUES.has(issue)) {
    return NextResponse.json({ ok: false, error: "Please complete all required fields." }, { status: 400 });
  }
  if (screenshot && screenshot.size > MAX_SCREENSHOT_BYTES) {
    return NextResponse.json(
      { ok: false, error: "Screenshot is too large. Maximum size is 8MB." },
      { status: 400 }
    );
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    await queueFeedbackFallback({
      name,
      cellNo,
      email,
      issue,
      detail,
      screenshot,
      emailError: "RESEND_API_KEY missing",
    });
    return NextResponse.json({ ok: true, queued: true });
  }

  const resend = new Resend(apiKey);
  const fromEmail = process.env.FEEDBACK_FROM_EMAIL?.trim() || "onboarding@resend.dev";
  const textBody = [
    "New beta feedback submission",
    "",
    `Name: ${name}`,
    `Cell no: ${cellNo}`,
    `Email: ${email}`,
    `Issue: ${issue}`,
    "",
    "Detail:",
    detail,
  ].join("\n");

  const attachments =
    screenshot != null
      ? [
          {
            filename: screenshot.name || "screenshot",
            content: Buffer.from(await screenshot.arrayBuffer()),
          },
        ]
      : undefined;

  try {
    await resend.emails.send({
      from: fromEmail,
      to: [TO_EMAIL],
      replyTo: email,
      subject: SUBJECT,
      text: textBody,
      attachments,
    });
    return NextResponse.json({ ok: true, queued: false });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not send feedback email.";
    await queueFeedbackFallback({
      name,
      cellNo,
      email,
      issue,
      detail,
      screenshot,
      emailError: msg,
    });
    return NextResponse.json({ ok: true, queued: true });
  }
}
