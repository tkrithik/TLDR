import { Link } from 'react-router-dom'
import ScrollReveal from '../components/ScrollReveal'
import { topics, storyMap } from '../data/mockTopics'

/**
 * Topic explorer page for the UI prototype.
 * @returns {import('react').JSX.Element}
 */
export default function Articles() {
  return (
    <div>
      <h1 className="page-title">Topic feeds</h1>
      <p className="page-lead">
        Prototype-only view inspired by Particle. Select a topic to explore floating story cards.
      </p>
      <div className="topic-grid">
        {topics.map((topic) => (
          <ScrollReveal key={topic.id}>
            <Link className="topic-card" to={`/topics/${topic.id}`}>
              <h3>{topic.label}</h3>
              <p>{storyMap[topic.id]?.length ?? 0} curated stories</p>
            </Link>
          </ScrollReveal>
        ))}
      </div>
    </div>
  )
}
