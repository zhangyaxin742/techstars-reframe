# Reframe MVP Cutdown

Date: 2026-05-06

Research mode: `technical-research-before-code`

Decision class: Research only. Do not build until this cutdown is accepted.

## 0. Top-Level Product And Backend Decision

Do not edit `/demo`. Treat it as a frozen seeded investor demo and visual reference. The MVP should be built on separate routes:

- `/intake`: the real intake loop for business context, campaign goal, founder note, optional URL references, and manual media upload.
- `/app/[workspaceSlug]/projects/[projectSlug]`: the real MVP workspace for extracted context, labeled assets, curated content recipes, editable storyboards, editorial memory, and export.
- `/account`: basic account, workspace, and member management for multiple users.

Implementation strategy: clone only the useful UI primitives and interaction patterns from `/demo` into the MVP surfaces, then implement the cuts in `/app`. Leave `/demo` intact so old demo behavior, seeded timing, fake publish, fake metrics, and visual walkthrough assets do not block real MVP work.

The backend is not a vague "AI backend." It is a small Next.js backend-for-frontend with seven boring responsibilities:

- Authenticate users and scope every project to a workspace through Supabase Auth, profiles, memberships, and RLS.
- Persist short-lived pre-auth intake drafts, then claim them into a verified user's workspace without forcing duplicate context entry.
- Persist project data in Supabase Postgres: intake sources, extracted context, media metadata, generated recipes, storyboard beats, editorial events, preferences, and exports.
- Store uploaded images/videos in private Supabase Storage buckets through server-created signed upload URLs.
- Call OpenAI server-side for structured extraction, media/frame labeling, recipe generation, beat regeneration, and preference inference.
- Serialize real export artifacts: Markdown brief, JSON package, CSV shot list, and copyable script.
- Enforce security boundaries: validate inputs, keep service keys server-only, limit file type/size, avoid logging private media/text, and scope every project to an owner/session.

For a public MVP with private media and multiple users, authentication and ownership are P0. Use Supabase Auth with server-side cookie sessions, public `profiles`, `workspaces`, and `workspace_memberships` tables, private storage buckets, and RLS. A session-scoped project token is only acceptable for a controlled demo or pilot, not for the multi-user product.

The backend is explicitly not:

- A separate microservice stack.
- A scraping service.
- A social publishing service.
- A Shopify app.
- A video rendering farm.
- A vector database/RAG platform.
- A general-purpose agent system.
- A queue-heavy workflow engine.

Industry-standard MVP rule: every server route should have a typed request/response contract, schema validation, explicit error states, server-only secrets, deterministic persistence, and focused tests with external providers mocked. Add background jobs only when a single synchronous request cannot safely finish the work, such as longer video frame extraction or future MP4 rendering.

### Accounts Management Research Addendum

Decision: add `/account` as a P0 path before real uploads, editorial memory, or multi-user projects go public. This is not a full admin console. It is the minimum account-management layer needed to keep private founder data, uploaded media, and workspace membership credible.

Use Supabase Auth because the backend already depends on Supabase and official Supabase Next.js guidance supports cookie-based SSR with `@supabase/ssr` [S21][S22]. Supabase Auth users live in the Auth schema; application-facing user data should live in a protected `public.profiles` table with RLS and a foreign key to `auth.users` [S25]. Supabase states that RLS should be enabled for exposed-schema tables and that policies can use `auth.uid()` for user-scoped access [S23]. Supabase Storage private buckets are RLS-protected and can use signed URLs for limited-time access [S24][S7]. Supabase supports admin email invites, but admin methods require the service role key and must run only on a trusted server [S28][S29].

P0 account scope:

- Sign up, sign in, sign out, and session refresh with Supabase Auth.
- `/account` page for profile basics: name, email display, avatar optional, sign out.
- One default workspace per new user.
- Workspace membership table with `owner`, `admin`, and `member` roles.
- Minimal owner/admin invite flow using a trusted server route.
- Project ownership through `workspace_id`, not loose user/session IDs.
- RLS policies on all MVP tables based on workspace membership.
- Private media bucket paths scoped by workspace and project.
- Basic member list and invite-by-email flow.

Do not build P0:

- Billing, plan enforcement, or seats.
- Enterprise SSO/SAML.
- Complex RBAC/custom JWT claims.
- Public team directory.
- Audit log UI.
- Super-admin dashboard.
- MFA as mandatory onboarding.

MFA is a P1 security setting, not a P0 blocker. Supabase supports MFA/TOTP and authenticator assurance levels, but requiring it in the first onboarding flow adds friction [S26]. Custom claims/RBAC hooks are credible later if role checks become performance-sensitive or cross-service, but P0 can use membership-table RLS directly [S27].

### Intake-To-Auth Handoff Research Addendum

Decision: the landing page should send founders to `/intake` before signup, but the product must not grant access to any workspace until identity is verified. The safe flow is: collect context, save a short-lived draft, authenticate or verify the user, claim the draft into a workspace, then redirect to `/app/[workspaceSlug]/projects/[projectSlug]`.

This is industry-standard because it separates low-risk lead capture from authenticated ownership. Supabase supports email/password signup with email confirmation; when confirmations are enabled, signup returns a user but no session until verification [S30]. Supabase email templates can include `{{ .Token }}` for a 6-digit OTP instead of relying only on a confirmation link [S31]. The OTP is verified through `verifyOtp`, which returns an authenticated session after a valid token is supplied [S32]. Existing users can sign in with password, and Supabase intentionally avoids distinguishing some account-existence cases in auth errors [S35]. OWASP recommends generic auth and registration responses to avoid account enumeration, including consistent messages and response behavior [S36].

Build the flow this way:

- Landing CTA routes to `/intake`, not `/account`.
- `/intake` collects business URL, product/store URL, campaign goal, founder note, and optional media references.
- On first save, the server creates `intake_drafts` with a random draft token, stores only a hash of that token, sets a `HttpOnly`, `Secure`, `SameSite=Lax` cookie, and expires the draft quickly, for example 24 hours.
- If a valid Supabase session already exists, the server claims the draft immediately into the user's active workspace, creates or updates a project, and redirects to `/app/[workspaceSlug]/projects/[projectSlug]`.
- If no session exists, ask for email on the intake completion step. The server may use a protected `email_hash` lookup against application profiles to decide whether the next UI should be sign in or sign up, but that lookup must require a valid draft token and rate limits. Do not expose a standalone "does this email exist?" endpoint.
- For a new user, call Supabase `signUp` with email/password and email confirmation enabled. Configure the confirmation template to show a code using `{{ .Token }}`. The user enters the code on `/intake/verify`.
- After `verifyOtp` succeeds and a session exists, create `profiles`, default `workspaces`, and `workspace_memberships` if missing, claim the draft idempotently, then redirect to the unique app project slug.
- For an existing user without a session, prompt sign in with password or email OTP, then use the same claim-and-redirect step.
- Do not put founder notes, media URLs, draft tokens, OTPs, or project IDs that imply ownership in query strings.
- Delay real media upload until after auth when possible. If pre-auth upload is required later, use draft-scoped temporary storage paths, strict MIME/size limits, expiration, and cleanup.

Product wording should be precise: "Continue to save this workspace" is safe. "We found your account" or "This email is not in our database" is not safe unless the user is already verified. The internal backend may decide whether to show signup or login UI after a protected draft flow, but the public API response should not be a reusable account-enumeration oracle. Supabase rate limits auth endpoints, but the app should still add per-IP and per-email throttling around intake completion and verification attempts [S34].

## 1. BLUF

The MVP is not a trend crawler, publisher, analytics tool, or video editor, and it is not an edit of the existing `/demo`. The MVP is a new landing-to-`/intake` workflow that captures real business context first, then authenticates through `/account` only when needed, claims the draft, and opens the founder's `/app/[workspaceSlug]/projects/[projectSlug]` workspace. Reframe extracts brand/founder/content context, generates founder-led content recipes, and learns visibly from edits, approvals, and rejections. The smallest credible build is a structured content planner with lightweight storyboard/timeline editing, deterministic edit actions, editorial memory, basic multi-user ownership, and boring exports. Cut everything that implies live platform integrations unless it is real or explicitly labeled simulated.

