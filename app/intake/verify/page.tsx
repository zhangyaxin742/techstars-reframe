import { IntakeVerifyForm } from "@/components/intake/intake-verify-form";

export default function IntakeVerifyPage() {
  return (
    <main className="min-h-dvh bg-ink px-5 py-8 text-cream sm:px-8">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-5xl items-center justify-center">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[1fr_28rem]">
          <section className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-gold">
              Reframe intake
            </p>
            <h2 className="mt-5 font-display text-5xl font-normal leading-none tracking-normal text-cream sm:text-6xl">
              Save the context before the workspace opens.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-cream/68">
              Your business notes stay in the draft until the code verifies and
              the draft is claimed into your workspace.
            </p>
          </section>

          <IntakeVerifyForm />
        </div>
      </div>
    </main>
  );
}
