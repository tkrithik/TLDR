import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { fetchArticle } from '../api/articles.js'
import { addBookmark, removeBookmark } from '../api/auth.js'
import { useAuth } from '../context/AuthContext.jsx'

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function getYouTubeId(value) {
  try {
    const u = new URL(value)
    const host = u.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') return u.pathname.split('/').filter(Boolean)[0] || ''
    if (host.endsWith('youtube.com')) {
      if (u.pathname.startsWith('/embed/')) return u.pathname.split('/')[2] || ''
      if (u.pathname.startsWith('/shorts/')) return u.pathname.split('/')[2] || ''
      return u.searchParams.get('v') || ''
    }
  } catch {
    return ''
  }
  return ''
}

function normalizeEmbedUrl(value) {
  if (!value) return ''
  const withProtocol = value.startsWith('//') ? `https:${value}` : value
  const id = getYouTubeId(withProtocol)
  return id ? `https://www.youtube.com/embed/${id}` : withProtocol
}

function hostFromUrl(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function normalizeSources(article) {
  const related = Array.isArray(article.relatedSources) ? article.relatedSources : []
  const base = []
  for (const item of related) {
    if (item?.name || item?.url || item?.articleUrl) {
      base.push({
        name: item.name || hostFromUrl(item.articleUrl || item.url),
        url: item.url || item.articleUrl || '',
        articleUrl: item.articleUrl || item.url || '',
      })
    }
  }
  if (article?.sourceId?.name || article?.url) {
    base.push({
      name: article.sourceId?.name || hostFromUrl(article.url),
      url: article.sourceId?.url || article.url || '',
      articleUrl: article.url || article.sourceId?.url || '',
    })
  }
  const seen = new Set()
  return base.filter((item) => {
    const name = String(item.name || '').trim()
    if (!name) return false
    const key = `${name.toLowerCase()}|${hostFromUrl(item.articleUrl || item.url)}`
    if (seen.has(key)) return false
    seen.add(key)
    item.name = name
    return true
  })
}

function articleParagraphs(text) {
  const value = String(text || '').trim()
  if (!value) return []
  const explicit = value.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  if (explicit.length >= 2) return explicit
  const sentences = value.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).filter(Boolean)
  const paragraphs = []
  for (let i = 0; i < sentences.length; i += 2) {
    paragraphs.push(sentences.slice(i, i + 2).join(' '))
  }
  return paragraphs.filter(Boolean)
}

function VideoEmbed({ article }) {
  if (article.videoEmbed) {
    const src = normalizeEmbedUrl(article.videoEmbed)
    return (
      <div className="article-video-wrap">
        <iframe
          src={src}
          title="Article video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="article-video-iframe"
        />
      </div>
    )
  }
  // Direct video URL (MP4 etc)
  if (article.videoUrl) {
    const id = getYouTubeId(article.videoUrl)
    if (id) {
      return (
        <div className="article-video-wrap">
          <iframe
            src={`https://www.youtube.com/embed/${id}`}
            title="Article video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="article-video-iframe"
          />
        </div>
      )
    }
    return (
      <div className="article-video-wrap">
        <video controls className="article-video-native" preload="metadata">
          <source src={article.videoUrl} />
          Your browser does not support video playback.
        </video>
      </div>
    )
  }
  return null
}

