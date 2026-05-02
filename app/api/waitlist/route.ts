import { NextResponse } from "next/server";
import {
  WaitlistProviderNotConfiguredError,
  submitWaitlistEmail,
} from "@/lib/waitlist/submit";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const email = typeof (payload as { email?: unknown })?.email === "string"
    ? (payload as { email: string }).email.trim().toLowerCase()
    : "";

  if (!emailPattern.test(email)) {
    return NextResponse.json(
      { ok: false, error: "Enter a valid email address." },
      { status: 400 },
    );
  }

  try {
    await submitWaitlistEmail(email);
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
