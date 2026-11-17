import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import MainLayout from '../components/MainLayout'
import PostCard from '../components/PostCard'
import { useAuth } from '../contexts/AuthContext'
import SasImage from '../components/SasImage'
import './UserProfileView.css'

const API_BASE_URL = (() => {
  const configured = (import.meta.env.VITE_API_BASE_URL ?? '').trim()
  if (configured) return configured
  return import.meta.env.DEV ? 'http://localhost:5000' : ''
})()

const UserProfileView = () => {
  const { userId } = useParams()
  const { user: currentUser } = useAuth()
  const navigate = useNavigate()

  const [user, setUser] = useState(null)
  const [posts, setPosts] = useState([])
  const [events, setEvents] = useState([])
  const [opportunities, setOpportunities] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [loadingOpportunities, setLoadingOpportunities] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState(null)
  const [followLoading, setFollowLoading] = useState(false)
  const [activeActivityTab, setActiveActivityTab] = useState('posts')
  const [showContactModal, setShowContactModal] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
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
      setLoading(true)
      const token = localStorage.getItem('auth_token')
      const response = await axios.get(`${API_BASE_URL}/api/users/${userId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
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
      const token = localStorage.getItem('auth_token')
      const response = await axios.get(`${API_BASE_URL}/api/posts/user/${userId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      setPosts((response.data || []).map((post) => ({ ...post, category: 'Post' })))
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
      const token = localStorage.getItem('auth_token')
      const response = await axios.get(`${API_BASE_URL}/api/content/events`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const filtered = (response.data || []).filter((event) => {
        const postedById = event.postedBy?._id || event.postedBy
        return postedById === userId
      })
      setEvents(filtered.map((event) => ({ ...event, category: 'Event' })))
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
      const token = localStorage.getItem('auth_token')
      const response = await axios.get(`${API_BASE_URL}/api/content/opportunities`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const filtered = (response.data || []).filter((opportunity) => {
        const postedById = opportunity.postedBy?._id || opportunity.postedBy
        return postedById === userId
      })
      setOpportunities(filtered.map((opportunity) => ({ ...opportunity, category: 'Opportunity' })))
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
        headers: { Authorization: `Bearer ${token}` },
      })

      const connections = response.data || []
      const connection = connections.find((conn) => {
        const requesterId = conn.requester?._id || conn.requester
        const recipientId = conn.recipient?._id || conn.recipient
        return (
          (requesterId === currentUser._id && recipientId === userId) ||
          (requesterId === userId && recipientId === currentUser._id)
        )
      })

      if (connection) {
        setConnectionStatus(connection.status)
      } else {
        setConnectionStatus('none')
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
        alert('Please sign in to connect with alumni')
        return
      }

      await axios.post(
        `${API_BASE_URL}/api/connections/${userId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )

      setConnectionStatus('pending')
      checkConnectionStatus()
    } catch (error) {
      console.error('Failed to connect:', error)
      if (error.response?.status === 400 && error.response?.data?.message?.includes('already')) {
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

      const connectionsResponse = await axios.get(`${API_BASE_URL}/api/connections`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const connections = connectionsResponse.data || []
      const connection = connections.find((conn) => {
        const requesterId = conn.requester?._id || conn.requester
        const recipientId = conn.recipient?._id || conn.recipient
        return (
          (requesterId === currentUser._id && recipientId === userId) ||
          (requesterId === userId && recipientId === currentUser._id)
        )
      })

      if (connection) {
        await axios.delete(`${API_BASE_URL}/api/connections/${connection._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        setConnectionStatus('none')
        checkConnectionStatus()
      }
    } catch (error) {
      console.error('Failed to remove connection:', error)
      alert('Failed to remove connection')
    } finally {
      setFollowLoading(false)
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="li-profile-loading-wrap">
          <div className="li-spinner"></div>
          <p>Loading LinkedIn profile...</p>
        </div>
      </MainLayout>
    )
  }

  if (!user) {
    return (
      <MainLayout>
        <div className="li-profile-loading-wrap">
          <h2>Alumnus profile not found</h2>
          <p>The profile you are looking for may have been removed or is unavailable.</p>
          <button className="li-btn-primary" onClick={() => navigate('/alumni')} style={{ marginTop: '16px' }}>
            Back to Alumni Directory
          </button>
        </div>
      </MainLayout>
    )
  }

  // Derive professional headline
  const headline =
    user.headline ||
    (user.privateInfo?.currentPosition && user.privateInfo?.currentCompany
      ? `${user.privateInfo.currentPosition} at ${user.privateInfo.currentCompany}`
      : user.privateInfo?.currentPosition
      ? user.privateInfo.currentPosition
      : user.course && user.institution
      ? `${user.course} Graduate • ${user.institution}`
      : user.institution
      ? `Alumnus at ${user.institution}`
      : 'Alumnus & Professional')

  // Check if current user is viewing their own profile
  const isSelf = currentUser && (currentUser._id === userId || currentUser.id === userId)

  // Experience records compilation
  const currentCompany = user.privateInfo?.currentCompany
  const currentPosition = user.privateInfo?.currentPosition || 'Professional'
  const totalExperience = user.privateInfo?.totalExperience
  const previousCompanies = Array.isArray(user.privateInfo?.previousCompanies) ? user.privateInfo.previousCompanies : []
  const customExperience = Array.isArray(user.experience) ? user.experience : []

  const hasAnyExperience =
    Boolean(currentCompany) ||
    previousCompanies.length > 0 ||
    customExperience.length > 0 ||
    Boolean(user.privateInfo?.placementCompany)

  // Education compilation
  const customEducation = Array.isArray(user.education) ? user.education : []
  const hasMasters = Boolean(user.privateInfo?.hasMasters && (user.privateInfo?.mastersUniversity || user.privateInfo?.mastersDegree))

  return (
    <MainLayout fullWidth={true}>
      <div className="li-profile-page">
        <div className="li-profile-layout">
          {/* =========================================================
              MAIN COLUMN
              ========================================================= */}
          <main className="li-profile-main">
            {/* 1. HERO TOP CARD */}
            <div className="li-card li-hero-card">
              {/* Cover Banner */}
              <div className="li-cover-wrap">
                {user.coverImage ? (
                  <SasImage src={getImageUrl(user.coverImage)} alt="Cover" className="li-cover-img" />
                ) : (
                  <div className="li-cover-default">
                    <div className="li-cover-pattern"></div>
                  </div>
                )}
              </div>

              {/* Header Content */}
              <div className="li-hero-body">
                {/* Avatar and Top Actions */}
                <div className="li-hero-top-row">
                  <div className="li-avatar-wrap">
                    {user.profileImage ? (
                      <SasImage
                        src={getImageUrl(user.profileImage)}
                        alt={user.name}
                        className="li-avatar-img"
                      />
                    ) : (
                      <div className="li-avatar-placeholder">
                        {user.name ? user.name.charAt(0).toUpperCase() : '👤'}
                      </div>
                    )}
                  </div>

                  {/* Institution Badge on top-right */}
                  {user.institution && (
                    <div className="li-hero-inst-badge">
                      <div className="li-inst-icon">🏛️</div>
                      <span className="li-inst-text">{user.institution}</span>
                    </div>
                  )}
                </div>

                {/* Name, Headline, and Location */}
                <div className="li-hero-info">
                  <div className="li-name-row">
                    <h1 className="li-hero-name">{user.name}</h1>
                    {user.isAdmin && <span className="li-verified-badge">Admin</span>}
                    {user.role === 'instituteadmin' && <span className="li-verified-badge institute">Institute Admin</span>}
                  </div>

                  <p className="li-hero-headline">{headline}</p>

                  <div className="li-hero-meta">
                    {user.location && (
                      <span className="li-meta-item">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        {user.location}
                      </span>
                    )}
                    {user.institution && (
                      <span className="li-meta-item">
                        • {user.institution}
                      </span>
                    )}
                    {user.year && (
                      <span className="li-meta-item">
                        • Class of {user.year}
                      </span>
                    )}
                    <button
                      type="button"
                      className="li-contact-link-btn"
                      onClick={() => setShowContactModal(true)}
                    >
                      Contact info
                    </button>
                  </div>
                </div>

                {/* Hero Action Buttons */}
                <div className="li-hero-actions">
                  {isSelf ? (
                    <Link to="/profile" className="li-btn li-btn-primary">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                      Edit Profile
                    </Link>
                  ) : (
                    <>
                      {connectionStatus === 'accepted' ? (
                        <button
                          className="li-btn li-btn-secondary"
                          onClick={handleUnfollow}
                          disabled={followLoading}
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                          </svg>
                          Connected
                        </button>
                      ) : connectionStatus === 'pending' ? (
                        <button
                          className="li-btn li-btn-secondary"
                          onClick={handleUnfollow}
                          disabled={followLoading}
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          Pending
                        </button>
                      ) : (
                        <button
                          className="li-btn li-btn-primary"
                          onClick={handleFollow}
                          disabled={followLoading}
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="8.5" cy="7" r="4" />
                            <line x1="20" y1="8" x2="20" y2="14" />
                            <line x1="23" y1="11" x2="17" y2="11" />
                          </svg>
                          Connect
                        </button>
                      )}

                      <button
                        className="li-btn li-btn-secondary"
                        onClick={() => {
                          if (connectionStatus === 'accepted') {
                            navigate(`/chat?with=${user._id}`)
                          } else {
                            setShowContactModal(true)
                          }
                        }}
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        Message
                      </button>

                      <button
                        className="li-btn li-btn-secondary"
                        onClick={() => navigate('/alumni')}
                      >
                        View Alumni
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 2. ABOUT CARD */}
            <div className="li-card li-section-card">
              <h2 className="li-section-title">About</h2>
              <div className="li-about-content">
                {user.bio ? (
                  <p>{user.bio}</p>
                ) : (
                  <p className="li-text-muted">
                    Alumnus of {user.institution || 'our network'}
                    {user.course ? `, ${user.course}` : ''}
                    {user.year ? ` (Class of ${user.year})` : ''}.
                    {user.privateInfo?.currentPosition && user.privateInfo?.currentCompany
                      ? ` Currently working as ${user.privateInfo.currentPosition} at ${user.privateInfo.currentCompany}.`
                      : ' Passionate about connecting with fellow alumni, sharing experiences, and exploring collaborative industry opportunities.'}
                  </p>
                )}
              </div>
            </div>

            {/* 3. EXPERIENCE CARD */}
            <div className="li-card li-section-card">
              <h2 className="li-section-title">Experience</h2>
              <div className="li-timeline">
                {/* Current Active Position */}
                {currentCompany && (
                  <div className="li-timeline-item">
                    <div className="li-timeline-icon">
                      <span>💼</span>
                    </div>
                    <div className="li-timeline-content">
                      <h3 className="li-role-title">{currentPosition}</h3>
                      <p className="li-company-name">{currentCompany} · Full-time</p>
                      <p className="li-item-dates">
                        Present · {totalExperience ? `${totalExperience} yrs total exp` : 'Active'}
                      </p>
                      {user.location && <p className="li-item-location">{user.location}</p>}
                    </div>
                  </div>
                )}

                {/* Previous Companies */}
                {previousCompanies.map((prev, idx) => (
                  <div key={`prev-${idx}`} className="li-timeline-item">
                    <div className="li-timeline-icon">
                      <span>🏢</span>
                    </div>
                    <div className="li-timeline-content">
                      <h3 className="li-role-title">{prev.position || 'Engineer / Professional'}</h3>
                      <p className="li-company-name">{prev.company}</p>
                      {prev.field && <p className="li-item-dates">Domain: {prev.field}</p>}
                    </div>
                  </div>
                ))}

                {/* Custom Experience array */}
                {customExperience.map((exp, idx) => (
                  <div key={`exp-${idx}`} className="li-timeline-item">
                    <div className="li-timeline-icon">
                      <span>💼</span>
                    </div>
                    <div className="li-timeline-content">
                      <h3 className="li-role-title">{exp.title}</h3>
                      <p className="li-company-name">{exp.company}</p>
                      <p className="li-item-dates">
                        {exp.startDate ? new Date(exp.startDate).getFullYear() : ''}
                        {exp.current ? ' - Present' : exp.endDate ? ` - ${new Date(exp.endDate).getFullYear()}` : ''}
                      </p>
                      {exp.location && <p className="li-item-location">{exp.location}</p>}
                      {exp.description && <p className="li-item-desc">{exp.description}</p>}
                    </div>
                  </div>
                ))}

                {/* Fallback Placement Company */}
                {!hasAnyExperience && user.privateInfo?.placementCompany && (
                  <div className="li-timeline-item">
                    <div className="li-timeline-icon">
                      <span>🎯</span>
                    </div>
                    <div className="li-timeline-content">
                      <h3 className="li-role-title">Campus Placement</h3>
                      <p className="li-company-name">{user.privateInfo.placementCompany}</p>
                      {user.privateInfo.placementYear && (
                        <p className="li-item-dates">Year of Placement: {user.privateInfo.placementYear}</p>
                      )}
                    </div>
                  </div>
                )}

                {!hasAnyExperience && !user.privateInfo?.placementCompany && (
                  <p className="li-empty-state">No professional experience listed yet.</p>
                )}
              </div>
            </div>

            {/* 4. EDUCATION CARD */}
            <div className="li-card li-section-card">
              <h2 className="li-section-title">Education</h2>
              <div className="li-timeline">
                {/* Primary Degree */}
                {user.institution && (
                  <div className="li-timeline-item">
                    <div className="li-timeline-icon education">
                      <span>🎓</span>
                    </div>
                    <div className="li-timeline-content">
                      <h3 className="li-role-title">{user.institution}</h3>
                      <p className="li-company-name">
                        {[user.program, user.course, user.specialization].filter(Boolean).join(' • ') || 'Alumni Degree'}
                      </p>
                      {user.year && <p className="li-item-dates">Batch: Class of {user.year}</p>}
                    </div>
                  </div>
                )}

                {/* Masters if present */}
                {hasMasters && (
                  <div className="li-timeline-item">
                    <div className="li-timeline-icon education">
                      <span>🎓</span>
                    </div>
                    <div className="li-timeline-content">
                      <h3 className="li-role-title">{user.privateInfo.mastersUniversity || 'Post-Graduate University'}</h3>
                      <p className="li-company-name">
                        {[user.privateInfo.mastersDegree, user.privateInfo.mastersField].filter(Boolean).join(' in ') || 'Masters Degree'}
                      </p>
                      {user.privateInfo.mastersYear && (
                        <p className="li-item-dates">Graduated: {user.privateInfo.mastersYear}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Custom Education entries */}
                {customEducation.map((edu, idx) => (
                  <div key={`edu-${idx}`} className="li-timeline-item">
                    <div className="li-timeline-icon education">
                      <span>🎓</span>
                    </div>
                    <div className="li-timeline-content">
                      <h3 className="li-role-title">{edu.school}</h3>
                      <p className="li-company-name">
                        {edu.degree} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ''}
                      </p>
                      <p className="li-item-dates">
                        {edu.startDate ? new Date(edu.startDate).getFullYear() : ''}
                        {edu.current ? ' - Present' : edu.endDate ? ` - ${new Date(edu.endDate).getFullYear()}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. SKILLS CARD */}
            {((user.skills && user.skills.length > 0) || (user.privateInfo?.fieldsWorked && user.privateInfo.fieldsWorked.length > 0)) && (
              <div className="li-card li-section-card">
                <h2 className="li-section-title">Skills &amp; Expertise</h2>
                <div className="li-skills-grid">
                  {(user.skills || []).map((skill, idx) => (
                    <div key={`sk-${idx}`} className="li-skill-badge">
                      <span>{skill}</span>
                    </div>
                  ))}
                  {(user.privateInfo?.fieldsWorked || []).map((f, idx) => (
                    <div key={`fw-${idx}`} className="li-skill-badge domain">
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. PROFESSIONAL INFORMATION CARD */}
            {(user.professionalInfo || user.skills?.length > 0 || user.linkedin || user.github || user.website) && (
              <div className="li-card li-section-card">
                <h2 className="li-section-title">💼 Professional Details</h2>
                <div className="li-timeline" style={{ padding: '4px 0' }}>
                  {user.professionalInfo?.currentTitle && (
                    <div className="li-timeline-item">
                      <div className="li-timeline-icon"><span>💼</span></div>
                      <div className="li-timeline-content">
                        <h3 className="li-role-title">{user.professionalInfo.currentTitle}</h3>
                        {user.professionalInfo.company && (
                          <p className="li-company-name">{user.professionalInfo.company}</p>
                        )}
                        {user.professionalInfo.industry && (
                          <p className="li-item-dates">Industry: {user.professionalInfo.industry}</p>
                        )}
                        {user.professionalInfo.totalExperience && (
                          <p className="li-item-dates">Experience: {user.professionalInfo.totalExperience}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {user.professionalInfo?.workSummary && (
                    <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: '1.5', margin: '8px 0 12px' }}>
                      {user.professionalInfo.workSummary}
                    </p>
                  )}

                  {/* External links */}
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {(user.professionalInfo?.linkedin || user.linkedin) && (
                      <a
                        href={user.professionalInfo?.linkedin || user.linkedin}
                        target="_blank"
                        rel="noreferrer"
                        className="li-btn li-btn-secondary"
                        style={{ fontSize: '12px', padding: '4px 12px' }}
                      >
                        LinkedIn ↗
                      </a>
                    )}
                    {(user.professionalInfo?.github || user.github) && (
                      <a
                        href={user.professionalInfo?.github || user.github}
                        target="_blank"
                        rel="noreferrer"
                        className="li-btn li-btn-secondary"
                        style={{ fontSize: '12px', padding: '4px 12px' }}
                      >
                        GitHub ↗
                      </a>
                    )}
                    {(user.professionalInfo?.portfolio || user.website) && (
                      <a
                        href={user.professionalInfo?.portfolio || user.website}
                        target="_blank"
                        rel="noreferrer"
                        className="li-btn li-btn-secondary"
                        style={{ fontSize: '12px', padding: '4px 12px' }}
                      >
                        Portfolio ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ACTIVITY CARD */}
            <div className="li-card li-section-card">
              <div className="li-activity-header">
                <div>
                  <h2 className="li-section-title" style={{ margin: 0 }}>Activity</h2>
                  <p className="li-activity-sub">
                    {posts.length} {posts.length === 1 ? 'post' : 'posts'} · {events.length} {events.length === 1 ? 'event' : 'events'}
                  </p>
                </div>
                <div className="li-activity-tabs">
                  <button
                    className={`li-tab-btn ${activeActivityTab === 'posts' ? 'active' : ''}`}
                    onClick={() => setActiveActivityTab('posts')}
                  >
                    Posts ({posts.length})
                  </button>
                  <button
                    className={`li-tab-btn ${activeActivityTab === 'events' ? 'active' : ''}`}
                    onClick={() => setActiveActivityTab('events')}
                  >
                    Events ({events.length})
                  </button>
                  <button
                    className={`li-tab-btn ${activeActivityTab === 'opportunities' ? 'active' : ''}`}
                    onClick={() => setActiveActivityTab('opportunities')}
                  >
                    Opportunities ({opportunities.length})
                  </button>
                </div>
              </div>

              <div className="li-activity-feed">
                {activeActivityTab === 'posts' && (
                  loadingPosts ? (
                    <p className="li-loading-inline">Loading posts...</p>
                  ) : posts.length === 0 ? (
                    <p className="li-empty-state">No posts published yet by {user.name}.</p>
                  ) : (
                    <div className="li-posts-stack">
                      {posts.map((post) => (
                        <PostCard key={post._id} post={post} />
                      ))}
                    </div>
                  )
                )}

                {activeActivityTab === 'events' && (
                  loadingEvents ? (
                    <p className="li-loading-inline">Loading events...</p>
                  ) : events.length === 0 ? (
                    <p className="li-empty-state">No events organized yet.</p>
                  ) : (
                    <div className="li-posts-stack">
                      {events.map((event) => (
                        <PostCard key={event._id} post={event} />
                      ))}
                    </div>
                  )
                )}

                {activeActivityTab === 'opportunities' && (
                  loadingOpportunities ? (
                    <p className="li-loading-inline">Loading opportunities...</p>
                  ) : opportunities.length === 0 ? (
                    <p className="li-empty-state">No job opportunities posted yet.</p>
                  ) : (
                    <div className="li-posts-stack">
                      {opportunities.map((opp) => (
                        <PostCard key={opp._id} post={opp} />
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>
          </main>

          {/* =========================================================
              SIDEBAR COLUMN
              ========================================================= */}
          <aside className="li-profile-aside">
            {/* Institution Highlight */}
            {user.institution && (
              <div className="li-card li-aside-card">
                <h3 className="li-aside-title">Institution Profile</h3>
                <div className="li-aside-inst-box">
                  <div className="li-aside-inst-logo">🏛️</div>
                  <div>
                    <h4 className="li-aside-inst-name">{user.institution}</h4>
                    <p className="li-aside-inst-detail">
                      {user.course} {user.year ? `· Batch ${user.year}` : ''}
                    </p>
                  </div>
                </div>
                <button
                  className="li-aside-btn"
                  onClick={() => navigate(`/institution/${encodeURIComponent(user.institution)}`)}
                >
                  View Institution Details
                </button>
              </div>
            )}

            {/* Public Links Card */}
            <div className="li-card li-aside-card">
              <h3 className="li-aside-title">Contact &amp; Social Links</h3>
              <div className="li-links-list">
                {user.linkedin && (
                  <a
                    href={user.linkedin.startsWith('http') ? user.linkedin : `https://${user.linkedin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="li-social-link"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                    </svg>
                    LinkedIn Profile
                  </a>
                )}
                {user.website && (
                  <a
                    href={user.website.startsWith('http') ? user.website : `https://${user.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="li-social-link"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                    Personal Portfolio
                  </a>
                )}
                {user.github && (
                  <a
                    href={user.github.startsWith('http') ? user.github : `https://github.com/${user.github}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="li-social-link"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    GitHub Profile
                  </a>
                )}
                {user.twitter && (
                  <a
                    href={user.twitter.startsWith('http') ? user.twitter : `https://twitter.com/${user.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="li-social-link"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.936 9.936 0 0024 4.59z" />
                    </svg>
                    Twitter / X
                  </a>
                )}
                {!user.linkedin && !user.website && !user.github && !user.twitter && (
                  <p className="li-empty-state" style={{ padding: '8px 0' }}>
                    No public links added. Click &quot;Contact info&quot; for details.
                  </p>
                )}
              </div>
            </div>

            {/* Quick Alumni Connect Card */}
            <div className="li-card li-aside-card">
              <h3 className="li-aside-title">Explore Alumni</h3>
              <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, margin: '0 0 12px 0' }}>
                Discover fellow graduates and professionals from your institution and expanding network.
              </p>
              <button
                className="li-btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => navigate('/alumni')}
              >
                Browse Alumni Directory
              </button>
            </div>
          </aside>
        </div>
      </div>

      {/* =========================================================
          CONTACT INFO MODAL (LINKEDIN STYLE)
          ========================================================= */}
      {showContactModal && (
        <div className="li-modal-overlay" onClick={() => setShowContactModal(false)}>
          <div className="li-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="li-modal-header">
              <h2>{user.name}</h2>
              <button className="li-modal-close-btn" onClick={() => setShowContactModal(false)}>
                ✕
              </button>
            </div>
            <div className="li-modal-body">
              <h3 className="li-modal-sub">Contact Info</h3>

              {user.email && (
                <div className="li-modal-item">
                  <div className="li-modal-icon">✉️</div>
                  <div>
                    <span className="li-modal-label">Email</span>
                    <a href={`mailto:${user.email}`} className="li-modal-val">
                      {user.email}
                    </a>
                  </div>
                </div>
              )}

              {user.phone && (
                <div className="li-modal-item">
                  <div className="li-modal-icon">📱</div>
                  <div>
                    <span className="li-modal-label">Phone</span>
                    <span className="li-modal-val">{user.phone}</span>
                  </div>
                </div>
              )}

              {user.location && (
                <div className="li-modal-item">
                  <div className="li-modal-icon">📍</div>
                  <div>
                    <span className="li-modal-label">Location</span>
                    <span className="li-modal-val">{user.location}</span>
                  </div>
                </div>
              )}

              {user.linkedin && (
                <div className="li-modal-item">
                  <div className="li-modal-icon">💼</div>
                  <div>
                    <span className="li-modal-label">LinkedIn</span>
                    <a
                      href={user.linkedin.startsWith('http') ? user.linkedin : `https://${user.linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="li-modal-val"
                    >
                      {user.linkedin}
                    </a>
                  </div>
                </div>
              )}

              {user.website && (
                <div className="li-modal-item">
                  <div className="li-modal-icon">🌐</div>
                  <div>
                    <span className="li-modal-label">Website</span>
                    <a
                      href={user.website.startsWith('http') ? user.website : `https://${user.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="li-modal-val"
                    >
                      {user.website}
                    </a>
                  </div>
                </div>
              )}

              <div className="li-modal-item">
                <div className="li-modal-icon">🏛️</div>
                <div>
                  <span className="li-modal-label">Institution</span>
                  <span className="li-modal-val">{user.institution || 'Alumni Network'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}

export default UserProfileView
