import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const PrivateRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <div>Loading...</div>
      </div>
    )
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/signin" state={{ from: location }} replace />
  }

  // Admin-only route
  if (adminOnly && !user.isAdmin) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <h2>Access Denied</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    )
  }

  return children
}

export default PrivateRoute
