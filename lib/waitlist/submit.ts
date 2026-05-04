import { createHash, createHmac } from "node:crypto";

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

export type WaitlistRequestContext = {
  ipAddress: string | null;
  userAgent: string | null;
};

type SupabaseConfig = {
  url: string;
  serviceRoleKey: string;
};

type ResendConfig = {
  apiKey: string;
  notificationFrom: string;
  notificationTo: string[];
  notificationReplyTo?: string;
};

type ExistingWaitlistRecord = {
  first_submitted_at: string;
  submission_count: number;
};

type WaitlistRecord = {
  email: string;
  company_url: string;
  growth_challenge: string;
  source: string;
  landing_page: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  referrer?: string;
  first_submitted_at: string;
  last_submitted_at: string;
  submission_count: number;
  ip_hash?: string;
  user_agent?: string;
  payload: {
    email: string;
    companyUrl: string;
    growthChallenge: string;
    metadata: WaitlistMetadata;
  };
  notification_status: "pending" | "sent" | "failed" | "skipped";
  notification_error: string | null;
  notification_email_id: string | null;
  notified_at: string | null;
};

const SUPABASE_TABLE = "waitlist_signups";
const RESEND_EMAILS_ENDPOINT = "https://api.resend.com/emails";

export async function submitWaitlistEmail(
  submission: WaitlistSubmission,
  requestContext: WaitlistRequestContext,
) {
  await submitToSupabaseAndResend(submission, requestContext);
}

