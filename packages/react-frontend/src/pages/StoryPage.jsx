import { Link, useParams } from 'react-router-dom'
import { getDemoStory } from '../data/demoStories.js'

/**
 * Full article view for demo stories.
 * @returns {import('react').JSX.Element}
 */
export default function StoryPage() {
  const { storyId } = useParams()
  const story = storyId ? getDemoStory(storyId) : null

  if (!story) {
    return (
      <div className="card empty-state">
        <p>Story not found or not available in the demo yet.</p>
        <p>
          <Link to="/topics/technology">Browse Technology</Link>
        </p>
      </div>
    )
  }

  return (
    <article className="story-article">
      <nav className="story-breadcrumb" aria-label="Breadcrumb">
        <Link to="/topics">Topics</Link>
        <span aria-hidden="true"> / </span>
        <Link to={`/topics/${story.topicId}`}>{story.topicLabel}</Link>
        <span aria-hidden="true"> / </span>
        <span className="muted">Article</span>
      </nav>

      <header className="story-header">
        <p className="story-meta">
          {story.sourceCount} cross-checked sources · {story.ago} · {story.readMinutes} min read
        </p>
        <h1 className="story-headline">{story.headline}</h1>
        <p className="story-published muted">{story.published}</p>
        <p className="story-deck">{story.deck}</p>
      </header>

      <section className="story-tldr" aria-labelledby="tldr-heading">
        <h2 id="tldr-heading">TLDR</h2>
        <p>{story.tldr}</p>
      </section>

      <section className="story-key-points" aria-labelledby="key-points-heading">
        <h2 id="key-points-heading">Key points</h2>
        <ul>
          {story.keyPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </section>

      {story.sections.map((section) => (
        <section key={section.title} className="story-section">
          <h2>{section.title}</h2>
          {section.paragraphs.map((para) => (
            <p key={para.slice(0, 40)}>{para}</p>
          ))}
        </section>
      ))}

      <section className="story-timeline" aria-labelledby="timeline-heading">
        <h2 id="timeline-heading">Timeline</h2>
        <ol className="story-timeline-list">
          {story.timeline.map((item) => (
            <li key={item.time}>
              <time>{item.time}</time>
              <span>{item.event}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="story-impact" aria-labelledby="impact-heading">
        <h2 id="impact-heading">What it means for you</h2>
        <ul>
          {story.userImpact.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="story-sources-block" aria-labelledby="sources-heading">
        <h2 id="sources-heading">Sources ({story.citations.length} cited in this summary)</h2>
        <ul className="story-source-list">
          {story.citations.map((src) => (
            <li key={src.name} className={src.verified ? 'is-verified' : ''}>
              <div className="story-source-head">
                <a href={src.url} target="_blank" rel="noopener noreferrer">
                  {src.name}
                </a>
                {src.verified ? (
                  <span className="source-badge source-badge--ok">Cross-checked</span>
                ) : (
                  <span className="source-badge source-badge--warn">Unverified</span>
                )}
              </div>
              <p className="muted">{src.note}</p>
            </li>
          ))}
        </ul>
      </section>

      {story.disputedClaims.length > 0 ? (
        <section className="story-flags" aria-labelledby="flags-heading">
          <h2 id="flags-heading">Misinformation flags</h2>
          <p className="page-lead" style={{ marginBottom: '1rem' }}>
            Claims below could not be corroborated across our source set.
          </p>
          <ul className="story-flag-list">
            {story.disputedClaims.map((item) => (
              <li key={item.claim}>
                <p className="story-flag-claim">{item.claim}</p>
                <span className={`source-badge source-badge--${item.status}`}>
                  {item.status}
                </span>
                <p className="muted">{item.note}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="story-footer">
        <p className="muted">Prototype demo · synthesized for TLDR presentation</p>
        <div className="story-related">
          {story.relatedLinks.map((link) => (
            <Link key={link.to} to={link.to} className="btn btn-ghost">
              {link.label}
            </Link>
          ))}
        </div>
      </footer>
    </article>
  )
}
