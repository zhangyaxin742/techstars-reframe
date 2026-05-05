"use client";

import { useState, type FormEvent } from "react";
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
  return (
    <div className="landing-demo-card" data-testid="landing-demo-card">
      <video
        data-testid="landing-demo-video"
        className="landing-demo-video"
        controls
        playsInline
        preload="metadata"
        poster="/assets/demo-4k-poster.jpg"
      >
        <source src="/assets/demo-4k-optimized.mp4" type="video/mp4" />
      </video>
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