The wedge to protect:

> Reframe starts from the founder's real business context, generates founder-led content, and learns from the founder's edits.

## 2. What To Cut From The MVP Immediately

Do not remove these from `/demo`; leave that route intact. Remove, hide, or label these in the new `/intake` and `/app` MVP because they are credibility liabilities in a real product surface.

| Current feature or claim | Decision | Why |
| --- | --- | --- |
| "Searching the web" for trends | CUT | No live trend infrastructure exists, and real trend discovery is not needed to prove the wedge. |
| "Searching Instagram" / "Searching TikTok" | CUT | Platform APIs and scraping risk make this a bad P0. |
| "Searching YouTube Shorts" | REWORD | YouTube search is real via Data API, but it is not a broad trend oracle and has quota cost. |
| Website/social "reading" as if live | REWORD | Keep URL intake, but say "extracting from provided context" unless fetch/scrape is implemented. |
| Instagram/TikTok/YouTube/Shopify "syncing media" | CUT | Current demo uses seeded assets; sync implies OAuth/connectors that do not exist. |
| Google Drive/iCloud/camera roll connectors | CUT | Use manual upload first. Drive/iCloud are connector projects, not MVP proof. |
| Shopify connector/OAuth | CUT P0 | Full app install and OAuth is overkill. Use product/store URL or CSV/manual export instead. |
| "Live trends" and "trend scores" | REWORD | Replace with "curated content formats" and "context fit score." |
| Trend videos as if pulled live from platforms | DEMO-ONLY WITH LABEL | Seeded examples can stay as teaching assets if labeled "curated example." |
| "Clone trend" | REWORD | Say "adapt a content format to this business context." |
| AI missing-shot video generation | CUT P0 | Generating new credible video is unnecessary and risky. Keep "missing shot to film." |
| "Generate with AI" missing-shot button | REWORD | If no real media generation exists, rename to "Suggest missing shot" or "Use placeholder." |
| "Drag and drop or click to upload video" when it swaps a seeded asset | CUT OR IMPLEMENT | A fake upload affordance is misleading. Add a real file input or rename it "Use demo clip." |
| CapCut export | CUT P0 | Keep only if a real handoff package exists; otherwise this overclaims. |
| Adobe Premiere Pro export | CUT P0 | Same issue. |
| DaVinci Resolve export | CUT P0 | Same issue. |
| "Prepared editor export" toast | CUT | Toast-only export proves nothing. |
| "Download preview" if no file is downloaded | REWORD | Make it "Download content brief" or implement a real download. |
| "Post to Instagram" | CUT | Official Instagram publishing requires professional accounts, permissions, hosted media, container creation, and publish flow. Not P0. |
| Publish progress / "Live" state | CUT | It is fake and creates the highest overclaim risk. |
| Seeded engagement metrics | CUT | Fake metrics are worse than no metrics. |
| Performance learning from metrics | CUT P0 | Not visible and not backed by real data. |
| Generic chat placeholder "Ask Reframe anything..." | CUT | It promises a broad assistant that does not visibly change content. |
| Generic prompt response that changes nothing | CUT | Deterministic edit commands are better and testable. |
| Broad "AI CMO" claims inside product | REWORD | Use "founder-led content from business context" until downstream distribution/analytics are real. |

## 3. Final MVP Scope

### P0 Features

- Business context intake: website/product URL, product/store URL, campaign goal, founder note/text rant, and manual upload of images/videos.
- Intake-to-auth handoff: save context before signup, verify the user only when needed, claim the draft into the workspace, and redirect to the unique app project slug without duplicate entry.
- Basic accounts/workspaces: sign up, sign in, sign out, one default workspace, profile basics, invite members, workspace membership, and owner/member-scoped project access.
- Structured brand context extraction: audience, pain, product promise, conversion goal, founder voice, tone, do/avoid rules, CTA, and proof moments.
- Media labeling: uploaded images and selected video frames labeled as product detail, founder POV, customer proof, behind the scenes/process, before/after, CTA support, and hook/middle/ending fit.
- Curated content format library: founder confessional, POV transformation, before/after, launch countdown, product demo, customer pain to proof, why I built this, and mistake I made building this.
- Context-to-content generation: 3 to 5 recipes with hook, script, shot list, caption, CTA, proof moments, suggested assets, and missing shots to film.
- Editable storyboard/timeline: reorder beats, swap suggested clips, edit hook/caption/CTA, mark missing shots, regenerate one beat, and approve/reject variants.
- Editorial memory: save accepted hooks, rejected hooks, CTA preferences, tone preferences, edit deltas, and show a visible "saved preference" card/message.
- Export: copy script, download Markdown/JSON content brief, download shot list CSV, and optionally download a ZIP of selected assets and captions if implementation stays simple.
- Deterministic edit prompts: "make hook more direct," "make this more founder-led," "use a stronger CTA," "show me 3 alternates," and "save this as my style."

### P1 Features

- Voice note transcription for founder rants.
- Manual Shopify CSV import or product CSV parsing.
- Simple MP4 render from approved storyboard using Remotion or server FFmpeg.
- Manual performance logging: founder enters views, saves, comments, clicks, or preorder clicks.
- Performance-informed preferences after enough manually entered outcomes.
- Reference-video upload where the founder supplies a video and Reframe extracts a reusable format.
- Google Drive or Shopify Storefront/Admin connector after the manual-upload MVP works.
- MFA setup, audit logs, and billing/seat management.

### Explicitly Cut

- Direct Instagram/TikTok/LinkedIn/YouTube publishing.
- Live trend crawling/scraping.
- Fake publish progress.
- Fake metrics.
- Full video editor.
- AI video generation.
- CapCut/Premiere/DaVinci exports unless a real importable handoff file exists.
- Platform chooser unless labeled "coming soon" and visually de-emphasized.
- Social/profile syncing as P0.

## 4. Feature Scoring Matrix

Scoring: 1 low, 5 high.

