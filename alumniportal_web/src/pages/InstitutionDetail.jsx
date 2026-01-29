import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import MainLayout from '../components/MainLayout'
import PostCard from '../components/PostCard'
import CreateInstitutionPostModal from '../components/CreateInstitutionPostModal'
import { useAuth } from '../contexts/AuthContext'
import './InstitutionDetail.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const InstitutionDetail = () => {
  const { institutionName } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    website: '',
  })
  const [logoFile, setLogoFile] = useState(null)
  const [coverFile, setCoverFile] = useState(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [formErrors, setFormErrors] = useState({})

  // Decode the institution name from URL
  const decodedInstitutionName = decodeURIComponent(institutionName || '')

  useEffect(() => {
    checkAdminStatus()
    loadProfile()
    loadPosts()
  }, [decodedInstitutionName, user])

  const checkAdminStatus = () => {
    if (user && (user.isAdmin === true || user.role === 'admin' || user.isAdmin === 'true')) {
      setIsAdmin(true)
    } else {
      setIsAdmin(false)
    }
  }

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null
    if (imagePath.startsWith('http')) return imagePath
    return `${API_BASE_URL}${imagePath.startsWith('/') ? imagePath : '/' + imagePath}`
  }

  const loadProfile = async () => {
    try {
      setProfileLoading(true)
      setError('')
      const res = await axios.get(`${API_BASE_URL}/api/institutions/${encodeURIComponent(decodedInstitutionName)}`)
      if (res.data) {
        setProfile(res.data)
        setProfileForm({
          name: res.data.name || decodedInstitutionName,
          phone: res.data.phone || '',
          email: res.data.email || '',
          address: res.data.address || '',
          website: res.data.website || '',
        })
      }
    } catch (err) {
      // If not found (404), keep profile null - this is expected for new institutions
      if (err.response?.status !== 404) {
        console.error('Error loading institution profile:', err)
        setError('Failed to load institution profile')
      }
      setProfile(null)
    } finally {
      setProfileLoading(false)
    }
  }

  const openProfileModal = () => {
    setProfileForm({
      name: profile?.name || decodedInstitutionName,
      phone: profile?.phone || '',
      email: profile?.email || '',
      address: profile?.address || '',
      website: profile?.website || '',
    })
    setLogoFile(null)
    setCoverFile(null)
    setProfileError('')
    setFormErrors({})
    setShowProfileModal(true)
  }

  const closeProfileModal = () => {
    setShowProfileModal(false)
    setLogoFile(null)
    setCoverFile(null)
    setProfileError('')
    setFormErrors({})
  }

  const handleProfileInputChange = (field, value) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }))
  }

  const validateForm = () => {
    const errors = {}
    
    if (!profileForm.name || profileForm.name.trim() === '') {
      errors.name = 'Institution name is required'
    }
    
    if (profileForm.email && profileForm.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(profileForm.email)) {
        errors.email = 'Please enter a valid email address'
      }
    }
    
    if (profileForm.website && profileForm.website.trim() !== '') {
      const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/
      if (!urlRegex.test(profileForm.website) && !profileForm.website.startsWith('http')) {
        errors.website = 'Please enter a valid website URL'
      }
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSaveProfile = async () => {
    setProfileError('')
    setFormErrors({})
    
    // Validate form
    if (!validateForm()) {
      setProfileError('Please fix the errors in the form')
      return
    }

    try {
      setSavingProfile(true)
      const token = localStorage.getItem('auth_token')
      if (!token) {
        setProfileError('Authentication required. Please log in again.')
        return
      }

      // Ensure name is set - use decoded institution name if not provided
      const institutionName = (profileForm.name && profileForm.name.trim()) || decodedInstitutionName
      
      const formData = new FormData()
      formData.append('name', institutionName.trim())
      if (profileForm.phone) formData.append('phone', profileForm.phone.trim())
      if (profileForm.email) formData.append('email', profileForm.email.trim())
      if (profileForm.address) formData.append('address', profileForm.address.trim())
      if (profileForm.website) {
        let website = profileForm.website.trim()
        // Add http:// if no protocol is specified
        if (website && !website.startsWith('http://') && !website.startsWith('https://')) {
          website = 'https://' + website
        }
        formData.append('website', website)
      }
      if (logoFile) formData.append('image', logoFile)

      const url = profile?._id
        ? `${API_BASE_URL}/api/institutions/${profile._id}`
        : `${API_BASE_URL}/api/institutions`
      const method = profile?._id ? 'put' : 'post'

      const res = await axios({
        method,
        url,
        data: formData,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      })

      // Upload cover image separately if provided
      if (coverFile) {
        const coverData = new FormData()
        coverData.append('image', coverFile)
        const institutionId = res.data._id || profile?._id
        if (institutionId) {
          try {
            await axios.put(
              `${API_BASE_URL}/api/institutions/${institutionId}/cover-image`,
              coverData,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'multipart/form-data',
                },
              }
            )
          } catch (coverErr) {
            console.warn('Failed to upload cover image:', coverErr)
            // Don't fail the whole operation if cover image fails
          }
        }
      }

      await loadProfile()
      setProfileError('')
      closeProfileModal()
      // Show success message using a more user-friendly approach
      setTimeout(() => {
        alert('Institution profile saved successfully!')
      }, 100)
    } catch (err) {
      console.error('Error saving institution profile:', err)
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error ||
                          err.message || 
                          'Failed to save profile. Please check your connection and try again.'
      setProfileError(errorMessage)
    } finally {
      setSavingProfile(false)
    }
  }

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
      
      // Filter posts for this specific institution
      const institutionPosts = response.data
        .filter(post => post.institution === decodedInstitutionName)
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

  const handlePostCreated = () => {
    setShowCreateModal(false)
    loadPosts()
  }

  if (loading && posts.length === 0) {
    return (
      <MainLayout>
        <div className="institution-detail-loading">
          <div className="loading-spinner"></div>
          <p>Loading institution page...</p>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="institution-detail-container">
        {/* Institution Header */}
        <div className="institution-detail-header">
          <button 
            className="back-button"
            onClick={() => navigate('/institutions')}
          >
            Back to Institutions
          </button>
          <div className="institution-header-content">
            <div className="institution-cover" style={{ backgroundImage: profile?.coverImage ? `url(${getImageUrl(profile.coverImage)})` : undefined }}>
              {!profile?.coverImage && <div className="cover-placeholder">Cover image</div>}
            </div>
            <div className="institution-header-main">
              <div className="institution-avatar">
                {profile?.image ? (
                  <img src={getImageUrl(profile.image)} alt={decodedInstitutionName} />
                ) : (
                  <div className="institution-avatar-fallback">{decodedInstitutionName.charAt(0)}</div>
                )}
              </div>
              <div className="institution-header-info">
                <h1>{decodedInstitutionName}</h1>
                <p>{posts.length} {posts.length === 1 ? 'post' : 'posts'}</p>
                {profile && (
                  <div className="institution-contact">
                    {/* Do not display email/phone publicly */}
                    {profile.address && <span>{profile.address}</span>}
                  </div>
                )}
                {profile?.website && (
                  <a href={profile.website} target="_blank" rel="noreferrer" className="institution-website">
                    {profile.website}
                  </a>
                )}
              </div>
              {isAdmin && (
                <button className="linkedin-btn-primary" onClick={() => openProfileModal()}>
                  {profile ? 'Edit Profile' : 'Create Profile'}
                </button>
              )}
            </div>
          </div>
        </div>
        {/* Create Post Card - Only visible to admins */}
        {isAdmin && (
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
                Post to {decodedInstitutionName}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="linkedin-error">
            <p>{error}</p>
          </div>
        )}

        {/* Posts Feed */}
        {posts.length === 0 ? (
          <div className="linkedin-empty-state">
            <p>No posts yet for this institution.</p>
            {isAdmin && (
              <button className="linkedin-btn-primary" onClick={() => setShowCreateModal(true)}>
                Create Post
              </button>
            )}
          </div>
        ) : (
          <div className="linkedin-feed">
            {posts.map((post) => (
              <PostCard key={post._id} post={post} onUpdate={loadPosts} />
            ))}
          </div>
        )}

        {showCreateModal && (
          <CreateInstitutionPostModal
            institution={decodedInstitutionName}
            onClose={() => setShowCreateModal(false)}
            onPostCreated={handlePostCreated}
          />
        )}

        {showProfileModal && (
          <div className="modal-backdrop" onClick={closeProfileModal}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{profile ? 'Edit Institution Profile' : 'Create Institution Profile'}</h2>
                <button className="modal-close" onClick={closeProfileModal} aria-label="Close">×</button>
              </div>
              <p className="modal-description">Fill in the details below to create or update your institution profile. This information will be displayed on the institution page.</p>
              
              {profileError && (
                <div className="modal-error">
                  <span className="error-icon">⚠️</span>
                  <span>{profileError}</span>
                </div>
              )}
              
              <div className="modal-grid">
                <label className={formErrors.name ? 'error' : ''}>
                  Institution Name <span className="required">*</span>
                  <input
                    type="text"
                    value={profileForm.name || ''}
                    onChange={(e) => {
                      handleProfileInputChange('name', e.target.value)
                      if (formErrors.name) {
                        setFormErrors({ ...formErrors, name: '' })
                      }
                    }}
                    placeholder="Enter institution name"
                    required
                  />
                  {formErrors.name && <span className="field-error">{formErrors.name}</span>}
                </label>
                
                <label className={formErrors.email ? 'error' : ''}>
                  Email
                  <input
                    type="email"
                    value={profileForm.email || ''}
                    onChange={(e) => {
                      handleProfileInputChange('email', e.target.value)
                      if (formErrors.email) {
                        setFormErrors({ ...formErrors, email: '' })
                      }
                    }}
                    placeholder="institution@example.com"
                  />
                  {formErrors.email && <span className="field-error">{formErrors.email}</span>}
                </label>
                
                <label>
                  Phone
                  <input
                    type="tel"
                    value={profileForm.phone || ''}
                    onChange={(e) => handleProfileInputChange('phone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </label>
                
                <label className="full-width">
                  Address
                  <input
                    type="text"
                    value={profileForm.address || ''}
                    onChange={(e) => handleProfileInputChange('address', e.target.value)}
                    placeholder="Street address, City, State, ZIP"
                  />
                </label>
                
                <label className={`full-width ${formErrors.website ? 'error' : ''}`}>
                  Website
                  <input
                    type="text"
                    value={profileForm.website || ''}
                    onChange={(e) => {
                      handleProfileInputChange('website', e.target.value)
                      if (formErrors.website) {
                        setFormErrors({ ...formErrors, website: '' })
                      }
                    }}
                    placeholder="www.example.com"
                  />
                  {formErrors.website && <span className="field-error">{formErrors.website}</span>}
                  <small className="field-hint">Include http:// or https:// or leave blank</small>
                </label>
                
                <label className="file-upload-label">
                  <span>Logo Image</span>
                  <div className="file-upload-wrapper">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                      className="file-input"
                    />
                    <div className="file-upload-display">
                      {logoFile ? (
                        <span className="file-selected">✓ {logoFile.name}</span>
                      ) : profile?.image ? (
                        <span className="file-current">Current logo uploaded</span>
                      ) : (
                        <span className="file-placeholder">Click to select logo (optional)</span>
                      )}
                    </div>
                  </div>
                  <small className="field-hint">Recommended: Square image, max 5MB</small>
                </label>
                
                <label className="file-upload-label">
                  <span>Cover Image</span>
                  <div className="file-upload-wrapper">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                      className="file-input"
                    />
                    <div className="file-upload-display">
                      {coverFile ? (
                        <span className="file-selected">✓ {coverFile.name}</span>
                      ) : profile?.coverImage ? (
                        <span className="file-current">Current cover image uploaded</span>
                      ) : (
                        <span className="file-placeholder">Click to select cover image (optional)</span>
                      )}
                    </div>
                  </div>
                  <small className="field-hint">Recommended: Wide image (16:9), max 5MB</small>
                </label>
              </div>
              
              <div className="modal-actions">
                <button 
                  className="linkedin-btn-secondary" 
                  onClick={closeProfileModal}
                  disabled={savingProfile}
                >
                  Cancel
                </button>
                <button 
                  className="linkedin-btn-primary" 
                  onClick={handleSaveProfile} 
                  disabled={savingProfile}
                >
                  {savingProfile ? (
                    <>
                      <span className="spinner-small"></span>
                      Saving...
                    </>
                  ) : (
                    profile ? 'Update Profile' : 'Create Profile'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}

export default InstitutionDetail
