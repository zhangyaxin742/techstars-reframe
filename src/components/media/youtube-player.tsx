"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildYouTubeEmbedUrl, extractYouTubeVideoId } from "../../lib/demo-video";
import { cn } from "../../lib/utils";

type YouTubePlayerState = "unstarted" | "ended" | "playing" | "paused" | "buffering" | "cued";

interface YouTubePlayerProps {
  videoUrl: string;
  title: string;
  className?: string;
  testId?: string;
  autoPlay?: boolean;
  controls?: boolean;
  muted?: boolean;
  playing?: boolean;
  seekToSeconds?: number | null;
  loading?: "eager" | "lazy";
  onCurrentTimeChange?: (seconds: number) => void;
  onDurationChange?: (seconds: number) => void;
  onPlaybackStateChange?: (state: YouTubePlayerState) => void;
}

interface YouTubePlayerInstance {
  destroy: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  mute: () => void;
  pauseVideo: () => void;
  playVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setVolume: (volume: number) => void;
  unMute: () => void;
}

interface YouTubePlayerStateChangeEvent {
  data: number;
}

interface YouTubePlayerReadyEvent {
  target: YouTubePlayerInstance;
}

interface YouTubeNamespace {
  Player: new (
    target: HTMLIFrameElement,
    options: {
      events?: {
        onReady?: (event: YouTubePlayerReadyEvent) => void;
        onStateChange?: (event: YouTubePlayerStateChangeEvent) => void;
      };
    }
  ) => YouTubePlayerInstance;
  PlayerState: {
    BUFFERING: number;
    CUED: number;
    ENDED: number;
    PAUSED: number;
    PLAYING: number;
    UNSTARTED: number;
  };
}

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    __reframeYouTubeApiPromise?: Promise<YouTubeNamespace>;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const YOUTUBE_IFRAME_API_URL = "https://www.youtube.com/iframe_api";

function loadYouTubeIframeApi() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube iframe API requires a browser."));
  }

  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (window.__reframeYouTubeApiPromise) {
    return window.__reframeYouTubeApiPromise;
  }

  window.__reframeYouTubeApiPromise = new Promise<YouTubeNamespace>((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${YOUTUBE_IFRAME_API_URL}"]`);
    const previousReady = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();

      if (window.YT?.Player) {
        resolve(window.YT);
        return;
      }

      reject(new Error("YouTube iframe API loaded without a player constructor."));
    };

    if (existingScript) {
      return;
    }

    const script = document.createElement("script");
    script.src = YOUTUBE_IFRAME_API_URL;
    script.async = true;
    script.onerror = () => reject(new Error("Failed to load the YouTube iframe API."));
    document.head.appendChild(script);
  });

  return window.__reframeYouTubeApiPromise;
}

function mapPlayerState(YT: YouTubeNamespace, state: number): YouTubePlayerState {
  switch (state) {
    case YT.PlayerState.PLAYING:
      return "playing";
    case YT.PlayerState.PAUSED:
      return "paused";
    case YT.PlayerState.ENDED:
      return "ended";
    case YT.PlayerState.BUFFERING:
      return "buffering";
    case YT.PlayerState.CUED:
      return "cued";
    default:
      return "unstarted";
  }
}

