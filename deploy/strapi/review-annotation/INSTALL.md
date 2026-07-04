# Installing the `review-annotation` content type (Strapi 5)

Drop-in for the Studio's reviewer-annotation feature (Phase 2 — see
`docs/superpowers/specs/2026-07-04-reviewer-annotations-design.md` §8). Content types are
CODE in Strapi: they cannot be created remotely with an API token or on a production-mode
server. This folder is copied into the Strapi PROJECT and deployed like any code change.

## Steps

1. Copy this folder into the Strapi project as `src/api/review-annotation/`
   (so the schema lands at `src/api/review-annotation/content-types/review-annotation/schema.json`).
   If the Strapi project is JavaScript, rename the three `.ts` stubs to `.js` and change each to
   `const { factories } = require('@strapi/strapi')` + `module.exports = factories.createCore…(…)`.
2. Deploy / restart Strapi. The type appears in the admin under Content Manager.
3. Permissions — Settings → Administration panel → Roles:
   - **Author** and **Editor** (and Super Admin implicitly): grant full Create / Read /
     Update / Delete on **Review Annotation**. RBAC stays coarse on purpose — the Studio
     enforces the finer creator-or-Editor delete rule in the UI (spec §1).
   - **Settings → Users & Permissions plugin → Roles → Public (and Authenticated):**
     leave Review Annotation at ZERO access. Review threads are internal workflow data
     and must not be exposed via the public REST/GraphQL surface.
4. Optional smoke test with the dev API token (server-side only — never ship it to a client):
   `curl -H "Authorization: Bearer $STRAPI_API_TOKEN" https://v2.hub.icjia-api.cloud/api/review-annotations`
   Expect `200 {"data":[]}` if the token's scope includes the new type, or `403` if not —
   either confirms the type exists. The Studio itself reaches the type via the
   Content-Manager admin API with the signed-in admin JWT, not this token.

## Field notes

- `targetDocumentId` is a plain string (the annotated entry's documentId) — deliberately
  NOT a relation, because one field can't relate to all three content types.
- `comments` is a JSON array (`{ id, body, authorName, authorEmail, createdAt }[]`);
  `comments[0]` is the annotation's initial note.
- Draft & Publish is OFF — annotations have no draft state.
