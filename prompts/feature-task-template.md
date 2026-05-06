# Codex Feature Task Prompt

Use this prompt when asking Codex to build a feature that needs technical research first.

```text
$technical-research-before-code

Goal: Build <FEATURE>.

Context:
- Product/user problem: <WHY THIS MATTERS>
- Current stack: inspect the repo; do not assume.
- Relevant files if known: <PATHS OR “unknown, inspect repo”>
- Constraints: production-ready MVP, minimal changes, no broad rewrites, no unnecessary dependencies, no secrets in client code.

Research requirements before code:
- Inspect the repo and existing patterns first.
- Use current internet research and official docs for any API, SDK, webhook, pricing, rate-limit, platform, or security assumption.
- Compare incumbent/industry-standard approaches.
- Determine what is actually shippable for an MVP.
- Estimate operational costs/limits where relevant.
- Identify risks, non-goals, and validation plan.

Output requirement:
- Before writing production code, create a Markdown report at docs/technical-research/YYYY-MM-DD-<feature-slug>.md using the skill template.
- BLUF first.
- Cite sources with access dates in the report.
- Mark unverified assumptions explicitly.

Implementation rule:
- After the report, implement only the smallest production-ready MVP path.
- If the report finds a blocking risk or ambiguous architecture fork, stop after the report and ask for approval.

Done when:
- Report exists.
- Implementation matches the report.
- Relevant tests/type checks/lint/build are run, or failures are explained.
- Final response includes changed files, validation results, and remaining risks.
```
