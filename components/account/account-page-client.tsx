"use client";

import {
  ArrowSquareOut,
  Check,
  EnvelopeSimple,
  SignOut,
  UserCircle,
  UsersThree,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import type {
  AccountPayload,
  AccountWorkspace,
} from "@/lib/reframe/account/types";

type AccountPageClientProps = {
  initialInviteToken: string;
};

type ApiError = {
  error?: {
    message?: string;
    fields?: Record<string, string>;
  };
};

export function AccountPageClient({
  initialInviteToken,
}: AccountPageClientProps) {
  const [csrfToken, setCsrfToken] = useState("");
  const [account, setAccount] = useState<AccountPayload | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(true);
  const [authEmail, setAuthEmail] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [authStep, setAuthStep] = useState<"email" | "code">("email");
  const [displayName, setDisplayName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const canManageInvites = Boolean(account?.pendingInvites);
  const inviteMode = Boolean(initialInviteToken);

  useEffect(() => {
    let mounted = true;

    async function boot() {
      const token = await fetchCsrfToken();
      if (mounted) {
        setCsrfToken(token);
      }
      const nextAccount = await fetchAccount();
      if (mounted) {
        setAccount(nextAccount);
        setDisplayName(nextAccount?.profile.displayName ?? "");
        setLoadingAccount(false);
      }
    }

    void boot();

    return () => {
      mounted = false;
    };
  }, []);

  const activeWorkspace = account?.activeWorkspace ?? null;
  const sortedMemberships = useMemo(
    () => account?.memberships ?? [],
    [account?.memberships],
  );

  async function reloadAccount() {
    setLoadingAccount(true);
    const nextAccount = await fetchAccount();
    setAccount(nextAccount);
    setDisplayName(nextAccount?.profile.displayName ?? "");
    setLoadingAccount(false);
  }

  async function startOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!csrfToken || !authEmail.trim()) {
      return;
    }

    setBusy("auth");
    setMessage("");

    try {
      await requestJson("/api/reframe/auth/otp/start", {
        csrfToken,
        body: {
          email: authEmail,
          mode: inviteMode ? "invite_accept" : "public_account",
          ...(inviteMode ? { inviteToken: initialInviteToken } : {}),
          returnTo: "/account",
        },
      });
      setAuthStep("code");
      setMessage("Check your email for the six-digit code.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send code.");
    } finally {
      setBusy(null);
    }
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!csrfToken || !authEmail.trim() || otpToken.length !== 6) {
      return;
    }

    setBusy("auth");
    setMessage("");

    try {
      await requestJson("/api/reframe/auth/verify", {
        csrfToken,
        body: {
          email: authEmail,
          token: otpToken,
          returnTo: "/account",
        },
      });

      if (inviteMode) {
        await requestJson("/api/reframe/account/invites/accept", {
          csrfToken,
          body: {
            token: initialInviteToken,
          },
        });
      }

      setAuthStep("email");
      setOtpToken("");
      setMessage(inviteMode ? "Invite accepted." : "Signed in.");
      await reloadAccount();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not verify code.");
    } finally {
      setBusy(null);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!csrfToken) {
      return;
    }

    setBusy("profile");
    setMessage("");

    try {
      await requestJson("/api/reframe/account/profile", {
        csrfToken,
        method: "PATCH",
        body: {
          displayName,
        },
      });
      setMessage("Profile updated.");
      await reloadAccount();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update profile.");
    } finally {
      setBusy(null);
    }
  }

  async function switchWorkspace(workspace: AccountWorkspace) {
    if (!csrfToken || workspace.id === activeWorkspace?.id) {
      return;
    }

    setBusy(`workspace:${workspace.id}`);
    setMessage("");

    try {
      await requestJson("/api/reframe/account/workspaces/active", {
        csrfToken,
        method: "PATCH",
        body: {
          workspaceId: workspace.id,
        },
      });
      await reloadAccount();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not switch workspace.");
    } finally {
      setBusy(null);
    }
  }

  async function createWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!csrfToken) {
      return;
    }

    setBusy("workspace-create");
    setMessage("");

    try {
      await requestJson("/api/reframe/account/workspaces", {
        csrfToken,
        body: {
          name: workspaceName || undefined,
        },
      });
      setWorkspaceName("");
      setMessage("Workspace created.");
      await reloadAccount();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create workspace.");
    } finally {
      setBusy(null);
    }
  }

  async function inviteMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!csrfToken || !activeWorkspace || !inviteEmail.trim()) {
      return;
    }

    setBusy("invite");
    setMessage("");

    try {
      await requestJson(
        `/api/reframe/account/workspaces/${activeWorkspace.id}/invites`,
        {
          csrfToken,
          body: {
            email: inviteEmail,
            role: inviteRole,
          },
        },
      );
      setInviteEmail("");
      setInviteRole("member");
      setMessage("Invite created.");
      await reloadAccount();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create invite.");
    } finally {
      setBusy(null);
    }
  }

  async function revokeInvite(inviteId: string) {
    if (!csrfToken || !activeWorkspace) {
      return;
    }

    setBusy(`invite:${inviteId}`);
    setMessage("");

    try {
      await requestJson(
        `/api/reframe/account/workspaces/${activeWorkspace.id}/invites/${inviteId}`,
        {
          csrfToken,
          method: "DELETE",
          body: {},
        },
      );
      setMessage("Invite revoked.");
      await reloadAccount();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not revoke invite.");
    } finally {
      setBusy(null);
    }
  }

  async function signOut() {
    if (!csrfToken) {
      return;
    }

    setBusy("sign-out");
    setMessage("");

    try {
      await requestJson("/api/reframe/auth/sign-out", {
        csrfToken,
        body: {},
      });
      setAccount(null);
      setAuthStep("email");
      setOtpToken("");
      setMessage("Signed out.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not sign out.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <header className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <a className="font-display text-3xl text-foreground" href="/">
              reframe.
            </a>
            <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
              Account and workspace access for Reframe.
            </p>
          </div>
          {account ? (
            <div className="flex flex-wrap gap-2">
              {activeWorkspace ? (
                <a
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90"
                  href="/app"
                >
                  <ArrowSquareOut size={16} />
                  Open workspace
                </a>
              ) : null}
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-50"
                disabled={busy === "sign-out"}
                onClick={signOut}
                type="button"
              >
                <SignOut size={16} />
                Sign out
              </button>
            </div>
          ) : null}
        </header>

        {message ? (
          <div className="rounded-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            {message}
          </div>
        ) : null}

        {loadingAccount ? (
          <div className="rounded-md border border-border bg-card p-5 text-sm text-muted-foreground">
            Loading account.
          </div>
        ) : account ? (
          <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
            <section className="space-y-5">
              <Panel
                icon={<UserCircle size={18} />}
                title="Profile"
                value={account.profile.email}
              >
                <form className="mt-4 flex flex-col gap-3" onSubmit={saveProfile}>
                  <label className="text-xs font-medium uppercase text-muted-foreground">
                    Display name
                  </label>
                  <input
                    className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-accent"
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="Your name"
                    value={displayName}
                  />
                  <button
                    className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
                    disabled={busy === "profile"}
                    type="submit"
                  >
                    <Check size={16} />
                    Save
                  </button>
                </form>
              </Panel>

              <Panel
                icon={<UsersThree size={18} />}
                title="Members"
                value={activeWorkspace?.name ?? "No active workspace"}
              >
                <div className="mt-4 divide-y divide-border">
                  {account.members.map((member) => (
                    <div
                      className="flex items-center justify-between gap-3 py-3"
                      key={member.userId}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {member.displayName || "Unnamed member"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {member.email ?? "Workspace member"}
                        </p>
                      </div>
                      <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                        {member.role}
                      </span>
                    </div>
                  ))}
                </div>
              </Panel>

              {canManageInvites && activeWorkspace ? (
                <Panel icon={<EnvelopeSimple size={18} />} title="Invites">
                  <form className="mt-4 grid gap-3 sm:grid-cols-[1fr_120px_auto]" onSubmit={inviteMember}>
                    <input
                      className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-accent"
                      onChange={(event) => setInviteEmail(event.target.value)}
                      placeholder="teammate@example.com"
                      type="email"
                      value={inviteEmail}
                    />
                    <select
                      className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-accent"
                      onChange={(event) =>
                        setInviteRole(event.target.value as "member" | "admin")
                      }
                      value={inviteRole}
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
                      disabled={busy === "invite"}
                      type="submit"
                    >
                      Invite
                    </button>
                  </form>
                  <div className="mt-4 divide-y divide-border">
                    {(account.pendingInvites ?? []).map((invite) => (
                      <div
                        className="flex items-center justify-between gap-3 py-3"
                        key={invite.id}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {invite.email}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {invite.role} - {invite.deliveryStatus ?? "pending"}
                          </p>
                        </div>
                        <button
                          className="h-9 rounded-md border border-border px-3 text-xs font-medium hover:bg-secondary disabled:opacity-50"
                          disabled={busy === `invite:${invite.id}`}
                          onClick={() => revokeInvite(invite.id)}
                          type="button"
                        >
                          Revoke
                        </button>
                      </div>
                    ))}
                  </div>
                </Panel>
              ) : null}
            </section>

            <aside className="space-y-5">
              <Panel title="Workspaces" value={activeWorkspace?.role ?? ""}>
                <div className="mt-4 space-y-2">
                  {sortedMemberships.map((workspace) => (
                    <button
                      className="flex w-full items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-3 text-left text-sm hover:bg-secondary disabled:opacity-60"
                      disabled={busy === `workspace:${workspace.id}`}
                      key={workspace.id}
                      onClick={() => switchWorkspace(workspace)}
                      type="button"
                    >
                      <span className="min-w-0 truncate font-medium">
                        {workspace.name}
                      </span>
                      {workspace.id === activeWorkspace?.id ? (
                        <Check size={16} className="text-accent" />
                      ) : null}
                    </button>
                  ))}
                </div>
                <form className="mt-4 flex gap-2" onSubmit={createWorkspace}>
                  <input
                    className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-accent"
                    onChange={(event) => setWorkspaceName(event.target.value)}
                    placeholder="New workspace"
                    value={workspaceName}
                  />
                  <button
                    className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
                    disabled={busy === "workspace-create"}
                    type="submit"
                  >
                    Add
                  </button>
                </form>
              </Panel>
            </aside>
          </div>
        ) : (
          <AuthPanel
            authEmail={authEmail}
            authStep={authStep}
            busy={busy === "auth"}
            inviteMode={inviteMode}
            onEmailChange={setAuthEmail}
            onOtpChange={setOtpToken}
            onStart={startOtp}
            onVerify={verifyOtp}
            otpToken={otpToken}
          />
        )}
      </div>
    </main>
  );
}

function AuthPanel(props: {
  authEmail: string;
  authStep: "email" | "code";
  busy: boolean;
  inviteMode: boolean;
  onEmailChange: (value: string) => void;
  onOtpChange: (value: string) => void;
  onStart: (event: FormEvent<HTMLFormElement>) => void;
  onVerify: (event: FormEvent<HTMLFormElement>) => void;
  otpToken: string;
}) {
  return (
    <section className="mx-auto w-full max-w-md rounded-md border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="flex size-10 items-center justify-center rounded-md bg-secondary text-accent">
          <EnvelopeSimple size={20} />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {props.inviteMode ? "Accept workspace invite" : "Sign in to Reframe"}
          </h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Use the email tied to this workspace.
          </p>
        </div>
      </div>

      {props.authStep === "email" ? (
        <form className="mt-5 space-y-3" onSubmit={props.onStart}>
          <input
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-accent"
            onChange={(event) => props.onEmailChange(event.target.value)}
            placeholder="founder@example.com"
            type="email"
            value={props.authEmail}
          />
          <button
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
            disabled={props.busy}
            type="submit"
          >
            <EnvelopeSimple size={16} />
            Email code
          </button>
        </form>
      ) : (
        <form className="mt-5 space-y-3" onSubmit={props.onVerify}>
          <input
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm tabular-nums tracking-tight outline-none focus:border-accent"
            inputMode="numeric"
            maxLength={6}
            onChange={(event) =>
              props.onOtpChange(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="123456"
            value={props.otpToken}
          />
          <button
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
            disabled={props.busy || props.otpToken.length !== 6}
            type="submit"
          >
            <Check size={16} />
            Continue
          </button>
        </form>
      )}
    </section>
  );
}

function Panel(props: {
  children?: ReactNode;
  icon?: ReactNode;
  title: string;
  value?: string;
}) {
  return (
    <section className="rounded-md border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          {props.icon ? (
            <span className="flex size-8 items-center justify-center rounded-md bg-secondary text-accent">
              {props.icon}
            </span>
          ) : null}
          <span>{props.title}</span>
        </div>
        {props.value ? (
          <span className="truncate text-xs font-medium text-muted-foreground">
            {props.value}
          </span>
        ) : null}
      </div>
      {props.children}
    </section>
  );
}

async function fetchCsrfToken() {
  const response = await fetch("/api/reframe/security/csrf", {
    cache: "no-store",
  });
  if (!response.ok) {
    return "";
  }

  const body = (await response.json()) as { csrfToken?: string };
  return body.csrfToken ?? "";
}

async function fetchAccount() {
  const response = await fetch("/api/reframe/account", {
    cache: "no-store",
  });
  if (!response.ok) {
    return null;
  }

  const body = (await response.json()) as { account?: AccountPayload };
  return body.account ?? null;
}

async function requestJson(
  url: string,
  input: {
    csrfToken: string;
    body: Record<string, unknown>;
    method?: string;
  },
) {
  const response = await fetch(url, {
    method: input.method ?? "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Reframe-CSRF": input.csrfToken,
    },
    body: JSON.stringify(input.body),
  });
  const body = (await response.json().catch(() => ({}))) as ApiError;

  if (!response.ok || (body as { ok?: boolean }).ok === false) {
    throw new Error(body.error?.message ?? "Request failed.");
  }

  return body;
}
