"use client";

import React, { useState } from "react";
import { LandingNav } from "./nav";
import { PhoneMockup } from "./phone-mockup";
import { WaitlistModal } from "./waitlist-modal";

export function Hero() {
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  return (
    <>
      <div className="landing-page relative min-h-screen overflow-hidden bg-ink text-cream">
        <div className="absolute inset-0">
          <div className="absolute inset-[-4%] will-change-transform">
            <img
              src="/assets/painting-bg.png"
              alt=""
              className="landing-background-image animate-kenburns object-cover object-center sepia-[0.2] saturate-[0.85] brightness-[0.7]"
            />
          </div>
          <div className="hero-vignette absolute inset-0" />
          <div className="hero-tint absolute inset-0" />
          <div className="hero-grain absolute inset-0" />
        </div>

        <LandingNav onWaitlistClick={() => setWaitlistOpen(true)} />

        <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 pb-10 pt-28 text-center sm:px-8 sm:pt-32 lg:px-10">
          <div className="mx-auto flex w-full max-w-5xl flex-col items-center">
            <p className="text-[11px] uppercase tracking-eyebrow text-gold">
              Your AI CMO
            </p>

            <div className="mt-5 space-y-1 sm:space-y-2">
              <h1 className="font-display text-[2.65rem] font-light leading-[0.95] tracking-[-0.045em] text-cream sm:text-[4.4rem] md:text-[5rem] lg:text-[5.2rem]">
                Built for founders
              </h1>
              <h1 className="font-display text-[2.65rem] font-light leading-[0.95] tracking-[-0.045em] text-cream sm:text-[4.4rem] md:text-[5rem] lg:text-[5.2rem]">
                who have a <em className="font-normal italic">product</em>
              </h1>
              <h1 className="font-display text-[2.65rem] font-light leading-[0.95] tracking-[-0.045em] text-cream sm:text-[4.4rem] md:text-[5rem] lg:text-[5.2rem]">
                but no audience.
              </h1>
            </div>

            <p className="mt-6 max-w-xl text-sm leading-6 text-warm sm:text-base sm:leading-7 max-[374px]:hidden">
              Reframe finds your people, tells you what to say, and gets you
              posted.
            </p>

            <div className="mt-8 sm:mt-10">
              <PhoneMockup />
            </div>

            <button
              type="button"
              onClick={() => setWaitlistOpen(true)}
              className="mt-8 inline-flex items-center rounded-md bg-cream px-6 py-3 text-sm text-ink transition hover:bg-gold hover:text-cream sm:mt-10"
            >
              Get early access →
            </button>
          </div>
        </main>
      </div>

      <WaitlistModal open={waitlistOpen} onOpenChange={setWaitlistOpen} />
    </>
  );
}
