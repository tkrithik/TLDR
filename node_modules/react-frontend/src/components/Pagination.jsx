/**
 * Apple-style numbered pagination with prev/next chevrons.
 * @param {object} props
 * @param {number} props.page - Current page (1-based).
 * @param {number} props.pages - Total page count.
 * @param {(p: number) => void} props.onPageChange
 * @returns {import('react').JSX.Element|null}
 */
export default function Pagination({ page, pages, onPageChange }) {
  if (pages <= 1) return null

  const windowSize = 5
  let start = Math.max(1, page - Math.floor(windowSize / 2))
  const end = Math.min(pages, start + windowSize - 1)
  if (end - start + 1 < windowSize) start = Math.max(1, end - windowSize + 1)

  const nums = []
  for (let i = start; i <= end; i += 1) nums.push(i)

  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        type="button"
        className="chev"
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        ‹
      </button>
      {nums.map((n) => (
        <button
          key={n}
          type="button"
          className={n === page ? 'current' : ''}
          aria-label={`Page ${n}`}
          aria-current={n === page ? 'page' : undefined}
          onClick={() => onPageChange(n)}
        >
          {n}
        </button>
      ))}
      <button
        type="button"
        className="chev"
        aria-label="Next page"
        disabled={page >= pages}
        onClick={() => onPageChange(page + 1)}
      >
        ›
      </button>
    </nav>
  )
}
