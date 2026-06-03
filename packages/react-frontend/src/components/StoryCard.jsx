import { Link } from 'react-router-dom'
import { getDemoStory, DEMO_STORY_ID } from '../data/demoStories.js'

/**
 * @param {{
 *   story: { id: string, headline: string, deck: string, sources: number, ago: string },
 *   index?: number,
 *   featured?: boolean
 * }} props
 * @returns {import('react').JSX.Element}
 */
export default function StoryCard({ story, index = 0, featured = false }) {
  const hasDetail = Boolean(getDemoStory(story.id))
  const isDemo = story.id === DEMO_STORY_ID
  const className = [
    'story-float-card',
    hasDetail ? 'story-float-card--link' : '',
    isDemo || featured ? 'story-float-card--demo' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const inner = (
    <>
      {isDemo ? <span className="story-demo-badge">Demo article</span> : null}
      <p className="story-meta">
        {story.sources} sources · {story.ago}
        {hasDetail ? ' · Read full story' : ''}
      </p>
      <h3>{story.headline}</h3>
      <p>{story.deck}</p>
    </>
  )

  if (!hasDetail) {
    return (
      <article className={className} style={{ '--float-delay': `${index * 0.2}s` }}>
        {inner}
      </article>
    )
  }

  return (
    <Link
      to={`/stories/${story.id}`}
      className={className}
      style={{ '--float-delay': `${index * 0.2}s` }}
    >
      {inner}
    </Link>
  )
}
