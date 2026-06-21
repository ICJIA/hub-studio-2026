# Publish → Rebuild, and the Review-Email — Setup

This Studio publishes content via the Strapi Content-Manager **publish action**. Two pieces of the
publish/review loop are **operator configuration**, not application code:

1. **Rebuild on publish** — a **Strapi webhook** that calls a **Netlify build hook**. (No Studio
   code triggers the rebuild; the build-hook URL is a secret that lives ONLY in Strapi.)
2. **The review email** — sent by the Studio's own server route via **Mailgun**, configured with
   the environment variables below.

---

## 1. Rebuild on publish (Strapi webhook → Netlify build hook)

### a. Create the Netlify build hook (in Netlify)
1. Netlify → your **public Hub** site → **Site settings** → **Build & deploy** → **Build hooks**.
2. **Add build hook** → name it e.g. `strapi-publish` → choose the production branch → **Save**.
3. Copy the generated URL (looks like `https://api.netlify.com/build_hooks/XXXXXXXX`). **Treat it as a
   secret** — anyone with it can trigger a build.

### b. Create the Strapi webhook (in the Strapi admin panel)
1. Strapi admin → **Settings** → **Webhooks** → **Create new webhook**.
2. **Name:** `Netlify rebuild on publish`.
3. **URL:** paste the Netlify build-hook URL from step (a).
4. **Events:** enable **`entry.publish`** (and optionally **`entry.unpublish`** so an unpublish also
   rebuilds). Leave create/update/delete off unless you also want drafts to rebuild the site.
5. **Save**, then use **Trigger** to fire a test event and confirm a Netlify build starts.

That is the entire "rebuild" wiring. When a manager clicks **Publish** in the Studio, Strapi sets
`publishedAt`, fires `entry.publish`, and Netlify rebuilds the public Hub.

---

## 2. Review-email environment variables

The review-email route (`server/api/request-review.post.ts`) reads these at runtime. Set them in
the **Studio's** Netlify site (Site settings → Environment variables) — and locally in a `.env` that
is **NOT committed**.

| Variable           | Scope        | Example                                         | Purpose                                                        |
| ------------------ | ------------ | ----------------------------------------------- | -------------------------------------------------------------- |
| `MAILGUN_API_KEY`  | **server**   | `key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`           | Mailgun private API key (HTTP Basic `api:<key>`). **Secret.**  |
| `MAILGUN_DOMAIN`   | **server**   | `mg.studio.example.gov`                          | Mailgun sending domain (`POST /v3/{domain}/messages`).         |
| `MAILGUN_FROM`     | **server**   | `ICJIA Studio <noreply@mg.studio.example.gov>`  | The `From` header on review emails.                            |
| `PUBLIC_BASE_URL`  | public       | `https://studio.example.gov`                    | The Studio origin used to build the absolute `/preview/...` link. |

Notes:
- `MAILGUN_API_KEY` is **server-only** — it is read from `runtimeConfig.mailgunApiKey` inside the
  Nitro route and **never** shipped to the browser. Do not move it under `runtimeConfig.public`.
- `PUBLIC_BASE_URL` is **not** a secret (it is just the site's public origin); it is exposed via
  `runtimeConfig.public.publicBaseUrl` so the email's preview link is absolute.
- The route also reuses `runtimeConfig.public.strapiBaseUrl` to verify the caller's session
  (`GET /admin/users/me`) before sending — this prevents the endpoint from being an open spam relay.
- The Netlify **build-hook** URL from section 1 is configured in **Strapi**, NOT here, and is never
  an env var of the Studio.
