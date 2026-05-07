import { AccountPageClient } from "@/components/account/account-page-client";

type AccountPageProps = {
  searchParams: Promise<{
    invite?: string;
  }>;
};

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const params = await searchParams;

  return <AccountPageClient initialInviteToken={params.invite ?? ""} />;
}
