import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import './MainLayout.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const MainLayout = ({ children }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [connectionsCount, setConnectionsCount] = useState(0)

  useEffect(() => {
    loadUnreadNotificationCount()
    loadConnectionsCount()
    const interval = setInterval(loadUnreadNotificationCount, 30000)
    const connectionsInterval = setInterval(loadConnectionsCount, 60000)
    
    // Listen for connections updates
    const handleConnectionsUpdate = () => {
      loadConnectionsCount()
    }
    window.addEventListener('connectionsUpdated', handleConnectionsUpdate)
    
    return () => {
      clearInterval(interval)
      clearInterval(connectionsInterval)
      window.removeEventListener('connectionsUpdated', handleConnectionsUpdate)
    }
  }, [user])

  const loadUnreadNotificationCount = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (token) {
        const response = await axios.get(`${API_BASE_URL}/api/notifications/unread-count`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        setUnreadNotificationCount(response.data.unreadCount || 0)
      }
    } catch (error) {
      console.error('Failed to load notification count:', error)
    }
  }

  const loadConnectionsCount = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (token && user) {
        const response = await axios.get(`${API_BASE_URL}/api/connections`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        // Count only accepted connections
        const acceptedConnections = response.data.filter(
          conn => conn.status === 'accepted'
        )
        setConnectionsCount(acceptedConnections.length)
      }
    } catch (error) {
      console.error('Failed to load connections count:', error)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/signin')
  }

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null
    if (imagePath.startsWith('http')) return imagePath
    return `${API_BASE_URL}${imagePath.startsWith('/') ? imagePath : '/' + imagePath}`
  }

  const isActive = (path) => location.pathname === path

  return (
    <div className="linkedin-layout">
      {/* Top Navigation Bar - LinkedIn Style */}
      <header className="linkedin-header">
        <div className="header-container">
          <div className="header-left">
            <div className="logo" onClick={() => navigate('/home')}>
              <img src="/logo.png" alt="Alva's Alumni" className="logo-image" />
              <span className="logo-text">Alva's Alumni</span>
            </div>
            <div className="search-box">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M11.4351 10.0629H10.7124L10.4562 9.81589C11.3528 8.77301 11.8925 7.4191 11.8925 5.94626C11.8925 2.66209 9.23042 0 5.94626 0C2.66209 0 0 2.66209 0 5.94626C0 9.23042 2.66209 11.8925 5.94626 11.8925C7.4191 11.8925 8.77301 11.3528 9.81589 10.4562L10.0629 10.7124V11.4351L14.6369 16L16 14.6369L11.4351 10.0629ZM5.94626 10.0629C3.66838 10.0629 1.82962 8.22413 1.82962 5.94626C1.82962 3.66838 3.66838 1.82962 5.94626 1.82962C8.22413 1.82962 10.0629 3.66838 10.0629 5.94626C10.0629 8.22413 8.22413 10.0629 5.94626 10.0629Z" fill="#666"/>
              </svg>
              <input type="text" placeholder="Search" />
            </div>
          </div>

          <nav className="header-nav">
            <div 
              className={`nav-item ${isActive('/home') ? 'active' : ''}`}
              onClick={() => navigate('/home')}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill={isActive('/home') ? '#0a66c2' : '#666'}>
                <path d="M12.5 2.75L3.5 8.75V20.75C3.5 21.5784 4.17157 22.25 5 22.25H9.5V15.5C9.5 14.6716 10.1716 14 11 14H13C13.8284 14 14.5 14.6716 14.5 15.5V22.25H19C19.8284 22.25 20.5 21.5784 20.5 20.75V8.75L12.5 2.75Z"/>
              </svg>
              <span>Home</span>
            </div>
            <div 
              className={`nav-item ${isActive('/alumni') ? 'active' : ''}`}
              onClick={() => navigate('/alumni')}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill={isActive('/alumni') ? '#0a66c2' : '#666'}>
                <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z"/>
                <path d="M12.0002 14.5C6.99016 14.5 2.91016 17.86 2.91016 22C2.91016 22.28 3.13016 22.5 3.41016 22.5H20.5902C20.8702 22.5 21.0902 22.28 21.0902 22C21.0902 17.86 17.0102 14.5 12.0002 14.5Z"/>
              </svg>
              <span>My Network</span>
            </div>
            <div 
              className={`nav-item ${isActive('/opportunities') ? 'active' : ''}`}
              onClick={() => navigate('/opportunities')}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill={isActive('/opportunities') ? '#0a66c2' : '#666'}>
                <path d="M20 6H16V4C16 2.89 15.11 2 14 2H10C8.89 2 8 2.89 8 4V6H4C2.89 6 2.01 6.89 2.01 8L2 19C2 20.11 2.89 21 4 21H20C21.11 21 22 20.11 22 19V8C22 6.89 21.11 6 20 6ZM10 4H14V6H10V4ZM20 19H4V8H20V19Z"/>
              </svg>
              <span>Jobs</span>
            </div>
            <div 
              className={`nav-item ${isActive('/events') ? 'active' : ''}`}
              onClick={() => navigate('/events')}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill={isActive('/events') ? '#0a66c2' : '#666'}>
                <path d="M19 4H5C3.89 4 3 4.9 3 6V20C3 21.1 3.89 22 5 22H19C20.1 22 21 21.1 21 20V6C21 4.9 20.1 4 19 4ZM19 20H5V9H19V20ZM19 7H5V6H19V7Z"/>
                <path d="M7 11H17V13H7V11ZM7 15H12V17H7V15Z"/>
              </svg>
              <span>Events</span>
            </div>
            <div 
              className={`nav-item ${isActive('/notifications') ? 'active' : ''}`}
              onClick={() => navigate('/notifications')}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill={isActive('/notifications') ? '#0a66c2' : '#666'}>
                <path d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.89 22 12 22ZM18 16V11C18 7.93 16.36 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C7.63 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16Z"/>
              </svg>
              <span>Notifications</span>
            </div>
            <div 
              className="nav-item profile-nav-item"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              <div className="profile-avatar-small">
                {user?.profileImage ? (
                  <img src={getImageUrl(user.profileImage)} alt={user.name} />
                ) : (
                  <span>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                )}
              </div>
              <span>Me</span>
              {showProfileMenu && (
                <div className="profile-menu-dropdown">
                  <div className="menu-header">
                    <div className="menu-profile-info">
                      <div className="menu-avatar">
                        {user?.profileImage ? (
                          <img src={getImageUrl(user.profileImage)} alt={user.name} />
                        ) : (
                          <span>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                        )}
                      </div>
                      <div>
                        <div className="menu-name">{user?.name || 'User'}</div>
                        <div className="menu-headline">{user?.headline || 'Alumni'}</div>
                      </div>
                    </div>
                  </div>
                  <div className="menu-divider"></div>
                  <div className="menu-item" onClick={() => { 
                    // Open own profile in web view
                    const webUrl = `${window.location.origin}/user/${user?._id}`
                    window.open(webUrl, '_blank')
                    setShowProfileMenu(false)
                  }}>
                    <span>View Profile</span>
                  </div>
                  <div className="menu-divider"></div>
                  <div className="menu-item" onClick={handleLogout}>
                    <span>Sign Out</span>
                  </div>
                </div>
              )}
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="linkedin-main">
        {/* Left Sidebar */}
        <aside className="linkedin-sidebar left-sidebar">
          <div className="sidebar-card">
            {user && (
              <div className="sidebar-profile" onClick={() => navigate('/profile')}>
                {user?.coverImage ? (
                  <div className="sidebar-cover">
                    <img src={getImageUrl(user.coverImage)} alt="Cover" />
                  </div>
                ) : (
                  <div className="sidebar-cover-placeholder"></div>
                )}
                <div className="sidebar-profile-pic">
                  {user?.profileImage ? (
                    <img src={getImageUrl(user.profileImage)} alt={user.name} />
                  ) : (
                    <div className="profile-pic-placeholder">
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                <div className="sidebar-profile-info">
                  <h3>{user?.name || 'Your Name'}</h3>
                  <p>{user?.headline || 'Your headline'}</p>
                </div>
              </div>
            )}
          </div>

          <div className="sidebar-card">
            <div className="sidebar-section">
              <div className="sidebar-item" onClick={() => navigate('/connections')}>
                <span className="sidebar-icon">👥</span>
                <span>Connections</span>
                <span className="sidebar-count">{connectionsCount}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="linkedin-content">
          {children}
        </main>

        {/* Right Sidebar */}
        <aside className="linkedin-sidebar right-sidebar">
          <div className="sidebar-card">
            <h3 className="sidebar-title">Alumni News</h3>
            <div className="news-item">
              <p>Stay connected with your alumni network</p>
            </div>
          </div>

          <div className="sidebar-card">
            <h3 className="sidebar-title">Quick Links</h3>
            <div className="sidebar-links">
              <div className="sidebar-link" onClick={() => navigate('/opportunities')}>
                💼 Job Opportunities
              </div>
              <div className="sidebar-link" onClick={() => navigate('/events')}>
                📅 Upcoming Events
              </div>
              <div className="sidebar-link" onClick={() => navigate('/institutions')}>
                🏫 Institutions
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default MainLayout
