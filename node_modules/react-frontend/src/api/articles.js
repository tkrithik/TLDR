import { apiFetch } from './client.js'
import { getStoredToken } from './auth.js'

function authHeaders() {
  const token = getStoredToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/**
 * @param {object} params
 * @param {number} [params.page]
 * @param {number} [params.limit]
 * @param {string} [params.category]
 * @param {string} [params.sourceId]
 * @param {string} [params.q]
 * @param {boolean} [params.hasVideo]
 */
export async function fetchArticles(params = {}) {
  const q = new URLSearchParams()
  if (params.page) q.set('page', params.page)
  if (params.limit) q.set('limit', params.limit)
  if (params.category) q.set('category', params.category)
  if (params.sourceId) q.set('sourceId', params.sourceId)
  if (params.q) q.set('q', params.q)
  if (params.hasVideo) q.set('hasVideo', 'true')
  const qs = q.toString()
  const res = await apiFetch(`/api/articles${qs ? `?${qs}` : ''}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch articles')
  return res.json() // { items, total, page, pages, limit }
}

export async function fetchArticle(id) {
  const res = await apiFetch(`/api/articles/${id}`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Article not found')
  return res.json()
}

export async function fetchCategories() {
  const res = await apiFetch('/api/articles/categories')
  if (!res.ok) return { categories: [] }
  return res.json()
}

export async function triggerScrape() {
  const res = await apiFetch('/api/scrape/run', {
    method: 'POST',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Scrape failed')
  return res.json()
}
