import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import PostCard from '../components/PostCard'
import { useAuth } from '../contexts/AuthContext'
import './Profile.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const Profile = () => {
  const { user: currentUser } = useAuth()
  const [user, setUser] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [editing, setEditing] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)
  const coverInputRef = useRef(null)
  const [formData, setFormData] = useState({
    name: '',
    headline: '',
    bio: '',
    location: '',
    website: '',
    linkedin: '',
    twitter: '',
    github: '',
  })

  useEffect(() => {
    loadProfile()
    loadMyPosts()
  }, [])

  const loadProfile = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/users/profile`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })
      setUser(response.data)
      const data = response.data
      setFormData({
        name: data.name || '',
        headline: data.headline || '',
        bio: data.bio || '',
        location: data.location || '',
        website: data.website || '',
        linkedin: data.linkedin || '',
        twitter: data.twitter || '',
        github: data.github || '',
      })
    } catch (error) {
      console.error('Failed to load profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMyPosts = async () => {
    try {
      setLoadingPosts(true)
      const response = await axios.get(`${API_BASE_URL}/api/posts/mine`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })
      setPosts(response.data.map(post => ({ ...post, category: 'Post' })))
    } catch (error) {
      console.error('Failed to load posts:', error)
      setPosts([])
    } finally {
      setLoadingPosts(false)
    }
  }

  const handleUpdate = async () => {
    try {
      await axios.put(
        `${API_BASE_URL}/api/users/profile`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          },
        }
      )
      setEditing(false)
      loadProfile()
    } catch (error) {
      console.error('Failed to update profile:', error)
      alert('Failed to update profile')
    }
  }

  const handleImageUpload = async (e, isCover = false) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB')
      return
    }

    setUploadingImage(true)
    setError('')
    
    try {
      const formData = new FormData()
      formData.append('image', file)

      const endpoint = isCover 
        ? `${API_BASE_URL}/api/users/cover-image`
        : `${API_BASE_URL}/api/users/profile-image`

      const response = await axios.put(endpoint, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          // Don't set Content-Type - axios will set it automatically with boundary
        },
      })

      if (response.data) {
        // Reload profile to show updated image
        await loadProfile()
        alert(isCover ? 'Cover image updated successfully!' : 'Profile image updated successfully!')
      }
    } catch (error) {
      console.error('Failed to upload image:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Failed to upload image'
      alert(errorMessage)
      setError(errorMessage)
    } finally {
      setUploadingImage(false)
      // Reset file input
      if (isCover && coverInputRef.current) {
        coverInputRef.current.value = ''
      }
      if (!isCover && fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null
    if (imagePath.startsWith('http')) return imagePath
    return `${API_BASE_URL}${imagePath.startsWith('/') ? imagePath : '/' + imagePath}`
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
        <div className="error">Failed to load profile</div>
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
          <button
            className="cover-edit-btn"
            onClick={() => coverInputRef.current?.click()}
            disabled={uploadingImage}
          >
            {uploadingImage ? 'Uploading...' : '✏️ Add cover photo'}
          </button>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => handleImageUpload(e, true)}
          />
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
              <button
                className="profile-picture-edit"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                title="Change photo"
              >
                📷
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => handleImageUpload(e, false)}
              />
            </div>

            {/* Name and Headline */}
            <div className="profile-info-main">
              {editing ? (
                <>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="edit-input-large"
                    placeholder="Name"
                  />
                  <input
                    type="text"
                    value={formData.headline}
                    onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                    className="edit-input"
                    placeholder="Headline (e.g., Software Engineer)"
                  />
                </>
              ) : (
                <>
                  <h1>{user.name}</h1>
                  {user.headline && <p className="headline">{user.headline}</p>}
                  {user.location && (
                    <p className="location">📍 {user.location}</p>
                  )}
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="profile-actions-header">
              {editing ? (
                <>
                  <button onClick={handleUpdate} className="btn-primary">
                    Save
                  </button>
                  <button onClick={() => { setEditing(false); loadProfile(); }} className="btn-secondary">
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setEditing(true)} className="btn-primary">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                    Edit Profile
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="profile-content">
          <div className="profile-main">
            {/* About Section */}
            <div className="profile-section">
              <div className="section-header">
                <h2>About</h2>
                {editing && (
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="edit-textarea"
                    rows="4"
                    placeholder="Tell us about yourself..."
                  />
                )}
              </div>
              {!editing && user.bio && (
                <p className="section-content">{user.bio}</p>
              )}
            </div>


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
            <div className="profile-section">
              <h2>Contact & Links</h2>
              {editing ? (
                <div className="edit-links">
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="edit-input"
                    placeholder="Website URL"
                  />
                  <input
                    type="url"
                    value={formData.linkedin}
                    onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                    className="edit-input"
                    placeholder="LinkedIn URL"
                  />
                  <input
                    type="url"
                    value={formData.twitter}
                    onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                    className="edit-input"
                    placeholder="Twitter URL"
                  />
                  <input
                    type="url"
                    value={formData.github}
                    onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                    className="edit-input"
                    placeholder="GitHub URL"
                  />
                </div>
              ) : (
                <div className="links-container">
                  {user.website ? (
                    <a href={user.website} target="_blank" rel="noopener noreferrer" className="link-item">
                      🌐 Website
                    </a>
                  ) : (
                    <span className="link-item-disabled">🌐 Website - Not provided</span>
                  )}
                  {user.linkedin ? (
                    <a href={user.linkedin} target="_blank" rel="noopener noreferrer" className="link-item">
                      💼 LinkedIn
                    </a>
                  ) : (
                    <span className="link-item-disabled">💼 LinkedIn - Not provided</span>
                  )}
                  {user.twitter ? (
                    <a href={user.twitter} target="_blank" rel="noopener noreferrer" className="link-item">
                      🐦 Twitter
                    </a>
                  ) : (
                    <span className="link-item-disabled">🐦 Twitter - Not provided</span>
                  )}
                  {user.github ? (
                    <a href={user.github} target="_blank" rel="noopener noreferrer" className="link-item">
                      💻 GitHub
                    </a>
                  ) : (
                    <span className="link-item-disabled">💻 GitHub - Not provided</span>
                  )}
                </div>
              )}
            </div>

            {/* Posts Section */}
            <div className="profile-section">
              <h2>My Posts</h2>
              {loadingPosts ? (
                <div className="loading">Loading posts...</div>
              ) : posts.length === 0 ? (
                <p className="section-content">You haven't posted anything yet.</p>
              ) : (
                <div className="posts-container">
                  {posts.map((post) => (
                    <PostCard key={post._id} post={post} onUpdate={loadMyPosts} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
