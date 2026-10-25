// Thin fetch wrapper. Create one client per backend with createApiClient(),
// or use the default `api` client for our own Express server.
import { tokenStore } from '@/lib/token-store'

const DEFAULT_TIMEOUT_MS = 15000

export class ApiError extends Error {
  constructor(message, { status, data, url, cause } = {}) {
    super(message, { cause })
    this.name = 'ApiError'
    // 0 means the request never got a response (network error, timeout, abort)
    this.status = status ?? 0
    this.data = data
    this.url = url
  }

  get isNetworkError() {
    return this.status === 0
  }
}

function buildUrl(baseUrl, path, query) {
  const joined = `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
  const url = new URL(joined, globalThis.location?.origin)

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null) continue
    for (const item of Array.isArray(value) ? value : [value]) {
      url.searchParams.append(key, String(item))
    }
  }
  return url.toString()
}

// FormData, Blob etc. are sent as-is so the browser sets the right Content-Type
function isRawBody(body) {
  return (
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof URLSearchParams ||
    body instanceof ArrayBuffer ||
    typeof body === 'string'
  )
}

async function parseBody(response) {
  if (response.status === 204) return null
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) return response.json()
  const text = await response.text()
  return text || null
}

export function createApiClient({
  baseUrl,
  headers: defaultHeaders = {},
  getToken,
  timeout: defaultTimeout = DEFAULT_TIMEOUT_MS,
  credentials,
  onError,
} = {}) {
  if (!baseUrl) throw new Error('createApiClient: baseUrl is required')

  async function request(path, { method = 'GET', query, body, headers, signal, timeout } = {}) {
    const url = buildUrl(baseUrl, path, query)
    const token = await getToken?.()

    const finalHeaders = new Headers({ Accept: 'application/json', ...defaultHeaders, ...headers })
    if (token) finalHeaders.set('Authorization', `Bearer ${token}`)

    let finalBody = body
    if (body !== undefined && !isRawBody(body)) {
      finalHeaders.set('Content-Type', 'application/json')
      finalBody = JSON.stringify(body)
    }

    const signals = [AbortSignal.timeout(timeout ?? defaultTimeout)]
    if (signal) signals.push(signal)

    let response
    try {
      response = await fetch(url, {
        method,
        headers: finalHeaders,
        body: finalBody,
        credentials,
        signal: AbortSignal.any(signals),
      })
    } catch (err) {
      const message = err.name === 'TimeoutError' ? 'Request timed out' : 'Network error'
      const error = new ApiError(message, { url, cause: err })
      onError?.(error)
      throw error
    }

    const data = await parseBody(response)

    if (!response.ok) {
      const message = data?.error ?? data?.message ?? `Request failed with status ${response.status}`
      const error = new ApiError(message, { status: response.status, data, url })
      onError?.(error)
      throw error
    }

    return data
  }

  return {
    request,
    get: (path, options) => request(path, { ...options, method: 'GET' }),
    post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
    put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
    patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
    delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
  }
}

// Our Express backend. In dev, Vite proxies /api to it (see vite.config.js).
export const api = createApiClient({
  baseUrl: import.meta.env?.VITE_API_URL || '/api',
  getToken: () => tokenStore.get(),
  // An expired or revoked token is useless, so drop it and let the UI ask for a login
  onError: (error) => {
    if (error.status === 401) tokenStore.clear()
  },
})
