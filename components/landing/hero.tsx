"use client";

import { Play } from "@phosphor-icons/react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { YouTubePlayer } from "@/src/components/media/youtube-player";
import { REFRAME_DEMO_YOUTUBE_THUMBNAIL_URL, REFRAME_DEMO_YOUTUBE_URL } from "@/src/lib/demo-video";
import { LandingNav } from "./nav";
import { WaitlistModal } from "./waitlist-modal";

const backgroundStartPlaybackRate = 5.6;
const backgroundEndPlaybackRate = 1.25;
const backgroundPlaybackEaseMs = 3_500;
const reducedMotionQuery = "(prefers-reduced-motion: reduce)";
const landingBackgroundPosterSrc = "/videos/landing-background-poster.jpg";
const landingBackgroundVideoSrc = "/videos/landing-background.mp4";

function easeOutCubic(progress: number) {
  return 1 - Math.pow(1 - progress, 3);
}

function BackgroundFrame({ priority = false }: { priority?: boolean }) {
  const fallbackImageRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [canPlayVideo, setCanPlayVideo] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const fallbackImage = fallbackImageRef.current;
    let frameId = 0;
    let settleFrameId = 0;

    if (!fallbackImage) {
      return;
    }

    const markFallbackReady = () => {
      frameId = requestAnimationFrame(() => {
        settleFrameId = requestAnimationFrame(() => {
          setCanPlayVideo(true);
        });
      });
    };

    if (fallbackImage.complete) {
      markFallbackReady();
      return () => {
        cancelAnimationFrame(frameId);
        cancelAnimationFrame(settleFrameId);
      };
    }

    fallbackImage.addEventListener("load", markFallbackReady, { once: true });

    return () => {
      fallbackImage.removeEventListener("load", markFallbackReady);
      cancelAnimationFrame(frameId);
      cancelAnimationFrame(settleFrameId);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    let animationFrameId: number | undefined;

    if (!video) {
      return;
    }

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      setIsReady(true);
    }

    if (window.matchMedia(reducedMotionQuery).matches) {
      video.defaultPlaybackRate = 1;
      video.playbackRate = 1;
      return;
    }

    const cancelPlaybackEase = () => {
      if (animationFrameId !== undefined) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = undefined;
      }
    };

    const finishPlaybackEase = () => {
      cancelPlaybackEase();
      video.playbackRate = backgroundEndPlaybackRate;
    };

    const startPlaybackEase = () => {
      cancelPlaybackEase();
      video.defaultPlaybackRate = backgroundStartPlaybackRate;
      video.playbackRate = backgroundStartPlaybackRate;

      const startedAt = performance.now();

      const tick = (now: number) => {
        const progress = Math.min((now - startedAt) / backgroundPlaybackEaseMs, 1);
        const eased = easeOutCubic(progress);

        video.playbackRate =
          backgroundStartPlaybackRate +
          (backgroundEndPlaybackRate - backgroundStartPlaybackRate) * eased;

        if (progress < 1 && !video.paused && !video.ended) {
          animationFrameId = requestAnimationFrame(tick);
        } else {
          finishPlaybackEase();
        }
      };

      animationFrameId = requestAnimationFrame(tick);
    };

    video.defaultPlaybackRate = backgroundStartPlaybackRate;
    video.playbackRate = backgroundStartPlaybackRate;
    video.addEventListener("play", startPlaybackEase);
    video.addEventListener("pause", cancelPlaybackEase);
    video.addEventListener("ended", finishPlaybackEase);

    if (!video.paused) {
      startPlaybackEase();
    }

    return () => {
      cancelPlaybackEase();
      video.removeEventListener("play", startPlaybackEase);
      video.removeEventListener("pause", cancelPlaybackEase);
      video.removeEventListener("ended", finishPlaybackEase);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (!canPlayVideo || hasError) {
      video.pause();
      return;
    }

    void video.play().catch(() => {
      setHasError(true);
    });
  }, [canPlayVideo, hasError]);

  return (
    <>
      <img
        ref={fallbackImageRef}
        data-testid="landing-background-fallback"
        src={landingBackgroundPosterSrc}
        alt=""
        aria-hidden="true"
        className="size-full object-cover object-center"
        loading={priority ? "eager" : "lazy"}
      />
      {!hasError ? (
        <video
          ref={videoRef}
          data-testid="landing-background-video"
          aria-hidden="true"
          className={`landing-background-video absolute inset-0 size-full object-cover object-center transition-opacity duration-500 ${
            canPlayVideo && isReady ? "opacity-100" : "opacity-0"
          }`}
          muted
          playsInline
          poster={landingBackgroundPosterSrc}
          preload={priority ? "auto" : "metadata"}
          onCanPlay={() => setIsReady(true)}
          onLoadedData={() => setIsReady(true)}
          onError={() => setHasError(true)}
        >
          <source src={landingBackgroundVideoSrc} type="video/mp4" />
        </video>
      ) : null}
    </>
  );
}

function DemoPreview() {
  const [showPlayer, setShowPlayer] = useState(false);

  return (
    <div className="landing-demo-card group" data-testid="landing-demo-card">
      <div className="landing-demo-viewport" data-testid="landing-demo-viewport">
        {!showPlayer ? (
          <img
            data-testid="landing-demo-poster"
            src={REFRAME_DEMO_YOUTUBE_THUMBNAIL_URL}
            alt=""
            aria-hidden="true"
            className="landing-demo-media absolute inset-0 size-full object-cover object-center"
            loading="eager"
            referrerPolicy="no-referrer"
          />
        ) : (
          <YouTubePlayer
            videoUrl={REFRAME_DEMO_YOUTUBE_URL}
            title="Reframe demo video"
            testId="landing-demo-video"
            className="landing-demo-video absolute inset-0 size-full"
            autoPlay
            playing
            loading="eager"
          />
        )}
        {!showPlayer ? (
          <button
            type="button"
            data-testid="landing-demo-play-button"
            className="absolute left-1/2 top-1/2 z-10 inline-flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-cream/35 bg-black/45 text-cream shadow-[0_18px_52px_rgba(0,0,0,0.42)] backdrop-blur-xl backdrop-saturate-150 transition-all duration-300 ease-out hover:scale-105 hover:border-cream/50 hover:bg-black/55 hover:text-cream hover:shadow-[0_22px_64px_rgba(0,0,0,0.5)] focus:outline-none focus:ring-2 focus:ring-cream/60 active:scale-100 motion-reduce:transition-none sm:size-20"
            aria-label="Play demo video"
            onClick={() => setShowPlayer(true)}
          >
            <Play
              className="ml-1 size-7 transition-transform duration-300 group-hover:scale-105 sm:size-9"
              weight="fill"
              aria-hidden="true"
            />
          </button>
        ) : null}
      </div>
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

  const handleWaitlistSuccess = () => {
    setEmail("");
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
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter your email"
                />
                <button type="submit">Join the waitlist</button>
              </form>
              
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
        onSuccess={handleWaitlistSuccess}
      />
    </>
  );
}
