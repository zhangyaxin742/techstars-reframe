"use client";

import { motion, useReducedMotion } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";
import { LandingIntakeChat } from "./landing-intake-chat";
import { LandingNav } from "./nav";
import { WaitlistModal } from "./waitlist-modal";

const AUTO_ZOOM_DELAY_MS = 2000;

function BackgroundStill({ frame }: { frame: "start-frame" | "final-frame" }) {
  if (frame === "start-frame") {
    return (
      <img
        src="/assets/start-frame.png"
        alt=""
        aria-hidden="true"
        className="landing-background-image h-full w-full object-cover object-center sepia-[0.2] saturate-[0.85] brightness-[0.7]"
      />
    );
  }

  return (
    <picture className="block h-full w-full">
      <source srcSet="/assets/final-frame.avif" type="image/avif" />
      <source srcSet="/assets/final-frame.webp" type="image/webp" />
      <img
        src="/assets/final-frame.png"
        alt=""
        aria-hidden="true"
        className="landing-background-image h-full w-full object-cover object-center sepia-[0.2] saturate-[0.85] brightness-[0.7]"
      />
    </picture>
  );
}

export function Hero() {
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [backgroundState, setBackgroundState] = useState<"idle" | "playing" | "settled">("idle");
  const videoRef = useRef<HTMLVideoElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;

    const timerId = window.setTimeout(() => {
      setBackgroundState((current) => (current === "idle" ? "playing" : current));
    }, AUTO_ZOOM_DELAY_MS);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [prefersReducedMotion]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (backgroundState !== "playing") {
      video.pause();
      video.currentTime = 0;
      return;
    }

    const playPromise = video.play();
    if (playPromise) {
      playPromise.catch(() => {
        setBackgroundState("settled");
      });
    }
  }, [backgroundState]);

  const stillFrame = backgroundState === "settled" ? "final-frame" : "start-frame";

  return (
    <>
      <div className="landing-page relative min-h-screen overflow-hidden bg-ink text-cream">
        <div className="absolute inset-0">
          <div className="absolute inset-[-4%] will-change-transform">
            <BackgroundStill frame={stillFrame} />
            <video
              ref={videoRef}
              muted
              playsInline
              preload="metadata"
              aria-hidden="true"
              className={`landing-background-image pointer-events-none absolute inset-0 h-full w-full object-cover object-center sepia-[0.2] saturate-[0.85] brightness-[0.7] transition-opacity duration-300 ${
                backgroundState === "playing" ? "opacity-100" : "opacity-0"
              }`}
              onEnded={() => setBackgroundState("settled")}
              onError={() => setBackgroundState("settled")}
            >
              <source src="/assets/painting-zoom.webm" type="video/webm" />
              <source src="/assets/painting-zoom.mp4" type="video/mp4" />
            </video>
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

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="mt-8 w-full sm:mt-10"
            >
              <LandingIntakeChat className="w-full" />
            </motion.div>

            <button
              type="button"
              onClick={() => setWaitlistOpen(true)}
              className="mt-6 text-xs text-cream/50 transition hover:text-cream/80"
            >
              {"or join the waitlist ->"}
            </button>
          </div>
        </main>
      </div>

      <WaitlistModal open={waitlistOpen} onOpenChange={setWaitlistOpen} />
    </>
  );
}
