import { useEffect, useState } from 'react'
import { Routes, Route, Outlet, Navigate } from 'react-router-dom'
import Nav from './components/Nav'
import Footer from './components/Footer'
import BackgroundVideo from './components/BackgroundVideo'
import Home from './pages/Home'
import Sources from './pages/Sources'
import Feed from './pages/Feed'
import ArticlePage from './pages/ArticlePage'
import Login from './pages/Login'

const THEME_KEY = 'tldr-theme'

function getInitialTheme() {
  if (typeof window === 'undefined') return 'light'
  const saved = window.localStorage.getItem(THEME_KEY)
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function Layout({ theme, onToggleTheme }) {
  return (
    <div className="app-shell">
      <BackgroundVideo />
      <Nav theme={theme} onToggleTheme={onToggleTheme} />
      <main className="layout-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export default function App() {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    window.localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  return (
    <Routes>
      <Route element={<Layout theme={theme} onToggleTheme={() => setTheme((p) => p === 'light' ? 'dark' : 'light')} />}>
        <Route path="/" element={<Home />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/articles/:id" element={<ArticlePage />} />
        <Route path="/sources" element={<Sources />} />
        <Route path="/login" element={<Login />} />
        {/* Legacy redirects */}
        <Route path="/topics" element={<Navigate to="/feed" replace />} />
        <Route path="/topics/:id" element={<Navigate to="/feed" replace />} />
        <Route path="/articles" element={<Navigate to="/feed" replace />} />
        <Route path="/stories/:id" element={<Navigate to="/feed" replace />} />
      </Route>
    </Routes>
  )
}
