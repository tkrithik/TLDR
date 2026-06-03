/**
 * Full-screen looping video background with readability overlay.
 * @returns {import('react').JSX.Element}
 */
export default function BackgroundVideo() {
  const panels = [
    { id: '9jbAIkN8b8o', label: 'World' },
    { id: 'l1DBDONn9wQ', label: 'Politics' },
    { id: 'cuLprHh_BRg', label: 'Conflict' },
  ]

  return (
    <div className="bg-video-shell" aria-hidden="true">
      <div className="bg-video-grid">
        {panels.map((panel, index) => {
          const start = 25 + index * 40
          const embedUrl = `https://www.youtube.com/embed/${panel.id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${panel.id}&modestbranding=1&rel=0&playsinline=1&start=${start}`
          return (
            <div key={panel.id} className="bg-video-cell">
              <iframe
                className="bg-video-media bg-video-embed"
                src={embedUrl}
                title={`${panel.label} background video`}
                allow="autoplay; encrypted-media; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
                tabIndex={-1}
              />
            </div>
          )
        })}
      </div>
      <div className="bg-video-overlay" />
    </div>
  )
}
