# ICJIA Research Hub Studio 2026

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> This website is funded through a grant from the Bureau of Justice Statistics, Office of Justice Programs, U.S. Department of Justice. Neither the U.S. Department of Justice nor any of its components operate, control, are responsible for, or necessarily endorse, this website (including, without limitation, its content, technical infrastructure, and policies, and any services or tools provided).

Internal authoring &amp; publishing tool (**"Studio"**) for managing **ICJIA Research Hub** content — **articles, apps, and datasets** — backed by Strapi 5.

This is a ground-up rebuild of the 2019 [`researchhub-studio`](https://github.com/icjia/researchhub-studio) on a modern stack, with a simplified two-role workflow and proper (non-base64) image handling.

## Status: 🚧 Draft 1 — first iteration (in active development)

**This is Draft 1: the first exploratory iteration.** Requirements are being discovered *as the build proceeds*, so design decisions evolve — for example, this iteration moved authentication and content access from the public REST API to Strapi's admin **Content-Manager API** once we confirmed how the publish roles actually work. Treat everything in this repo — README, spec, and plans — as a **living first draft**, not a frozen final design.

Underway: the project foundation, Strapi 5 authentication, and the typed data layer. The full design lives here:

- 📄 [**Design spec**](docs/superpowers/specs/2026-06-19-researchhub-studio-2026-design.md) — dual-audience: plain-English for managers **and** technical detail for developers.

## Workflow

- **Authors** log in, write an article in a friendly markdown editor (formatting buttons + live preview, no code), add images from the Media Library, and save a **draft**.
- **Managers** review the list of pending drafts and click **Publish** — which marks the content published in Strapi and triggers a rebuild of the public site.

That's the whole lifecycle: **Authors draft → Managers publish.**

## Stack (planned)

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

## Repository layout

```text
docs/
  superpowers/specs/                 # design specs
  icjia-researchhub-studio-*.txt     # v1 code dump (reference only)
```

Application scaffolding (Nuxt app, components, composables, stores) will be added during implementation — see the spec.

## Reference

- Legacy app (v1): https://github.com/icjia/researchhub-studio
- Markdown editor: https://github.com/ICJIA/icjia-markdown-editor-2026

## License

[MIT](LICENSE) © 2026 Illinois Criminal Justice Information Authority
