import { apiFetch, apiUrl } from './client.js'

const TOKEN_KEY = 'tldr-auth-token'

export function getStoredToken() {
  return window.localStorage.getItem(TOKEN_KEY)
}
export function setStoredToken(token) {
  window.localStorage.setItem(TOKEN_KEY, token)
}
export function clearStoredToken() {
  window.localStorage.removeItem(TOKEN_KEY)
}

function authHeaders() {
  const token = getStoredToken()
  const h = { 'Content-Type': 'application/json' }
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

export async function register(email, password, name = '') {
  const res = await apiFetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Registration failed')
  setStoredToken(data.token)
  return data
}

export async function loginWithEmail(email, password) {
  const body = password ? { email, password } : { email }
  const res = await apiFetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Could not sign in')
  setStoredToken(data.token)
  return data
}

export async function fetchCurrentUser() {
  const token = getStoredToken()
  if (!token) return null
  const res = await apiFetch('/api/auth/me', { headers: authHeaders() })
  if (res.status === 401) { clearStoredToken(); return null }
  if (!res.ok) throw new Error('Could not load session')
  const data = await res.json()
  return data.user
}

export function logout() {
  clearStoredToken()
}

export async function updateProfile(updates) {
  const res = await apiFetch('/api/auth/me', {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(updates),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Update failed')
  return data
}

export async function addBookmark(articleId) {
  const res = await apiFetch(`/api/auth/bookmarks/${articleId}`, {
    method: 'POST',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to bookmark')
  return res.json()
}

export async function removeBookmark(articleId) {
  const res = await apiFetch(`/api/auth/bookmarks/${articleId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to remove bookmark')
  return res.json()
}

export { apiUrl }
