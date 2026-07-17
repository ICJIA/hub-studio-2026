# Demo → Production cutover runbook

How to move the Studio from the public demo (static, in-memory, `admin/admin`) to the live
production deploy (real Strapi 5 content, real annotations, real admin auth). Written
2026-07-05, when everything except the Strapi-side install and the deploy switches already
ships in this repo. Updated 2026-07-11: the §3 noindex hardening has shipped, and CI
(`.github/workflows/ci.yml`) now carries the dev-bypass **launch gate** (see §6).

**The short version:** production is not a different app — it is the SAME build with
`NUXT_PUBLIC_DEMO_MODE` unset, built with `npm run build` instead of `nuxt generate`, plus a
handful of secrets. Every demo behavior (demo login, in-memory content, localStorage
annotations, blocked writes) keys off that one flag and disables itself. The work below is
mostly Strapi-side setup and verification, not code.

---

## 0. What flips automatically (no work, but know it)

| Concern | Demo build (`NUXT_PUBLIC_DEMO_MODE=true`) | Production build (flag unset) |
| --- | --- | --- |
| Login | Demo bypass + role buttons only; real login impossible | Real Strapi admin login (`/admin/login` → JWT → `/admin/users/me` with roles); the bypass code ships but is unreachable (`import.meta.dev` and `demoMode` both false) |
| Content | In-memory demo repository, seeded synthetic articles | `$api` → Content-Manager API on `https://v2.hub.icjia-api.cloud` |
| Annotations | localStorage adapter (per-browser) | Strapi adapter → `review-annotation` content type (shared across reviewers/devices) — selected by `isDemoData()` in `app/composables/useAnnotations.ts` |
| Writes | Hard-blocked (`assertWritesAllowed()` throws) | Real creates/updates/publish via the admin JWT |
| Sample-content generators | Local dev only (`import.meta.dev` — already absent from the deployed demo) | Absent |
| CSP / headers | `deploy/headers-demo.txt` copied over `_headers` (connect-src 'self') | `public/_headers` production set (connect-src limits to the Strapi host + Mailgun) |
| Server routes | None (pure static) | `server/api/request-review.post.ts` deploys as a Netlify Function (Mailgun + rate limit) |

The Strapi host is **hardcoded** in `studio.config.ts` (`strapiBaseUrl: 'https://v2.hub.icjia-api.cloud'`
when not demo). If the production API lives elsewhere, edit that line AND the `connect-src`
entry in `public/_headers` together.

---

## 1. Strapi-side setup (owner: whoever deploys the Strapi project)

Do this any time before cutover — it does not affect the running Hub.

1. **Install the `review-annotation` content type.** Follow
   `deploy/strapi/review-annotation/INSTALL.md` exactly: copy the folder into the Strapi
   project as `src/api/review-annotation/`, deploy/restart. Content types are code in
   Strapi — this cannot be done through the admin UI or an API token.
2. **Permissions** (also in INSTALL.md):
   - Admin roles: **Author** and **Editor** get full CRUD on **Review Annotation**
     (Settings → Administration panel → Roles). The Studio enforces the finer
     creator-or-editor rules in the UI.
   - **Users & Permissions → Public and Authenticated: ZERO access** to Review Annotation.
     Review threads are internal workflow data; they must never appear on the public REST/GraphQL surface.
3. **Confirm the content-side roles for articles/apps/datasets** match what the Studio
   expects: Authors create/update drafts (no publish); Editors also publish/unpublish.
   The Studio's publish button is defense-in-depth — Strapi's server-side RBAC is the real gate.
4. **Create the real admin accounts** (Author/Editor roles) for everyone who had been using
   the demo. No Studio-side user provisioning exists — accounts live in Strapi.
5. **Smoke test** (from INSTALL.md): `GET /api/review-annotations` with the dev API token —
   `200 {"data":[]}` or `403` both prove the type deployed.
6. **CORS.** The Studio browser calls Strapi's admin + content-manager routes cross-origin
   (`app/plugins/api.ts` uses `strapiBaseUrl` directly — no proxy). If the Strapi project
   restricts CORS origins, add the Studio's production origin AND the staging origin used in
   §2. Symptom if missed: login fails with CORS errors in the console, not a 401.
7. **Media Library update permission.** Grant the Author and Editor roles the upload
   plugin's *update file info* action — the Studio's library picker writes alt text back to
   alt-less images (`POST /upload?id=<id>` with `fileInfo`). Verify during the staging
   rehearsal (§2): pick an alt-less image as an Author, supply alt, confirm the record
   updates.

> **Order matters:** finish this section on the PRODUCTION Strapi before starting §2 —
> the staging Studio talks to the production instance (see the warning below).

