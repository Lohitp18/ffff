import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import MainLayout from '../components/MainLayout'
import PostCard from '../components/PostCard'
import CreateInstitutionPostModal from '../components/CreateInstitutionPostModal'
import { useAuth } from '../contexts/AuthContext'
import './InstitutionAdmin.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const InstitutionAdmin = () => {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [filteredPosts, setFilteredPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedInstitution, setSelectedInstitution] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

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
    // Wait for auth to finish loading
    if (authLoading) {
      return
    }
    
    // If no user after loading, redirect to signin
    if (!user) {
      navigate('/signin', { replace: true })
      return
    }
    
    // Check if user is admin - check both isAdmin and role fields
    const userIsAdmin = user.isAdmin === true || user.role === 'admin' || user.isAdmin === 'true'
    
    if (userIsAdmin) {
      setIsAdmin(true)
    } else {
      setIsAdmin(false)
      // Use setTimeout to avoid navigation during render
      setTimeout(() => {
        navigate('/home', { replace: true })
      }, 100)
    }
  }, [user, authLoading, navigate])

  useEffect(() => {
    if (isAdmin) {
      loadPosts()
    }
  }, [isAdmin])

  useEffect(() => {
    filterPosts()
  }, [selectedInstitution, posts])

  const loadPosts = async () => {
    try {
      setLoading(true)
      setError('')
      const token = localStorage.getItem('auth_token')
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      }

      const response = await axios.get(`${API_BASE_URL}/api/content/institution-posts`, { headers })
      
      const institutionPosts = response.data
        .map(post => ({ ...post, category: 'InstitutionPost' }))
        .sort((a, b) => {
          const dateA = new Date(a.createdAt || 0)
          const dateB = new Date(b.createdAt || 0)
          return dateB - dateA
        })

      setPosts(institutionPosts)
    } catch (err) {
      setError('Failed to load posts')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filterPosts = () => {
    if (!selectedInstitution) {
      setFilteredPosts(posts)
    } else {
      setFilteredPosts(posts.filter(post => post.institution === selectedInstitution))
    }
  }

  const handlePostCreated = () => {
    setShowCreateModal(false)
    loadPosts()
  }

  const handleInstitutionSelect = (institution) => {
    setSelectedInstitution(institution)
    setShowCreateModal(true)
  }

  if (authLoading) {
    return (
      <MainLayout>
        <div className="institution-admin-loading">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </MainLayout>
    )
  }

  if (!isAdmin) {
    return null // Will redirect
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="institution-admin-loading">
          <div className="loading-spinner"></div>
          <p>Loading posts...</p>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="institution-admin-container">
        {/* Header */}
        <div className="institution-admin-header">
          <h1>Institution Post Management</h1>
          <p>Post to any institution as an admin</p>
        </div>

        {/* Institution Selection */}
        <div className="institution-selection-section">
          <h2>Select Institution to Post</h2>
          <div className="institutions-grid">
            {institutions.map((institution, index) => {
              const postCount = posts.filter(p => p.institution === institution).length
              return (
                <div
                  key={index}
                  className="institution-select-card"
                  onClick={() => handleInstitutionSelect(institution)}
                >
                  <div className="institution-select-icon">🏫</div>
                  <div className="institution-select-info">
                    <h3>{institution}</h3>
                    <p>{postCount} {postCount === 1 ? 'post' : 'posts'}</p>
                  </div>
                  <div className="institution-select-arrow">+</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Filter Section */}
        <div className="filter-section">
          <label>Filter by Institution:</label>
          <select
            value={selectedInstitution}
            onChange={(e) => setSelectedInstitution(e.target.value)}
            className="institution-filter-select"
          >
            <option value="">All Institutions</option>
            {institutions.map((inst, index) => (
              <option key={index} value={inst}>{inst}</option>
            ))}
          </select>
        </div>

        {/* Create Post Button */}
        <div className="create-post-section">
          <button
            className="create-post-btn"
            onClick={() => {
              if (!selectedInstitution) {
                alert('Please select an institution first')
                return
              }
              setShowCreateModal(true)
            }}
          >
            {selectedInstitution ? `Post to ${selectedInstitution}` : 'Select Institution to Post'}
          </button>
        </div>

        {error && (
          <div className="linkedin-error">
            <p>{error}</p>
          </div>
        )}

        {/* Posts Feed */}
        {filteredPosts.length === 0 ? (
          <div className="linkedin-empty-state">
            <p>
              {selectedInstitution 
                ? `No posts yet for ${selectedInstitution}.` 
                : 'No posts found. Select an institution to create a post.'}
            </p>
            {selectedInstitution && (
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

        {showCreateModal && selectedInstitution && (
          <CreateInstitutionPostModal
            institution={selectedInstitution}
            onClose={() => setShowCreateModal(false)}
            onPostCreated={handlePostCreated}
          />
        )}
      </div>
    </MainLayout>
  )
}

export default InstitutionAdmin

