import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("IntakeForm source contract", () => {
  it("saves drafts, attempts claim, starts OTP, and excludes password/upload controls", () => {
    const source = readFileSync(
      join(process.cwd(), "components", "intake", "intake-form.tsx"),
      "utf8",
    );

    expect(source).toContain("/api/reframe/security/csrf");
    expect(source).toContain("/api/reframe/intake/drafts");
    expect(source).toContain("/api/reframe/intake/claim");
    expect(source).toContain("/api/reframe/intake/continue");
    expect(source).toContain('"X-Reframe-CSRF": csrfToken');
    expect(source).toContain("Save and open my workspace");
    expect(source).not.toContain('type="password"');
    expect(source).not.toContain('type="file"');
    expect(source).not.toMatch(/connect shopify|sync|upload files/i);
  });
});
