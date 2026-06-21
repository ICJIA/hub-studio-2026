// Audit L-5: choose what the global error page shows WITHOUT ever leaking raw error.message /
// stack to users in production. In production the non-404 body is a fixed generic string; only in
// dev (isDev) do we surface the thrown message to aid local debugging. 404 stays generic in both.
// Pure + isDev-injected so both branches are unit-testable regardless of the runtime env.

export interface DisplayableError { statusCode?: number; message?: string }

const GENERIC_BODY = 'Something went wrong. Please try again, or return to the dashboard.'

/** Heading text for the error page. */
export function errorHeading(error: DisplayableError | null | undefined): string {
  return error?.statusCode === 404 ? 'Page not found' : 'Something went wrong'
}

/** Body text. 404 → generic not-found; otherwise dev shows the message, prod shows a generic line. */
export function errorBody(error: DisplayableError | null | undefined, isDev: boolean): string {
  if (error?.statusCode === 404) return 'That page does not exist.'
  if (isDev) return error?.message || 'Unexpected error.'
  return GENERIC_BODY
}
