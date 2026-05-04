export class WaitlistProviderNotConfiguredError extends Error {
  constructor(message = "Waitlist provider not configured.") {
    super(message);
    this.name = "WaitlistProviderNotConfiguredError";
  }
}

export type WaitlistMetadata = {
  createdAt: string;
  source: string;
  landingPage: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrer?: string;
};

export type WaitlistSubmission = {
  email: string;
  companyUrl: string;
  growthChallenge: string;
  metadata: WaitlistMetadata;
};

export async function submitWaitlistEmail(submission: WaitlistSubmission) {
  const provider = process.env.WAITLIST_PROVIDER;

  if (!provider) {
    throw new WaitlistProviderNotConfiguredError();
  }

  switch (provider) {
    case "loops":
      await submitToLoops(submission);
      return;
    default:
      throw new WaitlistProviderNotConfiguredError(
        `Unsupported waitlist provider: ${provider}`,
      );
  }
}

async function submitToLoops(submission: WaitlistSubmission) {
  const apiKey = process.env.LOOPS_API_KEY;
  const listId = process.env.LOOPS_WAITLIST_LIST_ID;

  if (!apiKey || !listId) {
    throw new WaitlistProviderNotConfiguredError(
      "Loops waitlist environment variables are missing.",
    );
  }

  const response = await fetch("https://app.loops.so/api/v1/contacts/update", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: submission.email,
      companyUrl: submission.companyUrl,
      growthChallenge: submission.growthChallenge,
      createdAt: submission.metadata.createdAt,
      source: submission.metadata.source,
      landingPage: submission.metadata.landingPage,
      utmSource: submission.metadata.utmSource,
      utmMedium: submission.metadata.utmMedium,
      utmCampaign: submission.metadata.utmCampaign,
      referrer: submission.metadata.referrer,
      mailingLists: {
        [listId]: true,
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || "Failed to submit waitlist email.");
  }
}
