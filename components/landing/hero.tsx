"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { LandingNav } from "@/components/landing/nav";
import { PhoneMockup } from "@/components/landing/phone-mockup";
import { WaitlistModal } from "@/components/landing/waitlist-modal";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay,
      duration: 1.1,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

export function Hero() {
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const reducedMotion = useReducedMotion();

  return (
    <>
      <div className="relative min-h-screen overflow-hidden bg-ink text-cream">
        <div className="absolute inset-0">
          <div className="absolute inset-[-4%] will-change-transform">
            <Image
              src="/assets/painting-bg.png"
              alt=""
              fill
              priority
              sizes="100vw"
              className="animate-kenburns object-cover object-center sepia-[0.2] saturate-[0.85] brightness-[0.7]"
            />
          </div>
          <div className="hero-vignette absolute inset-0" />
          <div className="hero-tint absolute inset-0" />
          <div className="hero-grain absolute inset-0" />
        </div>

        <LandingNav onWaitlistClick={() => setWaitlistOpen(true)} />

        <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 pb-10 pt-28 text-center sm:px-8 sm:pt-32 lg:px-10">
          <motion.div
            initial="hidden"
            animate="visible"
            className="mx-auto flex w-full max-w-5xl flex-col items-center"
          >
            <motion.p
              custom={0.5}
              variants={fadeUp}
              className="text-[11px] uppercase tracking-eyebrow text-gold"
            >
              Your AI CMO
            </motion.p>

            <div className="mt-5 space-y-1 sm:space-y-2">
              <motion.h1
                custom={0.6}
                variants={fadeUp}
                className="font-display text-[2.65rem] font-light leading-[0.95] tracking-[-0.045em] text-cream sm:text-[4.4rem] md:text-[5rem] lg:text-[5.2rem]"
              >
                Built for founders
              </motion.h1>
              <motion.h1
                custom={0.75}
                variants={fadeUp}
                className="font-display text-[2.65rem] font-light leading-[0.95] tracking-[-0.045em] text-cream sm:text-[4.4rem] md:text-[5rem] lg:text-[5.2rem]"
              >
                who have a <em className="font-normal italic">product</em>
              </motion.h1>
              <motion.h1
                custom={0.9}
                variants={fadeUp}
                className="font-display text-[2.65rem] font-light leading-[0.95] tracking-[-0.045em] text-cream sm:text-[4.4rem] md:text-[5rem] lg:text-[5.2rem]"
              >
                but no audience.
              </motion.h1>
            </div>

            <motion.p
              custom={1}
              variants={fadeUp}
              className="mt-6 max-w-xl text-sm leading-6 text-warm sm:text-base sm:leading-7 max-[374px]:hidden"
            >
              Reframe finds your people, tells you what to say, and gets you
              posted.
            </motion.p>

            <motion.div
              custom={1.2}
              variants={fadeUp}
              initial={{ opacity: 0, y: 28 }}
              animate={
                reducedMotion
                  ? { opacity: 1, y: 0 }
                  : {
                      opacity: 1,
                      y: 0,
                    }
              }
              transition={{ delay: 1.2, duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              className="mt-8 sm:mt-10"
            >
              <motion.div
                animate={
                  reducedMotion
                    ? undefined
                    : {
                        y: [0, -8, 0],
                      }
                }
                transition={
                  reducedMotion
                    ? undefined
                    : {
                        duration: 4,
                        ease: "easeInOut",
                        repeat: Number.POSITIVE_INFINITY,
                      }
                }
              >
                <PhoneMockup />
              </motion.div>
            </motion.div>

            <motion.button
              type="button"
              custom={1.35}
              variants={fadeUp}
              onClick={() => setWaitlistOpen(true)}
              className="mt-8 inline-flex items-center rounded-md bg-cream px-6 py-3 text-sm text-ink transition hover:bg-gold hover:text-cream sm:mt-10"
            >
              Get early access →
            </motion.button>
          </motion.div>
        </main>
      </div>

      <WaitlistModal open={waitlistOpen} onOpenChange={setWaitlistOpen} />
    </>
  );
}
