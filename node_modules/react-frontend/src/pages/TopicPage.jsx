import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Pagination from '../components/Pagination'
import { topics, storyMap } from '../data/mockTopics'
import StoryCard from '../components/StoryCard.jsx'

const PAGE_SIZE = 6

/**
 * Topic detail page with floating story cards and pagination.
 * @returns {import('react').JSX.Element}
 */
export default function TopicPage() {
  const { topicId } = useParams()
  const [page, setPage] = useState(1)
  const topic = topics.find((t) => t.id === topicId)
  const stories = useMemo(() => (topicId ? storyMap[topicId] ?? [] : []), [topicId])
  const pages = Math.max(1, Math.ceil(stories.length / PAGE_SIZE))
  const offset = (page - 1) * PAGE_SIZE
  const visible = stories.slice(offset, offset + PAGE_SIZE)

  if (!topic) {
    return (
      <div className="card empty-state">
        <p>Unknown topic.</p>
        <p>
          <Link to="/topics">Back to topics</Link>
        </p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="page-title">{topic.label}</h1>
      <p className="page-lead">Floating headlines with concise summaries for quick scanning.</p>
      <div className="floating-grid">
        {visible.map((story, idx) => (
          <StoryCard key={story.id} story={story} index={idx} />
        ))}
      </div>
      <Pagination page={page} pages={pages} onPageChange={setPage} />
    </div>
  )
}
