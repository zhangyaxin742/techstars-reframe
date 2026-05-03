"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  exploreVideos,
  trendVideos,
  type TrendingVideo,
} from "@/src/data/trending-videos";

const fadeIn = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay,
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

function attemptPlay(video: HTMLVideoElement) {
  const playPromise = video.play();
  if (playPromise) {
    playPromise.catch(() => {});
  }
}

export function TrendingWorkspace({
  titleClassName,
}: {
  titleClassName: string;
}) {
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [audibleVideoId, setAudibleVideoId] = useState<string | null>(null);

  useEffect(() => {
    for (const video of Object.values(videoRefs.current)) {
      if (!video) {
        continue;
      }

      video.muted = true;
      video.volume = 0;
      attemptPlay(video);
    }
  }, []);

  function registerVideo(id: string) {
    return (node: HTMLVideoElement | null) => {
      videoRefs.current[id] = node;
    };
  }

  function setMutedLoopState() {
    for (const video of Object.values(videoRefs.current)) {
      if (!video) {
        continue;
      }

      video.muted = true;
      video.volume = 0;
      attemptPlay(video);
    }

    setActiveVideoId(null);
    setAudibleVideoId(null);
  }

  function focusVideo(id: string) {
    setActiveVideoId(id);
    setAudibleVideoId(null);

    for (const [videoId, video] of Object.entries(videoRefs.current)) {
      if (!video) {
        continue;
      }

      const isTarget = videoId === id;
      video.muted = !isTarget;
      video.volume = isTarget ? 1 : 0;
      video.currentTime = isTarget ? video.currentTime : 0;

      const playPromise = video.play();
      if (!playPromise) {
        continue;
      }

      if (!isTarget) {
        playPromise.catch(() => {});
        continue;
      }

      playPromise
        .then(() => {
          if (!video.muted) {
            setAudibleVideoId(id);
          }
        })
        .catch(() => {
          video.muted = true;
          video.volume = 0;
          setAudibleVideoId(null);
          attemptPlay(video);
        });
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050505] text-[#f5f1e8]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,160,82,0.22),transparent_26%),radial-gradient(circle_at_80%_18%,rgba(249,212,125,0.16),transparent_20%),linear-gradient(135deg,#090909_18%,#16110c_56%,#090909_100%)]" />
      <div className="studio-grid absolute inset-0 opacity-40" />
      <div className="hero-grain absolute inset-0 opacity-[0.08]" />
      <div className="pointer-events-none absolute inset-x-[-10%] top-[-24%] h-[32rem] rounded-full bg-[radial-gradient(circle,rgba(244,184,85,0.24),transparent_62%)] blur-3xl" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1600px] flex-col px-4 pb-6 pt-4 sm:px-6 lg:px-8">

        <main className="mt-6 grid flex-1 gap-6 xl:grid-cols-[minmax(0,1.8fr)_360px]">
          <motion.section
            initial="hidden"
            animate="visible"
            custom={0.12}
            variants={fadeIn}
            className="glass-panel relative overflow-hidden rounded-[36px] px-5 py-6 sm:px-6 lg:px-8"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.24),transparent)]" />

            <div className="flex flex-col gap-6 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <h1
                  className={`${titleClassName} mt-4 text-[clamp(3.2rem,9vw,7.8rem)] uppercase leading-[0.9] tracking-[0.02em] text-[#f6ead1] [text-shadow:0_12px_30px_rgba(0,0,0,0.45)]`}
                >
                  What&apos;s
                  <span className="block text-transparent [-webkit-text-stroke:1.2px_rgba(246,234,209,0.88)]">
                    Trending
                  </span>
                </h1>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-3">
                  <p className="text-[0.65rem] uppercase tracking-[0.28em] text-white/45">
                    Feed
                  </p>
                  <p className="mt-2 text-base text-white/85">Instagram</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-3">
                  <p className="text-[0.65rem] uppercase tracking-[0.28em] text-white/45">
                    Focus
                  </p>
                  <p className="mt-2 text-base text-white/85">Founders + social proof</p>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-4 sm:p-5">
              <div className="flex flex-col gap-4 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[0.68rem] uppercase tracking-[0.34em] text-white/45">
                    Banner
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#ff8d4d,#ffcb6a)] text-sm font-semibold text-[#1f1105]">
                      IG
                    </div>
                    <div>
                      <h2 className="text-xl font-medium text-white">Instagram trend lane</h2>
                      <p className="text-sm text-white/55">
                        Labeled trend references for hooks, edits, and remixes
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-white/55">
                  <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5">
                    5 active cuts
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5">
                    Hover for audio
                  </span>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {trendVideos.map((video, index) => (
                  <VideoTile
                    key={video.id}
                    card={video}
                    index={index}
                    activeVideoId={activeVideoId}
                    audibleVideoId={audibleVideoId}
                    registerVideo={registerVideo}
                    onBlur={setMutedLoopState}
                    onFocus={focusVideo}
                    tall={index === 0}
                  />
                ))}
              </div>
            </div>
          </motion.section>

          <motion.aside
            initial="hidden"
            animate="visible"
            custom={0.22}
            variants={fadeIn}
            className="glass-panel flex flex-col rounded-[36px] px-4 py-5 sm:px-5"
          >
            <div className="border-b border-white/10 pb-5">
              <p className="text-[0.68rem] uppercase tracking-[0.34em] text-white/45">
                Explore rail
              </p>
              <h2 className="mt-2 text-2xl font-medium text-white">Adjacent references</h2>
              <p className="mt-2 text-sm leading-6 text-white/58">
                Supporting clips to pull textures, pacing, and creator energy
                from while building a remix.
              </p>
            </div>

            <div className="mt-5 flex flex-1 flex-col gap-4">
              {exploreVideos.map((video, index) => (
                <VideoTile
                  key={video.id}
                  card={video}
                  index={index}
                  activeVideoId={activeVideoId}
                  audibleVideoId={audibleVideoId}
                  registerVideo={registerVideo}
                  onBlur={setMutedLoopState}
                  onFocus={focusVideo}
                />
              ))}
            </div>
          </motion.aside>
        </main>
      </div>
    </div>
  );
}

