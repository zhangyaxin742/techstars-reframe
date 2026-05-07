import { IntakeForm } from "@/components/intake/intake-form";

export default function IntakePage() {
  return (
    <main className="min-h-dvh bg-ink px-5 py-8 text-cream sm:px-8">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-6xl items-center">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[0.82fr_1fr]">
          <section className="max-w-xl">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-gold">
              Reframe intake
            </p>
            <h2 className="mt-5 font-display text-5xl font-normal leading-none tracking-normal text-cream sm:text-6xl">
              Build from what is already true about the business.
            </h2>
            <p className="mt-5 text-base leading-7 text-cream/68">
              Save the source references, goal, and founder note first. The
              workspace opens after the draft is claimed to a verified account.
            </p>
          </section>

          <IntakeForm />
        </div>
      </div>
    </main>
  );
}
