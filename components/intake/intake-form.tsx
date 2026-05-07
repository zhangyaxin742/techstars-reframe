"use client";

import {
  ArrowRight,
  CheckCircle,
  EnvelopeSimple,
  LinkSimple,
  WarningCircle,
} from "@phosphor-icons/react";
import React, { FormEvent, useEffect, useMemo, useState } from "react";

type IntakeState = "editing" | "email" | "loading" | "success" | "error";

type DraftSaveResponse =
  | {
      ok: true;
      state: "draft_saved";
      expiresAt: string;
    }
  | {
      ok: false;
      state?: string;
      error?: {
        message?: string;
        fields?: Record<string, string>;
      };
    };

type ClaimResponse =
  | {
      ok: true;
      redirectTo: string;
    }
  | {
      ok: false;
      state?: string;
      error?: {
        message?: string;
      };
    };

type ContinueResponse =
  | {
      ok: true;
      nextStep: "verify_email";
      maskedEmail: string;
      resendAfterSeconds: number;
    }
  | {
      ok: false;
      error?: {
        message?: string;
      };
    };

type RestoreResponse =
  | {
      ok: true;
      draft: {
        businessUrl: string | null;
        productUrl: string | null;
        campaignGoal: string;
        founderNote: string;
        sourceReferences: { url?: string; label?: string; note?: string }[];
      };
    }
  | {
      ok: false;
    };

export function IntakeForm() {
  const [csrfToken, setCsrfToken] = useState("");
  const [businessUrl, setBusinessUrl] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [campaignGoal, setCampaignGoal] = useState("");
  const [founderNote, setFounderNote] = useState("");
  const [sourceReferenceText, setSourceReferenceText] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<IntakeState>("editing");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
          setState("error");
          setMessage("Intake is not available right now.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/reframe/intake/draft", {
      cache: "no-store",
    })
      .then(async (response) => {
        if (response.status === 404 || response.status === 410) {
          return null;
        }

        if (!response.ok) {
          throw new Error("draft_restore_failed");
        }

        return (await response.json()) as RestoreResponse;
      })
      .then((body) => {
        if (!isMounted || !body?.ok) {
          return;
        }

        setBusinessUrl(body.draft.businessUrl ?? "");
        setProductUrl(body.draft.productUrl ?? "");
        setCampaignGoal(body.draft.campaignGoal);
        setFounderNote(body.draft.founderNote);
        setSourceReferenceText(
          body.draft.sourceReferences
            .map((reference) => reference.url || reference.label || reference.note)
            .filter(Boolean)
            .join("\n"),
        );
        setMessage("Draft restored. Continue when ready.");
      })
      .catch(() => {
        if (isMounted) {
          setMessage("");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const sourceReferences = useMemo(
    () =>
      sourceReferenceText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 5)
        .map((line) => ({ url: line })),
    [sourceReferenceText],
  );

  async function handleDraftSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!csrfToken) {
      setState("error");
      setMessage("Intake is not ready yet.");
      return;
    }

    setState("loading");
    setMessage("Saving your context...");
    setFieldErrors({});

    const draftResponse = await fetch("/api/reframe/intake/drafts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Reframe-CSRF": csrfToken,
      },
      body: JSON.stringify({
        businessUrl,
        productUrl,
        campaignGoal,
        founderNote,
        sourceReferences,
      }),
    });
    const draftBody = (await draftResponse.json()) as DraftSaveResponse;

    if (!draftResponse.ok || !draftBody.ok) {
      setState("error");
      setMessage(draftBody.error?.message || "Check the intake fields.");
      setFieldErrors(draftBody.error?.fields ?? {});
      return;
    }

    const claimResponse = await fetch("/api/reframe/intake/claim", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Reframe-CSRF": csrfToken,
      },
      body: JSON.stringify({}),
    });
    const claimBody = (await claimResponse.json()) as ClaimResponse;

    if (claimResponse.ok && claimBody.ok) {
      setState("success");
      setMessage("Context saved. Opening your workspace...");
      window.location.assign(claimBody.redirectTo);
      return;
    }

    if (claimResponse.status === 401 || claimBody.state === "auth_required") {
      setState("email");
      setMessage("Continue to save this workspace.");
      return;
    }

    setState("error");
    setMessage(claimBody.error?.message || "Could not open the workspace.");
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!csrfToken || !email.trim()) {
      setState("email");
      setMessage("Enter an email to continue.");
      return;
    }

    setState("loading");
    setMessage("Sending your code...");

    const response = await fetch("/api/reframe/intake/continue", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Reframe-CSRF": csrfToken,
      },
      body: JSON.stringify({
        email,
      }),
    });
    const body = (await response.json()) as ContinueResponse;

    if (response.ok && body.ok) {
      setState("success");
      setMessage(`Code sent to ${body.maskedEmail}.`);
      window.location.assign("/intake/verify");
      return;
    }

    setState("email");
    setMessage(body.error?.message || "Could not send the code.");
  }

  const isBusy = state === "loading";

  return (
    <div className="w-full max-w-2xl rounded-md border border-white/10 bg-[rgba(245,239,224,0.06)] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.3)] sm:p-6">
      {state !== "email" ? (
        <form noValidate onSubmit={handleDraftSubmit}>
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cream text-ink">
              <LinkSimple size={20} weight="bold" aria-hidden="true" />
            </span>
            <div>
              <h1 className="font-display text-4xl font-normal leading-none tracking-normal text-cream">
                Start with the business context
              </h1>
              <p className="mt-3 text-sm leading-6 text-cream/68">
                Add the sources and notes that should shape the first campaign.
              </p>
            </div>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <TextField
              error={fieldErrors.businessUrl}
              id="business-url"
              label="Business source URL"
              onChange={setBusinessUrl}
              value={businessUrl}
            />
            <TextField
              error={fieldErrors.productUrl}
              id="product-url"
              label="Product source URL"
              onChange={setProductUrl}
              value={productUrl}
            />
          </div>

          <div className="mt-4 space-y-4">
            <TextField
              error={fieldErrors.campaignGoal}
              id="campaign-goal"
              label="Campaign goal"
              onChange={setCampaignGoal}
              value={campaignGoal}
            />

            <TextAreaField
              error={fieldErrors.founderNote}
              id="founder-note"
              label="Founder note"
              onChange={setFounderNote}
              rows={5}
              value={founderNote}
            />

            <TextAreaField
              error={fieldErrors.sourceReferences}
              id="source-references"
              label="Optional source references"
              onChange={setSourceReferenceText}
              rows={3}
              value={sourceReferenceText}
            />
          </div>

          <StatusMessage message={message} state={state} />

          <button
            type="submit"
            disabled={isBusy}
            className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-cream px-4 text-sm font-medium text-ink transition hover:bg-gold hover:text-cream disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
          >
            <span>{isBusy ? "Saving context" : "Save and open my workspace"}</span>
            <ArrowRight size={17} weight="bold" aria-hidden="true" />
          </button>
        </form>
      ) : (
        <form noValidate onSubmit={handleEmailSubmit}>
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cream text-ink">
              <EnvelopeSimple size={20} weight="bold" aria-hidden="true" />
            </span>
            <div>
              <h1 className="font-display text-4xl font-normal leading-none tracking-normal text-cream">
                Continue to save this workspace
              </h1>
              <p className="mt-3 text-sm leading-6 text-cream/68">
                Enter your email and we will send a six-digit code.
              </p>
            </div>
          </div>

          <div className="mt-7">
            <TextField
              id="intake-email"
              label="Email"
              onChange={setEmail}
              type="email"
              value={email}
            />
          </div>

          <StatusMessage message={message} state={state} />

          <button
            type="submit"
            disabled={isBusy}
            className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-cream px-4 text-sm font-medium text-ink transition hover:bg-gold hover:text-cream disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
          >
            <span>{isBusy ? "Sending code" : "Email me a code"}</span>
            <ArrowRight size={17} weight="bold" aria-hidden="true" />
          </button>
        </form>
      )}
    </div>
  );
}

