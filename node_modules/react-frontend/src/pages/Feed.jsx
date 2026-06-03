import { useEffect, useState, useCallback, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchArticles, fetchCategories, triggerScrape } from '../api/articles.js'
import { useAuth } from '../context/AuthContext.jsx'

const CATEGORY_LABELS = {
  general: 'All',
  technology: 'Technology',
  sports: 'Sports',
  politics: 'Politics',
  business: 'Business',
  science: 'Science',
  entertainment: 'Entertainment',
  world: 'World',
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function ArticleCard({ article }) {
  const hasVideo = Boolean(article.videoUrl || article.videoEmbed)
  const source = article.sourceId?.name || ''
  return (
    <Link to={`/articles/${article._id}`} className="feed-card">
      {article.imageUrl && (
        <div className="feed-card-img-wrap">
          <img src={article.imageUrl} alt="" className="feed-card-img" loading="lazy" />
          {hasVideo && <span className="feed-card-video-badge">▶ Video</span>}
        </div>
      )}
      {!article.imageUrl && hasVideo && (
        <div className="feed-card-img-wrap feed-card-img-wrap--video">
          <span className="feed-card-video-icon">▶</span>
        </div>
      )}
      <div className="feed-card-body">
        <div className="feed-card-meta">
          {source && <span className="feed-card-source">{source}</span>}
          {article.category && article.category !== 'general' && (
            <span className="feed-card-cat">{CATEGORY_LABELS[article.category] || article.category}</span>
          )}
          <span className="feed-card-time">{timeAgo(article.publishedAt || article.scrapedAt)}</span>
        </div>
        <h2 className="feed-card-title">{article.title}</h2>
        {article.summary && <p className="feed-card-summary">{article.summary}</p>}
      </div>
    </Link>
  )
}

export default function Feed() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [articles, setArticles] = useState([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState([])
  const [scraping, setScraping] = useState(false)
  const [scrapeMsg, setScrapeMsg] = useState('')
  const searchRef = useRef(null)

  const page = parseInt(searchParams.get('page') || '1', 10)
  const category = searchParams.get('category') || ''
  const q = searchParams.get('q') || ''
  const hasVideo = searchParams.get('video') === '1'

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchArticles({
        page,
        limit: 12,
        category: category || undefined,
        q: q || undefined,
        hasVideo: hasVideo || undefined,
      })
      setArticles(data.items)
      setTotal(data.total)
      setPages(data.pages)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [page, category, q, hasVideo])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    fetchCategories().then((d) => setCategories(d.categories || []))
  }, [])

  function setParam(key, value) {
    const p = new URLSearchParams(searchParams)
    if (value) p.set(key, value)
    else p.delete(key)
    p.delete('page')
    setSearchParams(p)
  }

  function setPage(n) {
    const p = new URLSearchParams(searchParams)
    p.set('page', n)
    setSearchParams(p)
  }

  async function handleScrape() {
    setScraping(true)
    setScrapeMsg('')
    try {
      const r = await triggerScrape()
      setScrapeMsg(`Done — ${r.saved} new articles from ${r.sources} sources`)
      load()
    } catch (e) {
      setScrapeMsg(`Scrape error: ${e.message}`)
    } finally {
      setScraping(false)
    }
  }

  function handleSearch(e) {
    e.preventDefault()
    setParam('q', searchRef.current?.value || '')
  }

  const allCats = ['', ...categories]

  return (
    <div className="feed-page">
      {/* Top bar */}
      <div className="feed-header">
        <h1 className="feed-title">
          {q ? `Search: "${q}"` : category ? (CATEGORY_LABELS[category] || category) : 'Latest News'}
        </h1>
        <div className="feed-actions">
          <form onSubmit={handleSearch} className="feed-search-form">
            <input
              ref={searchRef}
              type="search"
              placeholder="Search articles…"
              defaultValue={q}
              className="feed-search-input"
            />
            <button type="submit" className="btn btn-ghost">Search</button>
          </form>
          {user && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleScrape}
              disabled={scraping}
              title="Scrape all active sources now"
            >
              {scraping ? 'Scraping…' : '⟳ Refresh'}
            </button>
          )}
        </div>
      </div>

      {scrapeMsg && <p className="scrape-msg">{scrapeMsg}</p>}

      {/* Category pills */}
      <div className="feed-cats">
        {allCats.map((cat) => (
          <button
            key={cat || '__all'}
            type="button"
            className={`cat-pill${(category === cat) ? ' active' : ''}`}
            onClick={() => setParam('category', cat)}
          >
            {CATEGORY_LABELS[cat] || cat || 'All'}
          </button>
        ))}
        <button
          type="button"
          className={`cat-pill${hasVideo ? ' active' : ''}`}
          onClick={() => {
            const p = new URLSearchParams(searchParams)
            if (hasVideo) p.delete('video')
            else p.set('video', '1')
            p.delete('page')
            setSearchParams(p)
          }}
        >
          ▶ Videos
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="feed-loading">
          <div className="spinner" />
          <p>Loading articles…</p>
        </div>
      ) : error ? (
        <div className="feed-empty">
          <p className="error-text">{error}</p>
          <button type="button" className="btn btn-primary" onClick={load}>Retry</button>
        </div>
      ) : articles.length === 0 ? (
        <div className="feed-empty">
          <p>No articles yet.</p>
          {user
            ? <button type="button" className="btn btn-primary" onClick={handleScrape} disabled={scraping}>
                {scraping ? 'Scraping…' : 'Scrape sources now'}
              </button>
            : <p className="muted">Add some news sources, then click Refresh.</p>
          }
        </div>
      ) : (
        <div className="feed-grid">
          {articles.map((a) => <ArticleCard key={a._id} article={a} />)}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="pagination">
          <button
            type="button" className="btn btn-ghost"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >← Previous</button>
          <span className="pagination-info">Page {page} of {pages} · {total} articles</span>
          <button
            type="button" className="btn btn-ghost"
            disabled={page >= pages}
            onClick={() => setPage(page + 1)}
          >Next →</button>
        </div>
      )}
    </div>
  )
}
