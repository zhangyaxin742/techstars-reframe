import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("IntakeVerifyForm source contract", () => {
  it("uses email OTP verification with CSRF and no password field", () => {
    const source = readFileSync(
      join(process.cwd(), "components", "intake", "intake-verify-form.tsx"),
      "utf8",
    );

    expect(source).toContain("/api/reframe/security/csrf");
    expect(source).toContain("/api/reframe/auth/verify");
    expect(source).toContain('"X-Reframe-CSRF": csrfToken');
    expect(source).toContain('type="email"');
    expect(source).toContain('autoComplete="one-time-code"');
    expect(source).not.toContain('type="password"');
    expect(source).not.toMatch(/password reset/i);
  });
});
