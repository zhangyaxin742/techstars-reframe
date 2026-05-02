import { Bungee } from "next/font/google";
import { TrendingWorkspace } from "@/components/trending/trending-workspace";

const trendingDisplay = Bungee({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export default function TrendingPage() {
  return <TrendingWorkspace titleClassName={trendingDisplay.className} />;
}
