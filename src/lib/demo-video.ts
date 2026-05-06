const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

export const REFRAME_DEMO_YOUTUBE_VIDEO_ID = "fm4rNewIcH8";
export const REFRAME_DEMO_YOUTUBE_URL = `https://youtu.be/${REFRAME_DEMO_YOUTUBE_VIDEO_ID}`;
export const REFRAME_DEMO_YOUTUBE_THUMBNAIL_URL = `https://i.ytimg.com/vi/${REFRAME_DEMO_YOUTUBE_VIDEO_ID}/maxresdefault.jpg`;

export function extractYouTubeVideoId(input: string): string | null {
  if (YOUTUBE_ID_PATTERN.test(input)) {
    return input;
  }

  try {
    const url = new URL(input);
    const hostname = url.hostname.replace(/^www\./, "");

    if (hostname === "youtu.be") {
      const videoId = url.pathname.replace(/^\/+/, "").split("/")[0];
      return YOUTUBE_ID_PATTERN.test(videoId) ? videoId : null;
    }

    if (hostname === "youtube.com" || hostname === "m.youtube.com") {
      if (url.pathname === "/watch") {
        const videoId = url.searchParams.get("v");
        return videoId && YOUTUBE_ID_PATTERN.test(videoId) ? videoId : null;
      }

      const pathParts = url.pathname.split("/").filter(Boolean);
      const maybeVideoId = pathParts[1];

      if (
        (pathParts[0] === "embed" || pathParts[0] === "shorts" || pathParts[0] === "live") &&
        maybeVideoId &&
        YOUTUBE_ID_PATTERN.test(maybeVideoId)
      ) {
        return maybeVideoId;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function isYouTubeVideoUrl(input: string): boolean {
  return extractYouTubeVideoId(input) !== null;
}

export function buildYouTubeEmbedUrl(
  input: string,
  params: Record<string, string | number | boolean | undefined> = {}
): string {
  const videoId = extractYouTubeVideoId(input);

  if (!videoId) {
    return input;
  }

  const searchParams = new URLSearchParams({
    playsinline: "1",
    rel: "0",
    modestbranding: "1",
    enablejsapi: "1",
  });

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      continue;
    }

    searchParams.set(key, typeof value === "boolean" ? (value ? "1" : "0") : String(value));
  }

  return `https://www.youtube.com/embed/${videoId}?${searchParams.toString()}`;
}
