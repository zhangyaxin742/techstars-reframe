"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { LandingNav } from "./nav";
import { WaitlistModal } from "./waitlist-modal";

function BackgroundFrame({
  priority = false,
}: {
  priority?: boolean;
}) {
  return (
    <picture className="block h-full w-full">
      <source srcSet="/assets/start-frame.avif" type="image/avif" />
      <source srcSet="/assets/start-frame.webp" type="image/webp" />
      <img
        src="/assets/start-frame.png"
        alt=""
        aria-hidden="true"
        fetchPriority={priority ? "high" : undefined}
        className="landing-background-image h-full w-full object-cover object-[50%_24%] sepia-[0.2] saturate-[0.85] brightness-[0.7]"
      />
    </picture>
  );
}

export function Hero() {
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const headlineClassName =
    "font-display text-[2rem] font-light leading-[0.95] tracking-[-0.045em] text-cream sm:text-[3.3rem] md:text-[3.75rem] lg:text-[3.9rem]";

  return (
    <>
      <div className="landing-page bg-ink text-cream">
        <section className="relative min-h-screen overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute inset-[-4%] overflow-hidden">
              <div
                data-testid="landing-background"
                className={`absolute inset-0 ${
                  prefersReducedMotion ? "landing-background-final-frame" : "animate-landing-background"
                }`}
              >
                <BackgroundFrame priority />
              </div>
            </div>
            <div className="hero-vignette absolute inset-0" />
            <div className="hero-tint absolute inset-0" />
            <div className="hero-grain absolute inset-0" />
          </div>

          <LandingNav onWaitlistClick={() => setWaitlistOpen(true)} />

          <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 pb-10 pt-36 text-center sm:px-8 sm:pt-40 lg:px-10">
            <div className="mx-auto flex w-full max-w-5xl flex-col items-center">
              <div className="mt-5 space-y-[0.1875rem] sm:space-y-[0.375rem]">
                <h1 className={headlineClassName}>Drop your links.</h1>
                <h1 className={headlineClassName}>Get a recipe.</h1>
                <h1 className={headlineClassName}>
                  Go <em className="font-normal italic">viral.</em>
                </h1>
              </div>

              <p className="mt-6 max-w-xl text-sm leading-6 text-warm sm:text-base sm:leading-7 max-[374px]:hidden">
                Your AI CMO that helps you 10x.
              </p>
            </div>
          </main>
        </section>

        <motion.section
          initial={prefersReducedMotion ? false : { opacity: 0, y: 48 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative border-t border-white/10 bg-[rgba(15,11,7,0.92)] px-6 py-14 sm:px-8 sm:py-18 lg:px-10"
        >
          <div className="mx-auto w-full max-w-5xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs uppercase tracking-eyebrow text-gold">See Reframe in action</p>
              <h2 className="mt-4 font-display text-4xl leading-none tracking-[-0.04em] text-cream sm:text-5xl">
                Watch the full workflow before you join.
              </h2>
              <p className="mt-4 text-sm leading-6 text-warm sm:text-base sm:leading-7">
                A quick product walkthrough of how Reframe turns brand context into creative direction,
                trend picks, and a ready-to-ship content system.
              </p>
            </div>

            <div className="mt-8 overflow-hidden rounded-[1.75rem] border border-white/12 bg-[rgba(26,22,14,0.88)] shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
              <video
                data-testid="landing-demo-video"
                className="aspect-video w-full bg-black object-cover"
                autoPlay
                controls
                loop
                muted
                playsInline
                preload="metadata"
                poster="/assets/start-frame.png"
              >
                <source src="/videos/reframe-demo-final.mp4" type="video/mp4" />
              </video>
            </div>

            <div className="mx-auto mt-8 flex max-w-2xl flex-col items-center text-center">
              <p className="text-sm leading-6 text-warm sm:text-base sm:leading-7">
                Join the waitlist for early access when we start onboarding founder teams.
              </p>
              <button
                type="button"
                onClick={() => setWaitlistOpen(true)}
                className="mt-5 inline-flex min-w-52 items-center justify-center rounded-[0.95rem] bg-cream px-5 py-3 text-sm font-medium text-ink transition hover:bg-gold hover:text-cream"
              >
                Join the waitlist
              </button>
            </div>
          </div>
        </motion.section>
      </div>

      <WaitlistModal open={waitlistOpen} onOpenChange={setWaitlistOpen} />
    </>
  );
}
