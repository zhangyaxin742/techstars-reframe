type LandingNavProps = {
  onWaitlistClick: () => void;
};

export function LandingNav({ onWaitlistClick }: LandingNavProps) {
  return (
    <nav className="fixed inset-x-0 top-0 z-50 px-5 py-4 sm:px-8 sm:py-6 lg:px-11 lg:py-7">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="font-display text-[1.55rem] lowercase tracking-wordmark text-cream sm:text-[1.8rem]">
          reframe
        </div>
        <button
          type="button"
          onClick={onWaitlistClick}
          className="glass-pill inline-flex items-center justify-center rounded-full border border-white/35 px-4 py-2 text-sm text-cream transition hover:border-gold hover:text-gold sm:px-5"
        >
          Get early access
        </button>
      </div>
    </nav>
  );
}
