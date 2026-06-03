/**
 * API base URL for production (Vercel). Empty in dev → Vite proxies `/api` to localhost:8000.
 * @returns {string}
 */
export function getApiBaseUrl() {
  const base = import.meta.env.VITE_API_URL ?? ''
  return base.replace(/\/$/, '')
}

/**
 * @param {string} path - e.g. `/api/auth/login`
 * @returns {string}
 */
export function apiUrl(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`
  const base = getApiBaseUrl()
  return base ? `${base}${normalized}` : normalized
}

/**
 * @param {string} path
 * @param {RequestInit} [options]
 * @returns {Promise<Response>}
 */
export function apiFetch(path, options = {}) {
  return fetch(apiUrl(path), options)
}
