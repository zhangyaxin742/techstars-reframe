"use client";

import { Play } from "@phosphor-icons/react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { LandingNav } from "./nav";
import { WaitlistModal } from "./waitlist-modal";

const backgroundPlaybackRate = 2;

function BackgroundFrame({ priority = false }: { priority?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    video.defaultPlaybackRate = backgroundPlaybackRate;
    video.playbackRate = backgroundPlaybackRate;
  }, []);

  return (
    <video
      ref={videoRef}
      data-testid="landing-background-video"
      aria-hidden="true"
      className="landing-background-video size-full object-cover object-center"
      autoPlay
      muted
      playsInline
      poster="/assets/landing.png"
      preload={priority ? "auto" : "metadata"}
    >
      <source src="/assets/landing-video.mp4" type="video/mp4" />
    </video>
  );
}

function DemoPreview() {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlayClick = () => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    void video.play();
  };

  return (
    <div className="landing-demo-card" data-testid="landing-demo-card">
      <video
        ref={videoRef}
        data-testid="landing-demo-video"
        className="landing-demo-video"
        controls
        playsInline
        preload="metadata"
        poster="/assets/demo-4k-poster.jpg"
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      >
        <source src="/assets/demo-4k-optimized.mp4" type="video/mp4" />
      </video>
      {!isPlaying ? (
        <button
          type="button"
          className="absolute left-1/2 top-1/2 z-10 inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-3 rounded-full border border-cream/30 bg-cream/15 px-6 py-4 text-base font-medium text-cream backdrop-blur-xl backdrop-saturate-150 transition hover:bg-cream/25 focus:outline-none focus:ring-2 focus:ring-cream/55 sm:px-7 sm:py-4 sm:text-lg"
          aria-label="Play demo video"
          onClick={handlePlayClick}
        >
          <Play className="size-5 sm:size-6" weight="fill" />
          <span>Play demo</span>
        </button>
      ) : null}
    </div>
  );
}

export function Hero() {
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [modalEmail, setModalEmail] = useState("");

  const handleWaitlistSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setModalEmail(email.trim());
    setWaitlistOpen(true);
  };

  return (
    <>
      <div className="landing-page bg-ink text-cream">
        <section className="landing-scroll-section relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute inset-0 overflow-hidden">
              <div
                data-testid="landing-background"
                className="absolute inset-0"
              >
                <BackgroundFrame priority />
              </div>
            </div>
            <div className="hero-vignette absolute inset-0" />
            <div className="hero-tint absolute inset-0" />
            <div className="landing-background-fade absolute inset-0" />
            <div className="hero-grain absolute inset-0" />
          </div>

          <LandingNav />

          <main className="landing-hero-content relative z-10 flex flex-col items-center px-5 text-center sm:px-8">
            <div className="mx-auto flex w-full max-w-5xl flex-col items-center">
              <div className="landing-hero-headline">
                <h1>Map your brand.</h1>
                <h1>Get a recipe.</h1>
                <h1>
                  Go <em className="font-normal italic">viral.</em>
                </h1>
              </div>

              <p className="landing-hero-subtitle">
                Your AI CMO that helps you 10x your content engine.
              </p>

              <form className="landing-waitlist-form" onSubmit={handleWaitlistSubmit}>
                <label className="sr-only" htmlFor="landing-email">
                  Email address
                </label>
                <input
                  id="landing-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter your email"
                />
                <button type="submit">Join the waitlist</button>
              </form>

              <p className="landing-waitlist-note">No spam. Just early access.</p>

              <DemoPreview />

              <p className="landing-demo-caption">
                See how Reframe helps teams go from scattered
                <br />
                to clear in minutes.
              </p>
            </div>
          </main>
        </section>
      </div>

      <WaitlistModal
        open={waitlistOpen}
        onOpenChange={setWaitlistOpen}
        initialEmail={modalEmail}
      />
    </>
  );
}
