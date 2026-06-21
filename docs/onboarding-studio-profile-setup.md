# First-Login Onboarding — `studio-profile` Strapi Setup

First-login onboarding (Plan 7) stores each author's profile in a new Strapi **collection type**,
`studio-profile`, looked up by the author's admin email. **This type does not exist on the deployed
sandbox** (production mode disables the content-type builder), so it must be created in your Strapi
**dev** environment using the schema below.

> **The app fails open until this type exists.** The onboarding gate's profile lookup is wrapped so
> that any error — including the `studio-profile` type not existing yet — is treated as "unknown"
> and **does not gate** anyone (a console warning is logged). Authors are only redirected to
> `/onboarding` once the lookup **succeeds** and returns no profile for them. So creating this type
> *activates* onboarding; not creating it leaves the Studio fully usable (just without onboarding).

---

## The model

Domain shape (`app/types/studio-profile.ts`):

```ts
interface StudioProfile {
  documentId: string
  authorEmail: string   // the unique lookup key (== the author's admin email)
  reviewers: string[]   // reviewer/manager emails, prefilled into the Request-review form
  center: string        // the author's ICJIA center
  publishedAt?: string | null
}
```

## Fields

| Field         | Strapi type | Settings                                  | Notes                                                        |
| ------------- | ----------- | ----------------------------------------- | ------------------------------------------------------------ |
| `authorEmail` | Text (short)| **Required**, **Unique**                  | The lookup key. One profile per author email.                |
| `reviewers`   | **JSON**    | Required                                  | An array of reviewer/manager email strings (e.g. `["a@x.gov"]`). |
| `center`      | Text (short) *or* Enumeration | Required               | The author's center. Use Enumeration if you want a fixed list. |

**Why `reviewers` is JSON (not a repeatable component):** a JSON array round-trips a plain
`string[]` with no nested-component plumbing or per-item ids, it matches how the onboarding form and
the Request-review prefill already model the reviewer list, and it avoids a component schema you would
also have to hand-create. If you later want structured reviewers (name + email), migrate to a
repeatable component then.

## Create the type (Strapi dev env)

1. In your **dev** Strapi admin, open **Content-Type Builder** → **Create new collection type**.
2. **Display name:** `Studio Profile` (Strapi derives the API ID `studio-profile` and the
   uid `api::studio-profile.studio-profile` — the uid the Studio's repository uses).
3. Add the three fields per the table above (`authorEmail` → mark **Required** + **Unique**;
   `reviewers` → **JSON**, Required; `center` → **Text** or **Enumeration**, Required).
4. **Save** (Strapi restarts to apply the schema).
5. **Permissions:** the Studio talks to the **admin Content-Manager API** with the signed-in admin's
   JWT, so admin users can already read/write content types they have access to — confirm the author
   role can **find** and **create** `Studio Profile` entries in **Settings → Administration Panel →
   Roles** if your instance restricts content-type access per role.

### Equivalent `schema.json` (for reference / a code-first content type)

If you manage content types in code (`src/api/studio-profile/content-types/studio-profile/schema.json`):

```json
{
  "kind": "collectionType",
  "collectionName": "studio_profiles",
  "info": {
    "singularName": "studio-profile",
    "pluralName": "studio-profiles",
    "displayName": "Studio Profile"
  },
  "options": { "draftAndPublish": true },
  "attributes": {
    "authorEmail": { "type": "string", "required": true, "unique": true },
    "reviewers": { "type": "json", "required": true },
    "center": { "type": "string", "required": true }
  }
}
```

## After creating the type — confirm onboarding (post-plan check)

1. Sign in to dev Strapi as a **real author** (a `strapi-author` admin) with **no** profile yet →
   the Studio should redirect you to `/onboarding`.
2. Enter one or more reviewer emails + pick a center → **Save** → you land on the dashboard and are
   not asked again on the next sign-in (the profile now resolves).
3. Open a draft's **Request review** form → the reviewer field is **prefilled** from your profile.
4. Sign in as an **editor / super-admin** → you are **never** sent to `/onboarding`.
5. Temporarily rename/remove the type (or simulate a lookup error) → confirm authors are **not**
   gated (fail-open) and a console warning is logged.
