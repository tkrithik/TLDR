import { useEffect, useRef, useState } from 'react'

/**
 * Wraps children and applies a fade-up reveal when the block enters the viewport.
 * @param {object} props
 * @param {import('react').ReactNode} props.children
 * @param {string} [props.className]
 * @param {boolean} [props.useTimeline] - Prefer scroll-driven animation when supported.
 * @returns {import('react').JSX.Element}
 */
export default function ScrollReveal({ children, className = '', useTimeline = false }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  const supportsTimeline =
    typeof CSS !== 'undefined' &&
    CSS.supports?.('animation-timeline: view()') &&
    useTimeline

  useEffect(() => {
    if (supportsTimeline || !ref.current) return

    const el = ref.current
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [supportsTimeline])

  const cls = supportsTimeline
    ? `reveal-timeline ${className}`.trim()
    : `reveal ${visible ? 'is-visible' : ''} ${className}`.trim()

  return (
    <div ref={ref} className={cls}>
      {children}
    </div>
  )
}
