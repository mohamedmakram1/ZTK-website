import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, addLog } from '../lib/auth.js'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const u = await login(username.trim(), password)
      if (!u) {
        setError('Invalid username or password, or user is inactive')
        return
      }

      // Log successful login
      try {
        await addLog('login', 'User logged in successfully', u.username)
      } catch (logError) {
        console.error('Failed to log login event:', logError)
        // Don't block login if logging fails
      }


      // send to dashboard or admin page
      if (u.role === 'admin') {
        navigate('/admin')
      }
      else {
         navigate('/dashboard')
      }

    } catch (err) {
      setError('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }
  

  return (
    <div style={styles.wrap}>
      <form onSubmit={handleLogin} style={styles.card}>
        <h1 style={styles.h1}>ZKT Access — Sign in</h1>

        <label style={styles.label}>Username</label>
        <input
          style={styles.input}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="username"
        />

        <label style={styles.label}>Password</label>
        <input
          style={styles.input}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
        />

        {error && <div style={styles.error}>{error}</div>}

        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}

const styles = {
  wrap: { 
    minHeight: '100dvh',
    display: 'grid',
    placeItems: 'center',
    backgroundImage: "url('/login_bk.jpg')",
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  },
  card: { width:480, padding:24, borderRadius:16, background:'#111827', color:'#e5e7eb', boxShadow:'0 10px 30px rgba(0,0,0,.35)', display:'grid', gap:12 },
  h1: { margin:0, fontSize:22, textAlign:'center' },
  label: { fontSize:13, color:'#9ca3af' },
  input: { padding:'10px 12px', borderRadius:10, border:'1px solid #374151', background:'#0f172a', color:'#e5e7eb' },
  button: { marginTop:8, padding:'10px 12px', border:'none', borderRadius:10, background:'#2563eb', color:'#fff', cursor:'pointer' },
  error: { color:'#fca5a5', background:'#7f1d1d', borderRadius:8, padding:'8px 10px', fontSize:13 }
}
