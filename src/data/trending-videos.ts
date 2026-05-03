export type TrendingVideo = {
  id: string;
  src: string;
  label: "trend" | "explore";
  title: string;
  meta: string;
};

export const trendVideos: TrendingVideo[] = [
  {
    id: "trend-1",
    src: "/videos/trend1.mp4",
    label: "trend",
    title: "Founder confessional",
    meta: "Hook refresh",
  },
  {
    id: "trend-2",
    src: "/videos/trend2.mp4",
    label: "trend",
    title: "Process cutdown",
    meta: "High-retention edit",
  },
  {
    id: "trend-3",
    src: "/videos/trend3.mp4",
    label: "trend",
    title: "Customer proof remix",
    meta: "Comment-led version",
  },
  {
    id: "trend-4",
    src: "/videos/trend4.mp4",
    label: "trend",
    title: "Screen-record story",
    meta: "Narration layer",
  },
  {
    id: "trend-5",
    src: "/videos/trend5.mp4",
    label: "trend",
    title: "A/B opener pack",
    meta: "Save-ready templates",
  },
];

export const exploreVideos: TrendingVideo[] = [
  {
    id: "explore-1",
    src: "/videos/explore1.mp4",
    label: "explore",
    title: "Niche pocket",
    meta: "For You crossover",
  },
  {
    id: "explore-2",
    src: "/videos/explore2.mp4",
    label: "explore",
    title: "Visual bait",
    meta: "Texture-first loop",
  },
  {
    id: "explore-3",
    src: "/videos/explore3.mp4",
    label: "explore",
    title: "Creator reference",
    meta: "Format steal",
  },
];

export const trendingPageVideos = [...trendVideos, ...exploreVideos];
