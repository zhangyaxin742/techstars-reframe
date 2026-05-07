import { AppWorkspace } from "@/src/reframe-mvp/AppWorkspace";

interface AppProjectPageProps {
  params: Promise<{
    workspaceSlug: string;
    projectSlug: string;
  }>;
}

export default async function AppProjectPage({ params }: AppProjectPageProps) {
  const { workspaceSlug, projectSlug } = await params;

  return <AppWorkspace workspaceSlug={workspaceSlug} projectSlug={projectSlug} />;
}