| Feature | Thesis fit | Demo impressiveness | Buildability | Credibility | Differentiation | MVP necessity | Verdict | Rationale |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| Website URL intake | 5 | 3 | 4 | 4 | 3 | 5 | KEEP P0 | A URL is a low-friction context source. P0 can fetch basic public page text or let founder paste context if fetch fails. |
| Product/store URL intake | 5 | 4 | 4 | 4 | 4 | 5 | KEEP P0 | Product context is central. Treat Shopify as a URL/manual source, not an OAuth app. |
| Campaign goal | 5 | 3 | 5 | 5 | 4 | 5 | KEEP P0 | Required to make outputs conversion-oriented. |
| Founder note / text rant | 5 | 5 | 5 | 5 | 5 | 5 | KEEP P0 | Best input for founder-led voice and emotional context. |
| Pre-auth intake draft and claim | 5 | 4 | 4 | 5 | 4 | 5 | KEEP P0 | Lets founders experience the wedge before signup while still preserving secure ownership after verification. |
| Founder voice note | 5 | 4 | 3 | 4 | 4 | 3 | KEEP P1 | Useful, but transcription adds audio handling. Text gets the wedge first. |
| Uploaded product images/videos | 5 | 5 | 4 | 5 | 5 | 5 | KEEP P0 | Real media labeling is the most concrete proof of "from your business." |
| Sign up / sign in / sign out | 4 | 2 | 4 | 5 | 1 | 5 | KEEP P0 | Required before storing private media, projects, and memory for multiple users. Not differentiated, but table stakes. |
| `/account` profile basics | 3 | 2 | 4 | 5 | 1 | 4 | KEEP P0 | Needed for user trust, sign out, and account ownership; keep it plain. |
| Workspace memberships | 4 | 2 | 3 | 5 | 2 | 5 | KEEP P0 | Multiple users require projects/media/preferences to be scoped to a workspace, not loose sessions. |
| Owner/admin email invites | 3 | 2 | 3 | 5 | 1 | 4 | KEEP P0 | Multiple users need a safe way to add members; keep it to email invite, role, expiration, and acceptance. |
| Advanced team management | 2 | 2 | 3 | 4 | 1 | 2 | KEEP P1 | Billing seats, granular permissions, audit logs, and enterprise controls can wait. |
| Optional social/profile links | 3 | 3 | 3 | 3 | 2 | 2 | REWORD | Keep as text context or reference links. Do not imply sync or scraping. |
| Shopify app/OAuth | 4 | 4 | 1 | 3 | 3 | 1 | CUT P0 | Real Shopify app auth is a separate product effort. CSV/URL is enough. |
| Audience extraction | 5 | 4 | 5 | 5 | 4 | 5 | KEEP P0 | Simple structured extraction with high product value. |
| Pain extraction | 5 | 5 | 5 | 5 | 5 | 5 | KEEP P0 | Drives hooks and founder-led content. |
| Product promise extraction | 5 | 4 | 5 | 5 | 4 | 5 | KEEP P0 | Needed to avoid generic content. |
| Conversion goal extraction | 5 | 4 | 5 | 5 | 4 | 5 | KEEP P0 | Anchors content to business outcomes. |
| Founder voice / tone extraction | 5 | 4 | 4 | 4 | 5 | 5 | KEEP P0 | Important to differentiate from generic AI writers. |
| Do/avoid rules | 5 | 4 | 5 | 5 | 5 | 5 | KEEP P0 | Clear and defensible guardrails. |
| CTA extraction | 5 | 3 | 5 | 5 | 3 | 5 | KEEP P0 | Required for conversion-oriented content. |
| Proof moments extraction | 5 | 5 | 4 | 4 | 5 | 5 | KEEP P0 | Strongest bridge from business reality to content output. |
| Image media labeling | 5 | 5 | 4 | 5 | 5 | 5 | KEEP P0 | OpenAI vision/image analysis can classify uploaded proof assets. |
| Video media labeling from sampled frames | 5 | 4 | 3 | 4 | 5 | 4 | KEEP P0 | Extract a few frames and label them. Avoid full video understanding in P0. |
| Full video semantic analysis | 4 | 4 | 2 | 3 | 4 | 2 | KEEP P1 | Buildable later with frame extraction and transcripts, but not needed now. |
| Hook/middle/ending fit labels | 5 | 5 | 4 | 4 | 5 | 5 | KEEP P0 | Makes asset selection feel intelligent to nontechnical viewers. |
| Curated content format library | 5 | 4 | 5 | 5 | 4 | 5 | KEEP P0 | Safer and more controllable than live trend scraping. |
| Live trend search | 2 | 5 | 1 | 1 | 3 | 1 | CUT | Platform-risky and not required for the wedge. |
| Generate 3 to 5 recipes | 5 | 5 | 4 | 5 | 5 | 5 | KEEP P0 | Core output. Must be structured and grounded in context. |
| Hook/script/shot list/caption/CTA generation | 5 | 5 | 4 | 5 | 5 | 5 | KEEP P0 | This is the content product. |
| Required proof moments | 5 | 5 | 4 | 5 | 5 | 5 | KEEP P0 | Shows outputs are not generic. |
| Suggested assets | 5 | 5 | 4 | 4 | 5 | 5 | KEEP P0 | Makes media labeling pay off immediately. |
| Missing shots to film | 5 | 5 | 5 | 5 | 5 | 5 | KEEP P0 | Very useful and easy to build honestly. |
| Reorder beats | 4 | 4 | 4 | 5 | 3 | 4 | KEEP P0 | Gives real editability without full editing complexity. |
| Swap suggested clips | 5 | 5 | 3 | 4 | 5 | 5 | KEEP P0 | One of the most memorable interactions. |
| Edit hook/caption/CTA | 5 | 4 | 5 | 5 | 4 | 5 | KEEP P0 | Basic editing is mandatory. |
| Regenerate one beat | 5 | 4 | 4 | 5 | 5 | 4 | KEEP P0 | Avoids broad chat while feeling AI-native. |
| Approve/reject variants | 5 | 4 | 5 | 5 | 5 | 5 | KEEP P0 | Required input for editorial memory. |
| Save accepted hooks | 5 | 4 | 5 | 5 | 5 | 5 | KEEP P0 | Visible learning loop. |
| Save rejected hooks | 5 | 4 | 5 | 5 | 5 | 5 | KEEP P0 | More credible than pretending performance learning exists. |
| Infer tone preferences | 5 | 4 | 4 | 4 | 5 | 4 | KEEP P0 | Keep it lightweight and transparent: "inferred from 3 edits." |
| Remember CTA preferences | 5 | 3 | 5 | 5 | 4 | 4 | KEEP P0 | Simple and directly tied to conversion. |
| Learn from edits | 5 | 5 | 4 | 5 | 5 | 5 | KEEP P0 | The MVP feels broken without this visible loop. |
| Show "saved preference" in UI | 5 | 5 | 5 | 5 | 5 | 5 | KEEP P0 | Highest-leverage trust signal. |
| Copy script | 5 | 3 | 5 | 5 | 2 | 5 | KEEP P0 | Boring, real, and useful. |
| Download content brief | 5 | 3 | 5 | 5 | 3 | 5 | KEEP P0 | Real export beats fake video export. |
| Download shot list | 5 | 3 | 5 | 5 | 3 | 5 | KEEP P0 | Useful for founders and easy to validate. |
| ZIP assets/captions | 4 | 4 | 3 | 4 | 3 | 3 | KEEP P1 | Good handoff, but not necessary for first proof. |
| Simple MP4 render | 3 | 5 | 2 | 4 | 3 | 2 | KEEP P1 | Impressive, but rendering adds operational complexity. |
| CapCut/Premiere/DaVinci export | 2 | 4 | 1 | 2 | 2 | 1 | CUT | Do not claim until importable files are real. |
| Manual export workflow | 5 | 3 | 5 | 5 | 3 | 5 | KEEP P0 | Honest and sufficient. |
| Direct social publishing | 2 | 5 | 1 | 2 | 2 | 1 | CUT | OAuth, app review, media hosting, API limitations, and platform approval make this non-P0. |
| Platform chooser | 1 | 3 | 5 | 2 | 1 | 1 | CUT | A chooser without real publishing is cosmetic overclaim. |
| Manual metrics logging | 4 | 3 | 4 | 5 | 3 | 2 | KEEP P1 | Real but not needed until users ship content. |
| Fake metrics | 1 | 3 | 5 | 1 | 1 | 1 | CUT | Damages trust. |
| Conversion metric manually entered | 5 | 3 | 4 | 5 | 4 | 3 | KEEP P1 | Useful after export flow works. |
| Performance learning | 4 | 4 | 2 | 3 | 4 | 2 | KEEP P1 | Needs real or manually logged outcomes. |
| Generic chat | 2 | 3 | 3 | 2 | 1 | 1 | CUT | It currently changes nothing and feels generic. |
| Deterministic edit intents | 5 | 4 | 5 | 5 | 4 | 5 | KEEP P0 | Narrow commands can visibly update content and memory. |
| "Save this as my style" | 5 | 5 | 5 | 5 | 5 | 5 | KEEP P0 | Clean bridge from edit to memory. |

## 5. Recommended Product Flow

0. Founder starts from landing and enters intake before auth.

The landing CTA routes to `/intake`. The founder enters context before signup so the first product act is "tell Reframe what is happening in your business," not "create an empty account."

1. Reframe saves a pre-auth intake draft.

On `/intake`, the founder pastes a website/product/store URL, campaign goal, and a founder note. Optional: attach images/videos, but prefer real media upload after auth. The server saves the context to `intake_drafts` and stores only a hashed draft token while the browser holds the raw token in a secure HttpOnly cookie.

2. Reframe resolves the user state safely.

If the founder already has a valid Supabase session and workspace membership, claim the draft immediately and redirect to `/app/[workspaceSlug]/projects/[projectSlug]`. If no session exists, prompt for email from the intake completion step, then show sign in or sign up based on a protected, rate-limited `email_hash` lookup. Do not expose a public "email exists" lookup.

