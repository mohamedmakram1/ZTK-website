import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'

import './index.css'

// Pages
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Admin from './pages/Admin.jsx'
import Logs from './pages/Logs.jsx'

// Auth helper
import { currentUser } from './lib/auth.js'

// Small guard for protected routes
function RequireAuth({ children, role }) {
  const user = currentUser()
  if (!user) {
    return <Navigate to="/login" replace />
  }
  if (role && user.role !== role) {
    // logged-in but wrong role → send to dashboard
    return <Navigate to="/dashboard" replace />
  }
  return children
}

const router = createBrowserRouter([
  // Default → login (or you can redirect to /dashboard if preferred)
  { path: '/', element: <Navigate to="/login" replace /> },

  { path: '/login', element: <Login /> },

  {
    path: '/dashboard',
    element: (
      <RequireAuth>
        <Dashboard />
      </RequireAuth>
    )
  },

  {
    path: '/admin',
    element: (
      <RequireAuth role="admin">
        <Admin />
      </RequireAuth>
    )
  },

  {
    path: '/logs',
    element: (
      <RequireAuth role="admin">
        <Logs />
      </RequireAuth>
    )
  },

  // Fallback
  { path: '*', element: <Navigate to="/login" replace /> },
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
