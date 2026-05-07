import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const PILOT_PROJECT_SLUG = "campaign-demo";

type ProfileRow = {
  active_workspace_id: string | null;
};

type MembershipRow = {
  workspace_id: string;
  workspaces?:
    | {
        id: string;
        slug: string;
      }
    | {
        id: string;
        slug: string;
      }[]
    | null;
};

type NormalizedMembershipRow = {
  workspace_id: string;
  workspaces: {
    id: string;
    slug: string;
  } | null;
};

export default async function AppIndexPage() {
  const supabase = await createSupabaseServerClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId =
    typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : "";

  if (claimsError || !userId) {
    redirect("/account");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_workspace_id")
    .eq("id", userId)
    .maybeSingle();

  const { data: memberships } = await supabase
    .from("workspace_memberships")
    .select("workspace_id,workspaces(id,slug)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  const profileRow = (profile ?? null) as ProfileRow | null;
  const membershipRows: NormalizedMembershipRow[] = (
    (memberships ?? []) as MembershipRow[]
  ).map(
    normalizeMembershipRow,
  );
  const activeMembership =
    membershipRows.find(
      (membership) =>
        membership.workspace_id === profileRow?.active_workspace_id,
    ) ??
    membershipRows[0] ??
    null;
  const workspaceSlug = activeMembership?.workspaces?.slug;

  if (!workspaceSlug) {
    redirect("/account");
  }

  redirect(`/app/${workspaceSlug}/projects/${PILOT_PROJECT_SLUG}`);
}

function normalizeMembershipRow(row: MembershipRow): NormalizedMembershipRow {
  return {
    workspace_id: row.workspace_id,
    workspaces: Array.isArray(row.workspaces)
      ? row.workspaces[0] ?? null
      : row.workspaces ?? null,
  };
}