## 2. Staging validation (do this BEFORE approval day)

Stand up a second Netlify site (or a branch deploy) so the public demo keeps running
untouched. Point it at the SAME repo with the production build settings from §3.

> **⚠️ Staging writes to the PRODUCTION Strapi.** `strapiBaseUrl` is hardcoded to
> `https://v2.hub.icjia-api.cloud` whenever the demo flag is unset (`studio.config.ts`) —
> there is no separate staging backend unless you temporarily edit that line (and the
> `connect-src` in `public/_headers`) to point at one. If you validate against production:
> use clearly-named throwaway drafts (e.g. `ZZZ Staging Test — delete me`), do the
> publish/unpublish round-trip on that throwaway only, and delete the test drafts and test
> annotations afterward.

Checklist — every line exercised with a real Strapi account, none with admin/admin:

- [ ] Real login as an **Author**: sees drafts, no Publish control anywhere. (A CORS error
      in the console here means §1.6 wasn't done.)
- [ ] Real login as an **Editor**: sees Publish/Unpublish + the queue.
- [ ] **First login of a brand-new account**: the onboarding/profile gate behaves — create
      the Studio profile, land on the dashboard; second login skips the gate. (The gate is
      FAIL-OPEN by design: an API error must never lock anyone out.)
- [ ] Content list shows REAL articles; open one in the editor; edit + save a draft; confirm
      the change in the Strapi admin.
- [ ] **Edit-conflict round-trip (two browsers):** open the SAME draft for edit as user A
      (one browser) and user B (a second browser or machine). Save as A first, then save as
      B — confirm B's save is stopped by the conflict banner ("This draft was changed by
      someone else while you were editing…") showing A's save time. Exercise both choices
      from B's side on repeat attempts: **Save anyway** (confirm A's edit is overwritten in
      Strapi) and **Load their version** (confirm B's own in-progress edits reappear via the
      restore banner afterward, and A's content is now in B's form).
- [ ] **Filters wire format:** use the Type filter and the title search box and confirm each
      returns real (filtered) results, not an error toast/blank list. These — plus
      `studio-profile`'s first-login author-email lookup — are the first live-mode calls to
      exercise `repository.ts`'s filter query params; a prior bug sent them as a JSON-stringified
      `filters` value (`ofetch`/`ufo` has no custom query serializer for nested objects), which
      Strapi 5's qs-based parser rejects. Fixed to flat bracket-key params
      (`filters[title][$containsi]=...`), but this repo cannot reach live Strapi to confirm —
      this is the first empirical check. Quick manual cross-check with curl (admin JWT from
      devtools → Network → any `content-manager` request → `Authorization` header):
      `curl -H "Authorization: Bearer <admin JWT>" "https://v2.hub.icjia-api.cloud/content-manager/collection-types/api::article.article?filters%5Btitle%5D%5B%24containsi%5D=a"`
      → `200` with a `results` array, NOT a `400` ("The filters parameter must be an object or
      an array").
- [ ] **Annotations end-to-end:** in the Live preview (and on `/preview/...`), highlight →
      comment → reply → resolve → delete. Then the cross-user test: annotate as user A,
      open the same draft as user B on another machine — the thread is there; reply as B;
      reload as A. (Freshness model is refetch-on-open + after-write; there is no live push.)
- [ ] Verify rows land in Strapi under **Review Annotation** and are **absent** from the
      public API (`/api/review-annotations` unauthenticated → 403/404).
- [ ] Publish + unpublish an article as Editor; confirm on the public Hub side.
- [ ] **Request review** email: submit the form; confirm the Mailgun send and the rate limit
      (6th request inside 10 minutes → 429).
- [ ] **CSP check** (README "Action required before launch"): open devtools on the staging
      deploy — if a Nuxt bootstrap inline script is blocked, add its `sha256` hash to
      `script-src` in `public/_headers`. Never add `'unsafe-inline'` to production.
- [ ] Uploads: add a splash image / main-file PDF via the Media Library path; confirm no
      base64 ever hits the payload (the write guard throws if it does).
- [ ] Annotation failure UX: kill the network (devtools offline) and try to comment — the
      composer stays open with the text preserved; nothing is silently lost.

## 3. Netlify production configuration

On the production site (Site settings → Build & deploy + Environment variables):

**Build settings** — edit `netlify.toml` (or override in the UI for the production site only,
leaving the demo site's TOML untouched — see note below):

```toml
[build]
  command = "npm run build"     # Nitro build (server functions), NOT `nuxt generate`
  publish = "dist"
  # DELETE the `cp deploy/headers-demo.txt dist/_headers` step — production keeps public/_headers
  [build.environment]
    # NUXT_PUBLIC_DEMO_MODE deliberately ABSENT
```

> Two-sites note: `netlify.toml` in the repo currently configures the DEMO. If demo and
> production deploy from the same repo simultaneously, keep the TOML as the demo config and
> set the production site's build command + env in the Netlify UI (UI settings apply when the
> site is configured to ignore/override the TOML), or maintain a `production` branch whose
> TOML is the production version. Decide once, write it down here.

**Environment variables (production site only):**

| Variable | Value | Notes |
| --- | --- | --- |
| `MAILGUN_API_KEY` | (secret) | server-only; request-review emails |
| `MAILGUN_DOMAIN` | e.g. `mg.icjia.example` | server-only |
| `MAILGUN_FROM` | e.g. `Studio <studio@…>` | server-only |
| `PUBLIC_BASE_URL` | the Studio's production URL | used for links in the review email |
| `NUXT_PUBLIC_DEMO_MODE` | **unset / absent** | presence of `true` = demo build |

No Strapi secret is needed in the Studio: users authenticate with their own admin JWTs.

~~Optional hardening: consider adding `X-Robots-Tag: noindex`~~ **Done (2026-07-11):**
both header sets now send `X-Robots-Tag: noindex` and `public/robots.txt` disallows all
crawling (unit-tested in `tests/unit/security-headers.test.ts`) — no action needed here.

## 4. Cutover day (≈30 minutes once §1–§3 are done)

1. Freeze: no demo pushes to `main` during the window.
2. Flip the production site's build settings + env per §3 (or merge the production TOML).
3. Trigger the deploy; watch the Netlify build log — expect **functions deployed** (the
   request-review route), unlike the demo's "No functions deployed".
4. Run the §2 checklist's top five lines against production (login ×2 roles, real content,
   one annotation round-trip, one publish round-trip).