function TextField({
  error,
  id,
  label,
  onChange,
  type = "text",
  value,
}: {
  error?: string;
  id: string;
  label: string;
  onChange: (value: string) => void;
  type?: string;
  value: string;
}) {
  return (
    <label className="block" htmlFor={id}>
      <span className="text-sm font-medium text-cream/76">{label}</span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-md border border-white/12 bg-[rgba(245,239,224,0.07)] px-3.5 py-3 text-base text-cream outline-none transition placeholder:text-cream/35 focus:border-gold"
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error ? (
        <span id={`${id}-error`} className="mt-1 block text-xs text-gold">
          {error}
        </span>
      ) : null}
    </label>
  );
}

function TextAreaField({
  error,
  id,
  label,
  onChange,
  rows,
  value,
}: {
  error?: string;
  id: string;
  label: string;
  onChange: (value: string) => void;
  rows: number;
  value: string;
}) {
  return (
    <label className="block" htmlFor={id}>
      <span className="text-sm font-medium text-cream/76">{label}</span>
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full resize-none rounded-md border border-white/12 bg-[rgba(245,239,224,0.07)] px-3.5 py-3 text-base text-cream outline-none transition placeholder:text-cream/35 focus:border-gold"
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error ? (
        <span id={`${id}-error`} className="mt-1 block text-xs text-gold">
          {error}
        </span>
      ) : null}
    </label>
  );
}

function StatusMessage({
  message,
  state,
}: {
  message: string;
  state: IntakeState;
}) {
  return (
    <div className="mt-5 min-h-6" aria-live="polite">
      {message ? (
        <p className="flex items-center gap-2 text-sm text-cream/70">
          {state === "error" ? (
            <WarningCircle size={16} aria-hidden="true" />
          ) : state === "success" ? (
            <CheckCircle size={16} aria-hidden="true" />
          ) : null}
          <span>{message}</span>
        </p>
      ) : null}
    </div>
  );
}