3. New users verify email without re-entering context.

For a new account, call Supabase email/password signup with confirmation enabled, send an OTP-style confirmation email, verify the code on `/intake/verify`, create profile/default workspace/membership, claim the draft, and redirect to the workspace project slug. Existing users sign in, then go through the same claim step.

4. Reframe extracts brand/founder/content context.

Use structured extraction to produce audience, pain, product promise, conversion goal, founder voice, tone, do/avoid rules, CTA, and proof moments. Show the result as editable context chips/sections so the founder can correct it.

5. Reframe labels uploaded media/proof moments.

Uploaded images and sampled video frames get labels such as product detail, founder POV, customer proof, BTS/process, before/after, CTA support, hook fit, proof beat, or ending fit. Each label should include short reasoning.

6. Reframe matches context to curated content formats.

Use a maintained library of founder-led formats. This is not "live trends." The match score should explain why the format fits the campaign goal, proof moments, and founder voice.

7. Reframe generates recipes/storyboards.

Generate 3 to 5 recipes. Each includes hook, script, shot list, caption, CTA, required proof moments, suggested assets, and missing shots to film.

8. Founder edits/approves/rejects.

The founder can reorder beats, swap suggested clips, edit copy, regenerate one beat, approve a variant, reject a variant, or mark missing shots.

9. Reframe visibly saves editorial preferences.

After an edit or approval/rejection, show a persistent card/message: "Saved preference: use direct fit-proof hooks over generic empowerment copy." This is the self-improvement loop.

10. Founder exports script/shot list/assets.

Provide copy script, download brief, download shot list CSV, and optional ZIP. No fake publish or fake metrics.

## 6. UI Plan For `/account`, `/intake`, And `/app`

The goal is not to retrofit `/demo`. The goal is to build the real MVP by cloning useful visual/interaction pieces into `/intake` and `/app`, adding basic account/workspace controls in `/account`, then applying the cuts below only in those new routes.

### `/account` Scope

- Sign in, sign up, sign out, and session recovery entry points.
- Profile basics: display name, email, optional avatar later.
- Workspace switcher or current workspace display.
- Member list with role labels.
- Owner/admin "invite member" flow backed by a trusted server route.
- No billing, admin analytics, full org settings, or social account connections.

### `/intake` Auth Handoff Scope

- Landing CTA goes to `/intake`, not a blank signup screen.
- Intake completion asks the founder to "Save and open my workspace."
- If already signed in, submit claims the draft and routes directly to `/app/[workspaceSlug]/projects/[projectSlug]`.
- If not signed in, show signup/sign-in inline from intake, then `/intake/verify` for the emailed code.
- After verification, show "Context saved. Opening your workspace..." and redirect; do not ask the founder to re-enter context.
- Avoid account-enumeration copy such as "we found your account" unless the user is already authenticated.

### Screens And Nodes That Stay

- Clone the Brand Context node pattern into `/app`, but rename it "Extracted Business Context."
- Clone the Library node pattern into `/app`, but rename it "Uploaded Proof Assets" or "Labeled Media."
- Clone the three-card recipe pattern into `/app`, but rename cards "Content Formats" or "Founder-Led Recipes," not live trend results.
- Clone the timeline/storyboard interaction into `/app` as the primary work surface.
- Clone the preview node only as a storyboard/assembly preview, not a published post preview.
- Clone the chat history/prompt shell only if prompts perform deterministic edits.
- Build `/intake` separately as the source-entry loop before `/app`.

### Nodes And Flows To Exclude From `/app`

- Remove live web/Instagram/TikTok/YouTube search tool calls.
- Remove Instagram publish progress and "Live" card.
- Remove engagement metrics card.
- Remove CapCut/Premiere/DaVinci export dropdown unless replaced by real downloadable handoff files.
- Remove fake upload behavior if no native file picker is implemented.
- Remove AI missing-shot generation unless labeled as a placeholder.

### Text Changes

| Current copy | Replace with |
| --- | --- |
| "Reading website and social links" | "Extracting context from provided sources" |
| "Syncing media" | "Indexing uploaded media" |
| "Searching the web" | "Matching against curated content formats" |
| "Searching Instagram" | Remove |
| "Searching TikTok" | Remove |
| "Generating trend recipes" | "Generating founder-led content recipes" |
| "Trend Video" | "Format Example" |
| "Generate timeline from..." | "Build storyboard from..." |
| "Auto-filling timeline" | "Drafting storyboard and asset matches" |
| "Generate with AI" | "Suggest shot to film" or "Use placeholder" |
| "Drag and drop or click to upload video" | "Upload a real clip" only if real, otherwise "Use demo clip" |
| "Download preview" | "Download content brief" |
| "Post to Instagram" | Remove or "Manual posting checklist" |
| "Ask Reframe anything..." | "Ask Reframe to revise this post..." |

### Button Renames

- `+` under recipe: keep icon, tooltip should say "Build storyboard."
- "Export timeline": rename to "Download handoff."
- "Download preview": rename to "Download brief."
- "Post to Instagram": remove.
- "Generate with AI": rename to "Suggest missing shot."
- "Drag and drop or click to upload video": only keep if it opens a real upload picker.

### Seeded Or Simulated Flows That Need Labels In `/app`

- Seeded recipe examples: label "Curated demo examples."
- Seeded media library: label "Demo assets" if no real upload has occurred.
- Any AI-like timed state copied into `/app`: label "Demo simulation" until backed by API calls.
- Preview video: label "Storyboard preview" unless a real render is generated.

### Chat Prompts That Should Actually Do Something

- "Make hook more direct" updates the hook field and creates a saved preference event.
- "Make this more founder-led" rewrites one selected beat with first-person/founder language.
- "Use a stronger CTA" updates CTA/caption and saves CTA preference.
- "Show me 3 alternates" opens the selected beat variant list.
- "Save this as my style" writes the current accepted hook/tone/CTA into editorial memory.

### Learning Loop Card

Show after the first edit, approval, or rejection:

```text
Saved to Editorial Memory
Preference: Use direct fit-proof hooks over generic empowerment copy.
Source: You accepted Hook B and rejected two softer variants.
Next drafts will apply this preference.
```

This card is more important than fake metrics. It proves the "gets sharper as the founder edits" thesis.

## 7. Technical Architecture

### Recommendation

Use the existing Next.js app and add the smallest backend needed for real context extraction, uploads, labeling, recipe generation, edit events, and export. The backend should be a Next.js route-handler API plus Supabase Postgres/Storage plus server-side OpenAI calls. Use Supabase because the repo already has Supabase waitlist infrastructure and because Postgres + object storage is enough for this MVP. Do not introduce a separate API service, queue, worker platform, vector database, or social integration layer until a specific P1 feature requires it.

### Frontend

- Next.js App Router + React 19.
- Keep `/demo` unchanged.
- Add `/account` for auth/account/workspace controls.
- Add `/intake` for the real intake loop.
- Add `/intake/verify` for email-code verification when signup is required.
- Add `/app/[workspaceSlug]/projects/[projectSlug]` for the real MVP workspace.
- Use existing Tailwind tokens and component style.
- Replace broad chat with deterministic edit commands and focused controls.
- Treat timeline as a storyboard editor, not a video editor.

### Backend

Use Next route handlers as the backend-for-frontend. Routes should validate JSON with shared schemas, call server-only helpers, persist normalized records, and return typed response objects. Proposed P0 routes:

- `POST /api/reframe/intake/drafts`: create or update a short-lived pre-auth intake draft and set the draft cookie.
- `POST /api/reframe/intake/continue`: decide whether to claim immediately, request login, or start signup without exposing account enumeration.
- `POST /api/reframe/intake/claim`: idempotently claim a valid draft into the current verified user's workspace and project.
- `POST /api/reframe/auth/signup`: start email/password signup from an intake draft.
- `POST /api/reframe/auth/verify`: verify the emailed OTP, establish the Supabase session, create missing profile/workspace rows, and claim the draft.
- `POST /api/reframe/auth/sign-in`: sign in an existing user with email/password or start an OTP login flow.
- `POST /api/reframe/projects`: create a workspace-scoped project after an authenticated claim.
- `GET /api/reframe/account`: read profile, active workspace, and memberships for the signed-in user.
- `PATCH /api/reframe/account/profile`: update profile basics.
- `POST /api/reframe/workspaces`: create the default workspace or a new workspace.
- `GET /api/reframe/workspaces/:id/members`: list workspace members for owners/admins.
- `POST /api/reframe/workspaces/:id/invites`: owner/admin invite endpoint, implemented server-side with service-role-only Supabase Admin calls.
- `POST /api/reframe/context/extract`: extract structured business/founder context from URL text, founder notes, campaign goal, and uploaded-source summaries.
- `POST /api/reframe/media/upload-url`: create a signed upload URL for one allowed media file.
- `POST /api/reframe/media/complete`: persist uploaded media metadata after direct upload succeeds.
- `POST /api/reframe/media/label`: label uploaded image assets or sampled video frames.
- `POST /api/reframe/recipes/generate`: generate 3 to 5 context-grounded content recipes.
- `POST /api/reframe/storyboards`: create a storyboard from a selected recipe.
- `POST /api/reframe/storyboards/:id/regenerate-beat`: regenerate one beat, not the whole project.
- `POST /api/reframe/editorial-events`: persist accepted/rejected/edited/saved-style events.
- `GET /api/reframe/editorial-memory`: read current inferred preferences.
- `POST /api/reframe/export`: generate Markdown, JSON, and CSV export artifacts.

Keep routes synchronous for small P0 payloads. Add background jobs only when video processing or render duration forces it. If jobs become necessary, use a single `media_jobs` table with status polling before adding a queue provider.

### Auth And Ownership

For a public MVP, add Supabase Auth before storing real private uploads or persistent editorial memory. For an invite-only pilot, a signed session/project token can temporarily scope projects, but it is not a production auth substitute.

Minimum ownership rules:

- Every project row has a `workspace_id`.
- Every workspace has at least one `owner` membership.
- Every invite is tied to `workspace_id`, invited email, inviter user, role, token hash, and expiration.
- Every storage object path includes the project ID and random file ID.
- Every storage object also resolves back to a workspace-owned media record.
- Every API route checks project ownership before reading or writing.
- Service role keys remain server-only.
- Client never receives raw bucket paths that grant broader access than needed.
- RLS should be enabled once real auth is present.

### Intake Draft Handoff

The intake handoff is a backend state machine, not a client-only redirect trick:

- `draft`: context exists in `intake_drafts`, not yet owned by a user.
- `auth_required`: draft is valid but no verified session exists.
- `verification_pending`: signup has started and the user must enter the emailed code.
- `claimed`: a verified user owns the draft through a workspace-scoped project.
- `expired`: draft can no longer be claimed and should be deleted or restarted.

The claim operation must be idempotent. If the user refreshes after verification, the server should return the existing project slug instead of creating duplicate projects. The draft token should be random, stored hashed in Postgres, placed only in a HttpOnly cookie, and rotated or cleared after claim. Do not rely on localStorage for draft ownership.

### Database

Suggested Supabase tables:

- `profiles`: public application profile keyed by `auth.users.id`, with normalized email display and protected `email_hash` for intake continuation checks.
- `workspaces`: account/team container for one or more users.
- `workspace_memberships`: user-to-workspace rows with `owner`, `admin`, and `member` roles.
- `workspace_invites`: pending invite records with role, token hash, expiration, accepted timestamp, and inviter.
- `intake_drafts`: pre-auth context payload, draft token hash, optional email hash, status, expiration, claimed user/workspace/project IDs, and timestamps.
- `projects`: founder/project/campaign container scoped to `workspace_id`.
- `brand_sources`: URL, pasted text, source type, extracted text, extraction status.
- `brand_contexts`: structured audience, pain, promise, tone, rules, CTA, proof moments.
- `media_assets`: storage path, type, filename, duration, thumbnails, upload metadata.
- `media_labels`: asset/frame labels, confidence, reasoning, hook/middle/ending fit.
- `content_formats`: curated format library entries.
- `content_recipes`: generated recipe variants.
- `storyboards`: selected recipe and current draft.
- `storyboard_beats`: ordered beats, copy, assigned assets, missing-shot status.
- `editorial_events`: accepted, rejected, edited, regenerated, saved-style events.
- `editorial_preferences`: inferred preferences with evidence and confidence.
- `exports`: generated export package metadata.

Do not add billing, plan, seat, audit-log, or enterprise role tables in P0. Do not add analytics tables until manual metrics logging becomes P1 work.

### Storage

P0: Supabase Storage signed upload URLs. Supabase documents signed upload URLs that allow direct uploads without further authentication and are valid for 2 hours [S7].

Alternative: Cloudflare R2 or S3-compatible storage with presigned PUT URLs. R2 supports single-operation presigned URLs for GET/PUT/HEAD/DELETE with explicit expiry and recommends content-type restrictions and CORS controls [S8]. AWS S3 presigned URLs also support direct upload without exposing AWS credentials [S9].

Decision: use Supabase Storage first if this repo continues using Supabase. Move to R2 later only if storage cost, egress, or Workers integration matters.

### Media Processing

P0:

- Images: send image inputs to the vision model for structured labeling.
- Videos: sample frames client-side with `<video>` + canvas, or server-side with FFmpeg if deployment supports it.
- Do not do full video editing or rendering in P0.

P1:

- Server FFmpeg for stable frame extraction and thumbnails. FFmpeg is a broad media converter that can read inputs, filter, and transcode outputs [S4].
- Avoid ffmpeg.wasm for core P0 backend processing. Browser ffmpeg.wasm works, but its core is large and the multi-thread path requires SharedArrayBuffer/security isolation [S5].
- Use Remotion only for optional simple MP4 rendering. Remotion can create real MP4 videos with React and render locally/server/serverless, but render infrastructure and licensing make it P1 [S6].

### AI Model Calls

Use OpenAI Responses API with Structured Outputs:

- Brand context extraction.
- Media label extraction.
- Recipe generation.
- Beat regeneration.
- Editorial preference inference.

OpenAI Structured Outputs enforce a supplied JSON Schema and avoid missing keys or invalid enums [S1]. Vision models can process image inputs and analyze them via the Responses API [S2]. Use a low-cost model for extraction/generation and reserve stronger models for difficult regeneration or QA. Check pricing before implementation; as of this report, OpenAI lists token prices by model and built-in web search pricing separately [S3].

### Structured JSON Schemas

Define schemas in TypeScript and mirror them in API validation:

- `BrandContextSchema`
- `MediaLabelSchema`
- `ContentFormatMatchSchema`
- `RecipeSetSchema`
- `StoryboardSchema`
- `BeatVariantSchema`
- `EditorialEventSchema`
- `EditorialPreferenceSchema`
- `ExportPackageSchema`

Keep schemas small and strict. Do not ask the model to emit a giant app state blob.

### Error Handling And Observability

P0 should use boring production hygiene:

- Return explicit `400`, `401/403`, `413`, `415`, `429`, and `500` errors where appropriate.
- Redact founder notes, URLs, and media references from logs unless they are explicitly safe metadata.
- Store provider request IDs and coarse timing, not full prompts/media payloads, by default.
- Add idempotency keys for upload completion, export generation, and editorial events.
- Rate-limit expensive AI routes by owner/session and project.
- Write route tests with provider calls mocked.

### Background Jobs

Avoid background jobs in P0 unless file processing exceeds route limits. If needed later, add one queue for media labeling/render jobs with explicit status:

- `queued`
- `processing`
- `complete`
- `failed`

No analytics queue, publishing queue, or social sync worker before the MVP proves the wedge.

## 8. Implementation Tickets

### Ticket 1 - Create `/account`, `/intake`, and `/app` MVP shells

P0

Objective: Add separate MVP routes while leaving `/demo` unchanged.

