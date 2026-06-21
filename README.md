# ICJIA Research Hub Studio 2026

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> This website is funded through a grant from the Bureau of Justice Statistics, Office of Justice Programs, U.S. Department of Justice. Neither the U.S. Department of Justice nor any of its components operate, control, are responsible for, or necessarily endorse, this website (including, without limitation, its content, technical infrastructure, and policies, and any services or tools provided).

## TL;DR — the 30-second version

- **What it is:** the internal tool ICJIA staff use to write, preview, and publish Research Hub content (articles, apps, datasets).
- **Status:** built and working in development — you can click through a complete demo today.
- **How it works:** authors draft in a plain-English editor with a live "exactly-as-published" preview; a manager clicks **Publish**.
- **Security:** independently red/blue-team audited — **0 critical issues**; in-repo fixes done and covered by 375 automated tests ([`docs/security-audit.md`](docs/security-audit.md)).
- **What's left:** setup on the Strapi / email side (Research &amp; Analysis) and a short launch checklist — not new building.

*That's the whole project in five lines. Everything below is supporting detail — read only what you need.*

Internal authoring &amp; publishing tool (**"Studio"**) for managing **ICJIA Research Hub** content — **articles, apps, and datasets** — backed by Strapi 5.

This is a ground-up rebuild of the 2019 [`researchhub-studio`](https://github.com/icjia/researchhub-studio) on a modern stack, with a simplified two-role workflow and proper (non-base64) image handling.

## Status: built and working in development (pre-launch)

The core Studio is **built and working** — authoring, the live "exactly-as-published" preview, publishing, image handling, and a full clickable demo are all in place and covered by automated tests. It remains in **active development** ahead of launch: requirements are still refined as we go (for example, authentication moved from the public REST API to Strapi's admin **Content-Manager API** once we confirmed how the publish roles work), and the Strapi / email setup plus a short launch checklist remain. The full design and the security review live here:

- 📄 [**Design &amp; Implementation Spec**](docs/ICJIA-Research-Hub-Studio-2026-Design-and-Implementation-Spec.md) ([Word version](docs/ICJIA-Research-Hub-Studio-2026-Design-and-Implementation-Spec.docx)) — plain-English for managers **and** technical detail for developers; opens with a 30-second TL;DR.
- 🔒 [**Security audit**](docs/security-audit.md) — independent red/blue team review (running log below).

## Workflow

- **Authors** log in, write an article in a friendly markdown editor (formatting buttons + live preview, no code), add images from the Media Library, and save a **draft**.
- **Managers** review the list of pending drafts and click **Publish** — which marks the content published in Strapi and triggers a rebuild of the public site.

That's the whole lifecycle: **Authors draft → Managers publish.**

## Stack

- [Nuxt 4](https://nuxt.com/) (SPA mode) + [Vue 3](https://vuejs.org/)
- [Nuxt UI 4](https://ui.nuxt.com/) (Tailwind CSS v4)
- [Pinia](https://pinia.vuejs.org/) for state, TypeScript throughout
- [Strapi 5](https://strapi.io/) backend (REST + Upload), native **Draft &amp; Publish**
- Markdown authoring via the [ICJIA Markdown Editor 2026](https://github.com/ICJIA/icjia-markdown-editor-2026), consumed as a **Nuxt layer**

## Key principles

- **Zero base64 images.** Every image is a Strapi Media Library upload, referenced by relation or URL — never embedded as a `data:` blob.
- **Native Draft &amp; Publish.** No custom status workflow.
- **Server-enforced roles.** Only Managers can publish.

## Backend

Strapi 5 — `https://v2.hub.icjia-api.cloud` (GraphQL + REST). The schema is modernized and at content parity with the legacy Strapi 3 instance. **Do not modify the backend without coordination.**

## Security audits

A running log of red / blue team security audits. The **latest** summary is shown; earlier audits are collapsed under *Previous audits*. Full reports live in [`docs/security-audit.md`](docs/security-audit.md).

<!-- Maintenance: when a new audit is run, move the current "Latest" block into a new entry under "Previous audits" below, then replace the Latest block with the new summary. -->

### Latest — 2026-06-21 · Red / Blue Team

**Posture: strong** for a client-side staff tool — **0 Critical**, nothing confirmed-exploitable in the production path.

| Critical | High | Medium | Low | Info |
|:--:|:--:|:--:|:--:|:--:|
| 0 | 1 | 4 | 4 | 4 |

- **Top risk (H-1):** no Content-Security-Policy / security headers, plus the admin JWT in a JS-readable cookie → **add a CSP**.
- **Other findings:** unthrottled review-email relay (M-5); client-only SVG / document-upload validation (M-3, M-4); fragile TOC id injection (M-2).
- **Blue-team credit:** single `html:false` markdown seam, `safeHref` URL allowlist, default-deny routing with Strapi as the real authority, server-isolated secrets, dev bypass fails closed.
- **Report:** [`docs/security-audit.md`](docs/security-audit.md) — reviewed `0f42014`, committed `5f4c951`.
- **Remediation (2026-06-21):** in-repo findings addressed in `e402f3d` — security headers + CSP, email rate-limit, AST-based TOC ids, dataset URL gate, hard base64 write-guard, 403 logout, Dependabot (375 tests). Open: the CSP needs a Netlify deploy-preview check; the dev-login removal + Strapi-side config are launch-time.

<details>
<summary><strong>Previous audits</strong></summary>

_No earlier audits yet — 2026-06-21 is the first._

</details>

## Repository layout

```text
app/         # Nuxt 4 app — pages, components, composables, stores, lib/ (pure logic)
server/api/  # server routes (e.g. the review-email endpoint)
public/      # static assets + _headers (CSP / security headers)
tests/       # Vitest unit + Nuxt component tests
docs/        # design & implementation spec, security audit, + v1 reference dump
```

The Nuxt 4 application is built out under `app/` (with pure, unit-tested logic in `app/lib/`), server routes under `server/`, and tests under `tests/` — see the spec for the architecture.

## Reference

- Legacy app (v1): https://github.com/icjia/researchhub-studio
- Markdown editor: https://github.com/ICJIA/icjia-markdown-editor-2026

## License

[MIT](LICENSE) © 2026 Illinois Criminal Justice Information Authority
