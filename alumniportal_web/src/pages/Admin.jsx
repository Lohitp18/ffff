import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import './Admin.css'
import './Auth.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const Admin = () => {
  const navigate = useNavigate()
  const { user, login } = useAuth()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
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

  const SUPER_ADMIN_EMAIL = 'patgarlohit818@gmail.com'
  const SUPER_ADMIN_PASSWORD = 'Lohit@2004'

  useEffect(() => {
    const adminAuth = localStorage.getItem('admin_authenticated')
    if (adminAuth === 'true') {
      setIsAuthenticated(true)
      if (user) {
        loadDashboardStats()
      }
    }
  }, [user])

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

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (email !== SUPER_ADMIN_EMAIL || password !== SUPER_ADMIN_PASSWORD) {
      setError('Invalid admin credentials')
      setLoading(false)
      return
    }

    const result = await login(email, password)
    if (result.success) {
      localStorage.setItem('admin_authenticated', 'true')
      setIsAuthenticated(true)
      loadDashboardStats()
    } else {
      setError(result.message || 'Login failed')
    }
    setLoading(false)
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
      setUsers([...pendingRes.data, ...approvedRes.data, ...blockedRes.data])
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
      setPosts([...pendingRes.data, ...approvedRes.data])
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
      setEvents([...pendingRes.data, ...approvedRes.data])
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
      setOpportunities([...pendingRes.data, ...approvedRes.data])
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
    }
  }, [activeTab, isAuthenticated])

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

  if (!isAuthenticated) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1>Alumni Portal</h1>
          <h2>Admin Login</h2>
          {error && <div className="error-message">{error}</div>}
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter admin email"
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter admin password"
              />
            </div>
            <button type="submit" disabled={loading} className="auth-button">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-container-full">
      <div className="admin-header-full">
        <h1>Super Admin Dashboard</h1>
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
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="admin-section-full">
            <h2>All Users</h2>
            {usersLoading ? (
              <div className="loading">Loading users...</div>
            ) : users.length === 0 ? (
              <div className="empty-state">No users found</div>
            ) : (
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Photo</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Institution</th>
                      <th>Course</th>
                      <th>Year</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
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
                        <td>{user.email || 'N/A'}</td>
                        <td>{user.phone || '-'}</td>
                        <td>{user.institution || '-'}</td>
                        <td>{user.course || '-'}</td>
                        <td>{user.year || '-'}</td>
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
            {postsLoading ? (
              <div className="loading">Loading posts...</div>
            ) : posts.length === 0 ? (
              <div className="empty-state">No posts found</div>
            ) : (
              <div className="content-list">
                {posts.map((post) => (
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
                      <span>By: {post.authorId?.name || post.postedBy?.name || 'Unknown'}</span>
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
            {eventsLoading ? (
              <div className="loading">Loading events...</div>
            ) : events.length === 0 ? (
              <div className="empty-state">No events found</div>
            ) : (
              <div className="content-list">
                {events.map((event) => (
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
                      <span>By: {event.postedBy?.name || 'Unknown'}</span>
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
            {opportunitiesLoading ? (
              <div className="loading">Loading opportunities...</div>
            ) : opportunities.length === 0 ? (
              <div className="empty-state">No opportunities found</div>
            ) : (
              <div className="content-list">
                {opportunities.map((opp) => (
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
                      <span>Company: {opp.company || 'N/A'}</span>
                      <span>By: {opp.postedBy?.name || 'Unknown'}</span>
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
                      <span>Reported by: {report.reporterId?.name || report.reporterId?.email || 'Unknown'}</span>
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
                          <p>Author: {report.reportedItem.authorId.name || report.reportedItem.authorId.email}</p>
                        )}
                        {report.reportedItem.postedBy && (
                          <p>Posted by: {report.reportedItem.postedBy.name || report.reportedItem.postedBy.email}</p>
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
      </div>
    </div>
  )
}

export default Admin
