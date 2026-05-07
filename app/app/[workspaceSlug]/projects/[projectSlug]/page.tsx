import { notFound, redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AppWorkspace } from "@/src/reframe-mvp/AppWorkspace";

interface AppProjectPageProps {
  params: Promise<{
    workspaceSlug: string;
    projectSlug: string;
  }>;
}

export default async function AppProjectPage({ params }: AppProjectPageProps) {
  const { workspaceSlug, projectSlug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId =
    typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : "";

  if (claimsError || !userId) {
    redirect("/account");
  }

  const { data: membership } = await supabase
    .from("workspace_memberships")
    .select("workspace_id,workspaces!inner(id,slug)")
    .eq("user_id", userId)
    .eq("workspaces.slug", workspaceSlug)
    .maybeSingle();

  if (!membership) {
    notFound();
  }

  return <AppWorkspace workspaceSlug={workspaceSlug} projectSlug={projectSlug} />;
}
