import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import PostCard from '../components/PostCard'
import { useAuth } from '../contexts/AuthContext'
import './UserProfileView.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const UserProfileView = () => {
  const { userId } = useParams()
  const { user: currentUser } = useAuth()
  const [user, setUser] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [events, setEvents] = useState([])
  const [opportunities, setOpportunities] = useState([])
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [loadingOpportunities, setLoadingOpportunities] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)

  useEffect(() => {
    loadUser()
    loadUserPosts()
    loadUserEvents()
    loadUserOpportunities()
    if (currentUser && userId && currentUser._id !== userId) {
      checkConnectionStatus()
    }
  }, [userId, currentUser])

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null
    if (imagePath.startsWith('http')) return imagePath
    return `${API_BASE_URL}${imagePath.startsWith('/') ? imagePath : '/' + imagePath}`
  }

  const loadUser = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })
      setUser(response.data)
    } catch (error) {
      console.error('Failed to load user:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUserPosts = async () => {
    try {
      setLoadingPosts(true)
      const response = await axios.get(`${API_BASE_URL}/api/posts/user/${userId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })
      setPosts(response.data.map(post => ({ ...post, category: 'Post' })))
    } catch (error) {
      console.error('Failed to load user posts:', error)
      setPosts([])
    } finally {
      setLoadingPosts(false)
    }
  }

  const loadUserEvents = async () => {
    try {
      setLoadingEvents(true)
      const response = await axios.get(`${API_BASE_URL}/api/content/events`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })
      const filtered = (response.data || []).filter(event => {
        const postedById = event.postedBy?._id || event.postedBy
        return postedById === userId
      })
      setEvents(filtered.map(event => ({ ...event, category: 'Event' })))
    } catch (error) {
      console.error('Failed to load user events:', error)
      setEvents([])
    } finally {
      setLoadingEvents(false)
    }
  }

  const loadUserOpportunities = async () => {
    try {
      setLoadingOpportunities(true)
      const response = await axios.get(`${API_BASE_URL}/api/content/opportunities`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })
      const filtered = (response.data || []).filter(opportunity => {
        const postedById = opportunity.postedBy?._id || opportunity.postedBy
        return postedById === userId
      })
      setOpportunities(filtered.map(opportunity => ({ ...opportunity, category: 'Opportunity' })))
    } catch (error) {
      console.error('Failed to load user opportunities:', error)
      setOpportunities([])
    } finally {
      setLoadingOpportunities(false)
    }
  }

  const checkConnectionStatus = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) return

      const response = await axios.get(`${API_BASE_URL}/api/connections`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const connections = response.data || []
      const connection = connections.find(conn => {
        const requesterId = conn.requester?._id || conn.requester
        const recipientId = conn.recipient?._id || conn.recipient
        return (
          (requesterId === currentUser._id && recipientId === userId) ||
          (requesterId === userId && recipientId === currentUser._id)
        )
      })

      if (connection) {
        setConnectionStatus(connection.status)
        setIsFollowing(connection.status === 'accepted' || connection.status === 'pending')
      } else {
        setConnectionStatus('none')
        setIsFollowing(false)
      }
    } catch (error) {
      console.error('Failed to check connection status:', error)
    }
  }

  const handleFollow = async () => {
    if (followLoading || !currentUser || currentUser._id === userId) return

    setFollowLoading(true)
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        alert('Please login to follow users')
        return
      }

      await axios.post(
        `${API_BASE_URL}/api/connections/${userId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      setIsFollowing(true)
      setConnectionStatus('pending')
      alert('Connection request sent!')
      checkConnectionStatus()
    } catch (error) {
      console.error('Failed to follow user:', error)
      if (error.response?.status === 400 && error.response?.data?.message?.includes('already')) {
        setIsFollowing(true)
        setConnectionStatus('pending')
      } else {
        alert(error.response?.data?.message || 'Failed to send connection request')
      }
    } finally {
      setFollowLoading(false)
    }
  }

  const handleUnfollow = async () => {
    if (followLoading || !currentUser || !connectionStatus) return

    setFollowLoading(true)
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) return

      // Get connection ID first
      const connectionsResponse = await axios.get(`${API_BASE_URL}/api/connections`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const connections = connectionsResponse.data || []
      const connection = connections.find(conn => {
        const requesterId = conn.requester?._id || conn.requester
        const recipientId = conn.recipient?._id || conn.recipient
        return (
          (requesterId === currentUser._id && recipientId === userId) ||
          (requesterId === userId && recipientId === currentUser._id)
        )
      })

      if (connection) {
        await axios.delete(`${API_BASE_URL}/api/connections/${connection._id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        setIsFollowing(false)
        setConnectionStatus('none')
        alert('Unfollowed successfully')
        checkConnectionStatus()
      }
    } catch (error) {
      console.error('Failed to unfollow user:', error)
      alert('Failed to unfollow user')
    } finally {
      setFollowLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="user-profile-full">
        <div className="loading">Loading profile...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="user-profile-full">
        <div className="error">User not found</div>
      </div>
    )
  }

  return (
    <div className="user-profile-full">
      <div className="linkedin-profile">
        {/* Cover Image Section */}
        <div className="profile-cover">
          {user.coverImage ? (
            <img src={getImageUrl(user.coverImage)} alt="Cover" />
          ) : (
            <div className="cover-placeholder"></div>
          )}
        </div>

        {/* Profile Header */}
        <div className="profile-header-section">
          <div className="profile-header-content">
            {/* Profile Picture */}
            <div className="profile-picture-container">
              {user.profileImage ? (
                <img 
                  src={getImageUrl(user.profileImage)} 
                  alt={user.name}
                  className="profile-picture"
                />
              ) : (
                <div className="profile-picture-placeholder">
                  {user.name?.charAt(0)?.toUpperCase() || '👤'}
                </div>
              )}
            </div>

            {/* Name and Headline */}
            <div className="profile-info-main">
              <h1>{user.name}</h1>
              {user.headline && <p className="headline">{user.headline}</p>}
              {user.location && (
                <p className="location">📍 {user.location}</p>
              )}
            </div>

            {/* Action Buttons */}
            {currentUser && currentUser._id !== userId && (
              <div className="profile-actions-header">
                {isFollowing ? (
                  <button 
                    className="btn-secondary" 
                    onClick={handleUnfollow}
                    disabled={followLoading}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                    </svg>
                    {connectionStatus === 'pending' ? 'Pending' : 'Following'}
                  </button>
                ) : (
                  <button 
                    className="btn-primary" 
                    onClick={handleFollow}
                    disabled={followLoading}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                    </svg>
                    {followLoading ? 'Loading...' : 'Follow'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="profile-content">
          <div className="profile-main">
            {/* About Section */}
            {user.bio && (
              <div className="profile-section">
                <div className="section-header">
                  <h2>About</h2>
                </div>
                <p className="section-content">{user.bio}</p>
              </div>
            )}


            {/* Experience Section */}
            {user.experience && user.experience.length > 0 && (
              <div className="profile-section">
                <h2>Experience</h2>
                {user.experience.map((exp, idx) => (
                  <div key={idx} className="experience-item">
                    <div className="exp-icon">💼</div>
                    <div className="exp-content">
                      <h3>{exp.title}</h3>
                      <p className="exp-company">{exp.company}</p>
                      {exp.location && <p className="exp-location">📍 {exp.location}</p>}
                      <p className="exp-dates">
                        {exp.startDate && new Date(exp.startDate).getFullYear()}
                        {exp.endDate || exp.current ? ' - ' : ''}
                        {exp.current ? 'Present' : exp.endDate ? new Date(exp.endDate).getFullYear() : ''}
                      </p>
                      {exp.description && <p className="exp-description">{exp.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Education Section */}
            {user.education && user.education.length > 0 && (
              <div className="profile-section">
                <h2>Education</h2>
                {user.education.map((edu, idx) => (
                  <div key={idx} className="education-item">
                    <div className="edu-icon">🎓</div>
                    <div className="edu-content">
                      <h3>{edu.school}</h3>
                      <p className="edu-degree">
                        {edu.degree} {edu.fieldOfStudy && `in ${edu.fieldOfStudy}`}
                      </p>
                      <p className="edu-dates">
                        {edu.startDate && new Date(edu.startDate).getFullYear()}
                        {edu.endDate || edu.current ? ' - ' : ''}
                        {edu.current ? 'Present' : edu.endDate ? new Date(edu.endDate).getFullYear() : ''}
                      </p>
                      {edu.description && <p className="edu-description">{edu.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Skills Section */}
            {user.skills && user.skills.length > 0 && (
              <div className="profile-section">
                <h2>Skills</h2>
                <div className="skills-container">
                  {user.skills.map((skill, idx) => (
                    <span key={idx} className="skill-tag">{skill}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Contact & Links */}
            {(user.website || user.linkedin || user.twitter || user.github) && (
              <div className="profile-section">
                <h2>Contact & Links</h2>
                <div className="links-container">
                  {user.website ? (
                    <a href={user.website} target="_blank" rel="noopener noreferrer" className="link-item">
                      🌐 Website
                    </a>
                  ) : null}
                  {user.linkedin ? (
                    <a href={user.linkedin} target="_blank" rel="noopener noreferrer" className="link-item">
                      💼 LinkedIn
                    </a>
                  ) : null}
                  {user.twitter ? (
                    <a href={user.twitter} target="_blank" rel="noopener noreferrer" className="link-item">
                      🐦 Twitter
                    </a>
                  ) : null}
                  {user.github ? (
                    <a href={user.github} target="_blank" rel="noopener noreferrer" className="link-item">
                      💻 GitHub
                    </a>
                  ) : null}
                </div>
              </div>
            )}

            {/* Events Section */}
            <div className="profile-section">
              <h2>Events</h2>
              {loadingEvents ? (
                <div className="loading">Loading events...</div>
              ) : events.length === 0 ? (
                <p className="section-content">No events posted yet.</p>
              ) : (
                <div className="posts-container">
                  {events.map((event) => (
                    <PostCard key={event._id} post={event} />
                  ))}
                </div>
              )}
            </div>

            {/* Opportunities Section */}
            <div className="profile-section">
              <h2>Opportunities</h2>
              {loadingOpportunities ? (
                <div className="loading">Loading opportunities...</div>
              ) : opportunities.length === 0 ? (
                <p className="section-content">No opportunities posted yet.</p>
              ) : (
                <div className="posts-container">
                  {opportunities.map((opportunity) => (
                    <PostCard key={opportunity._id} post={opportunity} />
                  ))}
                </div>
              )}
            </div>

            {/* Posts Section */}
            <div className="profile-section">
              <h2>Posts</h2>
              {loadingPosts ? (
                <div className="loading">Loading posts...</div>
              ) : posts.length === 0 ? (
                <p className="section-content">No posts yet.</p>
              ) : (
                <div className="posts-container">
                  {posts.map((post) => (
                    <PostCard key={post._id} post={post} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="profile-sidebar">
            <div className="sidebar-card">
              <h3>Profile Information</h3>
              {user.institution && (
                <div className="info-item">
                  <strong>Institution:</strong> {user.institution}
                </div>
              )}
              {user.course && (
                <div className="info-item">
                  <strong>Course:</strong> {user.course}
                </div>
              )}
              {user.year && (
                <div className="info-item">
                  <strong>Year:</strong> {user.year}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserProfileView

