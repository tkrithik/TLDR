import { Link } from 'react-router-dom'
import Hero from '../components/Hero.jsx'
import ScrollReveal from '../components/ScrollReveal.jsx'

export default function Home() {
  return (
    <div className="snap-page">
      <Hero />
      <section className="snap-section home-features" style={{ minHeight: '85svh', justifyContent: 'flex-start', paddingTop: '2rem' }}>
        <h2 className="page-title" style={{ textAlign: 'center', width: '100%', marginBottom: '2.5rem' }}>
          How it works
        </h2>
        <div className="feature-grid">
          <ScrollReveal>
            <div className="feature-tile">
              <div className="feature-icon">📡</div>
              <h3>Add sources</h3>
              <p>Point TLDR at any RSS feed or news website. The system watches every feed so fresh stories surface automatically.</p>
            </div>
          </ScrollReveal>
          <ScrollReveal>
            <div className="feature-tile">
              <div className="feature-icon">🤖</div>
              <h3>AI summaries</h3>
              <p>Every story becomes a short AI-written article built from clean source coverage, with only a blurb shown in the feed.</p>
            </div>
          </ScrollReveal>
          <ScrollReveal>
            <div className="feature-tile">
              <div className="feature-icon">🔍</div>
              <h3>Smart dedup</h3>
              <p>Same story on every outlet? Duplicate detection keeps your feed clean so you only see each story once.</p>
            </div>
          </ScrollReveal>
        </div>

        <ScrollReveal>
          <div className="home-cta-block">
            <Link to="/feed" className="btn btn-primary btn-lg">Browse the feed →</Link>
            <Link to="/sources" className="btn btn-ghost btn-lg">Manage sources</Link>
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <div className="home-categories">
            <h3 className="strip-title">Browse by category</h3>
            <div className="topic-pills">
              {['technology', 'sports', 'politics', 'business', 'science', 'entertainment', 'world'].map((cat) => (
                <Link key={cat} to={`/feed?category=${cat}`} className="topic-pill">
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Link>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </section>
    </div>
  )
}