export function YouTubePlayer({
  videoUrl,
  title,
  className,
  testId,
  autoPlay = false,
  controls = true,
  muted = false,
  playing,
  seekToSeconds = null,
  loading = "lazy",
  onCurrentTimeChange,
  onDurationChange,
  onPlaybackStateChange,
}: YouTubePlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const playerRef = useRef<YouTubePlayerInstance | null>(null);
  const pollRef = useRef<number | null>(null);
  const currentTimeChangeRef = useRef(onCurrentTimeChange);
  const durationChangeRef = useRef(onDurationChange);
  const playbackStateChangeRef = useRef(onPlaybackStateChange);
  const [apiReady, setApiReady] = useState(false);
  const [apiFailed, setApiFailed] = useState(false);
  const videoId = useMemo(() => extractYouTubeVideoId(videoUrl), [videoUrl]);

  useEffect(() => {
    currentTimeChangeRef.current = onCurrentTimeChange;
    durationChangeRef.current = onDurationChange;
    playbackStateChangeRef.current = onPlaybackStateChange;
  }, [onCurrentTimeChange, onDurationChange, onPlaybackStateChange]);

  const stopPolling = useCallback(() => {
    if (pollRef.current === null) {
      return;
    }

    window.clearInterval(pollRef.current);
    pollRef.current = null;
  }, []);

  const emitPlayerSnapshot = useCallback(() => {
    const player = playerRef.current;

    if (!player) {
      return;
    }

    const currentTime = player.getCurrentTime();
    const duration = player.getDuration();

    if (Number.isFinite(currentTime)) {
      currentTimeChangeRef.current?.(currentTime);
    }

    if (Number.isFinite(duration) && duration > 0) {
      durationChangeRef.current?.(duration);
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    pollRef.current = window.setInterval(emitPlayerSnapshot, 250);
  }, [emitPlayerSnapshot, stopPolling]);

  useEffect(() => stopPolling, [stopPolling]);

  useEffect(() => {
    const iframe = iframeRef.current;

    if (!iframe || !videoId) {
      return;
    }

    let cancelled = false;

    loadYouTubeIframeApi()
      .then((YT) => {
        if (cancelled || !iframeRef.current) {
          return;
        }

        const player = new YT.Player(iframeRef.current, {
          events: {
            onReady: (event) => {
              if (cancelled) {
                return;
              }

              playerRef.current = event.target;
              setApiReady(true);

              if (muted) {
                event.target.mute();
              } else {
                event.target.unMute();
                event.target.setVolume(100);
              }

              emitPlayerSnapshot();

              if (seekToSeconds !== null) {
                event.target.seekTo(seekToSeconds, true);
              }

              if (playing ?? autoPlay) {
                event.target.playVideo();
              }
            },
            onStateChange: (event) => {
              if (cancelled) {
                return;
              }

              const nextState = mapPlayerState(YT, event.data);
              playbackStateChangeRef.current?.(nextState);

              if (nextState === "playing") {
                startPolling();
              } else {
                emitPlayerSnapshot();
                stopPolling();
              }
            },
          },
        });

        playerRef.current = player;
      })
      .catch(() => {
        if (!cancelled) {
          setApiFailed(true);
        }
      });

    return () => {
      cancelled = true;
      stopPolling();
      setApiReady(false);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [
    autoPlay,
    emitPlayerSnapshot,
    startPolling,
    stopPolling,
    videoId,
  ]);

  useEffect(() => {
    if (!apiReady || !playerRef.current) {
      return;
    }

    if (muted) {
      playerRef.current.mute();
      return;
    }

    playerRef.current.unMute();
    playerRef.current.setVolume(100);
  }, [apiReady, muted]);

  useEffect(() => {
    if (!apiReady || !playerRef.current || playing === undefined) {
      return;
    }

    const player = playerRef.current;
    const playerState = player.getPlayerState();
    const YT = window.YT;

    if (!YT?.PlayerState) {
      return;
    }

    if (playing && playerState !== YT.PlayerState.PLAYING) {
      player.playVideo();
      return;
    }

    if (!playing && playerState === YT.PlayerState.PLAYING) {
      player.pauseVideo();
    }
  }, [apiReady, playing]);

  useEffect(() => {
    if (!apiReady || !playerRef.current || seekToSeconds === null) {
      return;
    }

    const currentTime = playerRef.current.getCurrentTime();

    if (Math.abs(currentTime - seekToSeconds) > 0.25) {
      playerRef.current.seekTo(seekToSeconds, true);
      onCurrentTimeChange?.(seekToSeconds);
    }
  }, [apiReady, onCurrentTimeChange, seekToSeconds]);

  const iframeSrc = useMemo(() => {
    if (!videoId) {
      return videoUrl;
    }

    return buildYouTubeEmbedUrl(videoUrl, {
      autoplay: autoPlay || playing ? 1 : 0,
      controls: controls ? 1 : 0,
      mute: muted ? 1 : 0,
    });
  }, [autoPlay, controls, muted, playing, videoId, videoUrl]);

  return (
    <iframe
      ref={iframeRef}
      src={iframeSrc}
      title={title}
      aria-label={title}
      data-testid={testId}
      className={cn("block border-0", className)}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
      loading={loading}
      referrerPolicy="strict-origin-when-cross-origin"
      data-youtube-api-ready={apiReady ? "true" : "false"}
      data-youtube-fallback={apiFailed ? "true" : "false"}
    />
  );
}
