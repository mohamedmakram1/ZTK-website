import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  addUser,
  getUsers,
  logout,
  setUserActive,
  resetPassword,
  currentUser,
  addLog,
  resetToday,
  deleteUser
} from '../lib/auth.js'

export default function Admin() {
  const nav = useNavigate()
  const me = currentUser()
  const [users, setUsers] = useState([])
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('user')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!me) {
      nav('/login')
      return
    }
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const userList = await getUsers()
      setUsers(userList)
    } catch (error) {
      if (error.message === 'TOKEN_EXPIRED') {
        logout()
        nav('/login')
        return
      }
      setMsg('Failed to load users')
      console.error('Load users error:', error)
    }
  }

  const refresh = () => loadUsers()

  const create = async (e) => {
    e.preventDefault()
    setMsg('')
    setLoading(true)
    try {
      const u = username.trim()
      if (!u || !password.trim()) throw new Error('Username and password are required')
      await addUser({ username: u, password, role })
      await addLog(role, `Created user ${u} (role ${role})`, me?.username)
      setUsername(''); setPassword(''); setRole('user')
      setMsg('User created')
      refresh()
    } catch (err) {
      if (err.message === 'TOKEN_EXPIRED') {
        logout()
        nav('/login')
        return
      }
      setMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleActive = async (u) => {
    try {
      await setUserActive(u.username)
      await addLog(u.role, `${u.active ? 'Disabled' : 'Enabled'} user ${u.username}`, me?.username)
      refresh()
    } catch (error) {
      if (error.message === 'TOKEN_EXPIRED') {
        logout()
        nav('/login')
        return
      }
      setMsg('Failed to update user status')
      console.error('Toggle active error:', error)
    }
  }

  const doResetPassword = async (u) => {
    const p = prompt(`New password for ${u.username}:`)
    if (!p) return
    try {
      await resetPassword(u.username, p)
      await addLog(u.role, `Reset password for ${u.username}`, me?.username)
      refresh()
    } catch (error) {
      if (error.message === 'TOKEN_EXPIRED') {
        logout()
        nav('/login')
        return
      }
      setMsg('Failed to reset password')
      console.error('Reset password error:', error)
    }
  }

  const resetDailyLimit = async (u) => {
    if (!window.confirm(`Reset today's QR generation limit for ${u.username}?`)) return
    try {
      await resetToday(u.username) 
      await addLog(u.role, `Reset daily limit for ${u.username}`, me?.username)
      setMsg(`Daily limit reset for ${u.username}`)
    } catch (error) {
      if (error.message === 'TOKEN_EXPIRED') {
        logout()
        nav('/login')
        return
      }
      setMsg('Failed to reset daily limit')
      console.error('Reset daily limit error:', error)
    }
  }

  const doDeleteUser = async (u) => {
    if (u.username === me?.username) {
      alert("You can't delete yourself while logged in.")
      return
    }
    const otherAdmins = users.filter(x => x.username !== u.username && x.role === 'admin')
    if (u.role === 'admin' && otherAdmins.length === 0) {
      alert("You can't delete the last remaining admin.")
      return
    }
    if (!window.confirm(`Delete user "${u.username}" permanently?`)) return

    try {
      await deleteUser(u.username)
      await addLog(u.role, `Deleted user ${u.username}`, me?.username)
      setMsg(`Deleted user ${u.username}`)
      refresh()
    } catch (error) {
      if (error.message === 'TOKEN_EXPIRED') {
        logout()
        nav('/login')
        return
      }
      setMsg('Failed to delete user')
      console.error('Delete user error:', error)
    }
  }

  const doLogout = () => { logout(); nav('/login') }

  return (
    <div style={styles.page}>
      <header style={styles.topbar}>
        <div style={styles.brand}>
          <span style={styles.brandDot}></span>
          <span>Admin Console</span>
        </div>
        <div style={{display:'flex', gap:10, alignItems:'center'}}>
          <span style={{fontSize:13, color:'#9CA3AF'}}>
            Signed in: {me?.username} (admin)
          </span>
          <button onClick={() => nav('/dashboard')} style={styles.btnGhost}>Dashboard</button>
          <button onClick={() => nav('/logs')} style={styles.btnGhost}>View Logs</button>
          <button onClick={doLogout} style={styles.btnDanger}>Logout</button>
        </div>
      </header>

      <main style={styles.container}>
        {/* CREATE USER */}
        <section style={styles.card}>
          <h3 style={styles.cardTitle}>Create User</h3>
          <form onSubmit={create} style={styles.formWrap}>
            <div style={styles.form}>
              <input
                style={styles.input}
                placeholder="username"
                value={username}
                onChange={e=>setUsername(e.target.value)}
              />
              <input
                style={styles.input}
                placeholder="password"
                type="password"
                value={password}
                onChange={e=>setPassword(e.target.value)}
              />
              <select style={styles.input} value={role} onChange={e=>setRole(e.target.value)}>
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>

              {msg && <div style={styles.notice}>{msg}</div>}

              <button type="submit" style={styles.btnPrimary} disabled={loading}>
                {loading ? 'Creating...' : 'Add user'}
              </button>
            </div>
          </form>
        </section>

        {/* USERS LIST */}
        <section style={styles.card}>
          <h3 style={styles.cardTitle}>Users</h3>
          <div style={{overflowX:'auto'}}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{...styles.th, minWidth:240}}>Username</th>
                  <th style={styles.th}>Role</th>
                  <th style={styles.th}>Status</th>
                  <th style={{...styles.th, minWidth:520}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.username} style={i % 2 ? styles.trAlt : undefined}>
                    <td style={{...styles.td, minWidth:240}}>{u.username}</td>
                    <td style={styles.td}>{u.role}</td>
                    <td style={styles.td}>
                      <span style={u.active ? styles.badgeOk : styles.badgeMuted}>
                        {u.active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td style={{...styles.td, whiteSpace:'nowrap'}}>
                      <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
                        <button onClick={()=>toggleActive(u)} style={styles.btnSmall}>
                          {u.active ? 'Disable' : 'Enable'}
                        </button>
                        <button onClick={()=>doResetPassword(u)} style={styles.btnSmall}>
                          Reset password
                        </button>
                        <button onClick={()=>resetDailyLimit(u)} style={styles.btnSmall}>
                          Reset daily limit
                        </button>
                        <button
                          onClick={()=>doDeleteUser(u)}
                          style={styles.btnDangerSmall}
                          disabled={u.username === me?.username}
                          title={u.username === me?.username ? "Can't delete yourself" : 'Delete user'}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!users.length && (
                  <tr>
                    <td colSpan="4" style={{...styles.td, color:'#9CA3AF'}}>No users yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}

const styles = {
  page: {minHeight:'100dvh', background:'#0B1220', color:'#E5E7EB'},
  topbar: {
    display:'flex', justifyContent:'space-between', alignItems:'center',
    padding:'14px 18px', borderBottom:'1px solid #1F2937', background:'#0F172A',
    position:'sticky', top:0, zIndex:10
  },
  brand: {display:'flex', gap:10, alignItems:'center', fontWeight:700},
  brandDot: {width:10, height:10, borderRadius:999, background:'#3B82F6', display:'inline-block'},
  container: {maxWidth:1200, margin:'28px auto', padding:'0 16px'},

  card: {
    background:'#111827', border:'1px solid #1F2937', borderRadius:20, padding:22,
    boxShadow:'0 18px 55px rgba(0,0,0,0.35)', marginBottom:22
  },
  cardTitle: {margin:'0 0 12px 0', fontSize:22},

  formWrap: {display:'grid'},
  form: {maxWidth:520, width:'100%', display:'grid', gap:12, margin:'0 auto'},
  input: {
    padding:'12px 14px', borderRadius:12, border:'1px solid #2A3344',
    background:'#0F1626', color:'#E5E7EB', outline:'none'
  },
  notice: {color:'#BBF7D0', background:'#14532D', border:'1px solid #166534',
           borderRadius:10, padding:'8px 10px', fontSize:13},

  table: {
    width:'100%', borderCollapse:'separate', borderSpacing:0,
    border:'1px solid #2F3A4D', borderRadius:14, overflow:'hidden'
  },
  th: {
    textAlign:'left', padding:'10px 12px',
    background:'#1F2937', borderBottom:'1px solid #2F3A4D',
    borderRight:'1px solid #2F3A4D'
  },
  td: {
    padding:'10px 12px', borderBottom:'1px solid #2F3A4D',
    borderRight:'1px solid #2F3A4D'
  },
  trAlt: { background:'#0F172A' },

  badgeOk: {
    display:'inline-block', padding:'2px 8px', borderRadius:999,
    background:'#052E16', color:'#86EFAC', border:'1px solid #14532D', fontSize:12
  },
  badgeMuted: {
    display:'inline-block', padding:'2px 8px', borderRadius:999,
    background:'#3F3F46', color:'#E4E4E7', border:'1px solid #52525B', fontSize:12
  },

  btnPrimary: {
    padding:'12px 14px', border:'none', borderRadius:12,
    background:'#2563EB', color:'#fff', cursor:'pointer',
    boxShadow:'0 6px 18px rgba(37,99,235,0.25)'
  },
  btnSmall: {
    padding:'8px 10px', border:'1px solid #2F3A4D', borderRadius:10,
    background:'#0F1626', color:'#E5E7EB', cursor:'pointer'
  },
  btnGhost: {
    padding:'8px 10px', border:'1px solid #374151', borderRadius:10,
    background:'transparent', color:'#E5E7EB', cursor:'pointer'
  },
  btnDanger: {
    padding:'8px 10px', border:'1px solid #EF4444', borderRadius:10,
    background:'transparent', color:'#EF4444', cursor:'pointer'
  },
  btnDangerSmall: {
    padding:'8px 10px',
    border:'1px solid #EF4444',
    borderRadius:10,
    background:'transparent',
    color:'#EF4444',
    cursor:'pointer'
  }
}