5. **Custom domain, if one is planned** (e.g. `studio.icjia.example`): add it to the
   production Netlify site, wait for DNS + the auto-provisioned certificate, and re-run the
   login smoke test from that hostname (it must also be in Strapi's CORS allowlist, §1.6).
   Do this before announcing — HSTS (`max-age=31536000`) makes the hostname hard to walk back.
6. Point people at the production URL. The demo site can keep running as long as it's useful —
   it is isolated by design (own site, own flag, zero backend reach).
7. Tag the release: version + date in `CHANGELOG.md` (per repo convention), `git tag`.

## 5. Rollback

The demo is unaffected by anything above, so rollback is only about the production site:

- Bad build → Netlify → Deploys → **Publish** the previous known-good deploy (instant).
- Bad config → restore §3 settings; redeploy.
- Strapi-side trouble with `review-annotation` → the Studio degrades cleanly: annotation
  calls fail with toasts/console errors but drafts, editing, and publishing are untouched
  (the adapter is only reached from the preview surfaces).

## 6. Known launch-posture decisions (documented, deliberate)

- **Annotation freshness:** refetch on preview open and after every write. No polling, no
  websockets. Two reviewers replying to the *same thread* in the same instant is
  last-write-wins (`addComment` re-fetches then PUTs the whole row). Fine at ICJIA review
  volumes; revisit only if it ever bites.
- **Annotation ids:** in production, an annotation's id IS its Strapi `documentId` (the
  target entry's id lives in `targetDocumentId`). localStorage (demo) ids are client UUIDs.
- **Demo annotations do not migrate.** localStorage threads live in individual browsers and
  reference synthetic demo documentIds; they are demonstration data by definition. Anything
  worth keeping should be re-entered against real drafts after cutover.
- **Coarse RBAC on annotations** (any Author/Editor can CRUD all of them at the API level)
  is intentional for launch; the UI enforces the polite rules.
- **Non-blocking polish backlog:** the Phase-1 final review logged a hardening follow-up
  list at the end of `.superpowers/sdd/progress.md` (annotation a11y riders: swatch
  radiogroup semantics, roving toolbar tabindex, drawer dialog semantics, document-level
  keyboard-create listener). None block launch; keep them visible.
- **Dev bypass ships-but-unreachable — and the CI launch gate.** `app/lib/dev-auth.ts`
  stays in the repo because the public demo's role buttons depend on it; in a production
  build it is unreachable (both activation switches false) and its sentinel token fails
  closed — the audited, accepted posture. CI runs a **positive control** on every demo
  build (`scripts/check-dev-bypass.mjs … --expect present`) so the sentinel scan can never
  rot. **If the demo site is ever retired** (or pinned to an old deploy) and `dev-auth.ts`
  is deleted, uncomment the "Dev-bypass launch gate" step in `.github/workflows/ci.yml` in
  the same PR — from then on CI proves every production bundle ships without the bypass.
