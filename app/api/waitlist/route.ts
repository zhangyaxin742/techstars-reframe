import { NextResponse } from "next/server";
import {
  WaitlistProviderNotConfiguredError,
  type WaitlistSubmission,
  submitWaitlistEmail,
} from "@/lib/waitlist/submit";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const maxTextLength = 2_000;

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeCompanyUrl(value: string) {
  const candidate = value.match(/^https?:\/\//i) ? value : `https://${value}`;

  try {
    const url = new URL(candidate);

    if (!url.hostname.includes(".")) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function sanitizeMetadata(value: unknown) {
  if (!value || typeof value !== "object") {
    return {};
  }

  const metadata = value as Record<string, unknown>;

  return {
    landingPage: readString(metadata.landingPage),
    utmSource: readString(metadata.utmSource),
    utmMedium: readString(metadata.utmMedium),
    utmCampaign: readString(metadata.utmCampaign),
    referrer: readString(metadata.referrer),
  };
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 },
    );
  }

  const body = payload as {
    email?: unknown;
    companyUrl?: unknown;
    growthChallenge?: unknown;
    metadata?: unknown;
  };
  const email = readString(body.email).toLowerCase();
  const companyUrl = normalizeCompanyUrl(readString(body.companyUrl));
  const growthChallenge = readString(body.growthChallenge);
  const metadata = sanitizeMetadata(body.metadata);

  if (!emailPattern.test(email)) {
    return NextResponse.json(
      { ok: false, error: "Enter a valid email address." },
      { status: 400 },
    );
  }

  if (!companyUrl) {
    return NextResponse.json(
      { ok: false, error: "Enter a valid company URL." },
      { status: 400 },
    );
  }

  if (!growthChallenge) {
    return NextResponse.json(
      { ok: false, error: "Tell us your biggest growth challenge." },
      { status: 400 },
    );
  }

  if (growthChallenge.length > maxTextLength) {
    return NextResponse.json(
      { ok: false, error: "Keep your growth challenge under 2000 characters." },
      { status: 400 },
    );
  }

  const referer = readString(request.headers.get("referer"));
  const submission: WaitlistSubmission = {
    email,
    companyUrl,
    growthChallenge,
    metadata: {
      createdAt: new Date().toISOString(),
      source: "reframe-landing",
      landingPage: metadata.landingPage || referer || "/",
      utmSource: metadata.utmSource || undefined,
      utmMedium: metadata.utmMedium || undefined,
      utmCampaign: metadata.utmCampaign || undefined,
      referrer: metadata.referrer || undefined,
    },
  };

  try {
    await submitWaitlistEmail(submission);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof WaitlistProviderNotConfiguredError) {
      return NextResponse.json(
        { ok: false, error: "Waitlist delivery is not configured yet." },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
