"use client";

import React, { useEffect, useState } from "react";

type WaitlistModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type SubmitState = "idle" | "submitting" | "success" | "error";

function readTrackingMetadata() {
  if (typeof window === "undefined") {
    return {};
  }

  const params = new URLSearchParams(window.location.search);

  return {
    landingPage: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    utmSource: params.get("utm_source") ?? undefined,
    utmMedium: params.get("utm_medium") ?? undefined,
    utmCampaign: params.get("utm_campaign") ?? undefined,
    referrer: document.referrer || undefined,
  };
}

export function WaitlistModal({ open, onOpenChange }: WaitlistModalProps) {
  const [email, setEmail] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [growthChallenge, setGrowthChallenge] = useState("");
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);

  useEffect(() => {
    if (open) {
      setEmail("");
      setCompanyUrl("");
      setGrowthChallenge("");
      setState("idle");
      setMessage("");
    }
  }, [open]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim()) {
      setState("error");
      setMessage("Enter your email address.");
      return;
    }

    if (!companyUrl.trim()) {
      setState("error");
      setMessage("Enter your company URL.");
      return;
    }

    if (!growthChallenge.trim()) {
      setState("error");
      setMessage("Tell us your biggest growth challenge.");
      return;
    }

    setState("submitting");
    setMessage("");

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          companyUrl,
          growthChallenge,
          metadata: readTrackingMetadata(),
        }),
      });

      const data = (await response.json()) as { ok: boolean; error?: string };

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Something went wrong.");
      }

      setState("success");
      setMessage("");
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="waitlist-modal fixed inset-0 z-[60] flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="Close waitlist modal"
        className="absolute inset-0 bg-[rgba(11,9,6,0.7)] backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      <div className="waitlist-card relative z-10 w-full max-w-md rounded-[2rem] border border-white/15 bg-[rgba(26,22,14,0.96)] p-6 text-cream shadow-[0_30px_90px_rgba(0,0,0,0.45)] sm:p-8">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-5 top-5 text-sm text-cream/60 transition hover:text-cream"
        >
          Close
        </button>

        <p className="text-xs uppercase tracking-eyebrow text-gold">
          Join the waitlist
        </p>
        <h2 className="mt-4 font-display text-4xl leading-none tracking-[-0.04em] text-cream sm:text-5xl">
          Get early access
        </h2>
        <p className="mt-4 max-w-sm text-sm leading-6 text-warm">
          Join the list for product updates, early access, and the first wave of
          founder onboarding invites.
        </p>

        {state === "success" ? (
          <div className="mt-8 rounded-[1.6rem] border border-[rgba(201,168,76,0.28)] bg-[rgba(245,239,224,0.06)] p-5">
            <p className="text-base text-cream">
              You&apos;re in. We&apos;ll reach out when early access opens.
            </p>
          </div>
        ) : (
          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-eyebrow text-warm/80">
                Email
              </span>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email address"
                className="w-full rounded-[1.2rem] border border-white/12 bg-[rgba(245,239,224,0.06)] px-4 py-3.5 text-base text-cream outline-none transition placeholder:text-cream/35 focus:border-gold"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-eyebrow text-warm/80">
                Company URL
              </span>
              <input
                type="text"
                inputMode="url"
                autoComplete="off"
                value={companyUrl}
                onChange={(event) => setCompanyUrl(event.target.value)}
                placeholder="https://company.com"
                className="w-full rounded-[1.2rem] border border-white/12 bg-[rgba(245,239,224,0.06)] px-4 py-3.5 text-base text-cream outline-none transition placeholder:text-cream/35 focus:border-gold"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-eyebrow text-warm/80">
                Biggest growth challenge
              </span>
              <textarea
                value={growthChallenge}
                onChange={(event) => setGrowthChallenge(event.target.value)}
                placeholder="What is hardest right now: distribution, positioning, content, conversion, or something else?"
                rows={4}
                className="w-full resize-none rounded-[1.2rem] border border-white/12 bg-[rgba(245,239,224,0.06)] px-4 py-3.5 text-base text-cream outline-none transition placeholder:text-cream/35 focus:border-gold"
              />
            </label>

            <button
              type="submit"
              disabled={state === "submitting"}
              className="inline-flex w-full items-center justify-center rounded-[0.8rem] bg-cream px-4 py-3.5 text-sm font-medium text-ink transition hover:bg-gold hover:text-cream disabled:cursor-not-allowed disabled:opacity-70"
            >
              {state === "submitting" ? "Submitting..." : "Join waitlist"}
            </button>

            {message ? (
              <p className="text-sm text-[rgba(255,224,224,0.88)]">{message}</p>
            ) : null}
          </form>
        )}
      </div>
    </div>
  );
}
