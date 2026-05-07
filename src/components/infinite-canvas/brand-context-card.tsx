import React, { memo } from "react";
import { motion } from "framer-motion";
import { Users, Warning, Star, Target, Sparkle, CheckCircle, VideoCamera, Image } from "@phosphor-icons/react";
import type { BrandContextCardData, SignalLevel } from "../../data/reframe-demo";
import { cn } from "../../lib/utils";

const colVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.75,
      delay,
      ease: "easeOut" as const,
      staggerChildren: 0.06,
      delayChildren: 0.06,
    },
  }),
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay, ease: "easeOut" as const },
  }),
};

const tileImageVariants = {
  hidden: { opacity: 0, scale: 1.035 },
  visible: (delay: number) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.7, delay, ease: "easeOut" as const },
  }),
};

const statVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.44, delay, ease: "easeOut" as const },
  }),
};

interface BrandContextCardProps {
  data: BrandContextCardData;
  animateIn?: boolean;
  labels?: {
    trendSignalsTitle?: string;
  };
}

function makePlaceholderSvg(_color: string): string {
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 100'%3E%3Crect width='160' height='100' fill='%231f1f29'/%3E%3C/svg%3E`;
}

function levelColor(level: SignalLevel) {
  if (level === "High") return "text-accent font-semibold";
  if (level === "Medium") return "text-foreground";
  return "text-muted-foreground";
}

function ToneBar({
  value,
  animateIn = false,
  delay = 0,
}: {
  value: number;
  animateIn?: boolean;
  delay?: number;
}) {
  return (
    <div className="flex h-1.5 w-24 overflow-hidden rounded-full bg-muted">
      <motion.div
        className="h-full rounded-full bg-accent"
        style={{ width: `${value}%`, transformOrigin: "left center" }}
        initial={animateIn ? { scaleX: 0 } : false}
        animate={animateIn ? { scaleX: 1 } : undefined}
        transition={{ duration: 0.58, delay, ease: "easeOut" }}
      />
    </div>
  );
}