Files/areas likely touched: `app/account/page.tsx`, `app/intake/page.tsx`, `app/intake/verify/page.tsx`, `app/app/[workspaceSlug]/projects/[projectSlug]/page.tsx`, new MVP-specific components under `src/components/reframe-mvp/` or similar, route tests.

Acceptance criteria:

- `/demo` source and behavior are not modified.
- `/account` renders a basic account/workspace shell.
- `/intake` renders a real context intake shell.
- `/intake/verify` renders an email-code verification shell.
- `/app/[workspaceSlug]/projects/[projectSlug]` renders a real MVP workspace shell.
- Shared code copied from `/demo` is isolated so MVP changes do not mutate the demo.

Testing requirements: route/component smoke tests; `npm run typecheck`.

### Ticket 2 - Basic auth and workspace ownership

P0

Objective: Add Supabase Auth, profiles, default workspaces, memberships, and workspace-scoped project ownership.

Files/areas likely touched: Supabase SQL migration docs, `lib/supabase/*`, auth middleware/proxy, `app/account/page.tsx`, account components, `app/intake/verify/page.tsx`, `app/api/reframe/auth/*`, `app/api/reframe/account/*`, `app/api/reframe/workspaces/*`, route tests.

Acceptance criteria:

- Users can sign up, sign in, sign out, and refresh sessions through server-side cookie auth.
- Email/password signup uses email confirmation, with an OTP-style verification screen if the product chooses code entry over link-only confirmation.
- New users get a profile and default workspace.
- Projects, uploads, recipes, storyboards, editorial events, and exports are scoped by `workspace_id`.
- RLS policies prevent users from reading/writing workspaces where they are not members.
- `/account` shows profile basics, current workspace, member list, and sign out.
- Owners/admins can invite a member by email through a server route; service role key is never exposed to the browser.
- Service role keys remain server-only.

Testing requirements: mocked Supabase Auth route tests, RLS policy review, account component tests, `npm run typecheck`.

### Ticket 3 - Cut misleading claims from `/app`

P0

Objective: Exclude fake live trend, publish, export, upload, and metrics claims from the new MVP workspace.

Files/areas likely touched: MVP components under `src/components/reframe-mvp/`, MVP data fixtures, tests under `src/**/*.test.tsx`.

Acceptance criteria:

- No `/app` UI text claims live Instagram/TikTok/web trend search.
- No fake Instagram publish/progress/metrics flow exists in `/app`.
- No fake editor export toast is presented as real in `/app`.
- Any remaining seeded behavior is labeled "Demo simulation" or "Curated demo example."
- `/demo` remains unchanged.

Testing requirements: focused component tests for omitted/renamed actions; `npm run typecheck`.

### Ticket 4 - Define MVP domain schemas

P0

Objective: Add typed schemas for brand context, media labels, recipes, storyboards, edit events, and editorial preferences.

Files/areas likely touched: `src/data/`, `src/lib/`, possibly new `src/lib/reframe/`.

Acceptance criteria:

- Types cover all P0 objects.
- Schema enums include proof-moment labels and deterministic edit intents.
- Tests cover serialization fixtures.

Testing requirements: focused unit tests; `npm run typecheck`.

### Ticket 5 - Business context intake

P0

Objective: Build `/intake` to capture website/product URL, campaign goal, founder note, and optional uploaded files before auth without implying platform sync.

Files/areas likely touched: `app/intake/page.tsx`, `app/intake/verify/page.tsx`, `app/api/reframe/intake/*`, `app/api/reframe/auth/*`, intake components, intake tests.

Acceptance criteria:

- Founder can enter text context and campaign goal.
- URLs are source references, not "connected accounts."
- Attach menu offers manual upload first.
- Submit creates or updates an `intake_drafts` row and secure draft cookie.
- If the user is already signed in, submit claims the draft and routes to `/app/[workspaceSlug]/projects/[projectSlug]`.
- If the user is not signed in, submit prompts signup/sign-in without losing the draft.
- A new user can enter email/password, receive a verification code, verify it, and land in the claimed workspace project without re-entering context.
- Draft claim is idempotent; refresh/retry after verification does not create duplicate projects.
- Public responses do not reveal whether an email exists in the database.

Testing requirements: focused intake component tests, mocked auth/intake route tests, draft-claim idempotency tests, `npm run typecheck`.

### Ticket 6 - Real upload path

P0

Objective: Implement direct uploads to Supabase Storage using signed upload URLs.

Files/areas likely touched: `app/api/reframe/media/upload-url/route.ts`, storage helper under `lib/`, upload UI, tests.

Acceptance criteria:

- Server creates a signed upload URL for allowed image/video MIME types.
- Client uploads the file directly.
- File metadata is stored with project ID and owner/session ID.
- Errors are explicit and do not expose service keys.

Testing requirements: route tests with mocked Supabase/fetch; component upload tests; typecheck.

### Ticket 7 - Brand context extraction

P0

Objective: Convert founder note, URL text, and campaign goal into structured brand context.

Files/areas likely touched: `app/api/reframe/context/extract/route.ts`, OpenAI helper, schemas, UI card.

Acceptance criteria:

- API returns audience, pain, promise, founder voice, tone, CTA, do/avoid rules, proof moments.
- Output conforms to strict schema.
- UI shows editable extracted context.

Testing requirements: mocked OpenAI response tests; schema validation tests; typecheck.

### Ticket 8 - Media labeling

P0

Objective: Label uploaded images and sampled video frames against proof-moment categories.

Files/areas likely touched: `app/api/reframe/media/label/route.ts`, media UI, frame sampling utility.

Acceptance criteria:

- Images receive 1 to 3 proof labels with reasoning.
- Video files produce sampled frame labels or a clear "frame sampling failed" state.
- Labels include hook/middle/ending fit.

Testing requirements: unit tests for label normalization; mocked API tests; UI tests for label display.

### Ticket 9 - Curated format library

P0

Objective: Replace live trends with a maintained content-format library.

Files/areas likely touched: new `src/data/content-formats.ts`, MVP recipe components.

Acceptance criteria:

- Library includes the required founder-led formats.
- Each format has beat structure, best-fit context, proof requirements, and example language.
- UI copy calls these "formats" or "recipes," not live trends.

Testing requirements: unit tests for data shape; typecheck.

### Ticket 10 - Recipe and storyboard generation

P0

Objective: Generate 3 to 5 content recipes and one editable storyboard from selected context/assets.

Files/areas likely touched: `app/api/reframe/recipes/generate/route.ts`, `app/api/reframe/storyboards/route.ts`, storyboard UI components.

Acceptance criteria:

- Recipes include hook, script, shot list, caption, CTA, suggested assets, and missing shots.
- Every suggested asset references a real uploaded asset or an explicitly labeled fixture asset.
- Missing shots are clearly marked as "to film" or "needed."

Testing requirements: mocked structured-output tests; UI tests for generated recipe cards.

### Ticket 11 - Storyboard editing controls

P0

Objective: Make edits real in local/project state: reorder beats, swap clips, edit hook/caption/CTA, approve/reject variants.

Files/areas likely touched: MVP storyboard components, state reducer/store, tests.

Acceptance criteria:

- User edits visibly change storyboard state.
- Approve/reject emits an editorial event.
- Regenerate one beat only changes that beat.

Testing requirements: focused Testing Library coverage for each edit path; typecheck.

### Ticket 12 - Editorial memory loop

P0

Objective: Save edit/approval/rejection events and show visible inferred preferences.

Files/areas likely touched: `app/api/reframe/editorial-events/route.ts`, `app/api/reframe/editorial-memory/route.ts`, memory UI card, data model.

Acceptance criteria:

- Accept/reject/edit events are stored.
- UI shows "Saved to Editorial Memory" after a qualifying event.
- Next recipe or regeneration uses saved preferences in prompt context.

Testing requirements: route tests; UI tests for memory card; mocked prompt context test.

### Ticket 13 - Deterministic edit prompt intents

P0

Objective: Replace generic chat with a small intent router for visible content edits.

Files/areas likely touched: MVP prompt shell, prompt parser utility.

Acceptance criteria:

