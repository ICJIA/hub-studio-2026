# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial repository scaffolding: `README.md`, `LICENSE` (MIT), `.gitignore`, `CHANGELOG.md`.
- Design spec for the Strapi 5 rebuild: [`docs/superpowers/specs/2026-06-19-researchhub-studio-2026-design.md`](docs/superpowers/specs/2026-06-19-researchhub-studio-2026-design.md) — a dual-audience document (plain-English for managers + technical detail for developers) covering:
  - Stack: Nuxt 4 (SPA) + Nuxt UI 4 + Pinia + TypeScript, talking to Strapi 5 over REST.
  - Two-role workflow on native Strapi 5 **Draft & Publish** — Authors draft, Managers publish.
  - **Zero-base64** image handling via the Strapi Media Library (media relations + URL references).
  - Reuse of the ICJIA Markdown Editor 2026 as a shared **Nuxt layer**, extended with a Strapi image-upload hook.
  - Publish → build-hook flow to rebuild the public Research Hub site.
- v1 code dump retained under `docs/` for reference only.

### Notes

- Project is in the **design phase**; application implementation has not started.
- Backend (Strapi 5) is managed separately and must not be modified without coordination.

[Unreleased]: https://github.com/icjia/hub-studio-2026