export const BrandContextCard = memo(function BrandContextCard({
  data,
  animateIn = false,
  labels,
}: BrandContextCardProps) {
  const animate = animateIn ? "visible" : undefined;
  const initial = animateIn ? "hidden" : undefined;

  return (
    <div className="flex w-full text-[11px] leading-4">
      {/* ── Left column: Brand Thesis ─────────────────────────────── */}
      <motion.div
        className="flex w-[210px] shrink-0 flex-col gap-3 border-r p-4"
        variants={colVariants}
        custom={0.0}
        initial={initial}
        animate={animate}
      >
        <motion.p
          className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground"
          variants={itemVariants}
          custom={0.06}
          initial={initial}
          animate={animate}
        >
          Brand Thesis
        </motion.p>

        <motion.h2
          className="text-[18px] font-bold leading-snug tracking-tight text-foreground"
          variants={itemVariants}
          custom={0.12}
          initial={initial}
          animate={animate}
        >
          {data.thesis}
        </motion.h2>
        <motion.p
          className="text-[10px] text-muted-foreground"
          variants={itemVariants}
          custom={0.17}
          initial={initial}
          animate={animate}
        >
          {data.tagline}
        </motion.p>

        <div className="mt-1 space-y-3">
          {([
            { icon: <Users size={12} weight="regular" className="mt-0.5 shrink-0 text-muted-foreground" />, label: "Audience", text: data.audience },
            { icon: <Warning size={12} weight="regular" className="mt-0.5 shrink-0 text-muted-foreground" />, label: "Pain", text: data.pain },
            { icon: <Star size={12} weight="regular" className="mt-0.5 shrink-0 text-muted-foreground" />, label: "Desired Identity", text: data.desiredIdentity },
          ] as const).map(({ icon, label, text }, i) => (
            <motion.div
              key={label}
              className="flex items-start gap-2"
              variants={itemVariants}
              custom={0.23 + i * 0.08}
              initial={initial}
              animate={animate}
            >
              {icon}
              <div>
                <p className="font-semibold text-foreground">{label}</p>
                <p className="text-muted-foreground">{text}</p>
              </div>
            </motion.div>
          ))}

          <motion.div
            className="flex items-start gap-2"
            variants={itemVariants}
            custom={0.47}
            initial={initial}
            animate={animate}
          >
            <Target size={12} weight="regular" className="mt-0.5 shrink-0 text-muted-foreground" />
            <div>
              <p className="font-semibold text-foreground">Conversion Goal</p>
              <p className="font-semibold text-foreground">{data.conversionGoal.name}</p>
              <p className="text-muted-foreground">{data.conversionGoal.description}</p>
            </div>
          </motion.div>
        </div>

        <motion.div
          variants={itemVariants}
          custom={0.55}
          initial={initial}
          animate={animate}
        >
          <p className="mb-1 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
            What success looks like
          </p>
          <div className="rounded-md border bg-muted/40 p-2.5">
            <p className="text-muted-foreground">{data.successLooksLike}</p>
          </div>
        </motion.div>
      </motion.div>

      {/* ── Middle column: Visual Proof Library ───────────────────── */}
      <motion.div
        className="flex min-w-0 flex-1 flex-col border-r"
        variants={colVariants}
        custom={0.28}
        initial={initial}
        animate={animate}
      >
        <motion.div
          className="flex items-center justify-between border-b px-3 py-2"
          variants={itemVariants}
          custom={0.32}
          initial={initial}
          animate={animate}
        >
          <motion.p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
            Visual Proof Library
          </motion.p>
          <motion.div className="flex items-center gap-1 text-[9px] text-accent">
            <Sparkle size={10} weight="fill" />
            <span>AI-labeled</span>
          </motion.div>
        </motion.div>

        <div className="grid grid-cols-3">
          {data.visualProof.map((item, idx) => (
            <motion.div
              key={item.id}
              className="flex flex-col overflow-hidden border-b border-r"
              variants={itemVariants}
              custom={0.34 + idx * 0.05}
              initial={initial}
              animate={animate}
            >
              <motion.div
                className="relative overflow-hidden"
                style={{ height: 120 }}
                variants={tileImageVariants}
                custom={0.38 + idx * 0.05}
                initial={initial}
                animate={animate}
              >
                <motion.img
                  src={item.imageUrl ?? makePlaceholderSvg(item.color)}
                  alt={item.label}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                />
                <motion.span
                  className="absolute left-1.5 top-1.5 rounded bg-[#1f1f29]/80 px-1 py-px text-[8px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm"
                  variants={itemVariants}
                  custom={0.48 + idx * 0.05}
                  initial={initial}
                  animate={animate}
                >
                  {item.tag}
                </motion.span>
              </motion.div>
              <motion.div
                className="flex flex-col gap-0.5 bg-card px-2 py-1.5"
                variants={itemVariants}
                custom={0.52 + idx * 0.05}
                initial={initial}
                animate={animate}
              >
                <motion.p className="truncate text-[10px] text-foreground">{item.label}</motion.p>
                <motion.span
                  className="self-start rounded bg-secondary px-1.5 py-px text-[9px] font-semibold text-foreground"
                >
                  {item.score} {item.scoreLabel}
                </motion.span>
              </motion.div>
            </motion.div>
          ))}
        </div>

        <div className="flex items-center gap-4 border-t px-3 py-2 text-[9px] text-muted-foreground">
          <motion.span
            className="flex items-center gap-1"
            variants={statVariants}
            custom={0.9}
            initial={initial}
            animate={animate}
          >
            <VideoCamera size={10} weight="regular" />
            <span className="font-semibold tabular-nums text-foreground">128</span> video clips
          </motion.span>
          <motion.span
            className="flex items-center gap-1"
            variants={statVariants}
            custom={0.96}
            initial={initial}
            animate={animate}
          >
            <Image size={10} weight="regular" />
            <span className="font-semibold tabular-nums text-foreground">74</span> photos
          </motion.span>
          <motion.span
            className="flex items-center gap-1"
            variants={statVariants}
            custom={1.02}
            initial={initial}
            animate={animate}
          >
            <Sparkle size={10} weight="fill" className="text-accent" />
            AI-labeled{" "}
            <span className="font-semibold tabular-nums text-accent">100%</span>
          </motion.span>
          <motion.span
            className="flex items-center gap-1"
            variants={statVariants}
            custom={1.08}
            initial={initial}
            animate={animate}
          >
            <CheckCircle size={10} weight="fill" className="text-foreground/50" />
            Brand fit avg{" "}
            <span className="font-semibold tabular-nums text-foreground">86%</span>
          </motion.span>
        </div>
      </motion.div>

      {/* ── Right column: AI Decision Signals ─────────────────────── */}
      <motion.div
        className="flex w-[260px] shrink-0 flex-col gap-3 p-3"
        variants={colVariants}
        custom={0.62}
        initial={initial}
        animate={animate}
      >
        <motion.p
          className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground"
          variants={itemVariants}
          custom={0.68}
          initial={initial}
          animate={animate}
        >
          AI Decision Signals
        </motion.p>

        <div>
          <motion.p
            className="mb-1.5 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-foreground"
            variants={itemVariants}
            custom={0.72}
            initial={initial}
            animate={animate}
          >
            {labels?.trendSignalsTitle ?? "Trend Matching Signals"}
          </motion.p>
          <div className="space-y-1">
            {data.trendSignals.map((sig, idx) => (
              <motion.div
                key={sig.rank}
                className="flex items-center gap-1.5"
                variants={itemVariants}
                custom={0.76 + idx * 0.05}
                initial={initial}
                animate={animate}
              >
                <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-foreground text-[8px] font-bold text-background">
                  {sig.rank}
                </span>
                <span className="flex-1 text-foreground">{sig.label}</span>
                <span className={cn("font-medium", levelColor(sig.level))}>{sig.level}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="border-t pt-2">
          <motion.p
            className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-foreground"
            variants={itemVariants}
            custom={1.06}
            initial={initial}
            animate={animate}
          >
            Script Rules
          </motion.p>
          <div className="space-y-1">
            {data.scriptRules.map((rule, idx) => (
              <motion.div
                key={rule}
                className="flex items-start gap-1"
                variants={itemVariants}
                custom={1.1 + idx * 0.05}
                initial={initial}
                animate={animate}
              >
                <CheckCircle size={9} weight="fill" className="mt-0.5 shrink-0 text-accent" />
                <span className="text-muted-foreground">{rule}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="border-t pt-2">
          <motion.p
            className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-foreground"
            variants={itemVariants}
            custom={1.38}
            initial={initial}
            animate={animate}
          >
            Tone
          </motion.p>
          <div className="space-y-1.5">
            {data.tone.map((t, idx) => (
              <motion.div
                key={t.label}
                className="flex items-center justify-between gap-2"
                variants={itemVariants}
                custom={1.42 + idx * 0.05}
                initial={initial}
                animate={animate}
              >
                <span className="w-16 text-muted-foreground">{t.label}</span>
                <ToneBar value={t.value} animateIn={animateIn} delay={1.5 + idx * 0.06} />
              </motion.div>
            ))}
          </div>
        </div>

        <div className="border-t pt-2">
          <motion.div
            className="mb-1.5 flex items-center justify-between"
            variants={itemVariants}
            custom={1.64}
            initial={initial}
            animate={animate}
          >
            <p className="text-[9px] font-semibold uppercase tracking-wide text-foreground">DO / AVOID</p>
            <p className="text-[9px] font-semibold uppercase tracking-wide text-rose-600">AVOID</p>
          </motion.div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
            <div className="space-y-0.5">
              {data.doList.map((item, idx) => (
                <motion.div
                  key={item}
                  className="flex items-start gap-1"
                  variants={itemVariants}
                  custom={1.68 + idx * 0.05}
                  initial={initial}
                  animate={animate}
                >
                  <CheckCircle size={9} weight="fill" className="mt-0.5 shrink-0 text-accent" />
                  <span className="text-muted-foreground">{item}</span>
                </motion.div>
              ))}
            </div>
            <div className="space-y-0.5">
              {data.avoidList.map((item, idx) => (
                <motion.div
                  key={item}
                  className="flex items-start gap-1"
                  variants={itemVariants}
                  custom={1.68 + idx * 0.05}
                  initial={initial}
                  animate={animate}
                >
                  <span className="mt-px shrink-0 text-[8px] text-rose-500">✕</span>
                  <span className="text-muted-foreground">{item}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
});
