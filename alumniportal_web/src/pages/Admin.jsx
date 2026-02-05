import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import './Admin.css'
import './Auth.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const Admin = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  const SUPER_ADMIN_EMAIL = 'patgarlohit818@gmail.com'
  const SUPER_ADMIN_PASSWORD = 'Lohit@2004'
  const [stats, setStats] = useState({})
  const [users, setUsers] = useState([])
  const [posts, setPosts] = useState([])
  const [events, setEvents] = useState([])
  const [opportunities, setOpportunities] = useState([])
  const [reports, setReports] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [postsLoading, setPostsLoading] = useState(false)
  const [eventsLoading, setEventsLoading] = useState(false)
  const [opportunitiesLoading, setOpportunitiesLoading] = useState(false)
  const [reportsLoading, setReportsLoading] = useState(false)

  // Filter states
  const [filters, setFilters] = useState({
    institution: '',
    course: '',
    year: '',
    company: ''
  })
  
  // Statistics state
  const [statistics, setStatistics] = useState({
    byYear: {},
    byInstitution: {},
    byCourse: {},
    byCompany: {},
    entrepreneurs: 0,
    higherEducation: 0
  })

  useEffect(() => {
    const adminAuth = localStorage.getItem('admin_authenticated')
    if (adminAuth === 'true') {
      setIsAuthenticated(true)
      if (user) loadDashboardStats()
    } else {
      setIsAuthenticated(false)
    }
  }, [user])

  const handleAdminLogin = async (e) => {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)

    // Check if credentials match super admin
    if (loginEmail !== SUPER_ADMIN_EMAIL || loginPassword !== SUPER_ADMIN_PASSWORD) {
      setLoginError('Invalid admin credentials')
      setLoginLoading(false)
      return
    }

    // Set admin authentication
    localStorage.setItem('admin_authenticated', 'true')
    setIsAuthenticated(true)
    setLoginLoading(false)
    
    // Load dashboard stats after authentication
    // Note: This may require a valid auth token for API calls
    setTimeout(() => {
      loadDashboardStats()
    }, 100)
  }

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      console.warn('No auth token found')
      return {}
    }
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }


  const loadDashboardStats = async () => {
    try {
      const [usersRes, postsRes, eventsRes, oppsRes, instPostsRes, reportsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/admin/approved-users`, { headers: getAuthHeaders() }),
        axios.get(`${API_BASE_URL}/api/admin/approved-posts`, { headers: getAuthHeaders() }),
        axios.get(`${API_BASE_URL}/api/admin/approved-events`, { headers: getAuthHeaders() }),
        axios.get(`${API_BASE_URL}/api/admin/approved-opportunities`, { headers: getAuthHeaders() }),
        axios.get(`${API_BASE_URL}/api/admin/approved-institution-posts`, { headers: getAuthHeaders() }),
        axios.get(`${API_BASE_URL}/api/reports/stats`, { headers: getAuthHeaders() }),
      ])

      const [pendingUsersRes, pendingPostsRes, pendingEventsRes, pendingOppsRes, pendingInstPostsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/admin/users`, { headers: getAuthHeaders() }),
        axios.get(`${API_BASE_URL}/api/admin/pending-posts`, { headers: getAuthHeaders() }),
        axios.get(`${API_BASE_URL}/api/admin/pending-events`, { headers: getAuthHeaders() }),
        axios.get(`${API_BASE_URL}/api/admin/pending-opportunities`, { headers: getAuthHeaders() }),
        axios.get(`${API_BASE_URL}/api/admin/pending-institution-posts`, { headers: getAuthHeaders() }),
      ])

      setStats({
        totalUsers: usersRes.data.length,
        pendingUsers: pendingUsersRes.data.length,
        totalPosts: postsRes.data.length,
        pendingPosts: pendingPostsRes.data.length,
        totalEvents: eventsRes.data.length,
        pendingEvents: pendingEventsRes.data.length,
        totalOpportunities: oppsRes.data.length,
        pendingOpportunities: pendingOppsRes.data.length,
        totalInstitutionPosts: instPostsRes.data.length,
        pendingInstitutionPosts: pendingInstPostsRes.data.length,
        totalReports: reportsRes.data.total,
        pendingReports: reportsRes.data.pending,
      })
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const loadUsers = async () => {
    setUsersLoading(true)
    try {
      const [pendingRes, approvedRes, blockedRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/admin/users`, { headers: getAuthHeaders() }).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/api/admin/approved-users`, { headers: getAuthHeaders() }).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/api/admin/blocked-users`, { headers: getAuthHeaders() }).catch(() => ({ data: [] }))
      ])
      const allUsers = [...pendingRes.data, ...approvedRes.data, ...blockedRes.data]
      setUsers(allUsers)
      calculateStatistics(allUsers, posts, events, opportunities)
    } catch (error) {
      console.error('Failed to load users:', error)
      setUsers([])
    } finally {
      setUsersLoading(false)
    }
  }

  const loadPosts = async () => {
    setPostsLoading(true)
    try {
      const [pendingRes, approvedRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/admin/pending-posts`, { headers: getAuthHeaders() }),
        axios.get(`${API_BASE_URL}/api/admin/approved-posts`, { headers: getAuthHeaders() })
      ])
      const allPosts = [...pendingRes.data, ...approvedRes.data]
      setPosts(allPosts)
      calculateStatistics(users, allPosts, events, opportunities)
    } catch (error) {
      console.error('Failed to load posts:', error)
      setPosts([])
    } finally {
      setPostsLoading(false)
    }
  }

  const loadEvents = async () => {
    setEventsLoading(true)
    try {
      const [pendingRes, approvedRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/admin/pending-events`, { headers: getAuthHeaders() }),
        axios.get(`${API_BASE_URL}/api/admin/approved-events`, { headers: getAuthHeaders() })
      ])
      const allEvents = [...pendingRes.data, ...approvedRes.data]
      setEvents(allEvents)
      calculateStatistics(users, posts, allEvents, opportunities)
    } catch (error) {
      console.error('Failed to load events:', error)
      setEvents([])
    } finally {
      setEventsLoading(false)
    }
  }

  const loadOpportunities = async () => {
    setOpportunitiesLoading(true)
    try {
      const [pendingRes, approvedRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/admin/pending-opportunities`, { headers: getAuthHeaders() }),
        axios.get(`${API_BASE_URL}/api/admin/approved-opportunities`, { headers: getAuthHeaders() })
      ])
      const allOpportunities = [...pendingRes.data, ...approvedRes.data]
      setOpportunities(allOpportunities)
      calculateStatistics(users, posts, events, allOpportunities)
    } catch (error) {
      console.error('Failed to load opportunities:', error)
      setOpportunities([])
    } finally {
      setOpportunitiesLoading(false)
    }
  }

  const loadReports = async () => {
    setReportsLoading(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/api/reports?status=all`, { headers: getAuthHeaders() })
      setReports(response.data.reports || response.data || [])
    } catch (error) {
      console.error('Failed to load reports:', error)
      setReports([])
    } finally {
      setReportsLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      if (activeTab === 'users') loadUsers()
      if (activeTab === 'posts') loadPosts()
      if (activeTab === 'events') loadEvents()
      if (activeTab === 'opportunities') loadOpportunities()
      if (activeTab === 'reports') loadReports()
      if (activeTab === 'whatsapp') loadUsers() // Load users for WhatsApp tab
    }
  }, [activeTab, isAuthenticated])

  // Recalculate statistics when data changes
  useEffect(() => {
    if (users.length > 0 || posts.length > 0 || events.length > 0 || opportunities.length > 0) {
      calculateStatistics(users, posts, events, opportunities)
    }
  }, [users, posts, events, opportunities])

  const handleUserAction = async (userId, action) => {
    try {
      await axios.patch(
        `${API_BASE_URL}/api/admin/${action}/${userId}`,
        {},
        { headers: getAuthHeaders() }
      )
      loadUsers()
      loadDashboardStats()
      alert(`User ${action}ed successfully`)
    } catch (error) {
      alert(error.response?.data?.error || `Failed to ${action} user`)
    }
  }

  const handleContentAction = async (id, type, action) => {
    try {
      await axios.put(
        `${API_BASE_URL}/api/admin/${type}/${id}/status`,
        { status: action },
        { headers: getAuthHeaders() }
      )
      if (type === 'posts') loadPosts()
      if (type === 'events') loadEvents()
      if (type === 'opportunities') loadOpportunities()
      loadDashboardStats()
      alert(`Content ${action}ed successfully`)
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update content')
    }
  }

  const handleDeleteContent = async (id, type) => {
    if (!window.confirm(`Are you sure you want to delete this ${type.slice(0, -1)}?`)) return
    try {
      await axios.delete(
        `${API_BASE_URL}/api/admin/${type}/${id}`,
        { headers: getAuthHeaders() }
      )
      if (type === 'posts') loadPosts()
      if (type === 'events') loadEvents()
      if (type === 'opportunities') loadOpportunities()
      loadDashboardStats()
      alert(`${type.slice(0, -1)} deleted successfully`)
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete content')
    }
  }

  const handleReportAction = async (reportId, status) => {
    try {
      await axios.patch(
        `${API_BASE_URL}/api/reports/${reportId}/status`,
        { status },
        { headers: getAuthHeaders() }
      )
      loadReports()
      loadDashboardStats()
      alert('Report status updated successfully')
    } catch (error) {
      alert('Failed to update report')
    }
  }

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null
    if (imagePath.startsWith('http')) return imagePath
    return `${API_BASE_URL}${imagePath.startsWith('/') ? imagePath : '/' + imagePath}`
  }

  // Calculate statistics
  const calculateStatistics = (allUsers, allPosts, allEvents, allOpportunities) => {
    const stats = {
      byYear: {},
      byInstitution: {},
      byCourse: {},
      byCompany: {},
      entrepreneurs: 0,
      higherEducation: 0
    }

    // User statistics
    allUsers.forEach(user => {
      // By year
      if (user.year) {
        stats.byYear[user.year] = (stats.byYear[user.year] || 0) + 1
      }
      // By institution
      if (user.institution) {
        stats.byInstitution[user.institution] = (stats.byInstitution[user.institution] || 0) + 1
      }
      // By course
      if (user.course) {
        stats.byCourse[user.course] = (stats.byCourse[user.course] || 0) + 1
      }
      // Entrepreneurs (check if has entrepreneur company or currentStatus)
      if (user.privateInfo?.currentCompany && user.privateInfo?.currentCompany.toLowerCase().includes('entrepreneur')) {
        stats.entrepreneurs++
      }
      // Higher education (hasMasters or mastersUniversity)
      if (user.privateInfo?.hasMasters || user.privateInfo?.mastersUniversity) {
        stats.higherEducation++
      }
    })

    // Company statistics from opportunities
    allOpportunities.forEach(opp => {
      if (opp.company) {
        stats.byCompany[opp.company] = (stats.byCompany[opp.company] || 0) + 1
      }
    })

    setStatistics(stats)
  }

  // Get unique values for filters
  const getUniqueValues = (data, field) => {
    const values = new Set()
    data.forEach(item => {
      let value = null
      if (item[field]) {
        value = item[field]
      } else if (item.authorId && typeof item.authorId === 'object' && item.authorId[field]) {
        value = item.authorId[field]
      } else if (item.postedBy && typeof item.postedBy === 'object' && item.postedBy[field]) {
        value = item.postedBy[field]
      }
      if (value && value.trim() !== '') {
        values.add(value)
      }
    })
    return Array.from(values).sort()
  }

  // Filter data based on active filters
  const getFilteredData = (data, type) => {
    let filtered = [...data]

    if (type === 'users') {
      if (filters.institution) {
        filtered = filtered.filter(u => u.institution === filters.institution)
      }
      if (filters.course) {
        filtered = filtered.filter(u => u.course === filters.course)
      }
      if (filters.year) {
        filtered = filtered.filter(u => u.year === filters.year)
      }
      if (filters.company) {
        const companyFilter = filters.company.toLowerCase()
        filtered = filtered.filter(u => {
          const currentCompany = u.privateInfo?.currentCompany || ''
          const previousCompanies = u.privateInfo?.previousCompanies || []
          const companyMatch = currentCompany.toLowerCase().includes(companyFilter) ||
            previousCompanies.some(pc => pc.company && pc.company.toLowerCase().includes(companyFilter))
          return companyMatch
        })
      }
    } else if (type === 'posts') {
      if (filters.institution) {
        filtered = filtered.filter(p => {
          const userInstitution = p.authorId?.institution || p.postedBy?.institution
          return userInstitution === filters.institution
        })
      }
      if (filters.course) {
        filtered = filtered.filter(p => {
          const userCourse = p.authorId?.course || p.postedBy?.course
          return userCourse === filters.course
        })
      }
      if (filters.year) {
        filtered = filtered.filter(p => {
          const userYear = p.authorId?.year || p.postedBy?.year
          return userYear === filters.year
        })
      }
    } else if (type === 'events') {
      if (filters.institution) {
        filtered = filtered.filter(e => {
          const userInstitution = e.postedBy?.institution
          return userInstitution === filters.institution
        })
      }
      if (filters.course) {
        filtered = filtered.filter(e => {
          const userCourse = e.postedBy?.course
          return userCourse === filters.course
        })
      }
      if (filters.year) {
        filtered = filtered.filter(e => {
          const userYear = e.postedBy?.year
          return userYear === filters.year
        })
      }
    } else if (type === 'opportunities') {
      if (filters.company) {
        filtered = filtered.filter(o => o.company === filters.company)
      }
      if (filters.institution) {
        filtered = filtered.filter(o => {
          const userInstitution = o.postedBy?.institution
          return userInstitution === filters.institution
        })
      }
      if (filters.course) {
        filtered = filtered.filter(o => {
          const userCourse = o.postedBy?.course
          return userCourse === filters.course
        })
      }
      if (filters.year) {
        filtered = filtered.filter(o => {
          const userYear = o.postedBy?.year
          return userYear === filters.year
        })
      }
    }

    return filtered
  }

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }

  const clearFilters = () => {
    setFilters({
      institution: '',
      course: '',
      year: '',
      company: ''
    })
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1>Alumni Portal</h1>
          <h2>Admin Sign In</h2>
          {loginError && <div className="error-message">{loginError}</div>}
          <form onSubmit={handleAdminLogin}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                placeholder="Enter admin email"
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                placeholder="Enter admin password"
              />
            </div>
            <button type="submit" disabled={loginLoading} className="auth-button">
              {loginLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p className="auth-link">
            <a href="/signin">Back to Regular Login</a>
          </p>
        </div>
      </div>
    )
  }

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      localStorage.removeItem('admin_authenticated')
      logout()
      navigate('/signin')
    }
  }

  return (
    <div className="admin-container-full">
      <div className="admin-header-full">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1>Super Admin Dashboard</h1>
          <button 
            onClick={handleLogout}
            style={{
              padding: '8px 16px',
              background: '#fff',
              color: '#0a66c2',
              border: '1px solid #0a66c2',
              borderRadius: '24px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.target.style.background = '#f0f7ff'
            }}
            onMouseOut={(e) => {
              e.target.style.background = '#fff'
            }}
          >
            Logout
          </button>
        </div>
        <div className="admin-stats-full">
          <div className="stat-card-full">
            <div className="stat-value-full">{stats.totalUsers || 0}</div>
            <div className="stat-label-full">Total Users</div>
            {stats.pendingUsers > 0 && (
              <div className="stat-badge-full">{stats.pendingUsers} pending</div>
            )}
          </div>
          <div className="stat-card-full">
            <div className="stat-value-full">{stats.totalPosts || 0}</div>
            <div className="stat-label-full">Posts</div>
            {stats.pendingPosts > 0 && (
              <div className="stat-badge-full">{stats.pendingPosts} pending</div>
            )}
          </div>
          <div className="stat-card-full">
            <div className="stat-value-full">{stats.totalEvents || 0}</div>
            <div className="stat-label-full">Events</div>
            {stats.pendingEvents > 0 && (
              <div className="stat-badge-full">{stats.pendingEvents} pending</div>
            )}
          </div>
          <div className="stat-card-full">
            <div className="stat-value-full">{stats.totalOpportunities || 0}</div>
            <div className="stat-label-full">Opportunities</div>
            {stats.pendingOpportunities > 0 && (
              <div className="stat-badge-full">{stats.pendingOpportunities} pending</div>
            )}
          </div>
          <div className="stat-card-full">
            <div className="stat-value-full">{stats.totalReports || 0}</div>
            <div className="stat-label-full">Reports</div>
            {stats.pendingReports > 0 && (
              <div className="stat-badge-full">{stats.pendingReports} pending</div>
            )}
          </div>
        </div>
      </div>

      <div className="admin-tabs-full">
        <button
          className={activeTab === 'dashboard' ? 'active' : ''}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Dashboard
        </button>
        <button
          className={activeTab === 'users' ? 'active' : ''}
          onClick={() => setActiveTab('users')}
        >
          👥 Users
        </button>
        <button
          className={activeTab === 'posts' ? 'active' : ''}
          onClick={() => setActiveTab('posts')}
        >
          📝 Posts
        </button>
        <button
          className={activeTab === 'events' ? 'active' : ''}
          onClick={() => setActiveTab('events')}
        >
          📅 Events
        </button>
        <button
          className={activeTab === 'opportunities' ? 'active' : ''}
          onClick={() => setActiveTab('opportunities')}
        >
          💼 Opportunities
        </button>
        <button
          className={activeTab === 'reports' ? 'active' : ''}
          onClick={() => setActiveTab('reports')}
        >
          🚩 Reports
        </button>
        <button
          className={activeTab === 'whatsapp' ? 'active' : ''}
          onClick={() => setActiveTab('whatsapp')}
        >
          💬 WhatsApp Messages
        </button>
      </div>

      <div className="admin-content-full">
        {activeTab === 'dashboard' && (
          <div className="dashboard-view-full">
            <h2>Overview</h2>
            <div className="dashboard-grid-full">
              <div className="dashboard-card-full">
                <h3>Quick Actions</h3>
                <div className="quick-actions-full">
                  <button onClick={() => navigate('/institutionadmin')} className="action-btn-full">
                    🏫 Post to Institutions
                  </button>
                  <div className="action-info">
                    <span>Review Pending Users: {stats.pendingUsers || 0}</span>
                  </div>
                  <div className="action-info">
                    <span>Review Pending Posts: {stats.pendingPosts || 0}</span>
                  </div>
                  <div className="action-info">
                    <span>Review Pending Events: {stats.pendingEvents || 0}</span>
                  </div>
                  <div className="action-info">
                    <span>Review Pending Opportunities: {stats.pendingOpportunities || 0}</span>
                  </div>
                  <div className="action-info">
                    <span>Review Reports: {stats.pendingReports || 0}</span>
                  </div>
                </div>
              </div>
              
              {/* Statistics Cards */}
              <div className="dashboard-card-full">
                <h3>Statistics</h3>
                <div className="statistics-grid">
                  <div className="stat-item">
                    <h4>By Year</h4>
                    <div className="stat-list">
                      {Object.entries(statistics.byYear)
                        .sort((a, b) => b[0].localeCompare(a[0]))
                        .slice(0, 5)
                        .map(([year, count]) => (
                          <div key={year} className="stat-row">
                            <span>{year}:</span>
                            <strong>{count}</strong>
                          </div>
                        ))}
                    </div>
                  </div>
                  
                  <div className="stat-item">
                    <h4>By Institution</h4>
                    <div className="stat-list">
                      {Object.entries(statistics.byInstitution)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([institution, count]) => (
                          <div key={institution} className="stat-row">
                            <span>{institution.substring(0, 30)}...</span>
                            <strong>{count}</strong>
                          </div>
                        ))}
                    </div>
                  </div>
                  
                  <div className="stat-item">
                    <h4>By Course</h4>
                    <div className="stat-list">
                      {Object.entries(statistics.byCourse)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([course, count]) => (
                          <div key={course} className="stat-row">
                            <span>{course}:</span>
                            <strong>{count}</strong>
                          </div>
                        ))}
                    </div>
                  </div>
                  
                  <div className="stat-item">
                    <h4>By Company</h4>
                    <div className="stat-list">
                      {Object.entries(statistics.byCompany)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([company, count]) => (
                          <div key={company} className="stat-row">
                            <span>{company.substring(0, 30)}...</span>
                            <strong>{count}</strong>
                          </div>
                        ))}
                    </div>
                  </div>
                  
                  <div className="stat-item">
                    <h4>Entrepreneurs</h4>
                    <div className="stat-big-number">{statistics.entrepreneurs}</div>
                  </div>
                  
                  <div className="stat-item">
                    <h4>Higher Education</h4>
                    <div className="stat-big-number">{statistics.higherEducation}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="admin-section-full">
            <h2>All Users</h2>
            
            {/* Filters */}
            <div className="admin-filters">
              <select
                value={filters.institution}
                onChange={(e) => handleFilterChange('institution', e.target.value)}
                className="filter-select"
              >
                <option value="">All Institutions</option>
                {getUniqueValues(users, 'institution').map(inst => (
                  <option key={inst} value={inst}>{inst}</option>
                ))}
              </select>
              
              <select
                value={filters.course}
                onChange={(e) => handleFilterChange('course', e.target.value)}
                className="filter-select"
              >
                <option value="">All Courses</option>
                {getUniqueValues(users, 'course').map(course => (
                  <option key={course} value={course}>{course}</option>
                ))}
              </select>
              
              <select
                value={filters.year}
                onChange={(e) => handleFilterChange('year', e.target.value)}
                className="filter-select"
              >
                <option value="">All Years</option>
                {getUniqueValues(users, 'year').map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              
              <input
                type="text"
                value={filters.company}
                onChange={(e) => handleFilterChange('company', e.target.value)}
                placeholder="Filter by Company"
                className="filter-input"
              />
              
              <button onClick={clearFilters} className="clear-filters-btn">Clear Filters</button>
            </div>
            
            {usersLoading ? (
              <div className="loading">Loading users...</div>
            ) : getFilteredData(users, 'users').length === 0 ? (
              <div className="empty-state">No users found</div>
            ) : (
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Photo</th>
                      <th>Name</th>
                      <th>Institution</th>
                      <th>Course</th>
                      <th>Year</th>
                      <th>Headline</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredData(users, 'users').map((user) => (
                      <tr key={user._id}>
                        <td>
                          <div className="user-avatar-small">
                            {user.profileImage ? (
                              <img src={getImageUrl(user.profileImage)} alt={user.name} />
                            ) : (
                              <span>{user.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                            )}
                          </div>
                        </td>
                        <td>{user.name || 'N/A'}</td>
                        <td>{user.institution || '-'}</td>
                        <td>{user.course || '-'}</td>
                        <td>{user.year || '-'}</td>
                        <td>{user.headline || '-'}</td>
                        <td>
                          <span className={`status-badge ${user.status}`}>
                            {user.status || 'pending'}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            {user.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleUserAction(user._id, 'approve')}
                                  className="btn-approve"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleUserAction(user._id, 'reject')}
                                  className="btn-reject"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {user.status === 'approved' && (
                              <button
                                onClick={() => handleUserAction(user._id, 'block')}
                                className="btn-block"
                              >
                                Block
                              </button>
                            )}
                            {user.status === 'blocked' && (
                              <button
                                onClick={() => handleUserAction(user._id, 'unblock')}
                                className="btn-approve"
                              >
                                Unblock
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'posts' && (
          <div className="admin-section-full">
            <h2>All Posts</h2>
            
            {/* Filters */}
            <div className="admin-filters">
              <select
                value={filters.institution}
                onChange={(e) => handleFilterChange('institution', e.target.value)}
                className="filter-select"
              >
                <option value="">All Institutions</option>
                {getUniqueValues(posts, 'institution').map(inst => (
                  <option key={inst} value={inst}>{inst}</option>
                ))}
              </select>
              
              <select
                value={filters.course}
                onChange={(e) => handleFilterChange('course', e.target.value)}
                className="filter-select"
              >
                <option value="">All Courses</option>
                {getUniqueValues(posts, 'course').map(course => (
                  <option key={course} value={course}>{course}</option>
                ))}
              </select>
              
              <select
                value={filters.year}
                onChange={(e) => handleFilterChange('year', e.target.value)}
                className="filter-select"
              >
                <option value="">All Years</option>
                {getUniqueValues(posts, 'year').map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              
              <button onClick={clearFilters} className="clear-filters-btn">Clear Filters</button>
            </div>
            
            {postsLoading ? (
              <div className="loading">Loading posts...</div>
            ) : getFilteredData(posts, 'posts').length === 0 ? (
              <div className="empty-state">No posts found</div>
            ) : (
              <div className="content-list">
                {getFilteredData(posts, 'posts').map((post) => (
                  <div key={post._id} className="content-item">
                    <div className="content-header">
                      <h3>{post.title || 'Untitled Post'}</h3>
                      <span className={`status-badge ${post.status || 'pending'}`}>
                        {post.status || 'pending'}
                      </span>
                    </div>
                    <p>{post.content || post.description || 'No content'}</p>
                    {post.imageUrl && (
                      <img 
                        src={`${API_BASE_URL}${post.imageUrl}`} 
                        alt={post.title}
                        className="content-image"
                      />
                    )}
                    <div className="content-meta">
                      <span><strong>User:</strong> {post.authorId?.name || post.postedBy?.name || 'Unknown'}</span>
                      <span><strong>Institution:</strong> {post.authorId?.institution || post.postedBy?.institution || 'N/A'}</span>
                      <span><strong>Course:</strong> {post.authorId?.course || post.postedBy?.course || 'N/A'}</span>
                      <span><strong>Year:</strong> {post.authorId?.year || post.postedBy?.year || 'N/A'}</span>
                      <span>Created: {new Date(post.createdAt).toLocaleDateString()}</span>
                      {post.likes && <span>Likes: {post.likes.length || 0}</span>}
                    </div>
                    <div className="content-actions">
                      {post.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleContentAction(post._id, 'posts', 'approved')}
                            className="btn-approve"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleContentAction(post._id, 'posts', 'rejected')}
                            className="btn-reject"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {post.status === 'approved' && (
                        <button
                          onClick={() => handleContentAction(post._id, 'posts', 'rejected')}
                          className="btn-reject"
                        >
                          Reject
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteContent(post._id, 'posts')}
                        className="btn-delete"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'events' && (
          <div className="admin-section-full">
            <h2>All Events</h2>
            
            {/* Filters */}
            <div className="admin-filters">
              <select
                value={filters.institution}
                onChange={(e) => handleFilterChange('institution', e.target.value)}
                className="filter-select"
              >
                <option value="">All Institutions</option>
                {getUniqueValues(events, 'institution').map(inst => (
                  <option key={inst} value={inst}>{inst}</option>
                ))}
              </select>
              
              <select
                value={filters.course}
                onChange={(e) => handleFilterChange('course', e.target.value)}
                className="filter-select"
              >
                <option value="">All Courses</option>
                {getUniqueValues(events, 'course').map(course => (
                  <option key={course} value={course}>{course}</option>
                ))}
              </select>
              
              <select
                value={filters.year}
                onChange={(e) => handleFilterChange('year', e.target.value)}
                className="filter-select"
              >
                <option value="">All Years</option>
                {getUniqueValues(events, 'year').map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              
              <button onClick={clearFilters} className="clear-filters-btn">Clear Filters</button>
            </div>
            
            {eventsLoading ? (
              <div className="loading">Loading events...</div>
            ) : getFilteredData(events, 'events').length === 0 ? (
              <div className="empty-state">No events found</div>
            ) : (
              <div className="content-list">
                {getFilteredData(events, 'events').map((event) => (
                  <div key={event._id} className="content-item">
                    <div className="content-header">
                      <h3>{event.title || 'Untitled Event'}</h3>
                      <span className={`status-badge ${event.status || 'pending'}`}>
                        {event.status || 'pending'}
                      </span>
                    </div>
                    <p>{event.description || event.content || 'No description'}</p>
                    {event.imageUrl && (
                      <img 
                        src={`${API_BASE_URL}${event.imageUrl}`} 
                        alt={event.title}
                        className="content-image"
                      />
                    )}
                    <div className="content-meta">
                      <span><strong>User:</strong> {event.postedBy?.name || 'Unknown'}</span>
                      <span><strong>Institution:</strong> {event.postedBy?.institution || 'N/A'}</span>
                      <span><strong>Course:</strong> {event.postedBy?.course || 'N/A'}</span>
                      <span><strong>Year:</strong> {event.postedBy?.year || 'N/A'}</span>
                      <span>Date: {event.date || new Date(event.createdAt).toLocaleDateString()}</span>
                      <span>Location: {event.location || 'N/A'}</span>
                      {event.likes && <span>Likes: {event.likes.length || 0}</span>}
                    </div>
                    <div className="content-actions">
                      {event.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleContentAction(event._id, 'events', 'approved')}
                            className="btn-approve"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleContentAction(event._id, 'events', 'rejected')}
                            className="btn-reject"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {event.status === 'approved' && (
                        <button
                          onClick={() => handleContentAction(event._id, 'events', 'rejected')}
                          className="btn-reject"
                        >
                          Reject
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteContent(event._id, 'events')}
                        className="btn-delete"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'opportunities' && (
          <div className="admin-section-full">
            <h2>All Opportunities</h2>
            
            {/* Filters */}
            <div className="admin-filters">
              <select
                value={filters.company}
                onChange={(e) => handleFilterChange('company', e.target.value)}
                className="filter-select"
              >
                <option value="">All Companies</option>
                {getUniqueValues(opportunities, 'company').map(company => (
                  <option key={company} value={company}>{company}</option>
                ))}
              </select>
              
              <select
                value={filters.institution}
                onChange={(e) => handleFilterChange('institution', e.target.value)}
                className="filter-select"
              >
                <option value="">All Institutions</option>
                {getUniqueValues(opportunities, 'institution').map(inst => (
                  <option key={inst} value={inst}>{inst}</option>
                ))}
              </select>
              
              <select
                value={filters.course}
                onChange={(e) => handleFilterChange('course', e.target.value)}
                className="filter-select"
              >
                <option value="">All Courses</option>
                {getUniqueValues(opportunities, 'course').map(course => (
                  <option key={course} value={course}>{course}</option>
                ))}
              </select>
              
              <select
                value={filters.year}
                onChange={(e) => handleFilterChange('year', e.target.value)}
                className="filter-select"
              >
                <option value="">All Years</option>
                {getUniqueValues(opportunities, 'year').map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              
              <button onClick={clearFilters} className="clear-filters-btn">Clear Filters</button>
            </div>
            
            {opportunitiesLoading ? (
              <div className="loading">Loading opportunities...</div>
            ) : getFilteredData(opportunities, 'opportunities').length === 0 ? (
              <div className="empty-state">No opportunities found</div>
            ) : (
              <div className="content-list">
                {getFilteredData(opportunities, 'opportunities').map((opp) => (
                  <div key={opp._id} className="content-item">
                    <div className="content-header">
                      <h3>{opp.title || 'Untitled Opportunity'}</h3>
                      <span className={`status-badge ${opp.status || 'pending'}`}>
                        {opp.status || 'pending'}
                      </span>
                    </div>
                    <p>{opp.description || opp.content || 'No description'}</p>
                    {opp.imageUrl && (
                      <img 
                        src={`${API_BASE_URL}${opp.imageUrl}`} 
                        alt={opp.title}
                        className="content-image"
                      />
                    )}
                    <div className="content-meta">
                      <span><strong>Company:</strong> {opp.company || 'N/A'}</span>
                      <span><strong>Institution:</strong> {opp.postedBy?.institution || 'N/A'}</span>
                      <span><strong>Course:</strong> {opp.postedBy?.course || 'N/A'}</span>
                      <span><strong>Year:</strong> {opp.postedBy?.year || 'N/A'}</span>
                      <span>Type: {opp.type || 'Full-time'}</span>
                      {opp.applyLink && <span>🔗 <a href={opp.applyLink} target="_blank" rel="noopener noreferrer">Apply Link</a></span>}
                      {opp.likes && <span>Likes: {opp.likes.length || 0}</span>}
                    </div>
                    <div className="content-actions">
                      {opp.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleContentAction(opp._id, 'opportunities', 'approved')}
                            className="btn-approve"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleContentAction(opp._id, 'opportunities', 'rejected')}
                            className="btn-reject"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {opp.status === 'approved' && (
                        <button
                          onClick={() => handleContentAction(opp._id, 'opportunities', 'rejected')}
                          className="btn-reject"
                        >
                          Reject
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteContent(opp._id, 'opportunities')}
                        className="btn-delete"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="admin-section-full">
            <h2>All Reports</h2>
            {reportsLoading ? (
              <div className="loading">Loading reports...</div>
            ) : reports.length === 0 ? (
              <div className="empty-state">No reports found</div>
            ) : (
              <div className="reports-list">
                {reports.map((report) => (
                  <div key={report._id} className="report-item">
                    <div className="report-header">
                      <div>
                        <strong>Type:</strong> {report.reportedItemType || 'Unknown'}
                        {' | '}
                        <strong>Reason:</strong> {report.reason || 'No reason provided'}
                      </div>
                      <span className={`status-badge ${report.status || 'pending'}`}>
                        {report.status || 'pending'}
                      </span>
                    </div>
                    <p><strong>Description:</strong> {report.description || 'No description'}</p>
                    <div className="report-meta">
                      <span>Reported by: {report.reporterId?.name || 'Unknown User'}</span>
                      <span>Date: {report.createdAt ? new Date(report.createdAt).toLocaleDateString() : 'N/A'}</span>
                      {report.reviewedBy && (
                        <span>Reviewed by: {report.reviewedBy?.name || 'Admin'}</span>
                      )}
                    </div>
                    {report.reportedItem && (
                      <div className="reported-item">
                        <strong>Reported Content:</strong>
                        <p>{report.reportedItem.title || report.reportedItem.content || 'Content not available'}</p>
                        {report.reportedItem.authorId && (
                          <p>Author: {report.reportedItem.authorId.name || 'Unknown'}</p>
                        )}
                        {report.reportedItem.postedBy && (
                          <p>Posted by: {report.reportedItem.postedBy.name || 'Unknown'}</p>
                        )}
                      </div>
                    )}
                    <div className="content-actions">
                      {report.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleReportAction(report._id, 'reviewed')}
                            className="btn-approve"
                          >
                            Mark Reviewed
                          </button>
                          <button
                            onClick={() => handleReportAction(report._id, 'resolved')}
                            className="btn-approve"
                          >
                            Resolve
                          </button>
                          <button
                            onClick={() => handleReportAction(report._id, 'dismissed')}
                            className="btn-reject"
                          >
                            Dismiss
                          </button>
                        </>
                      )}
                      {report.status === 'reviewed' && (
                        <>
                          <button
                            onClick={() => handleReportAction(report._id, 'resolved')}
                            className="btn-approve"
                          >
                            Resolve
                          </button>
                          <button
                            onClick={() => handleReportAction(report._id, 'dismissed')}
                            className="btn-reject"
                          >
                            Dismiss
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'whatsapp' && (
          <div className="admin-section-full">
            <h2>WhatsApp Messages to Users</h2>
            {usersLoading ? (
              <div className="loading">Loading users...</div>
            ) : users.length === 0 ? (
              <div className="empty-state">No users found</div>
            ) : (
              <div className="whatsapp-users-list">
                <div className="whatsapp-header">
                  <p>Total Users: {users.length}</p>
                </div>
                <div className="users-grid">
                  {users.map((user) => (
                    <div key={user._id} className="whatsapp-user-card">
                      <div className="user-avatar-small">
                        {user.profileImage ? (
                          <img src={getImageUrl(user.profileImage)} alt={user.name} />
                        ) : (
                          <span>{user.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                        )}
                      </div>
                      <div className="user-name">{user.name || 'N/A'}</div>
                      {user.phone && (
                        <a
                          href={`https://wa.me/${user.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="whatsapp-link"
                        >
                          💬 Message on WhatsApp
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Admin
