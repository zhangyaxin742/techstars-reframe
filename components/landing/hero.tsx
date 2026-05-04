"use client";

import { CornersOut, Play, SpeakerHigh } from "@phosphor-icons/react";
import { useRef, useState, type FormEvent } from "react";
import { LandingNav } from "./nav";
import { WaitlistModal } from "./waitlist-modal";

function BackgroundFrame({ priority = false }: { priority?: boolean }) {
  return (
    <picture className="block size-full">
      <img
        src="/assets/landing.png"
        alt=""
        aria-hidden="true"
        fetchPriority={priority ? "high" : undefined}
        className="landing-background-image size-full object-cover object-center"
      />
    </picture>
  );
}

function DemoPreview() {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlay = () => {
    setPlaying(true);
    requestAnimationFrame(() => {
      void videoRef.current?.play().catch(() => {
        setPlaying(false);
      });
    });
  };

  return (
    <div className="landing-demo-card" data-testid="landing-demo-card">
      {playing ? (
        <video
          ref={videoRef}
          data-testid="landing-demo-video"
          className="size-full object-cover"
          controls
          playsInline
          preload="metadata"
        >
          <source src="/videos/reframe-demo-final.mp4" type="video/mp4" />
        </video>
      ) : (
        <div className="landing-demo-poster" data-testid="landing-demo-video">
          <div className="landing-demo-topbar">
            <div className="landing-demo-brand">
              <span className="landing-demo-dot" />
              <span className="font-display tracking-wordmark">reframe.</span>
            </div>
            <div className="landing-demo-profile">
              <span>Pro</span>
              <img src="/assets/sidebar-avatar.png" alt="" aria-hidden="true" />
            </div>
          </div>

          <div className="landing-demo-body">
            <aside className="landing-demo-sidebar" aria-hidden="true">
              <span className="is-active">Home</span>
              <span>Search</span>
              <span>Notebooks</span>
              <span>Collections</span>
              <span>Sources</span>
            </aside>

            <div className="landing-demo-copy">
              <h2>
                A new era
                <br />
                of research.
              </h2>
              <p>
                AI that understands depth
                <br />
                so you can create with clarity.
              </p>
            </div>

            <button
              type="button"
              className="landing-demo-play"
              onClick={handlePlay}
              aria-label="Play demo video"
            >
              <Play className="size-8" weight="fill" />
            </button>

            <div className="landing-demo-report" aria-hidden="true">
              <h3>Emerging Behavior in High-Performing Teams</h3>
              <div>
                <span>Report</span>
                <span>12 sources</span>
              </div>
              <p>Teams that document decisions in real time ship 23% faster and revisit context 41% less.</p>
              <svg viewBox="0 0 220 74" role="presentation">
                <path d="M4 62 C36 50 58 57 88 43 C119 29 140 42 166 25 C184 13 199 12 216 4" />
              </svg>
            </div>
          </div>

          <div className="landing-demo-controls" aria-hidden="true">
            <span>1:24</span>
            <div className="landing-demo-progress">
              <span />
            </div>
            <span>3:47</span>
            <SpeakerHigh className="size-4" weight="fill" />
            <CornersOut className="size-4" />
          </div>
        </div>
      )}
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
        <section className="relative h-dvh min-h-[720px] overflow-hidden">
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
            <div className="hero-grain absolute inset-0" />
          </div>

          <LandingNav />

          <main className="landing-hero-content relative z-10 flex h-full flex-col items-center px-5 text-center sm:px-8">
            <div className="mx-auto flex w-full max-w-5xl flex-col items-center">
              <div className="landing-hero-headline">
                <h1>Drop your links.</h1>
                <h1>Get a recipe.</h1>
                <h1>
                  Go <em className="font-normal italic">viral.</em>
                </h1>
              </div>

              <p className="landing-hero-subtitle">
                Your AI CMO that helps you 10x.
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
