import {
  createWorkspaceInviteToken,
  hashWorkspaceInviteToken,
  isValidWorkspaceInviteToken,
} from "./tokens";

const SECRET = "workspace_invite_secret_32_characters";

describe("workspace invite tokens", () => {
  it("creates raw bearer tokens and stores deterministic hashes only", () => {
    const token = createWorkspaceInviteToken();
    const hash = hashWorkspaceInviteToken(token, SECRET);

    expect(isValidWorkspaceInviteToken(token)).toBe(true);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain(token);
    expect(hashWorkspaceInviteToken(token, SECRET)).toBe(hash);
  });

  it("rejects malformed invite tokens", () => {
    expect(isValidWorkspaceInviteToken(null)).toBe(false);
    expect(isValidWorkspaceInviteToken("short")).toBe(false);
    expect(isValidWorkspaceInviteToken("not valid with spaces")).toBe(false);
  });
});
