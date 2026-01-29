import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import MainLayout from '../components/MainLayout'
import PostCard from '../components/PostCard'
import CreatePostModal from '../components/CreatePostModal'
import { useAuth } from '../contexts/AuthContext'
import './Home.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const Home = () => {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [filteredPosts, setFilteredPosts] = useState([])
  const [activeFilter, setActiveFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    loadPosts()
  }, [])

  useEffect(() => {
    filterPosts()
  }, [posts, activeFilter])

  const loadPosts = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('auth_token')
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      }

      const [eventsRes, opportunitiesRes, postsRes, institutionPostsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/content/events`, { headers }),
        axios.get(`${API_BASE_URL}/api/content/opportunities`, { headers }),
        axios.get(`${API_BASE_URL}/api/content/posts`, { headers }),
        axios.get(`${API_BASE_URL}/api/content/institution-posts`, { headers }),
      ])

      const allPosts = [
        ...eventsRes.data.map((e) => ({ ...e, category: 'Event' })),
        ...opportunitiesRes.data.map((o) => ({ ...o, category: 'Opportunity' })),
        ...postsRes.data.map((p) => ({ ...p, category: 'Post' })),
        ...institutionPostsRes.data.map((ip) => ({ ...ip, category: 'InstitutionPost' })),
      ]

      allPosts.sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt || 0)
        const dateB = new Date(b.date || b.createdAt || 0)
        return dateB - dateA
      })

      setPosts(allPosts)
    } catch (err) {
      setError('Failed to load posts')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filterPosts = () => {
    if (activeFilter === 'All') {
      setFilteredPosts(posts)
    } else if (activeFilter === 'Posts') {
      setFilteredPosts(posts.filter(post => post.category === 'Post' || post.category === 'InstitutionPost'))
    } else if (activeFilter === 'Events') {
      setFilteredPosts(posts.filter(post => post.category === 'Event'))
    } else if (activeFilter === 'Jobs') {
      setFilteredPosts(posts.filter(post => post.category === 'Opportunity'))
    }
  }

  const handleFilterChange = (filter) => {
    setActiveFilter(filter)
  }

  const handlePostCreated = () => {
    setShowCreateModal(false)
    loadPosts()
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="linkedin-loading">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="linkedin-home">
        {/* Create Post Card - LinkedIn Style */}
        <div className="linkedin-post-box">
          <div className="post-box-header">
            <div className="post-box-avatar">
              {user?.profileImage ? (
                <img src={`${API_BASE_URL}${user.profileImage}`} alt={user.name} />
              ) : (
                <div className="avatar-placeholder">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <button 
              className="post-box-input"
              onClick={() => setShowCreateModal(true)}
            >
              Start a post
            </button>
          </div>
          <div className="post-box-actions">
            <button className="post-action-btn" onClick={() => setShowCreateModal(true)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#70b5f9">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              <span>Photo</span>
            </button>
            <button className="post-action-btn" onClick={() => navigate('/post-event')}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#7fc15e">
                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/>
              </svg>
              <span>Event</span>
            </button>
            <button className="post-action-btn" onClick={() => navigate('/post-opportunity')}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#e7a33e">
                <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.1.89 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.11-.9-2-2-2zm-6 0h-4V4h4v2z"/>
              </svg>
              <span>Job</span>
            </button>
          </div>
        </div>

        {/* Sort/Filter Bar */}
        <div className="feed-sort-bar">
          <div className="sort-divider"></div>
          <div className="sort-options">
            <button 
              className={`sort-btn ${activeFilter === 'All' ? 'active' : ''}`}
              onClick={() => handleFilterChange('All')}
            >
              All
            </button>
            <button 
              className={`sort-btn ${activeFilter === 'Posts' ? 'active' : ''}`}
              onClick={() => handleFilterChange('Posts')}
            >
              Posts
            </button>
            <button 
              className={`sort-btn ${activeFilter === 'Events' ? 'active' : ''}`}
              onClick={() => handleFilterChange('Events')}
            >
              Events
            </button>
            <button 
              className={`sort-btn ${activeFilter === 'Jobs' ? 'active' : ''}`}
              onClick={() => handleFilterChange('Jobs')}
            >
              Jobs
            </button>
          </div>
        </div>

        {error && (
          <div className="linkedin-error">
            <p>{error}</p>
          </div>
        )}

        {/* Posts Feed */}
        {filteredPosts.length === 0 && !loading ? (
          <div className="linkedin-empty-state">
            <p>
              {posts.length === 0 
                ? "No posts yet. Be the first to share something!" 
                : `No ${activeFilter.toLowerCase()} found.`}
            </p>
            {posts.length === 0 && (
              <button className="linkedin-btn-primary" onClick={() => setShowCreateModal(true)}>
                Create Post
              </button>
            )}
          </div>
        ) : (
          <div className="linkedin-feed">
            {filteredPosts.map((post) => (
              <PostCard key={post._id} post={post} onUpdate={loadPosts} />
            ))}
          </div>
        )}

        {showCreateModal && (
          <CreatePostModal
            onClose={() => setShowCreateModal(false)}
            onPostCreated={handlePostCreated}
          />
        )}
      </div>
    </MainLayout>
  )
}

export default Home
