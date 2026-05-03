"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { LandingIntakeChat } from "./landing-intake-chat";
import { LandingNav } from "./nav";
import { WaitlistModal } from "./waitlist-modal";

function BackgroundFrame({
  frame,
  priority = false,
}: {
  frame: "start-frame" | "end-frame";
  priority?: boolean;
}) {
  return (
    <Image
      src={`/assets/${frame}.png`}
      alt=""
      aria-hidden="true"
      fill
      priority={priority}
      sizes="100vw"
      className="landing-background-image object-cover object-center sepia-[0.2] saturate-[0.85] brightness-[0.7]"
    />
  );
}

export function Hero() {
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const headlineClassName =
    "font-display text-[2rem] font-light leading-[0.95] tracking-[-0.045em] text-cream sm:text-[3.3rem] md:text-[3.75rem] lg:text-[3.9rem]";

  return (
    <>
      <div className="landing-page relative min-h-screen overflow-hidden bg-ink text-cream">
        <div className="absolute inset-0">
          <div className="absolute inset-[-4%] overflow-hidden">
            <div
              data-testid="landing-background-start"
              className={`absolute inset-0 ${
                prefersReducedMotion ? "opacity-0" : "animate-landing-start-frame"
              }`}
            >
              <BackgroundFrame frame="start-frame" priority />
            </div>
            <div
              data-testid="landing-background-end"
              className={`absolute inset-0 ${
                prefersReducedMotion ? "opacity-100" : "animate-landing-end-frame"
              }`}
            >
              <BackgroundFrame frame="end-frame" priority />
            </div>
          </div>
          <div className="hero-vignette absolute inset-0" />
          <div className="hero-tint absolute inset-0" />
          <div className="hero-grain absolute inset-0" />
        </div>

        <LandingNav onWaitlistClick={() => setWaitlistOpen(true)} />

        <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 pb-10 pt-28 text-center sm:px-8 sm:pt-32 lg:px-10">
          <div className="mx-auto flex w-full max-w-5xl flex-col items-center">
            <div className="mt-5 space-y-[0.1875rem] sm:space-y-[0.375rem]">
              <h1 className={headlineClassName}>
                Drop your links. 
              </h1>
              <h1 className={headlineClassName}>
                Get a recipe.
              </h1>
              <h1 className={headlineClassName}>
               Go <em className="font-normal italic">viral.</em>
              </h1>
            </div>

            <p className="mt-6 max-w-xl text-sm leading-6 text-warm sm:text-base sm:leading-7 max-[374px]:hidden">
              Your AI social media manager that helps you 10x.
            </p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="mt-8 w-full sm:mt-10"
            >
              <LandingIntakeChat className="w-full" />
            </motion.div>
          </div>
        </main>
      </div>

      <WaitlistModal open={waitlistOpen} onOpenChange={setWaitlistOpen} />
    </>
  );
}