export default function ArticlePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, updateUser } = useAuth()
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [bookmarked, setBookmarked] = useState(false)
  const [bookmarking, setBookmarking] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError('')
    fetchArticle(id)
      .then((a) => {
        setArticle(a)
        setBookmarked(a.bookmarked || false)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  async function toggleBookmark() {
    if (article?.isCombinedStory) return
    if (!user) { navigate('/login'); return }
    setBookmarking(true)
    try {
      if (bookmarked) {
        await removeBookmark(id)
        setBookmarked(false)
        updateUser({ bookmarks: (user.bookmarks || []).filter((b) => b !== id) })
      } else {
        await addBookmark(id)
        setBookmarked(true)
        updateUser({ bookmarks: [...(user.bookmarks || []), id] })
      }
    } finally {
      setBookmarking(false)
    }
  }

  if (loading) return (
    <div className="article-loading">
      <div className="spinner" />
      <p>Loading article…</p>
    </div>
  )

  if (error || !article) return (
    <div className="card empty-state">
      <p>{error || 'Article not found.'}</p>
      <Link to="/feed" className="btn btn-ghost">← Back to feed</Link>
    </div>
  )

  const relatedSources = normalizeSources(article)
  const source = relatedSources[0] || article.sourceId
  const hasVideo = Boolean(article.videoUrl || article.videoEmbed)

  return (
    <article className="article-page">
      <nav className="article-breadcrumb" aria-label="Breadcrumb">
        <Link to="/feed">Feed</Link>
        {article.category && (
          <>
            <span aria-hidden="true"> / </span>
            <Link to={`/feed?category=${article.category}`}>
              {article.category.charAt(0).toUpperCase() + article.category.slice(1)}
            </Link>
          </>
        )}
        <span aria-hidden="true"> / </span>
        <span className="muted">Article</span>
      </nav>

      <header className="article-header">
        <div className="article-meta-row">
          {source && (
            <a href={source.url || article.url} target="_blank" rel="noopener noreferrer" className="article-source-link">
              {source.name}
            </a>
          )}
          {article.isCombinedStory && <span className="tldr-badge">Combined story</span>}
          <span className="muted">
            {timeAgo(article.publishedAt || article.scrapedAt)}
          </span>
          {article.category && (
            <Link to={`/feed?category=${article.category}`} className="cat-pill cat-pill--sm">
              {article.category}
            </Link>
          )}
        </div>

        <h1 className="article-title">{article.title}</h1>

        <div className="article-actions">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            Read full article ↗
          </a>
          <button
            type="button"
            className={`btn btn-ghost bookmark-btn${bookmarked ? ' bookmarked' : ''}`}
            onClick={toggleBookmark}
            disabled={bookmarking || article.isCombinedStory}
          >
            {article.isCombinedStory ? 'Combined' : bookmarked ? '★ Saved' : '☆ Save'}
          </button>
        </div>
      </header>

      {/* Hero image */}
      {article.imageUrl && !hasVideo && (
        <div className="article-hero-img-wrap">
          <img src={article.imageUrl} alt="" className="article-hero-img" />
        </div>
      )}

      {/* Video player */}
      {hasVideo && <VideoEmbed article={article} />}

      {/* AI-generated article */}
      {article.summary && (
        <section className="article-tldr-block" aria-labelledby="article-heading">
          <div className="article-tldr-label">
            <span className="tldr-badge">AI-written article</span>
          </div>
          <div className="article-tldr-text">
            {articleParagraphs(article.summary).map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </section>
      )}

      {/* CTA to original */}
      <div className="article-read-more">
        <p className="muted">This AI-written article was generated from source coverage. For the original reporting:</p>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
        >
          Read original coverage{source?.name ? ` at ${source.name}` : ''} ↗
        </a>
      </div>

      {relatedSources.length > 0 && (
        <section className="article-tldr-block" aria-label="Sources used">
          <div className="article-tldr-label">
            <span className="tldr-badge">Sources used</span>
          </div>
          <div className="article-source-list">
            {relatedSources.map((item) => (
              <a
                key={`${item.name}-${item.articleUrl}`}
                href={item.articleUrl || item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="article-source-chip"
              >
                {item.name} ↗
              </a>
            ))}
          </div>
        </section>
      )}

      <footer className="article-footer">
        <Link to="/feed" className="btn btn-ghost">← Back to feed</Link>
        {article.category && (
          <Link to={`/feed?category=${article.category}`} className="btn btn-ghost">
            More {article.category} news
          </Link>
        )}
      </footer>
    </article>
  )
}