- Supported prompts update content or open relevant UI.
- Unsupported prompts respond with available commands.
- "Save this as my style" writes a preference event.

Testing requirements: parser unit tests; component tests for each supported intent.

### Ticket 14 - Boring export

P0

Objective: Provide real export artifacts: script copy, Markdown brief, JSON package, and shot list CSV.

Files/areas likely touched: `app/api/reframe/export/route.ts`, export UI, utility functions.

Acceptance criteria:

- Download buttons create actual files.
- Export contains current edited storyboard state.
- No CapCut/Premiere/DaVinci claims remain.

Testing requirements: export serializer tests; component tests for download buttons.

### Ticket 15 - Landing page repositioning

P0

Objective: Update landing copy to match the cut MVP and remove overclaims.

Files/areas likely touched: `app/page.tsx`, `components/landing/*`, tests.

Acceptance criteria:

- H1/subhead describe context-to-founder-led-content.
- Feature bullets match real P0 capability.
- Anti-positioning line differentiates from generic AI content tools.

Testing requirements: landing tests updated; typecheck.

### Ticket 16 - Simple MP4 render

P1

Objective: Render a basic vertical MP4 from approved storyboard.

Files/areas likely touched: new render package/routes, Remotion or FFmpeg integration, storage export.

Acceptance criteria:

- Renders a basic 9:16 video from selected assets and captions.
- Clear status states exist.
- Rendering failure does not block script/brief export.

Testing requirements: unit tests for composition inputs; integration smoke test in supported environment; build check.

### Ticket 17 - Manual metrics logging

P1

Objective: Let founders manually enter post outcomes after publishing elsewhere.

Files/areas likely touched: metrics form, database table, editorial preference inference.

Acceptance criteria:

- User can log platform, URL, views, saves, comments, clicks/preorder clicks.
- Metrics are manually entered and labeled as such.
- Preference inference only uses real entered data.

Testing requirements: route tests; form tests.

## 9. Demo Script

60 to 90 seconds:

"This is the new Reframe MVP flow. It starts in `/intake` with the founder's actual business context, not a blank prompt. Here I enter Petite Outdoors, a preorder goal, a founder note about why regular hiking pants do not fit petite women, and a few product/proof clips.

Reframe extracts the useful marketing context: audience, pain, product promise, founder voice, CTA, and the proof moments we have or still need. It then labels the uploaded media, so a close-up becomes opening hook proof, a trail clip becomes movement proof, and a flat lay becomes CTA support.

In `/app`, instead of pretending to crawl TikTok live, the MVP matches this context to curated founder-led content formats. Here are three recipes. I pick Founder Confessional, and Reframe drafts the storyboard: hook, beats, script, caption, CTA, suggested assets, and one missing shot to film.

Now I edit it. I make the hook more direct, reject a softer variant, and approve the version that names the fit problem clearly. Reframe saves that as an editorial preference, so future drafts use direct fit-proof hooks instead of generic empowerment copy.

Finally, I export a real script and shot list. This MVP proves the core wedge: Reframe turns founder/business context into content and gets sharper as the founder edits."

## 10. Landing Page Copy

H1:

Founder-led content from what already happens in your business.

Subhead:

Paste your product context, campaign goal, founder notes, and proof assets. Reframe turns them into editable content recipes, storyboards, scripts, and shot lists that learn from what you approve, reject, and rewrite.

CTA:

Build from my business context

3 feature bullets:

- Extracts your audience, pain, product promise, founder voice, CTA, and proof moments from real business context.
- Turns uploaded product photos/videos into labeled proof assets and matches them to founder-led content formats.
- Saves editorial preferences from edits, approvals, and rejections so the next draft sounds more like you.

Anti-positioning line:

Reframe is not another generic AI content generator; it starts from your business, your proof, and your editorial decisions.

## 11. Risk Register

| Risk | Severity | Decision | Mitigation |
| --- | --- | --- | --- |
| API risk: LLM output quality | Medium | KEEP P0 | Use strict JSON schemas, store raw inputs/outputs, validate every model response, and give founders editable context before generation. |
| API risk: OpenAI pricing/model changes | Medium | KEEP P0 | Keep prompts small, avoid long transcripts in P0, and review official pricing before implementation [S3]. |
| Media labeling quality | Medium | KEEP P0 | Label images and sampled frames with reasoning, not opaque confidence theater. Let founders correct labels. |
| Video rendering complexity | High | KEEP P1 | Do not render MP4 in P0. Use storyboard/script/shot-list exports first. Consider Remotion or FFmpeg later [S4][S6]. |
| ffmpeg.wasm browser complexity | Medium | CUT P0 | Avoid large browser WASM payloads and cross-origin isolation requirements in first build [S5]. |
| Social publishing complexity | High | CUT P0 | Instagram, TikTok, LinkedIn, and YouTube publishing require auth, permissions, app review or scoped API access, and platform-specific media flows [S13][S14][S16][S17]. |
| Scraping/platform risk | High | CUT | Do not scrape live social trends. It is not needed for the wedge and creates policy/reliability risk. |
| Live trend search expectation | High | CUT | Replace with curated content formats and "context fit" language. |
| Shopify OAuth complexity | Medium | CUT P0 | Use product URL or manual CSV/product export first. Full app auth can come later [S10][S11][S12]. |
| Analytics complexity | High | CUT P0 | No fake metrics. P1 can support manual metrics logging and later conversion events. |
| Overclaim risk | Critical | CUT/REWORD | Leave `/demo` alone, but remove fake publish/metrics/export from `/app`. Make every MVP claim testable. |
| Account/auth complexity | High | KEEP P0 WITH LIMITS | Use Supabase Auth, cookie SSR, profiles, workspaces, memberships, and RLS. Avoid custom auth and advanced RBAC. |
| RLS misconfiguration | High | KEEP P0 WITH LIMITS | Enable RLS on every exposed table, write explicit ownership policies, test cross-workspace denial, and keep service-role writes server-only [S23]. |
| Account enumeration from intake | High | KEEP P0 WITH LIMITS | Do not expose raw email-existence checks. Use generic auth copy/responses, throttling, and the same claim flow for new and existing users [S35][S36]. |
| Draft hijacking or stale pre-auth data | High | KEEP P0 WITH LIMITS | Store only hashed draft tokens server-side, keep raw tokens in HttpOnly cookies, expire drafts quickly, clear tokens after claim, and make claim idempotent. |
| Security/privacy risk from uploads | High | KEEP P0 WITH LIMITS | Use signed uploads, MIME/size limits, private buckets, no public service keys, explicit deletion policy, and no sensitive logs. |
| Public repo/secrets risk | High | KEEP P0 WITH LIMITS | Never commit env vars, credentials, source files containing private customer data, or generated media that should be private. |
| Before YC/demo scope creep | Critical | CUT | Avoid direct publishing, live trends, full video editor, AI video generation, and platform connectors before the wedge is real. |

## Current Repo Constraints

- The repo is Next.js 15, React 19, strict TypeScript, Tailwind, Vitest, and Testing Library.
- The only real backend path today is waitlist submission through Next route handlers and server-side Supabase/Resend fetch calls.
- `/demo` is a frontend-only seeded workflow. The audit says source reading, media sync, trend search, AI generation, export, publishing, and metrics are simulated.
- `/demo` should remain unchanged. The MVP should be built separately at `/intake`, `/intake/verify`, `/account`, and `/app/[workspaceSlug]/projects/[projectSlug]`.
- No Supabase Auth client, auth middleware, profile/workspace schema, or RLS policy set exists yet.
- No OpenAI SDK, Supabase JS client, Remotion, FFmpeg wrapper, queue, auth system, or storage upload pipeline exists in `package.json`.
- Package manager strategy is mixed (`package-lock.json` and `pnpm-lock.yaml`), so dependency additions require explicit approval.
- Existing AGENTS rules say doc-only changes can be verified by diff review.

## Research Findings

### OpenAI / LLM Structured Extraction

