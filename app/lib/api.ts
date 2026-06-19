import { ofetch, type $Fetch } from 'ofetch'

/** Returns a Headers object with the Bearer token applied when present. */
export function buildAuthHeaders(headers: HeadersInit | undefined, token: string | null): Headers {
  const result = new Headers(headers)
  if (token) result.set('Authorization', `Bearer ${token}`)
  return result
}

export interface CreateApiClientOptions {
  baseURL: string
  getToken: () => string | null
  onUnauthorized?: () => void
}

/** Builds a configured ofetch instance for the Strapi REST API. */
export function createApiClient(opts: CreateApiClientOptions): $Fetch {
  return ofetch.create({
    baseURL: opts.baseURL,
    onRequest({ options }) {
      options.headers = buildAuthHeaders(options.headers, opts.getToken())
    },
    onResponseError({ response }) {
      if (response.status === 401) opts.onUnauthorized?.()
    },
  })
}

declare module '#app' {
  interface NuxtApp {
    $api: $Fetch
  }
}
declare module 'vue' {
  interface ComponentCustomProperties {
    $api: $Fetch
  }
}
