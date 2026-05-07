export const INTAKE_DRAFT_MAX_PAYLOAD_BYTES = 12_000;

export type IntakeSourceReference = {
  label?: string;
  url?: string;
  note?: string;
};

export type IntakeDraftFields = {
  businessUrl: string | null;
  productUrl: string | null;
  campaignGoal: string;
  founderNote: string;
  sourceReferences: IntakeSourceReference[];
};

export type IntakeValidationResult =
  | { ok: true; fields: IntakeDraftFields }
  | {
      ok: false;
      status: 400 | 413;
      errors: Record<string, string>;
    };

export function parseIntakeDraftPayload(rawBody: string): IntakeValidationResult {
  if (Buffer.byteLength(rawBody, "utf8") > INTAKE_DRAFT_MAX_PAYLOAD_BYTES) {
    return {
      ok: false,
      status: 413,
      errors: {
        body: "Intake payload is too large.",
      },
    };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return {
      ok: false,
      status: 400,
      errors: {
        body: "Request body must be valid JSON.",
      },
    };
  }

  return validateIntakeDraftPayload(payload);
}

export function validateIntakeDraftPayload(
  payload: unknown,
): IntakeValidationResult {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {
      ok: false,
      status: 400,
      errors: {
        body: "Request body must be a JSON object.",
      },
    };
  }

  const input = payload as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const businessUrl = normalizeOptionalUrl(input.businessUrl, "businessUrl", errors);
  const productUrl = normalizeOptionalUrl(input.productUrl, "productUrl", errors);
  const campaignGoal = normalizeRequiredText(
    input.campaignGoal,
    "campaignGoal",
    240,
    errors,
  );
  const founderNote = normalizeOptionalText(
    input.founderNote,
    "founderNote",
    4_000,
    errors,
  );
  const sourceReferences = normalizeSourceReferences(
    input.sourceReferences,
    errors,
  );

  if (
    campaignGoal &&
    !businessUrl &&
    !productUrl &&
    !founderNote &&
    sourceReferences.length === 0
  ) {
    errors.context = "Add at least one source reference or founder note.";
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      status: 400,
      errors,
    };
  }

  return {
    ok: true,
    fields: {
      businessUrl,
      productUrl,
      campaignGoal,
      founderNote,
      sourceReferences,
    },
  };
}

function normalizeOptionalUrl(
  value: unknown,
  field: string,
  errors: Record<string, string>,
) {
  if (value == null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    errors[field] = "Enter a valid URL or remove this source.";
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.length > 2048) {
    errors[field] = "URL is too long.";
    return null;
  }

  try {
    const url = new URL(hasProtocol(trimmed) ? trimmed : `https://${trimmed}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      errors[field] = "Only http and https URLs are supported.";
      return null;
    }

    url.hash = "";
    return url.toString();
  } catch {
    errors[field] = "Enter a valid URL or remove this source.";
    return null;
  }
}

function normalizeRequiredText(
  value: unknown,
  field: string,
  maxLength: number,
  errors: Record<string, string>,
) {
  if (typeof value !== "string") {
    errors[field] = "This field is required.";
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    errors[field] = "This field is required.";
    return "";
  }

  if (trimmed.length > maxLength) {
    errors[field] = `Keep this field under ${maxLength} characters.`;
    return "";
  }

  return trimmed;
}

function normalizeOptionalText(
  value: unknown,
  field: string,
  maxLength: number,
  errors: Record<string, string>,
) {
  if (value == null) {
    return "";
  }

  if (typeof value !== "string") {
    errors[field] = "Enter text or leave this field blank.";
    return "";
  }

  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    errors[field] = `Keep this field under ${maxLength} characters.`;
    return "";
  }

  return trimmed;
}

function normalizeSourceReferences(
  value: unknown,
  errors: Record<string, string>,
): IntakeSourceReference[] {
  if (value == null) {
    return [];
  }

  if (!Array.isArray(value)) {
    errors.sourceReferences = "Source references must be a list.";
    return [];
  }

  if (value.length > 5) {
    errors.sourceReferences = "Add no more than five source references.";
    return [];
  }

  const references: IntakeSourceReference[] = [];

  value.forEach((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      errors[`sourceReferences.${index}`] = "Source reference must be an object.";
      return;
    }

    const source = entry as Record<string, unknown>;
    const label = normalizeSourceText(source.label, 80);
    const note = normalizeSourceText(source.note, 500);
    const url = normalizeOptionalUrl(
      source.url,
      `sourceReferences.${index}.url`,
      errors,
    );

    if (!label && !note && !url) {
      errors[`sourceReferences.${index}`] =
        "Source reference needs a URL, label, or note.";
      return;
    }

    references.push({
      ...(label ? { label } : {}),
      ...(url ? { url } : {}),
      ...(note ? { note } : {}),
    });
  });

  return references;
}

function normalizeSourceText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

function hasProtocol(value: string) {
  return /^[a-z][a-z\d+.-]*:\/\//i.test(value);
}
