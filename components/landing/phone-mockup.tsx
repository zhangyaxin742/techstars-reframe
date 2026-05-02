export function PhoneMockup() {
  return (
    <div className="relative mx-auto w-[260px] sm:w-[286px] md:w-[320px]">
      <div className="pointer-events-none absolute inset-x-6 bottom-[-2rem] h-16 rounded-full bg-[rgba(10,8,5,0.5)] blur-3xl" />
      <div className="relative rotate-[-1deg] rounded-[2.9rem] border border-white/25 bg-[linear-gradient(180deg,rgba(255,255,255,0.22),rgba(40,29,21,0.18))] p-[7px] shadow-phone backdrop-blur-sm">
        <span className="absolute left-[-3px] top-24 h-12 w-[3px] rounded-l-full bg-white/15" />
        <span className="absolute left-[-3px] top-40 h-14 w-[3px] rounded-l-full bg-white/15" />
        <span className="absolute right-[-3px] top-32 h-20 w-[3px] rounded-r-full bg-white/15" />

        <div className="relative overflow-hidden rounded-[2.45rem] bg-[#f6ebdc] px-4 pb-5 pt-5 text-left text-ink">
          <div className="mb-5 flex items-center justify-between px-1 text-[11px] text-[rgba(26,22,14,0.78)]">
            <span>9:41</span>
            <div className="h-6 w-24 rounded-full bg-[rgba(26,22,14,0.9)]" />
          </div>

          <div className="space-y-5">
            <div>
              <p className="font-display text-[2.25rem] leading-[0.95] tracking-[-0.04em] text-[rgba(26,22,14,0.86)]">
                Hey you
              </p>
            </div>

            <div className="flex justify-end">
              <div className="max-w-[11rem] rounded-[1.35rem] rounded-tr-md bg-white px-4 py-3 text-[12px] leading-relaxed shadow-[0_10px_30px_rgba(26,22,14,0.08)]">
                I built a fintech app but nobody&apos;s downloading it.
              </div>
            </div>

            <div className="space-y-3 text-[13px] leading-relaxed text-[rgba(26,22,14,0.82)]">
              <div className="max-w-[12.5rem] rounded-[1.4rem] rounded-tl-md bg-[rgba(201,168,76,0.18)] px-4 py-3">
                Your real buyers are on r/personalfinance, not LinkedIn.
              </div>
              <div className="max-w-[12.5rem] rounded-[1.4rem] rounded-tl-md bg-[rgba(201,168,76,0.18)] px-4 py-3">
                Here&apos;s what to post there.
              </div>
              <div className="rounded-[1.5rem] border border-[rgba(26,22,14,0.1)] bg-white px-4 py-4 shadow-[0_12px_40px_rgba(26,22,14,0.08)]">
                <p className="text-[11px] uppercase tracking-[0.16em] text-gold">
                  Ready to copy
                </p>
                <p className="mt-2 text-[15px] leading-snug">
                  3 posts ready to copy
                  <span className="ml-1 inline-block">→</span>
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-[1.7rem] border border-[rgba(26,22,14,0.08)] bg-[rgba(255,251,245,0.92)] p-3 shadow-[0_-2px_20px_rgba(26,22,14,0.05)]">
            <div className="flex items-center gap-2 rounded-full bg-white px-4 py-3 text-[11px] text-[rgba(26,22,14,0.45)]">
              <span className="truncate">Ask me anything...</span>
              <span className="ml-auto text-[rgba(26,22,14,0.6)]">⌁</span>
            </div>

            <div className="mt-4 flex items-center justify-between px-2 text-[10px] text-[rgba(26,22,14,0.72)]">
              <div className="flex flex-col items-center gap-1">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(26,22,14,0.15)]">↗</span>
                <span>Spend</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(26,22,14,0.92)] text-white">C</span>
                <span>Ask Cleo</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(26,22,14,0.15)]">⌂</span>
                <span>Save</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(26,22,14,0.15)]">$</span>
                <span>Request</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
