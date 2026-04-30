import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import CreateInstitutionPostModal from '../components/CreateInstitutionPostModal'
import { useAuth } from '../contexts/AuthContext'
import './Auth.css'
import './InstituteAdmin.css'
import '../components/CreatePostModal.css'

const API_BASE_URL = (() => {
  const configured = (import.meta.env.VITE_API_BASE_URL ?? '').trim()
  if (configured) return configured
  return import.meta.env.DEV ? 'http://localhost:5000' : ''
})()

const InstituteAdminLogin = () => {
  const navigate = useNavigate()
  const { user, institutionLogin, logout } = useAuth()
  const [college, setCollege] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(localStorage.getItem('institute_admin_authenticated') === 'true')
  const [posts, setPosts] = useState([])
  const [postsLoading, setPostsLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingPost, setEditingPost] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [institutions, setInstitutions] = useState([])

  // New States for Alumni Tab
  const [activeTab, setActiveTab] = useState('posts')
  const [alumniUsers, setAlumniUsers] = useState([])
  const [alumniLoading, setAlumniLoading] = useState(false)
  const [alumniSearchQuery, setAlumniSearchQuery] = useState('')

  const loadAlumniUsers = async (institutionName) => {
    setAlumniLoading(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/api/users/institution-dashboard`, {
        params: { institutionName }
      })
      setAlumniUsers(response.data)
    } catch (err) {
      console.error('Failed to load alumni:', err)
      setAlumniUsers([])
    } finally {
      setAlumniLoading(false)
    }
  }

  const downloadAlumniCSV = () => {
    if (!alumniUsers || alumniUsers.length === 0) return

    const headers = [
      'Name', 'Email', 'Phone', 'Course', 'Year', 'Specialization',
      'Current Company', 'Total Experience', 'Location', 'Status'
    ]

    const csvContent = [
      headers.join(','),
      ...alumniUsers.map(user => [
        `"${user.name || ''}"`,
        `"${user.email || ''}"`,
        `"${user.phone || ''}"`,
        `"${user.course || ''}"`,
        `"${user.year || ''}"`,
        `"${user.specialization || ''}"`,
        `"${user.privateInfo?.currentCompany || ''}"`,
        `"${user.privateInfo?.totalExperience || 0}"`,
        `"${user.location || ''}"`,
        `"${user.status || ''}"`
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `alumni_${college.replace(/\s+/g, '_')}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  useEffect(() => {
    const fetchInstitutions = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/institutions`)
        setInstitutions(response.data) // Store full objects
      } catch (err) {
        console.error('Failed to load institutions:', err)
      }
    }
    fetchInstitutions()

    const selectedCollege = localStorage.getItem('institute_admin_college')
    if (isAuthenticated && selectedCollege) {
      setCollege(selectedCollege)
      loadPosts(selectedCollege)
    }
  }, [isAuthenticated])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!college) {
      setError('Please select a college')
      setLoading(false)
      return
    }

    const trimmedEmail = email.trim().toLowerCase()
    const trimmedPassword = password.trim()
    const authResult = await institutionLogin(trimmedEmail, trimmedPassword, college)
    if (!authResult.success) {
      setError(authResult.message || 'Login failed')
      setLoading(false)
      return
    }

    localStorage.setItem('institute_admin_authenticated', 'true')
    localStorage.setItem('institute_admin_college', college)
    localStorage.setItem('institute_admin_email', email)
    setIsAuthenticated(true)
    loadPosts(college)
    setLoading(false)
  }

  const loadPosts = async (institutionName) => {
    setPostsLoading(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/api/content/institution-posts`)

      const institutionPosts = response.data
        .filter(post => post.institution === institutionName)
        .map(post => ({ ...post, category: 'InstitutionPost' }))
        .sort((a, b) => {
          const dateA = new Date(a.createdAt || 0)
          const dateB = new Date(b.createdAt || 0)
          return dateB - dateA
        })

      setPosts(institutionPosts)
    } catch (err) {
      console.error('Failed to load posts:', err)
      setPosts([])
    } finally {
      setPostsLoading(false)
    }
  }

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return

    try {
      await axios.delete(`${API_BASE_URL}/api/content/institution-posts/${postId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })
      loadPosts(college)
      alert('Post deleted successfully')
    } catch (err) {
      alert('Failed to delete post')
      console.error(err)
    }
  }

  const handleEditPost = (post) => {
    setEditingPost(post)
    setShowEditModal(true)
  }

  const handlePostCreated = () => {
    setShowCreateModal(false)
    setShowEditModal(false)
    setEditingPost(null)
    loadPosts(college)
  }

  useEffect(() => {
    if (isAuthenticated && college) {
      if (activeTab === 'posts') {
        loadPosts(college)
      } else if (activeTab === 'alumni') {
        loadAlumniUsers(college)
      }
    }
  }, [activeTab, isAuthenticated, college])

  const filteredAlumni = alumniUsers.filter(u =>
    u.name?.toLowerCase().includes(alumniSearchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(alumniSearchQuery.toLowerCase()) ||
    u.course?.toLowerCase().includes(alumniSearchQuery.toLowerCase()) ||
    u.year?.toString().includes(alumniSearchQuery)
  )

  const handleLogout = () => {
    localStorage.removeItem('institute_admin_authenticated')
    localStorage.removeItem('institute_admin_college')
    setIsAuthenticated(false)
    setCollege('')
    setPosts([])
    logout()
    navigate('/signin')
  }

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null
    if (imagePath.startsWith('http')) return imagePath
    return `${API_BASE_URL}${imagePath.startsWith('/') ? imagePath : '/' + imagePath}`
  }

  const getVideoUrl = (videoPath) => {
    if (!videoPath) return null
    if (videoPath.startsWith('http')) return videoPath
    return `${API_BASE_URL}${videoPath.startsWith('/') ? videoPath : '/' + videoPath}`
  }

  if (!isAuthenticated) {
    const [step, setStep] = useState('select') // 'select' or 'login'
    const [searchTerm, setSearchTerm] = useState('')

    const filteredInstitutions = institutions.filter(inst =>
      inst.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleSelectInstitution = (instName) => {
      setCollege(instName)
      setStep('login')
    }

    return (
      <div className="auth-container">
        {/* Left Panel with Image */}
        <div className="auth-left-panel">
          <div className="auth-image-container">
            <div className="auth-logo-container">
              <img
                src="/logo.png"
                alt="Alva's Alumni"
                className="auth-logo"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
            {/* Using a generic/relevant image or icon if specific one doesn't exist */}
            <div className="auth-icon-large" style={{ fontSize: '100px', marginBottom: '20px' }}>🏫</div>
            <h1 className="auth-welcome-text">Institute Administration</h1>
            <p className="auth-description">
              Manage your institution's presence, connect with alumni, and share updates with the student community.
            </p>
          </div>
        </div>

        {/* Right Panel with Form */}
        <div className="auth-right-panel">
          <div className="auth-card">
            <h1>Alumni Portal</h1>
            <h2>Institute Admin Login</h2>
            {error && <div className="error-message">{error}</div>}

            {step === 'select' ? (
              <div className="institution-selection-step">
                <p className="step-description">Select your institution to proceed</p>
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="Search for your college..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="institution-search-field"
                  />
                </div>
                <div className="institution-grid-small">
                  {filteredInstitutions.length > 0 ? (
                    filteredInstitutions.map((inst, index) => (
                      <div
                        key={index}
                        className={`institution-item ${college === inst.name ? 'selected' : ''}`}
                        onClick={() => handleSelectInstitution(inst.name)}
                      >
                        <div className="inst-icon">🏛️</div>
                        <div className="inst-name">{inst.name}</div>
                      </div>
                    ))
                  ) : (
                    <div className="no-results">No institutions found</div>
                  )}
                </div>
                <p className="auth-link" style={{ marginTop: '20px' }}>
                  <a href="/signin">Back to Regular Login</a>
                </p>
              </div>
            ) : (
              <div className="login-step">
                <button className="back-link-btn" onClick={() => setStep('select')}>
                  ← Back to selection
                </button>
                <div className="selected-college-badge">
                  <span>Logged in as:</span>
                  <strong>{college}</strong>
                </div>

                <form onSubmit={handleLogin}>
                  <div className="form-group">
                    <label>Admin Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="Enter email"
                    />
                  </div>
                  <div className="form-group">
                    <label>Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Enter password"
                    />
                  </div>
                  <button type="submit" disabled={loading} className="auth-button">
                    {loading ? 'Signing in...' : 'Sign In'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="institute-admin-container">
      <div className="institute-admin-header">
        <div>
          <h1>Institute Admin Dashboard</h1>
          <p>{college}</p>
        </div>
        <div className="header-actions">
          <button
            onClick={() => navigate(`/institution/${encodeURIComponent(college)}`)}
            className="create-post-btn-header"
          >
            {user?.isAdmin ? 'Create / Edit Profile' : 'View Profile'}
          </button>
          <button onClick={() => setShowCreateModal(true)} className="create-post-btn-header">
            + Create Post
          </button>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </div>

      <div className="admin-tabs">
        <button
          className={`tab-btn ${activeTab === 'posts' ? 'active' : ''}`}
          onClick={() => setActiveTab('posts')}
        >
          📝 Posts
        </button>
        <button
          className={`tab-btn ${activeTab === 'alumni' ? 'active' : ''}`}
          onClick={() => setActiveTab('alumni')}
        >
          🎓 Alumni Users
        </button>
      </div>

      {activeTab === 'posts' ? (
        postsLoading ? (
          <div className="loading">Loading posts...</div>
        ) : (
          <div className="institute-posts-list">
            <div className="posts-header">
              <h2>Posts for {college}</h2>
              <button onClick={() => setShowCreateModal(true)} className="create-post-btn">
                + Add New Post
              </button>
            </div>

            {posts.length === 0 ? (
              <div className="empty-state">
                <p>No posts found for {college}</p>
                <button onClick={() => setShowCreateModal(true)} className="create-post-btn">
                  Create Your First Post
                </button>
              </div>
            ) : (
              <div className="posts-grid">
                {posts.map((post) => (
                  <div key={post._id} className="institute-post-card">
                    {post.imageUrl && (
                      <img
                        src={getImageUrl(post.imageUrl)}
                        alt={post.title}
                        className="post-image"
                      />
                    )}
                    {post.videoUrl && (
                      <video
                        src={getVideoUrl(post.videoUrl)}
                        controls
                        className="post-video"
                      >
                        Your browser does not support the video tag.
                      </video>
                    )}
                    <div className="post-content">
                      <h3>{post.title || 'Untitled Post'}</h3>
                      <p>{post.content || post.description || 'No content'}</p>
                      <div className="post-meta">
                        <span>Created: {new Date(post.createdAt).toLocaleDateString()}</span>
                        {post.status && (
                          <span className={`status-badge ${post.status}`}>
                            {post.status}
                          </span>
                        )}
                      </div>
                      <div className="post-actions">
                        <button
                          onClick={() => handleEditPost(post)}
                          className="btn-edit"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDeletePost(post._id)}
                          className="btn-delete"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      ) : (
        <div className="alumni-view">
          <div className="search-export-container">
            <input
              type="text"
              placeholder="Search by name, email or course..."
              className="search-input"
              value={alumniSearchQuery}
              onChange={(e) => setAlumniSearchQuery(e.target.value)}
            />
            <button onClick={downloadAlumniCSV} className="export-btn">
              📥 Export to CSV
            </button>
          </div>

          {alumniLoading ? (
            <div className="loading">Loading alumni data...</div>
          ) : (
            <div className="alumni-table-container">
              <table className="alumni-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Course</th>
                    <th>Year</th>
                    <th>Status</th>
                    <th>Current Company</th>
                    <th>Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAlumni.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                        No alumni found matching your criteria
                      </td>
                    </tr>
                  ) : (
                    filteredAlumni.map(u => (
                      <tr key={u._id}>
                        <td>
                          <div className="user-cell">
                            <img
                              src={u.profileImage ? getImageUrl(u.profileImage) : 'https://via.placeholder.com/40'}
                              alt=""
                              className="user-avatar"
                            />
                            <div>
                              <div style={{ fontWeight: '600' }}>{u.name}</div>
                              <div style={{ fontSize: '12px', color: '#666' }}>{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>{u.course}</td>
                        <td>{u.year}</td>
                        <td>
                          <span className={`status-badge ${u.status}`}>
                            {u.status}
                          </span>
                        </td>
                        <td>{u.privateInfo?.currentCompany || 'N/A'}</td>
                        <td>{u.phone || 'N/A'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showCreateModal && (
        <CreateInstitutionPostModal
          institution={college}
          onClose={() => setShowCreateModal(false)}
          onPostCreated={handlePostCreated}
        />
      )}

      {showEditModal && editingPost && (
        <EditInstitutionPostModal
          post={editingPost}
          institution={college}
          onClose={() => {
            setShowEditModal(false)
            setEditingPost(null)
          }}
          onPostUpdated={handlePostCreated}
        />
      )}
    </div>
  )
}

// Edit Post Modal Component
const EditInstitutionPostModal = ({ post, institution, onClose, onPostUpdated }) => {
  const [title, setTitle] = useState(post.title || '')
  const [content, setContent] = useState(post.content || '')
  const [image, setImage] = useState(null)
  const [video, setVideo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const API_BASE_URL = (() => {
    const configured = (import.meta.env.VITE_API_BASE_URL ?? '').trim()
    if (configured) return configured
    return import.meta.env.DEV ? 'http://localhost:5000' : ''
  })()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title || !content) {
      setError('Title and content are required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('content', content)
      if (image) {
        formData.append('image', image)
      }
      if (video) {
        formData.append('video', video)
      }

      await axios.put(`${API_BASE_URL}/api/content/institution-posts/${post._id}`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'multipart/form-data',
        },
      })

      onPostUpdated()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update post')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Post for {institution}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Enter post title"
            />
          </div>
          <div className="form-group">
            <label>Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows="5"
              placeholder="What's on your mind?"
            />
          </div>
          <div className="form-group">
            <label>Image (Optional - Leave empty to keep current)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                setImage(e.target.files[0])
                if (e.target.files[0]) setVideo(null)
              }}
            />
            {image && (
              <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                Selected: {image.name}
              </p>
            )}
            {post.imageUrl && !image && (
              <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                Current image will be kept
              </p>
            )}
          </div>
          <div className="form-group">
            <label>Video (Optional - Leave empty to keep current)</label>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => {
                setVideo(e.target.files[0])
                if (e.target.files[0]) setImage(null)
              }}
            />
            {video && (
              <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                Selected: {video.name} (Max 50MB)
              </p>
            )}
            {post.videoUrl && !video && (
              <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                Current video will be kept
              </p>
            )}
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? 'Updating...' : 'Update Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default InstituteAdminLogin
