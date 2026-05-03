import React from "react";

type LandingNavProps = {
  onWaitlistClick: () => void;
};

export function LandingNav({ onWaitlistClick }: LandingNavProps) {
  return (
    <nav className="landing-nav fixed inset-x-0 top-0 z-50 px-5 py-4 sm:px-8 sm:py-6 lg:px-11 lg:py-7">
      <div className="landing-nav-inner mx-auto flex max-w-7xl items-center justify-between">
        <div className="landing-wordmark font-display text-[1.55rem] lowercase tracking-wordmark text-cream sm:text-[1.8rem]">
          reframe.
        </div>
        <button
          type="button"
          onClick={onWaitlistClick}
          className="landing-wordmark font-display text-[1.55rem] lowercase tracking-wordmark text-cream decoration-cream/70 transition-colors duration-200 hover:text-gold sm:text-[1.8rem]"
        >
          waitlist
        </button>
      </div>
    </nav>
  );
}
