import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getLogs, clearLogs, logout } from '../lib/auth.js'

export default function Logs() {
  const [logs, setLogs] = useState([])
  const [query, setQuery] = useState('')        // username search
  const [start, setStart] = useState('')        // YYYY-MM-DD
  const [end, setEnd] = useState('')            // YYYY-MM-DD
  const nav = useNavigate()

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const logsData = await getLogs()
        setLogs(logsData)
      } catch (error) {
        console.error('Failed to fetch logs:', error)
        if (error.message === 'TOKEN_EXPIRED') {
          logout()
          nav('/login')
          return
        }
        setLogs([])
      }
    }
    fetchLogs()
  }, [])

  // Unique usernames for quick-pick dropdown
  const users = useMemo(() => {
    const set = new Set()
    logs.forEach(l => l.username && set.add(l.username))
    return Array.from(set).sort()
  }, [logs])

  // Parse ISO date string (input type="date") into range timestamps
  const startTs = useMemo(() => (start ? new Date(start + 'T00:00:00').getTime() : null), [start])
  const endTs   = useMemo(() => (end   ? new Date(end   + 'T23:59:59.999').getTime() : null), [end])

  // Apply filters: user query + date range (inclusive)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return logs.filter(l => {
      const t = new Date(l.time).getTime()

      // user filter
      const userOk = !q || ((l.username || '').toLowerCase().includes(q))

      // date range filter
      const afterStart = startTs == null || t >= startTs
      const beforeEnd  = endTs   == null || t <= endTs

      return userOk && afterStart && beforeEnd
    })
  }, [logs, query, startTs, endTs])

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all logs?')) {
      clearLogs()
      setLogs([])
      setQuery('')
      setStart('')
      setEnd('')
    }
  }

  const pickUser = (u) => setQuery(u)
  const resetFilter = () => { setQuery(''); setStart(''); setEnd('') }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h2 style={{margin:0}}>System Logs</h2>
        <div style={{display:'flex', gap:10}}>
          <button onClick={() => nav('/admin')} style={styles.btnSecondary}>Back to Admin</button>
          <button onClick={handleClear} style={styles.btnClear}>Clear Logs</button>
        </div>
      </header>

      {/* Filter bar */}
      <div style={styles.filters}>
        <input
          style={styles.search}
          placeholder="Search by username…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <select
          style={styles.select}
          value={query && users.includes(query) ? query : ''}
          onChange={e => pickUser(e.target.value)}
        >
          <option value="">Pick user…</option>
          {users.map(u => <option key={u} value={u}>{u}</option>)}
        </select>

        <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
          <label style={styles.label}>From</label>
          <input
            type="date"
            style={styles.date}
            value={start}
            onChange={e => setStart(e.target.value)}
          />
          <label style={styles.label}>To</label>
          <input
            type="date"
            style={styles.date}
            value={end}
            onChange={e => setEnd(e.target.value)}
          />
        </div>

        <button onClick={resetFilter} style={styles.btnGhost}>Reset</button>
        <div style={styles.count}>{filtered.length} / {logs.length} shown</div>
      </div>

      <div style={{overflowX:'auto', marginTop:8}}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Time</th>
              <th style={styles.th}>User</th>
              <th style={styles.th}>Type</th>
              <th style={styles.th}>Message</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(log => (
              <tr key={log.id}>
                <td style={styles.td}>{new Date(log.time).toLocaleString()}</td>
                <td style={styles.td}>{log.username}</td>
                <td style={styles.td}>{log.type}</td>
                <td style={styles.td}>{log.message}</td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan="4" style={{padding:8, color:'#9ca3af'}}>No matching logs.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const styles = {
  page: {padding:20, color:'#e5e7eb', background:'#0b1220', minHeight:'100dvh'},
  header: {display:'flex', justifyContent:'space-between', alignItems:'center'},
  filters: { marginTop:14, display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' },
  search: {
    padding:'10px 12px', border:'1px solid #374151', borderRadius:12,
    background:'#0f172a', color:'#e5e7eb', minWidth:240, outline:'none'
  },
  select: {
    padding:'10px 12px', border:'1px solid #374151', borderRadius:12,
    background:'#0f172a', color:'#e5e7eb'
  },
  date: {
    padding:'8px 10px', border:'1px solid #374151', borderRadius:10,
    background:'#0f172a', color:'#e5e7eb'
  },
  label: { fontSize:12, color:'#9ca3af' },
  count: {marginLeft:'auto', fontSize:13, color:'#9ca3af'},
  table: {width:'100%', borderCollapse:'collapse', background:'#111827', border:'1px solid #2f3a4d', borderRadius:14},
  th: {border:'1px solid #2f3a4d', textAlign:'left', padding:8, background:'#1f2937'},
  td: {border:'1px solid #2f3a4d', padding:8, fontSize:14},
  btnClear: {
    padding:'8px 12px',
    border:'1px solid #ef4444',
    borderRadius:8,
    background:'transparent',
    color:'#ef4444',
    cursor:'pointer'
  },
  btnSecondary: {
    padding:'8px 12px',
    border:'1px solid #374151',
    borderRadius:8,
    background:'transparent',
    color:'#e5e7eb',
    cursor:'pointer'
  },
  btnGhost: {
    padding:'8px 12px',
    border:'1px solid #374151',
    borderRadius:8,
    background:'transparent',
    color:'#e5e7eb',
    cursor:'pointer'
  }
}
