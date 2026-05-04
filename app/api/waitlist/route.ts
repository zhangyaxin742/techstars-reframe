import { NextResponse } from "next/server";
import { checkWaitlistRateLimit } from "@/lib/waitlist/rate-limit";
import {
  WaitlistProviderNotConfiguredError,
  type WaitlistRequestContext,
  type WaitlistSubmission,
  submitWaitlistEmail,
} from "@/lib/waitlist/submit";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const maxTextLength = 2_000;

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalString(value: unknown) {
  const normalized = readString(value);
  return normalized || undefined;
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

function hasJsonContentType(request: Request) {
  const contentType = readString(request.headers.get("content-type"));
  return contentType.toLowerCase().includes("application/json");
}

function isAllowedOrigin(request: Request) {
  const origin = readString(request.headers.get("origin"));

  if (!origin) {
    return true;
  }

  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);
    return (
      originUrl.protocol === requestUrl.protocol && originUrl.host === requestUrl.host
    );
  } catch {
    return false;
  }
}

function readClientIp(request: Request) {
  const forwardedFor = readString(request.headers.get("x-forwarded-for"));

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null;
  }

  const realIp = readString(request.headers.get("x-real-ip"));
  return realIp || null;
}

function readHoneypotValue(body: Record<string, unknown>) {
  const honeypotKeys = ["website", "fullName", "phone", "faxNumber"];

  for (const key of honeypotKeys) {
    const value = readString(body[key]);
    if (value) {
      return value;
    }
  }

  return "";
}

export async function POST(request: Request) {
  if (!hasJsonContentType(request)) {
    return NextResponse.json(
      { ok: false, error: "Expected application/json." },
      { status: 415 },
    );
  }

  if (!isAllowedOrigin(request)) {
    return NextResponse.json(
      { ok: false, error: "Invalid request origin." },
      { status: 403 },
    );
  }

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
    website?: unknown;
    fullName?: unknown;
    phone?: unknown;
    faxNumber?: unknown;
  };
  const honeypotValue = readHoneypotValue(body as Record<string, unknown>);

  if (honeypotValue) {
    return NextResponse.json({ ok: true });
  }

  const email = readString(body.email).toLowerCase();
  const companyUrl = normalizeCompanyUrl(readString(body.companyUrl));
  const growthChallenge = readString(body.growthChallenge);
  const metadata = sanitizeMetadata(body.metadata);
  const requestContext: WaitlistRequestContext = {
    ipAddress: readClientIp(request),
    userAgent: readOptionalString(request.headers.get("user-agent")) || null,
  };

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

  const rateLimit = checkWaitlistRateLimit({
    email,
    ipAddress: requestContext.ipAddress,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many waitlist attempts. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
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
    await submitWaitlistEmail(submission, requestContext);
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
