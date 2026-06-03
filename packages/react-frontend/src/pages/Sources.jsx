import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../api/client.js'
import { getStoredToken } from '../api/auth.js'
import Pagination from '../components/Pagination.jsx'

const PAGE_SIZE = 8

function authHeaders() {
  const t = getStoredToken()
  return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
}

export default function Sources() {
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loadingList, setLoadingList] = useState(true)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editUrl, setEditUrl] = useState('')

  const loadSources = useCallback(async () => {
    setLoadingList(true)
    try {
      const res = await apiFetch(`/api/sources?page=${page}&limit=${PAGE_SIZE}`)
      const data = await res.json()
      setItems(data.items || [])
      setTotalPages(data.pages || 1)
    } catch (e) {
      setError(e.message || 'Failed to load sources')
    } finally {
      setLoadingList(false)
    }
  }, [page])

  useEffect(() => { loadSources() }, [loadSources])

  async function handleAdd(e) {
    e.preventDefault()
    setError('')
    setAdding(true)
    try {
      const res = await apiFetch('/api/sources', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name: name.trim(), url: url.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add source')
      setName(''); setUrl('')
      setPage(1)
      loadSources()
    } catch (e) {
      setError(e.message)
    } finally {
      setAdding(false)
    }
  }

  async function saveEdit(id) {
    setError('')
    try {
      const res = await apiFetch(`/api/sources/${id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ name: editName.trim(), url: editUrl.trim() }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      setEditingId(null)
      loadSources()
    } catch (e) {
      setError(e.message)
    }
  }

  async function toggleActive(row) {
    try {
      await apiFetch(`/api/sources/${row._id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ active: !row.active }),
      })
      loadSources()
    } catch (e) {
      setError(e.message || 'Failed to update source')
    }
  }

  async function remove(id) {
    if (!window.confirm('Remove this source? Its articles will remain.')) return
    try {
      await apiFetch(`/api/sources/${id}`, { method: 'DELETE', headers: authHeaders() })
      loadSources()
    } catch (e) {
      setError(e.message || 'Failed to remove source')
    }
  }

  return (
    <div>
      <h1 className="page-title">News sources</h1>
      <p className="page-lead">
        Add any RSS feed or news website URL. TLDR will scrape new articles on a schedule.
      </p>

      {error && <div className="error-banner">{error}</div>}

      {/* Add form */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '19px', marginBottom: '1rem' }}>Add source</h2>
        <form onSubmit={handleAdd}>
          <div className="form-row">
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="src-name">Name</label>
              <input id="src-name" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g. TechCrunch" required maxLength={200} disabled={adding} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="src-url">URL or RSS feed</label>
              <input id="src-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)}
                placeholder="https://techcrunch.com/feed" required disabled={adding} />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={adding}>
                {adding ? 'Adding…' : 'Add'}
              </button>
            </div>
          </div>
        </form>
      </div>

      <h2 style={{ fontSize: '19px', marginBottom: '1rem' }}>
        Your sources
        {items.length > 0 && <span className="muted" style={{ fontWeight: 400, marginLeft: '0.35em' }}>({items.length})</span>}
      </h2>

      {loadingList ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}><div className="spinner" /></div>
      ) : items.length === 0 ? (
        <div className="card empty-state">
          <p>No sources yet. Add one above to get started.</p>
          <p className="muted" style={{ fontSize: '14px' }}>
            Try: <code>https://feeds.bbci.co.uk/news/rss.xml</code> or <code>https://techcrunch.com/feed/</code>
          </p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Active</th><th>Name</th><th>URL</th><th>Last scraped</th><th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {items.map((row) =>
                editingId === row._id ? (
                  <tr key={row._id} className="edit-row">
                    <td colSpan={5}>
                      <div className="form-row" style={{ gridTemplateColumns: '1fr 2fr' }}>
                        <div className="field" style={{ marginBottom: 0 }}>
                          <label>Name</label>
                          <input value={editName} onChange={(e) => setEditName(e.target.value)} />
                        </div>
                        <div className="field" style={{ marginBottom: 0 }}>
                          <label>URL</label>
                          <input type="url" value={editUrl} onChange={(e) => setEditUrl(e.target.value)} />
                        </div>
                      </div>
                      <div className="row-actions" style={{ marginTop: '0.75rem' }}>
                        <button className="btn btn-primary" onClick={() => saveEdit(row._id)}>Save</button>
                        <button className="btn btn-ghost" onClick={() => setEditingId(null)}>Cancel</button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={row._id}>
                    <td>
                      <input type="checkbox" className="toggle" checked={row.active}
                        onChange={() => toggleActive(row)} aria-label={`Active: ${row.name}`} />
                    </td>
                    <td>{row.name}</td>
                    <td>
                      <a href={row.url} target="_blank" rel="noreferrer" className="url-cell" title={row.url}>
                        {row.url}
                      </a>
                    </td>
                    <td className="muted" style={{ fontSize: '13px' }}>
                      {row.lastScrapedAt ? new Date(row.lastScrapedAt).toLocaleString() : 'Never'}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-ghost" onClick={() => { setEditingId(row._id); setEditName(row.name); setEditUrl(row.url) }}>Edit</button>
                        <button className="btn btn-danger" onClick={() => remove(row._id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pages={totalPages} onPageChange={setPage} />
    </div>
  )
}
