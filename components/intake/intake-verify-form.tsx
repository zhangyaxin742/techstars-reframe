"use client";

import { ArrowRight, EnvelopeSimple, WarningCircle } from "@phosphor-icons/react";
import React, { FormEvent, useEffect, useState } from "react";

type IntakeVerifyFormProps = {
  onVerified?: (redirectTo: string) => void;
};

type SubmitState = "idle" | "loading" | "success" | "error";

export function IntakeVerifyForm({ onVerified }: IntakeVerifyFormProps) {
  const [csrfToken, setCsrfToken] = useState("");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    fetch("/api/reframe/security/csrf", {
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("csrf_unavailable");
        }

        return (await response.json()) as { csrfToken?: string };
      })
      .then((body) => {
        if (isMounted && body.csrfToken) {
          setCsrfToken(body.csrfToken);
        }
      })
      .catch(() => {
        if (isMounted) {
          setSubmitState("error");
          setMessage("Verification is not available right now.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!csrfToken || token.length !== 6 || !email.trim()) {
      setSubmitState("error");
      setMessage("Enter the email and six-digit code.");
      return;
    }

    setSubmitState("loading");
    setMessage("Checking the code...");

    const response = await fetch("/api/reframe/auth/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Reframe-CSRF": csrfToken,
      },
      body: JSON.stringify({
        email,
        token,
      }),
    });
    const body = (await response.json()) as {
      ok?: boolean;
      redirectTo?: string;
      error?: { message?: string };
    };

    if (response.ok && body.ok && body.redirectTo) {
      setSubmitState("success");
      setMessage("Context saved. Opening your workspace...");
      if (onVerified) {
        onVerified(body.redirectTo);
      } else {
        window.location.assign(body.redirectTo);
      }
      return;
    }

    setSubmitState("error");
    setMessage(body.error?.message || "That code did not work. Try again.");
  }

  const isSubmitting = submitState === "loading";
  const canSubmit = Boolean(csrfToken && email.trim() && token.length === 6);

  return (
    <form
      className="w-full max-w-md rounded-md border border-white/10 bg-[rgba(245,239,224,0.06)] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.32)] sm:p-6"
      noValidate
      onSubmit={handleSubmit}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cream text-ink">
          <EnvelopeSimple size={20} weight="bold" aria-hidden="true" />
        </span>
        <div>
          <h1 className="font-display text-3xl font-normal tracking-normal text-cream">
            Enter your email code
          </h1>
          <p className="mt-2 text-sm leading-6 text-cream/68">
            Continue to save this workspace.
          </p>
        </div>
      </div>

      <div className="mt-7 space-y-4">
        <label className="block" htmlFor="intake-verify-email">
          <span className="text-sm font-medium text-cream/76">Email</span>
          <input
            id="intake-verify-email"
            autoComplete="email"
            inputMode="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-md border border-white/12 bg-[rgba(245,239,224,0.07)] px-3.5 py-3 text-base text-cream outline-none transition placeholder:text-cream/35 focus:border-gold"
          />
        </label>

        <label className="block" htmlFor="intake-verify-code">
          <span className="text-sm font-medium text-cream/76">Code</span>
          <input
            id="intake-verify-code"
            autoComplete="one-time-code"
            inputMode="numeric"
            maxLength={6}
            pattern="[0-9]{6}"
            value={token}
            onChange={(event) =>
              setToken(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            className="mt-2 w-full rounded-md border border-white/12 bg-[rgba(245,239,224,0.07)] px-3.5 py-3 text-base tabular-nums tracking-tight text-cream outline-none transition placeholder:text-cream/35 focus:border-gold"
          />
        </label>
      </div>

      <div className="mt-5 min-h-6" aria-live="polite">
        {message ? (
          <p className="flex items-center gap-2 text-sm text-cream/70">
            {submitState === "error" ? (
              <WarningCircle size={16} aria-hidden="true" />
            ) : null}
            <span>{message}</span>
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={!canSubmit || isSubmitting}
        className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-cream px-4 text-sm font-medium text-ink transition hover:bg-gold hover:text-cream disabled:cursor-not-allowed disabled:opacity-45"
      >
        <span>{isSubmitting ? "Checking code" : "Open workspace"}</span>
        <ArrowRight size={17} weight="bold" aria-hidden="true" />
      </button>
    </form>
  );
}
