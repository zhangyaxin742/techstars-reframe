"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

type WaitlistModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type SubmitState = "idle" | "submitting" | "success" | "error";

export function WaitlistModal({ open, onOpenChange }: WaitlistModalProps) {
  const [email, setEmail] = useState("");
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

    setState("submitting");
    setMessage("");

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = (await response.json()) as { ok: boolean; error?: string };

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Something went wrong.");
      }

      setState("success");
      setMessage("You're in. We'll be in touch.");
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Close waitlist modal"
            className="absolute inset-0 bg-[rgba(11,9,6,0.7)] backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="relative z-10 w-full max-w-md rounded-[2rem] border border-white/15 bg-[rgba(26,22,14,0.96)] p-6 text-cream shadow-[0_30px_90px_rgba(0,0,0,0.45)] sm:p-8"
          >
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
              Reframe is built for founders with a product worth talking about
              and no time to brute-force distribution.
            </p>

            {state === "success" ? (
              <div className="mt-8 rounded-[1.6rem] border border-[rgba(201,168,76,0.28)] bg-[rgba(245,239,224,0.06)] p-5">
                <p className="text-base text-cream">{message}</p>
              </div>
            ) : (
              <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                <label className="block">
                  <span className="sr-only">Email address</span>
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

                <button
                  type="submit"
                  disabled={state === "submitting"}
                  className="inline-flex w-full items-center justify-center rounded-[0.8rem] bg-cream px-4 py-3.5 text-sm font-medium text-ink transition hover:bg-gold hover:text-cream disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {state === "submitting" ? "Submitting..." : "→ Join waitlist"}
                </button>

                {message ? (
                  <p className="text-sm text-[rgba(255,224,224,0.88)]">{message}</p>
                ) : null}
              </form>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
