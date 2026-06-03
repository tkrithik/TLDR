import { useState } from 'react'
import { Navigate, useLocation, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Login() {
  const { user, loading, login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) return <Navigate to={from} replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (mode === 'register') {
        await register(email.trim(), password, name.trim())
      } else {
        await login(email.trim(), password)
      }
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-logo">TLDR.</Link>
        <h1 className="auth-title">
          {mode === 'login' ? 'Sign in' : 'Create account'}
        </h1>
        <p className="auth-subtitle">
          {mode === 'login'
            ? 'Stay informed. Sign in to your TLDR account.'
            : 'Join TLDR. Get AI-summarized news in seconds.'}
        </p>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab${mode === 'login' ? ' active' : ''}`}
            onClick={() => { setMode('login'); setError('') }}
          >Sign in</button>
          <button
            type="button"
            className={`auth-tab${mode === 'register' ? ' active' : ''}`}
            onClick={() => { setMode('register'); setError('') }}
          >Create account</button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="auth-form">
          {mode === 'register' && (
            <div className="field">
              <label htmlFor="name">Name <span className="muted">(optional)</span></label>
              <input
                id="name" name="name" type="text" autoComplete="name"
                placeholder="Your name"
                value={name} onChange={(e) => setName(e.target.value)}
                disabled={submitting}
              />
            </div>
          )}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email" name="email" type="email" autoComplete="email"
              placeholder="you@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)}
              required disabled={submitting}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password" name="password" type="password"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              placeholder={mode === 'register' ? 'At least 6 characters' : 'Your password'}
              value={password} onChange={(e) => setPassword(e.target.value)}
              required disabled={submitting}
            />
          </div>

          {error && <p className="form-error" role="alert">{error}</p>}

          <button
            type="submit" className="btn btn-primary auth-submit"
            disabled={submitting || !email.trim() || !password}
          >
            {submitting
              ? (mode === 'login' ? 'Signing in…' : 'Creating account…')
              : (mode === 'login' ? 'Sign in' : 'Create account')}
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button" className="link-btn"
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
          >
            {mode === 'login' ? 'Create one' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