function VideoTile({
  activeVideoId,
  audibleVideoId,
  card,
  index,
  onBlur,
  onFocus,
  registerVideo,
  tall = false,
}: {
  activeVideoId: string | null;
  audibleVideoId: string | null;
  card: TrendingVideo;
  index: number;
  onBlur: () => void;
  onFocus: (id: string) => void;
  registerVideo: (id: string) => (node: HTMLVideoElement | null) => void;
  tall?: boolean;
}) {
  const isActive = activeVideoId === card.id;
  const isAudible = audibleVideoId === card.id;

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: 0.28 + index * 0.07,
        duration: 0.7,
        ease: [0.22, 1, 0.36, 1],
      }}
      tabIndex={0}
      onMouseEnter={() => onFocus(card.id)}
      onMouseLeave={onBlur}
      onFocus={() => onFocus(card.id)}
      onBlur={onBlur}
      className={[
        "group relative overflow-hidden rounded-[28px] border border-white/10 bg-black/30 outline-none transition duration-300",
        "hover:border-[#f0c979]/40 hover:shadow-[0_24px_60px_rgba(0,0,0,0.45)]",
        isActive ? "translate-y-[-4px] border-[#f0c979]/60 shadow-[0_28px_70px_rgba(0,0,0,0.5)]" : "",
        tall ? "md:col-span-2 2xl:col-span-1" : "",
      ].join(" ")}
    >
      <div className={`relative ${tall ? "aspect-[16/11]" : "aspect-[4/5]"}`}>
        <video
          ref={registerVideo(card.id)}
          src={card.src}
          loop
          muted
          autoPlay
          playsInline
          preload="metadata"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.04),rgba(0,0,0,0.08)_32%,rgba(0,0,0,0.78)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,transparent_0,transparent_40%,rgba(0,0,0,0.3)_100%)]" />

        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span className="rounded-full border border-white/14 bg-black/30 px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.24em] text-white/78 backdrop-blur-md">
            {card.label}
          </span>
          <span className="rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.18em] text-white/56 backdrop-blur-md">
            {isAudible ? "audio on" : "looping"}
          </span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[0.63rem] uppercase tracking-[0.28em] text-[#f0c979]">
                {card.meta}
              </p>
              <h3 className="mt-2 text-lg font-medium text-white">{card.title}</h3>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/12 bg-black/25 text-sm text-white/80 backdrop-blur-md transition group-hover:border-[#f0c979]/40 group-hover:text-[#f6e5b3]">
              {isActive ? "II" : ">"}
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
