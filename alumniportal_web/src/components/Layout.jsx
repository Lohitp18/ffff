import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Layout.css'

const Layout = ({ children }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/signin')
  }

  const navItems = [
    { path: '/home', label: 'Home', icon: '🏠' },
    { path: '/alumni', label: 'Alumni', icon: '👥' },
    { path: '/opportunities', label: 'Opportunities', icon: '💼' },
    { path: '/events', label: 'Events', icon: '📅' },
    { path: '/institutions', label: 'Institutions', icon: '🏫' },
  ]

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <div className="logo-section">
            <h1>Alumni Portal</h1>
          </div>
          <nav className="top-nav">
            <Link to="/notifications" className="nav-icon">
              🔔
            </Link>
            <div className="user-menu">
              <span>{user?.name || user?.email}</span>
              <div className="dropdown">
                <Link to="/profile">Profile</Link>
                {user?.role === 'admin' && <Link to="/admin">Admin</Link>}
                <button onClick={handleLogout}>Sign Out</button>
              </div>
            </div>
          </nav>
        </div>
      </header>
      <div className="layout-body">
        <aside className="sidebar">
          <nav className="sidebar-nav">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>
        <main className="main-content">{children}</main>
      </div>
    </div>
  )
}

export default Layout









