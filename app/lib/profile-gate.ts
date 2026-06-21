// The FAIL-OPEN first-login profile check (Plan 7 — the single most important safety property).
// Determines whether a LOGGED-IN AUTHOR has completed onboarding, returning:
//   true   — the author has a studio-profile (do not gate)
//   false  — the lookup RESOLVED and the author has NO profile (the ONLY state that gates)
//   null   — unknown / do not gate: a publisher (never gated), no email, OR ANY lookup error
//            (404 / 400 / network / the studio-profile type not existing yet). Pure + DI so the
//            fail-open behaviour is node-tested with a throwing findByAuthorEmail.
export interface ProfileGateDeps {
  /** Editors/super-admins (canPublish) are NEVER gated — the check is skipped for them. */
  canPublish: boolean
  /** The author's admin email (the profile lookup key). */
  email: string | null | undefined
  /** Resolve the author's profile (or null). May THROW if the type does not exist yet. */
  findByAuthorEmail: (email: string) => Promise<{ documentId: string } | null>
}

export async function resolveHasProfile(deps: ProfileGateDeps): Promise<boolean | null> {
  // Publishers are never gated.
  if (deps.canPublish) return null
  // Without an email we cannot look up a profile — do not gate.
  if (!deps.email) return null

  try {
    const profile = await deps.findByAuthorEmail(deps.email)
    return profile != null
  } catch (e) {
    // FAIL-OPEN: any error (incl. the studio-profile type not existing yet) ⇒ unknown ⇒ never gate.
    console.warn('[onboarding] profile lookup failed; not gating', e)
    return null
  }
}