async function submitToSupabaseAndResend(
  submission: WaitlistSubmission,
  requestContext: WaitlistRequestContext,
) {
  const supabase = getSupabaseConfig();
  const existing = await getExistingWaitlistRecord(supabase, submission.email);
  const record = buildWaitlistRecord(submission, requestContext, existing);

  await upsertWaitlistRecord(supabase, record);

  const resend = getResendConfig();

  if (!resend) {
    await updateWaitlistNotificationState(supabase, submission.email, {
      notification_status: "skipped",
      notification_error:
        "Resend notification env vars are missing. Persistence succeeded without email notification.",
      notification_email_id: null,
      notified_at: null,
    }).catch((error) => {
      console.error("Failed to record skipped waitlist notification state.", error);
    });
    return;
  }

  try {
    const emailId = await sendWaitlistNotification(
      resend,
      submission,
      requestContext,
      record.submission_count,
    );

    await updateWaitlistNotificationState(supabase, submission.email, {
      notification_status: "sent",
      notification_error: null,
      notification_email_id: emailId,
      notified_at: new Date().toISOString(),
    }).catch((error) => {
      console.error("Failed to record sent waitlist notification state.", error);
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Resend notification failed.";

    await updateWaitlistNotificationState(supabase, submission.email, {
      notification_status: "failed",
      notification_error: truncate(message, 1_000),
      notification_email_id: null,
      notified_at: null,
    }).catch((updateError) => {
      console.error("Failed to record waitlist notification error.", updateError);
    });
  }
}

function getSupabaseConfig(): SupabaseConfig {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new WaitlistProviderNotConfiguredError(
      "Supabase waitlist environment variables are missing.",
    );
  }

  return {
    url: url.replace(/\/+$/, ""),
    serviceRoleKey,
  };
}

function getResendConfig(): ResendConfig | null {
  const apiKey = process.env.RESEND_API_KEY;
  const notificationFrom = process.env.WAITLIST_NOTIFICATION_FROM;
  const notificationTo = process.env.WAITLIST_NOTIFICATION_TO;
  const notificationReplyTo = process.env.WAITLIST_NOTIFICATION_REPLY_TO;

  if (!apiKey || !notificationFrom || !notificationTo) {
    return null;
  }

  const recipients = notificationTo
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (recipients.length === 0) {
    return null;
  }

  return {
    apiKey,
    notificationFrom,
    notificationTo: recipients,
    notificationReplyTo: notificationReplyTo?.trim() || undefined,
  };
}

async function getExistingWaitlistRecord(
  supabase: SupabaseConfig,
  email: string,
): Promise<ExistingWaitlistRecord | null> {
  const response = await fetch(
    `${supabase.url}/rest/v1/${SUPABASE_TABLE}?select=first_submitted_at,submission_count&email=eq.${encodeFilterValue(email)}&limit=1`,
    {
      headers: buildSupabaseHeaders(supabase),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(await readResponseError(response, "Failed to read waitlist record."));
  }

  const rows = (await response.json()) as ExistingWaitlistRecord[];
  return rows[0] ?? null;
}

function buildWaitlistRecord(
  submission: WaitlistSubmission,
  requestContext: WaitlistRequestContext,
  existing: ExistingWaitlistRecord | null,
): WaitlistRecord {
  const secret =
    process.env.WAITLIST_RATE_LIMIT_SALT ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.RESEND_API_KEY ||
    "waitlist";

  return {
    email: submission.email,
    company_url: submission.companyUrl,
    growth_challenge: submission.growthChallenge,
    source: submission.metadata.source,
    landing_page: submission.metadata.landingPage,
    utm_source: submission.metadata.utmSource,
    utm_medium: submission.metadata.utmMedium,
    utm_campaign: submission.metadata.utmCampaign,
    referrer: submission.metadata.referrer,
    first_submitted_at:
      existing?.first_submitted_at || submission.metadata.createdAt,
    last_submitted_at: submission.metadata.createdAt,
    submission_count: (existing?.submission_count || 0) + 1,
    ip_hash: requestContext.ipAddress
      ? createHmac("sha256", secret)
          .update(requestContext.ipAddress)
          .digest("hex")
      : undefined,
    user_agent: requestContext.userAgent || undefined,
    payload: {
      email: submission.email,
      companyUrl: submission.companyUrl,
      growthChallenge: submission.growthChallenge,
      metadata: submission.metadata,
    },
    notification_status: "pending",
    notification_error: null,
    notification_email_id: null,
    notified_at: null,
  };
}

async function upsertWaitlistRecord(
  supabase: SupabaseConfig,
  record: WaitlistRecord,
) {
  const response = await fetch(
    `${supabase.url}/rest/v1/${SUPABASE_TABLE}?on_conflict=email`,
    {
      method: "POST",
      headers: {
        ...buildSupabaseHeaders(supabase),
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(record),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      await readResponseError(response, "Failed to persist waitlist record."),
    );
  }
}

async function updateWaitlistNotificationState(
  supabase: SupabaseConfig,
  email: string,
  state: Pick<
    WaitlistRecord,
    "notification_status" | "notification_error" | "notification_email_id" | "notified_at"
  >,
) {
  const response = await fetch(
    `${supabase.url}/rest/v1/${SUPABASE_TABLE}?email=eq.${encodeFilterValue(email)}`,
    {
      method: "PATCH",
      headers: {
        ...buildSupabaseHeaders(supabase),
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(state),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      await readResponseError(
        response,
        "Failed to update waitlist notification state.",
      ),
    );
  }
}

async function sendWaitlistNotification(
  resend: ResendConfig,
  submission: WaitlistSubmission,
  requestContext: WaitlistRequestContext,
  submissionCount: number,
): Promise<string | null> {
  const response = await fetch(RESEND_EMAILS_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resend.apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": buildResendIdempotencyKey(submission),
    },
    body: JSON.stringify({
      from: resend.notificationFrom,
      to: resend.notificationTo,
      subject: `New waitlist signup: ${submission.email}`,
      html: buildNotificationHtml(submission, requestContext, submissionCount),
      text: buildNotificationText(submission, requestContext, submissionCount),
      reply_to: resend.notificationReplyTo,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      await readResponseError(response, "Failed to send Resend waitlist notification."),
    );
  }

  const data = (await response.json()) as { id?: string };
  return data.id ?? null;
}

function buildResendIdempotencyKey(submission: WaitlistSubmission) {
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        email: submission.email,
        companyUrl: submission.companyUrl,
        growthChallenge: submission.growthChallenge,
        metadata: submission.metadata,
      }),
    )
    .digest("hex");

  return `waitlist-signup/${fingerprint}`;
}

function buildNotificationHtml(
  submission: WaitlistSubmission,
  requestContext: WaitlistRequestContext,
  submissionCount: number,
) {
  const rows = [
    ["Email", submission.email],
    ["Company URL", submission.companyUrl],
    ["Growth Challenge", submission.growthChallenge],
    ["Source", submission.metadata.source],
    ["Landing Page", submission.metadata.landingPage],
    ["UTM Source", submission.metadata.utmSource || "(none)"],
    ["UTM Medium", submission.metadata.utmMedium || "(none)"],
    ["UTM Campaign", submission.metadata.utmCampaign || "(none)"],
    ["Referrer", submission.metadata.referrer || "(none)"],
    ["Submitted At", submission.metadata.createdAt],
    ["Submission Count", String(submissionCount)],
    ["User Agent", requestContext.userAgent || "(none)"],
    ["IP Present", requestContext.ipAddress ? "yes" : "no"],
  ];

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
      <h1 style="font-size: 20px; margin-bottom: 16px;">New Reframe waitlist signup</h1>
      <table style="border-collapse: collapse; width: 100%;">
        <tbody>
          ${rows
            .map(
              ([label, value]) => `
                <tr>
                  <td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-weight: 600; vertical-align: top;">${escapeHtml(label)}</td>
                  <td style="padding: 8px 12px; border: 1px solid #e5e7eb; white-space: pre-wrap;">${escapeHtml(value)}</td>
                </tr>`,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `.trim();
}

function buildNotificationText(
  submission: WaitlistSubmission,
  requestContext: WaitlistRequestContext,
  submissionCount: number,
) {
  return [
    "New Reframe waitlist signup",
    `Email: ${submission.email}`,
    `Company URL: ${submission.companyUrl}`,
    `Growth Challenge: ${submission.growthChallenge}`,
    `Source: ${submission.metadata.source}`,
    `Landing Page: ${submission.metadata.landingPage}`,
    `UTM Source: ${submission.metadata.utmSource || "(none)"}`,
    `UTM Medium: ${submission.metadata.utmMedium || "(none)"}`,
    `UTM Campaign: ${submission.metadata.utmCampaign || "(none)"}`,
    `Referrer: ${submission.metadata.referrer || "(none)"}`,
    `Submitted At: ${submission.metadata.createdAt}`,
    `Submission Count: ${submissionCount}`,
    `User Agent: ${requestContext.userAgent || "(none)"}`,
    `IP Present: ${requestContext.ipAddress ? "yes" : "no"}`,
  ].join("\n");
}

function buildSupabaseHeaders(supabase: SupabaseConfig) {
  return {
    apikey: supabase.serviceRoleKey,
    Authorization: `Bearer ${supabase.serviceRoleKey}`,
  };
}

async function readResponseError(response: Response, fallback: string) {
  const text = truncate(await response.text(), 1_000);
  return text || fallback;
}

function encodeFilterValue(value: string) {
  return encodeURIComponent(value);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}
