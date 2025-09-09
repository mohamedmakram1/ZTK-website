import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import QRCode from 'react-qr-code'
import {
  currentUser,
  addLog,
  logout as doLogout,
  canGenerateToday,
  getTodayCount,
  generateQR,
  getToken
} from '../lib/auth.js'

export default function Dashboard() {
  const navigate = useNavigate()
  const [pin, setPin] = useState('')
  const [expires, setExpires] = useState(null)
  const [remaining, setRemaining] = useState(0)
  const [username, setUsername] = useState('')
  const [role, setRole] = useState('user')
  const [leftToday, setLeftToday] = useState(3)
  const [notice, setNotice] = useState('')
  const timerRef = useRef(null)

  // ---------- config ----------
  const DIGITS = 6         // change to 8 later if you want longer codes
  const VALID_MINUTES = 15   // visual timer only (backend will enforce later)
  const LIMIT = 3            // daily limit per user (frontend dev-only)

  useEffect(() => {
    const init = async () => {
      const me = currentUser()
      if (!me) navigate('/login')
      const u = me?.username || 'User'
      setUsername(u)
      setRole(me?.role || 'user')

      try {
        // initialize today's remaining count
        const used = await getTodayCount(u)
        setLeftToday(Math.max(0, LIMIT - used))
      } catch (error) {
        if (error.message === 'TOKEN_EXPIRED') {
          navigate('/login')
          return
        }
        console.error('Error getting today count:', error)
      }
    }
    init()
  }, [navigate])

  // countdown for the current PIN
  useEffect(() => {
    if (!expires) return
    clearInterval(timerRef.current)
    const tick = () => {
      const diff = Math.max(0, Math.floor((+expires - Date.now()) / 1000))
      setRemaining(diff)
      if (diff <= 0) clearInterval(timerRef.current)
    }
    tick()
    timerRef.current = setInterval(tick, 1000)
    return () => clearInterval(timerRef.current)
  }, [expires])
  const generatePin = async () => {
    setNotice('') // clear previous message
    const me = currentUser()
    const actor = me?.username || ''

    // Check if token exists
    if (!getToken()) {
      navigate('/login')
      return
    }

    try {
      // Check daily limit from backend
      let canGenerate
      try {
        canGenerate = await canGenerateToday(actor, LIMIT)
      } catch (limitError) {
        if (limitError.message === 'TOKEN_EXPIRED') {
          navigate('/login')
          return
        }
        throw limitError
      }
      if (!canGenerate) {
        setNotice(`Daily limit reached. You can only generate ${LIMIT} codes per day.`)
        return
      }

      // Generate QR from backend
      const result = await generateQR(actor)
      console.log('generateQR result.expires_at:', result.expires_at)
      // Parse expiry time as UTC to handle timezone correctly
      const expiresUtc = new Date(result.expires_at + 'Z')
      console.log('Parsed expiresDate as UTC:', expiresUtc)
      setPin(result.pin)
      setExpires(expiresUtc)

      // Log the action
      try {
        await addLog('qr', `Generated QR code with PIN ${result.pin}`, actor)
      } catch (logError) {
        if (logError.message === 'TOKEN_EXPIRED') {
          navigate('/login')
          return
        }
        console.error('Error logging action:', logError)
      }

      // Update daily count
      const newCount = await getTodayCount(actor)
      setLeftToday(Math.max(0, LIMIT - newCount))
    } catch (error) {
      if (error.message === 'TOKEN_EXPIRED') {
        navigate('/login')
        return
      }
      setNotice('Failed to generate QR code. Please try again.')
      console.error('Generate QR error:', error)
    }
  }

  const copyPin = async () => {
    if (!pin) return
    try {
      await navigator.clipboard.writeText(pin)
      alert('PIN copied')
    } catch {}
  }

  const handleLogout = () => {
    doLogout()
    navigate('/login')
  }

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.brand}>
          <span style={styles.brandDot}></span>
          <span>ZKT Access — Dashboard</span>
        </div>
        <div style={{display:'flex', gap:12, alignItems:'center'}}>
          <span style={{fontSize:13, color:'#9ca3af'}}>Signed in: {username}</span>
          {role === 'admin' && (
            <button onClick={() => navigate('/admin')} style={styles.btnGhost}>Admin</button>
          )}
          <button onClick={handleLogout} style={styles.btnDanger}>Logout</button>
        </div>
      </header>

      <main style={styles.main}>
        <section style={styles.card}>
          <h2 style={styles.h2}>Generate Access Code</h2>
          <p style={styles.sub}>Click to create a one-time PIN and QR.</p>

          <div style={{display:'flex', gap:10, flexWrap:'wrap', alignItems:'center'}}>
            <button
              onClick={generatePin}
              style={{
                ...styles.btnPrimary,
                opacity: leftToday > 0 ? 1 : 0.5,
                cursor: leftToday > 0 ? 'pointer' : 'not-allowed'
              }}
              disabled={leftToday <= 0}
            >
              Generate Code
            </button>

            <button
              onClick={copyPin}
              style={{...styles.btnGhost, opacity: pin ? 1 : 0.5}}
              disabled={!pin}
            >
              Copy PIN
            </button>

            <div style={{marginLeft:'auto', fontSize:13, color:'#9ca3af'}}>
              Codes left today: <b>{leftToday}</b> / {LIMIT}
            </div>
          </div>

          {notice && (
            <div style={styles.noticeError}>{notice}</div>
          )}

          {pin && (
            <div style={styles.resultBox}>
              <div style={styles.left}>
                <div style={styles.pinBox}>
                  <div style={styles.pin}>{pin}</div>
                  <div style={styles.badge}>Time left: {mm}:{ss}</div>
                </div>
                <div style={styles.meta}>
                  <div>Valid for: <strong>{VALID_MINUTES} minutes</strong></div>
                  {expires && <div>Expires at: {expires.toLocaleTimeString()}</div>}
                </div>
              </div>

              <div style={styles.qrWrap}>
                <div style={styles.qrCard}>
                  <QRCode value={pin} size={220} />
                </div>
                <div style={styles.qrHint}>Show this QR at the gate</div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

const styles = {
  page: {minHeight:'100dvh', background:'#0b1220', color:'#e5e7eb'},
  header: {
    display:'flex', justifyContent:'space-between', alignItems:'center',
    padding:'14px 18px', borderBottom:'1px solid #1f2937', background:'#0f172a',
    position:'sticky', top:0, zIndex:10
  },
  brand: {display:'flex', gap:10, alignItems:'center', fontWeight:700},
  brandDot: {width:10, height:10, borderRadius:999, background:'#3b82f6', display:'inline-block'},
  main: {maxWidth:1100, margin:'32px auto', padding:'0 16px'},
  card: {
    background:'linear-gradient(180deg, rgba(63,81,181,0.10) 0%, rgba(17,24,39,0.6) 100%)',
    border:'1px solid #1f2937', borderRadius:20, padding:24,
    boxShadow:'0 18px 55px rgba(0,0,0,.35)'
  },
  h2: {margin:'0 0 6px 0', fontSize:24},
  sub: {color:'#9ca3af', margin:'0 0 14px 0'},

  btnPrimary: {
    padding:'10px 12px', border:'none', borderRadius:12,
    background:'#2563eb', color:'#fff', cursor:'pointer',
    boxShadow:'0 6px 18px rgba(37,99,235,0.25)'
  },
  btnGhost: {
    padding:'10px 12px', border:'1px solid #374151', borderRadius:12,
    background:'transparent', color:'#e5e7eb', cursor:'pointer'
  },
  btnDanger: {
    padding:'10px 12px', border:'1px solid #ef4444', borderRadius:12,
    background:'transparent', color:'#ef4444', cursor:'pointer'
  },

  noticeError: {
    marginTop:10,
    color:'#fca5a5',
    background:'#7f1d1d',
    border:'1px solid #991b1b',
    borderRadius:10,
    padding:'8px 10px',
    fontSize:13
  },

  resultBox: {
    marginTop:18, padding:18, border:'1px dashed #374151', borderRadius:16, background:'#0f172a',
    display:'grid', gridTemplateColumns:'1fr 320px', gap:20
  },
  left: {display:'grid', gap:10, alignContent:'start'},
  pinBox: {display:'flex', gap:12, alignItems:'center', flexWrap:'wrap'},
  pin: {
    fontSize:36, fontWeight:800, letterSpacing:2,
    background:'#111827', padding:'10px 14px', borderRadius:12, border:'1px solid #374151'
  },
  badge: {
    fontSize:13, padding:'6px 10px', borderRadius:999,
    background:'#052e16', color:'#86efac', border:'1px solid #14532d'
  },
  meta: {fontSize:14, color:'#9ca3af'},
  qrWrap: {display:'grid', gap:8, justifyItems:'center'},
  qrCard: {
    background:'#fff', padding:14, borderRadius:16, border:'1px solid #e5e7eb',
    boxShadow:'0 10px 30px rgba(0,0,0,.25)'
  },
  qrHint: {fontSize:12, color:'#9ca3af'}
}
