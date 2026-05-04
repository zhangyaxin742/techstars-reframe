import React from "react";

export function LandingNav() {
  return (
    <nav className="landing-nav fixed inset-x-0 top-0 z-50 px-6 py-5 sm:px-12 sm:py-8 lg:px-16">
      <div className="landing-nav-inner flex items-center">
        <div className="landing-wordmark font-display text-[1.55rem] lowercase tracking-wordmark text-cream drop-shadow-[0_2px_10px_rgba(0,0,0,0.65)] sm:text-[1.8rem]">
          reframe.
        </div>
      </div>
    </nav>
  );
}
