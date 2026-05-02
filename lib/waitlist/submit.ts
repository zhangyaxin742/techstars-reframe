export class WaitlistProviderNotConfiguredError extends Error {
  constructor(message = "Waitlist provider not configured.") {
    super(message);
    this.name = "WaitlistProviderNotConfiguredError";
  }
}

export async function submitWaitlistEmail(email: string) {
  const provider = process.env.WAITLIST_PROVIDER;

  if (!provider) {
    throw new WaitlistProviderNotConfiguredError();
  }

  switch (provider) {
    case "loops":
      await submitToLoops(email);
      return;
    default:
      throw new WaitlistProviderNotConfiguredError(
        `Unsupported waitlist provider: ${provider}`,
      );
  }
}

async function submitToLoops(email: string) {
  const apiKey = process.env.LOOPS_API_KEY;
  const listId = process.env.LOOPS_WAITLIST_LIST_ID;

  if (!apiKey || !listId) {
    throw new WaitlistProviderNotConfiguredError(
      "Loops waitlist environment variables are missing.",
    );
  }

  const response = await fetch("https://app.loops.so/api/v1/contacts/create", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      mailingLists: {
        [listId]: true,
      },
      source: "reframe-landing",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || "Failed to submit waitlist email.");
  }
}
