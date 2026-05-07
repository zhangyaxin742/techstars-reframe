export type ClaimRpcRow = {
  workspace_slug: string;
  project_slug: string;
  reused_existing_project: boolean;
};

export function readClaimRpcRow(data: unknown): ClaimRpcRow | null {
  const row = Array.isArray(data) ? data[0] : data;

  if (!row || typeof row !== "object") {
    return null;
  }

  const candidate = row as Record<string, unknown>;
  if (
    typeof candidate.workspace_slug !== "string" ||
    typeof candidate.project_slug !== "string"
  ) {
    return null;
  }

  return {
    workspace_slug: candidate.workspace_slug,
    project_slug: candidate.project_slug,
    reused_existing_project: candidate.reused_existing_project === true,
  };
}

export function buildClaimRedirect(claim: ClaimRpcRow) {
  return `/app/${claim.workspace_slug}/projects/${claim.project_slug}`;
}