Structured Outputs are suitable for P0 extraction and generation because the model can be constrained to JSON Schema [S1]. Image inputs are suitable for labeling product photos and sampled video frames [S2]. This supports real brand context extraction, media labeling, recipe generation, and editorial preference inference without building a broad agent system.

### Image/Video Labeling

Image labeling is P0-feasible. Video labeling is P0-feasible only as sampled frame labeling, not full video understanding. Extract a few frames, pass them as images, and label them with reasoning. Full video transcript/scene analysis belongs in P1.

### FFmpeg / ffmpeg.wasm / Remotion

Server FFmpeg is credible for frame extraction and later rendering, but deployment details matter [S4]. ffmpeg.wasm is useful for browser experiments but has payload and isolation constraints [S5]. Remotion is credible for simple React-driven MP4 rendering, but rendering should be P1 because it adds infrastructure and operational surface [S6].

### Storage

Supabase Storage is the leanest P0 storage choice because the project already uses Supabase for waitlist persistence. R2 and S3 are both credible alternatives for presigned direct uploads, but they add new account/infrastructure surface [S7][S8][S9].

### Shopify

Shopify Storefront/Admin data is technically feasible, but full OAuth/app installation is overkill for this MVP. A product URL, pasted product copy, screenshots, or CSV export is enough to prove business-context input [S10][S11][S12].

### Social Publishing

Direct publishing is not P0. Instagram content publishing uses container creation and publish endpoints and requires platform permissions/account setup [S13]. TikTok direct posting has platform-specific initialization/upload/publish flows [S14]. LinkedIn posting uses API products and member/organization permissions [S16]. YouTube video upload is available through the Data API but requires OAuth and quota management [S17]. None of this is needed to prove the wedge.

### Live Trend Search

Live trend search is not P0. TikTok Research API is not designed as a broad commercial trend-search API for an MVP [S15]. YouTube search is available but quota-costly and does not cover TikTok/Instagram trend reality [S18]. A curated format library is more credible, cheaper, and more controllable.

### Editorial Memory

Editorial memory is the right P0 learning loop. It can be implemented with explicit events: accepted variant, rejected variant, direct text edit, regenerated beat, saved style, and exported recipe. A simple preference inference step can summarize patterns into editable preferences with evidence. This is more credible than fake performance learning because it uses actions the founder actually takes in the product.

### Accounts Management

Basic accounts are P0 because Reframe will store private founder notes, uploaded product media, generated content, and editorial memory for multiple users. Supabase Auth is the lowest-friction industry-standard path for this repo because Supabase already exists in the waitlist backend and official Next.js docs support SSR cookie sessions through `@supabase/ssr` [S21][S22]. Application-facing user data should be stored in a `public.profiles` table rather than querying the private Auth schema directly [S25].

Use workspaces, not loose per-user project ownership. The minimum credible multi-user model is `profiles`, `workspaces`, and `workspace_memberships`, with every project/media/storyboard row scoped to `workspace_id`. RLS should be enabled on all exposed tables, and policies should check `auth.uid()` against workspace membership [S23]. Private media should live in private Storage buckets with RLS and signed URLs, not public buckets [S24].

Keep accounts boring. P0 is email auth, profile basics, one default workspace, member list, role labels, and owner/admin email invites from a trusted server route. MFA, custom JWT claims, billing seats, audit logs, and enterprise SSO are P1+ [S26][S27][S28][S29].

### Intake-First Signup And Verification

The right build path is an intake draft handoff, not signup-first onboarding. Store pre-auth context in `intake_drafts`, bind it to a random draft token kept in a HttpOnly cookie, and claim it only after Supabase confirms the user's identity. This preserves the founder's context and avoids duplicate entry while keeping ownership technically defensible.

Use Supabase email/password signup with email confirmation enabled. Supabase confirms that signup may return no session until email confirmation is complete, which matches the desired "enter code, then enter workspace" flow [S30]. To make the UX code-based instead of link-only, customize Supabase's confirmation email template to include the OTP token variable [S31], then verify the supplied code with `verifyOtp` [S32]. Existing users can sign in with password or OTP and then use the same claim endpoint [S33][S35].

The unsafe version is a public endpoint that says "this email exists" or "this email is not in our database." Supabase auth docs already avoid distinguishing some account-existence cases, and OWASP explicitly recommends generic auth/registration responses to prevent enumeration [S35][S36]. If the product internally checks whether a profile/workspace exists, keep that behind a valid draft token, rate-limit it, and return product-safe states rather than reusable identity lookup results. Supabase has built-in auth rate limits, but the app should add its own throttles for intake completion and verification attempts [S34].

## Sources

Sources S1-S29 accessed on 2026-05-06. Sources S30-S36 accessed on 2026-05-07.

- [S1] OpenAI, Structured Outputs guide: https://platform.openai.com/docs/guides/structured-outputs
- [S2] OpenAI, Images and Vision guide: https://platform.openai.com/docs/guides/images-vision
- [S3] OpenAI, API pricing: https://openai.com/api/pricing/
- [S4] FFmpeg, official documentation: https://ffmpeg.org/ffmpeg.html
- [S5] ffmpeg.wasm, official docs: https://ffmpegwasm.netlify.app/docs/overview/
- [S6] Remotion, official docs: https://www.remotion.dev/docs/
- [S7] Supabase Storage, signed upload URLs: https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl
- [S8] Cloudflare R2, presigned URLs: https://developers.cloudflare.com/r2/api/s3/presigned-urls/
- [S9] AWS S3, uploading objects with presigned URLs: https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html
- [S10] Shopify Storefront API docs: https://shopify.dev/docs/api/storefront
- [S11] Shopify app authorization code grant: https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant
- [S12] Shopify product CSV export docs: https://help.shopify.com/en/manual/products/import-export/export-products
- [S13] Meta Instagram Graph API content publishing docs: https://archive.ph/2025.12.31-074218/https%3A/developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media
- [S14] TikTok Content Posting API docs: https://developers.tiktok.com/doc/content-posting-api-reference-direct-post
- [S15] TikTok Research API FAQ: https://developers.tiktok.com/doc/research-api-faq
- [S16] LinkedIn Posts API docs: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
- [S17] YouTube Data API `videos.insert`: https://developers.google.com/youtube/v3/docs/videos/insert
- [S18] YouTube Data API `search.list`: https://developers.google.com/youtube/v3/docs/search/list
- [S19] Local audit, `reframe-demo-audit.md`
- [S20] Local PRD, `docs/plans/2026-05-02-reframe-prd.md`
- [S21] Supabase, Next.js server-side auth guide: https://supabase.com/docs/guides/auth/server-side/nextjs
- [S22] Supabase, Auth users guide: https://supabase.com/docs/guides/auth/users
- [S23] Supabase, Row Level Security guide: https://supabase.com/docs/guides/database/postgres/row-level-security
- [S24] Supabase, Storage buckets fundamentals: https://supabase.com/docs/guides/storage/buckets/fundamentals
- [S25] Supabase, Managing user data: https://supabase.com/docs/guides/auth/managing-user-data
- [S26] Supabase, Multi-factor authentication guide: https://supabase.com/docs/guides/auth/auth-mfa
- [S27] Supabase, Custom Claims and RBAC: https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac
- [S28] Supabase JavaScript, `inviteUserByEmail`: https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail
- [S29] Supabase JavaScript, Auth Admin API: https://supabase.com/docs/reference/javascript/admin-api
- [S30] Supabase JavaScript, `signUp`: https://supabase.com/docs/reference/javascript/auth-signup
- [S31] Supabase, Auth email templates: https://supabase.com/docs/guides/auth/auth-email-templates
- [S32] Supabase JavaScript, `verifyOtp`: https://supabase.com/docs/reference/javascript/auth-verifyotp
- [S33] Supabase JavaScript, `signInWithOtp`: https://supabase.com/docs/reference/javascript/auth-signinwithotp
- [S34] Supabase Auth rate limits: https://supabase.com/docs/guides/auth/rate-limits
- [S35] Supabase JavaScript, `signInWithPassword`: https://supabase.com/docs/reference/javascript/auth-signinwithpassword
- [S36] OWASP Authentication Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
