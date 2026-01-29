import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import CreateInstitutionPostModal from '../components/CreateInstitutionPostModal'
import { useAuth } from '../contexts/AuthContext'
import './Auth.css'
import './InstituteAdmin.css'
import '../components/CreatePostModal.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const InstituteAdminLogin = () => {
  const navigate = useNavigate()
  const { user, login } = useAuth()
  const [college, setCollege] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [posts, setPosts] = useState([])
  const [postsLoading, setPostsLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingPost, setEditingPost] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)

  const INSTITUTE_EMAIL = 'patgarlohit818@gmail.com'
  const INSTITUTE_PASSWORD = 'Lohit@2004'

  const institutions = [
    "Alva's Pre-University College, Vidyagiri",
    "Alva's Degree College, Vidyagiri",
    "Alva's Centre for Post Graduate Studies and Research, Vidyagiri",
    "Alva's College of Education, Vidyagiri",
    "Alva's College of Physical Education, Vidyagiri",
    "Alva's Institute of Engineering & Technology (AIET), Mijar",
    "Alva's Ayurvedic Medical College, Vidyagiri",
    "Alva's Homeopathic Medical College, Mijar",
    "Alva's College of Naturopathy and Yogic Science, Mijar",
    "Alva's College of Physiotherapy, Moodbidri",
    "Alva's College of Nursing, Moodbidri",
    "Alva's Institute of Nursing, Moodbidri",
    "Alva's College of Medical Laboratory Technology, Moodbidri",
    "Alva's Law College, Moodbidri",
    "Alva's College, Moodbidri (Affiliated with Mangalore University)",
    "Alva's College of Nursing (Affiliated with Rajiv Gandhi University of Health Sciences, Bangalore)",
    "Alva's Institute of Engineering & Technology (AIET) (Affiliated with Visvesvaraya Technological University, Belgaum)",
  ]

  useEffect(() => {
    const instituteAuth = localStorage.getItem('institute_admin_authenticated')
    const selectedCollege = localStorage.getItem('institute_admin_college')
    if (instituteAuth === 'true' && selectedCollege) {
      setIsAuthenticated(true)
      setCollege(selectedCollege)
      loadPosts(selectedCollege)
    }
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!college) {
      setError('Please select a college')
      setLoading(false)
      return
    }

    if (email !== INSTITUTE_EMAIL || password !== INSTITUTE_PASSWORD) {
      setError('Invalid credentials')
      setLoading(false)
      return
    }

    // Also authenticate against backend so profile creation/edit works (admin-only API)
    const authResult = await login(email, password)
    if (!authResult.success) {
      setError(authResult.message || 'Login failed')
      setLoading(false)
      return
    }

    localStorage.setItem('institute_admin_authenticated', 'true')
    localStorage.setItem('institute_admin_college', college)
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

  const handleLogout = () => {
    localStorage.removeItem('institute_admin_authenticated')
    localStorage.removeItem('institute_admin_college')
    setIsAuthenticated(false)
    setCollege('')
    setPosts([])
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
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1>Alumni Portal</h1>
          <h2>Institute Admin Login</h2>
          {error && <div className="error-message">{error}</div>}
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>College</label>
              <select
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                required
                className="form-group select"
              >
                <option value="">Select College</option>
                {institutions.map((inst, index) => (
                  <option key={index} value={inst}>{inst}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Email</label>
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

      {postsLoading ? (
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

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

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
                Selected: {video.name} (Max 100MB)
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
