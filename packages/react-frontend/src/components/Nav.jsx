import { useEffect, useState } from 'react'
import { NavLink, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Nav({ theme, onToggleTheme }) {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function handleSignOut() {
    logout()
    navigate('/')
    setMenuOpen(false)
  }

  return (
    <header className={`nav${scrolled ? ' is-scrolled' : ''}`}>
      <div className="nav-inner">
        <NavLink to="/" className="nav-brand" end>TLDR.</NavLink>

        <ul className={`nav-links${menuOpen ? ' nav-links--open' : ''}`}>
          <li><NavLink to="/" end onClick={() => setMenuOpen(false)}>Home</NavLink></li>
          <li><NavLink to="/feed" onClick={() => setMenuOpen(false)}>Feed</NavLink></li>
          <li><NavLink to="/sources" onClick={() => setMenuOpen(false)}>Sources</NavLink></li>
        </ul>

        <div className="nav-actions">
          {!loading && user ? (
            <>
              <span className="nav-user" title={user.email}>
                {user.name || user.email.split('@')[0]}
              </span>
              <button type="button" className="btn btn-ghost nav-auth-btn" onClick={handleSignOut}>
                Sign out
              </button>
            </>
          ) : !loading ? (
            <Link to="/login" className="btn btn-ghost nav-auth-btn">Sign in</Link>
          ) : null}
          <button
            type="button" className="theme-toggle"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '◑' : '◐'}
          </button>
          <button
            type="button"
            className={`nav-hamburger${menuOpen ? ' open' : ''}`}
            aria-label="Toggle menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span /><span /><span />
          </button>
        </div>
      </div>
    </header>
  )
}
