import {
  buildSupabaseAdminHeaders,
  readSupabaseAdminConfig,
} from "@/lib/supabase/admin";

import type { IntakeDraftFields, IntakeSourceReference } from "./validation";

type IntakeDraftMetadataRow = {
  id: string;
  status:
    | "draft"
    | "auth_required"
    | "verification_pending"
    | "claimed"
    | "expired";
  expires_at: string;
};

type IntakeDraftSafeRow = IntakeDraftMetadataRow & {
  business_url: string | null;
  product_url: string | null;
  campaign_goal: string;
  founder_note: string;
  source_references: IntakeSourceReference[];
};

type IntakeDraftWriteRow = {
  token_hash: string;
  status: "draft";
  business_url: string | null;
  product_url: string | null;
  campaign_goal: string;
  founder_note: string;
  source_references: IntakeSourceReference[];
  expires_at: string;
};

export type SafeIntakeDraft = {
  status: "draft" | "auth_required" | "verification_pending";
  businessUrl: string | null;
  productUrl: string | null;
  campaignGoal: string;
  founderNote: string;
  sourceReferences: IntakeSourceReference[];
  expiresAt: string;
};

export type SaveIntakeDraftResult =
  | {
      ok: true;
      state: "draft_saved";
      expiresAt: string;
    }
  | {
      ok: false;
      state: "expired" | "claimed";
      expiresAt?: string;
    };

export type RestoreIntakeDraftResult =
  | {
      ok: true;
      state: SafeIntakeDraft["status"];
      draft: SafeIntakeDraft;
    }
  | {
      ok: false;
      state: "missing" | "expired" | "claimed";
      expiresAt?: string;
    };

const TABLE = "intake_drafts";
const SAFE_SELECT =
  "status,business_url,product_url,campaign_goal,founder_note,source_references,expires_at";

export async function saveIntakeDraft(input: {
  tokenHash: string;
  fields: IntakeDraftFields;
  now?: Date;
}): Promise<SaveIntakeDraftResult> {
  const now = input.now ?? new Date();
  const existing = await getDraftMetadata(input.tokenHash);

  if (
    existing &&
    (existing.status === "expired" ||
      new Date(existing.expires_at).getTime() <= now.getTime())
  ) {
    await markIntakeDraftExpired(input.tokenHash);
    return {
      ok: false,
      state: "expired",
      expiresAt: existing.expires_at,
    };
  }

  if (existing?.status === "claimed") {
    return {
      ok: false,
      state: "claimed",
      expiresAt: existing.expires_at,
    };
  }

  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1_000).toISOString();
  const row: IntakeDraftWriteRow = {
    token_hash: input.tokenHash,
    status: "draft",
    business_url: input.fields.businessUrl,
    product_url: input.fields.productUrl,
    campaign_goal: input.fields.campaignGoal,
    founder_note: input.fields.founderNote,
    source_references: input.fields.sourceReferences,
    expires_at: expiresAt,
  };

  const rows = existing
    ? await patchDraft(input.tokenHash, row)
    : await insertDraft(row);
  const saved = rows[0];

  return {
    ok: true,
    state: "draft_saved",
    expiresAt: saved?.expires_at ?? expiresAt,
  };
}

export async function restoreIntakeDraft(input: {
  tokenHash: string;
  now?: Date;
}): Promise<RestoreIntakeDraftResult> {
  const now = input.now ?? new Date();
  const rows = await fetchRows<IntakeDraftSafeRow>(
    `${TABLE}?select=${SAFE_SELECT}&token_hash=eq.${encodeFilterValue(input.tokenHash)}&limit=1`,
  );
  const draft = rows[0];

  if (!draft) {
    return {
      ok: false,
      state: "missing",
    };
  }

  if (
    draft.status === "expired" ||
    new Date(draft.expires_at).getTime() <= now.getTime()
  ) {
    await markIntakeDraftExpired(input.tokenHash);
    return {
      ok: false,
      state: "expired",
      expiresAt: draft.expires_at,
    };
  }

  if (draft.status === "claimed") {
    return {
      ok: false,
      state: "claimed",
      expiresAt: draft.expires_at,
    };
  }

  return {
    ok: true,
    state: draft.status,
    draft: {
      status: draft.status,
      businessUrl: draft.business_url,
      productUrl: draft.product_url,
      campaignGoal: draft.campaign_goal,
      founderNote: draft.founder_note,
      sourceReferences: draft.source_references,
      expiresAt: draft.expires_at,
    },
  };
}

export async function markIntakeDraftExpired(tokenHash: string) {
  await fetchRows(
    `${TABLE}?token_hash=eq.${encodeFilterValue(tokenHash)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        status: "expired",
      }),
    },
    false,
  );
}

export async function markIntakeDraftVerificationPending(input: {
  tokenHash: string;
  emailHash: string;
}) {
  await fetchRows(
    `${TABLE}?token_hash=eq.${encodeFilterValue(input.tokenHash)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        status: "verification_pending",
        email_hash: input.emailHash,
      }),
    },
    false,
  );
}

async function getDraftMetadata(tokenHash: string) {
  const rows = await fetchRows<IntakeDraftMetadataRow>(
    `${TABLE}?select=id,status,expires_at&token_hash=eq.${encodeFilterValue(tokenHash)}&limit=1`,
  );

  return rows[0] ?? null;
}

async function insertDraft(row: IntakeDraftWriteRow) {
  return fetchRows<IntakeDraftMetadataRow>(TABLE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(row),
  });
}

async function patchDraft(tokenHash: string, row: IntakeDraftWriteRow) {
  return fetchRows<IntakeDraftMetadataRow>(
    `${TABLE}?token_hash=eq.${encodeFilterValue(tokenHash)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(row),
    },
  );
}

async function fetchRows<T>(
  path: string,
  init: RequestInit = {},
  expectsJson = true,
): Promise<T[]> {
  const supabase = readSupabaseAdminConfig();
  const response = await fetch(`${supabase.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      ...buildSupabaseAdminHeaders(supabase),
      ...init.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await readResponseError(response));
  }

  if (!expectsJson) {
    return [];
  }

  return (await response.json()) as T[];
}

async function readResponseError(response: Response) {
  const text = await response.text();
  return text || `Supabase intake draft request failed with ${response.status}.`;
}

function encodeFilterValue(value: string) {
  return encodeURIComponent(value);
}
