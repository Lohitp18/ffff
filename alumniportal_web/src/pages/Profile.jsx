import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import PostCard from '../components/PostCard'
import { useAuth } from '../contexts/AuthContext'
import MainLayout from '../components/MainLayout'
import SasImage from '../components/SasImage'
import './Profile.css'

const API_BASE_URL = (() => {
  const configured = (import.meta.env.VITE_API_BASE_URL ?? '').trim()
  if (configured) return configured
  return import.meta.env.DEV ? 'http://localhost:5000' : ''
})()

const Profile = () => {
  const { user: currentUser } = useAuth()
  const [user, setUser] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [editingSection, setEditingSection] = useState(null) // 'bio', 'personal', 'professional', null
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [activeTab, setActiveTab] = useState('overview') // 'overview', 'personal', 'professional', 'posts'

  const [previewUrl, setPreviewUrl] = useState(null)
  const [previewCoverUrl, setPreviewCoverUrl] = useState(null)
  const fileInputRef = useRef(null)
  const coverInputRef = useRef(null)

  // Skill input helper
  const [skillInput, setSkillInput] = useState('')

  // Form State covering Bio, Personal Info, Professional Info
  const [formData, setFormData] = useState({
    name: '',
    headline: '',
    bio: '',
    location: '',
    website: '',
    linkedin: '',
    twitter: '',
    github: '',
    // Personal Information
    personalInfo: {
      dob: '',
      phone: '',
      personalEmail: '',
      city: '',
      state: '',
      country: '',
      gender: '',
      bloodGroup: '',
      languages: [],
      hobbies: '',
      isPublic: false, // Default is private
    },
    // Professional Information
    professionalInfo: {
      currentTitle: '',
      company: '',
      industry: '',
      totalExperience: '',
      skills: [],
      workSummary: '',
      linkedin: '',
      github: '',
      portfolio: '',
    },
  })

  useEffect(() => {
    loadProfile()
    loadMyPosts()
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      if (previewCoverUrl) URL.revokeObjectURL(previewCoverUrl)
    }
  }, [previewUrl, previewCoverUrl])

  const loadProfile = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/users/profile`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })
      const data = response.data
      setUser(data)

      const pInfo = data.personalInfo || {}
      const profInfo = data.professionalInfo || {}

      // Formatted date for input
      let formattedDob = ''
      if (pInfo.dob || data.dob) {
        try {
          const d = new Date(pInfo.dob || data.dob)
          if (!isNaN(d.getTime())) formattedDob = d.toISOString().split('T')[0]
        } catch {
          // ignore
        }
      }

      setFormData({
        name: data.name || '',
        headline: data.headline || '',
        bio: data.bio || '',
        location: data.location || pInfo.city || '',
        website: data.website || profInfo.portfolio || '',
        linkedin: data.linkedin || profInfo.linkedin || '',
        twitter: data.twitter || '',
        github: data.github || profInfo.github || '',
        personalInfo: {
          dob: formattedDob,
          phone: pInfo.phone || data.phone || '',
          personalEmail: pInfo.personalEmail || '',
          city: pInfo.city || data.location || '',
          state: pInfo.state || '',
          country: pInfo.country || '',
          gender: pInfo.gender || '',
          bloodGroup: pInfo.bloodGroup || '',
          languages: Array.isArray(pInfo.languages) ? pInfo.languages : [],
          hobbies: pInfo.hobbies || '',
          isPublic: Boolean(
            pInfo.isPublic === true || data.privacySettings?.personalInfoVisibility === 'public'
          ),
        },
        professionalInfo: {
          currentTitle:
            profInfo.currentTitle || data.privateInfo?.currentPosition || data.headline || '',
          company: profInfo.company || data.privateInfo?.currentCompany || '',
          industry: profInfo.industry || '',
          totalExperience:
            profInfo.totalExperience ||
            (data.privateInfo?.totalExperience ? `${data.privateInfo.totalExperience} Years` : ''),
          skills: Array.isArray(profInfo.skills) && profInfo.skills.length > 0
            ? profInfo.skills
            : Array.isArray(data.skills)
            ? data.skills
            : [],
          workSummary: profInfo.workSummary || data.bio || '',
          linkedin: profInfo.linkedin || data.linkedin || '',
          github: profInfo.github || data.github || '',
          portfolio: profInfo.portfolio || data.website || '',
        },
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
      setPosts((response.data || []).map((post) => ({ ...post, category: 'Post' })))
    } catch (error) {
      console.error('Failed to load posts:', error)
      setPosts([])
    } finally {
      setLoadingPosts(false)
    }
  }

  const handleSaveProfile = async () => {
    try {
      setSaving(true)
      await axios.put(
        `${API_BASE_URL}/api/users/profile`,
        {
          name: formData.name,
          headline: formData.headline,
          bio: formData.bio,
          location: formData.location || formData.personalInfo.city,
          website: formData.website || formData.professionalInfo.portfolio,
          linkedin: formData.linkedin || formData.professionalInfo.linkedin,
          twitter: formData.twitter,
          github: formData.github || formData.professionalInfo.github,
          personalInfo: formData.personalInfo,
          professionalInfo: formData.professionalInfo,
          skills: formData.professionalInfo.skills,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          },
        }
      )
      setEditingSection(null)
      await loadProfile()
      alert('Profile updated successfully!')
    } catch (error) {
      console.error('Failed to update profile:', error)
      alert(error.response?.data?.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = async (e, isCover = false) => {
    const file = e.target.files[0]
    if (!file) return

    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      alert('Please use JPG, PNG, or WebP format')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB')
      return
    }

    const preview = URL.createObjectURL(file)
    if (isCover) {
      if (previewCoverUrl) URL.revokeObjectURL(previewCoverUrl)
      setPreviewCoverUrl(preview)
    } else {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(preview)
    }

    setUploadingImage(true)
    try {
      const data = new FormData()
      data.append('image', file)

      const endpoint = isCover
        ? `${API_BASE_URL}/api/upload/cover-image`
        : `${API_BASE_URL}/api/upload/profile-image`

      await axios.post(endpoint, data, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })

      await loadProfile()
      alert(isCover ? 'Cover photo updated!' : 'Profile picture updated!')
    } catch (error) {
      console.error('Failed to upload image:', error)
      alert(error.response?.data?.message || 'Failed to upload image')
    } finally {
      setUploadingImage(false)
      if (isCover && coverInputRef.current) coverInputRef.current.value = ''
      if (!isCover && fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const addSkill = (e) => {
    e?.preventDefault()
    if (!skillInput.trim()) return
    const s = skillInput.trim()
    if (!formData.professionalInfo.skills.includes(s)) {
      setFormData({
        ...formData,
        professionalInfo: {
          ...formData.professionalInfo,
          skills: [...formData.professionalInfo.skills, s],
        },
      })
    }
    setSkillInput('')
  }

  const removeSkill = (skillToRemove) => {
    setFormData({
      ...formData,
      professionalInfo: {
        ...formData.professionalInfo,
        skills: formData.professionalInfo.skills.filter((s) => s !== skillToRemove),
      },
    })
  }

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null
    if (imagePath.startsWith('http')) return imagePath
    return `${API_BASE_URL}${imagePath.startsWith('/') ? imagePath : '/' + imagePath}`
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="profile-loading-state">
          <div className="spinner"></div>
          <p>Loading your profile...</p>
        </div>
      </MainLayout>
    )
  }

  if (!user) {
    return (
      <MainLayout>
        <div className="profile-error-state">
          <p>Failed to load profile. Please refresh or sign in again.</p>
        </div>
      </MainLayout>
    )
  }

  const isPersonalPublic = Boolean(formData.personalInfo.isPublic)

  return (
    <MainLayout>
      <div className="modern-profile-container">
        {/* TOP HERO PROFILE CARD - PROPER SIZED & CONTAINED COVER */}
        <div className="modern-profile-hero-card">
          {/* COVER PAGE (Bounded, elegant, no 100vw overflow) */}
          <div className="modern-cover-container">
            {previewCoverUrl || user.coverImage ? (
              <SasImage
                src={previewCoverUrl || getImageUrl(user.coverImage)}
                alt="Profile Cover"
                className="modern-cover-image"
              />
            ) : (
              <div className="modern-cover-placeholder">
                <div className="cover-pattern-overlay"></div>
              </div>
            )}

            <button
              className="modern-cover-edit-btn"
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadingImage}
              title="Change cover photo"
            >
              <span>📷 {uploadingImage ? 'Uploading...' : 'Edit Cover'}</span>
            </button>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={(e) => handleImageUpload(e, true)}
            />
          </div>

          {/* AVATAR AND HEADER DETAILS */}
          <div className="modern-hero-body">
            <div className="modern-avatar-wrapper">
              <div className="modern-avatar-circle">
                {previewUrl || user.profileImage ? (
                  <SasImage
                    src={previewUrl || getImageUrl(user.profileImage)}
                    alt={user.name}
                    className="modern-avatar-img"
                  />
                ) : (
                  <div className="modern-avatar-placeholder">
                    {user.name?.charAt(0)?.toUpperCase() || '👤'}
                  </div>
                )}
              </div>
              <button
                className="modern-avatar-camera-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                title="Change profile picture"
              >
                📷
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={(e) => handleImageUpload(e, false)}
              />
            </div>

            <div className="modern-hero-info">
              <div className="modern-name-row">
                <h1>{user.name}</h1>
                <span className="modern-verified-badge">✓ Verified Alumni</span>
              </div>

              <p className="modern-hero-headline">
                {user.headline ||
                  formData.professionalInfo.currentTitle ||
                  'Alumni Member'}
                {formData.professionalInfo.company && ` at ${formData.professionalInfo.company}`}
              </p>

              <div className="modern-hero-meta-row">
                {user.institution && (
                  <span className="hero-meta-tag">
                    🏫 {user.institution}
                  </span>
                )}
                {user.course && (
                  <span className="hero-meta-tag">
                    🎓 {user.course} {user.year && `('${user.year.slice(-2)})`}
                  </span>
                )}
                {(user.location || formData.personalInfo.city) && (
                  <span className="hero-meta-tag">
                    📍 {user.location || formData.personalInfo.city}
                  </span>
                )}
              </div>
            </div>

            <div className="modern-hero-actions">
              {editingSection ? (
                <div className="edit-btn-group">
                  <button
                    className="hero-action-btn primary"
                    onClick={handleSaveProfile}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : '💾 Save Changes'}
                  </button>
                  <button
                    className="hero-action-btn secondary"
                    onClick={() => {
                      setEditingSection(null)
                      loadProfile()
                    }}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  className="hero-action-btn primary"
                  onClick={() => setEditingSection('all')}
                >
                  ✏️ Edit Profile
                </button>
              )}
            </div>
          </div>

          {/* NAVIGATION TABS */}
          <div className="modern-profile-tabs">
            <button
              className={`modern-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              📝 Overview &amp; Bio
            </button>
            <button
              className={`modern-tab-btn ${activeTab === 'personal' ? 'active' : ''}`}
              onClick={() => setActiveTab('personal')}
            >
              👤 Personal Info
              <span className={`privacy-mini-pill ${isPersonalPublic ? 'public' : 'private'}`}>
                {isPersonalPublic ? '🌐 Public' : '🔒 Private'}
              </span>
            </button>
            <button
              className={`modern-tab-btn ${activeTab === 'professional' ? 'active' : ''}`}
              onClick={() => setActiveTab('professional')}
            >
              💼 Professional Info
            </button>
            <button
              className={`modern-tab-btn ${activeTab === 'posts' ? 'active' : ''}`}
              onClick={() => setActiveTab('posts')}
            >
              📰 Posts ({posts.length})
            </button>
          </div>
        </div>

        {/* =========================================================
            TAB 1: OVERVIEW & BIO
            ========================================================= */}
        {activeTab === 'overview' && (
          <div className="modern-card profile-section-card">
            <div className="section-card-header">
              <div>
                <h2>📝 Bio &amp; About Me</h2>
                <p className="section-card-sub">
                  Introduce yourself to the alumni network and highlight what you do.
                </p>
              </div>
              {!editingSection && (
                <button
                  className="inline-edit-btn"
                  onClick={() => setEditingSection('bio')}
                >
                  ✏️ Edit Bio
                </button>
              )}
            </div>

            {editingSection ? (
              <div className="edit-form-block">
                <div className="input-group">
                  <label>Professional Headline</label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Software Engineer at TechCorp | Alva's Alumni"
                    value={formData.headline}
                    onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                    className="styled-input"
                  />
                  <small>Appears right under your name across posts and directory cards.</small>
                </div>

                <div className="input-group">
                  <label>About / Bio</label>
                  <textarea
                    rows={5}
                    placeholder="Tell your story, your journey since graduation, your passions, and how fellow alumni can connect with you..."
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="styled-textarea"
                  />
                </div>

                <div className="form-save-row">
                  <button
                    className="hero-action-btn primary"
                    onClick={handleSaveProfile}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Bio'}
                  </button>
                  <button
                    className="hero-action-btn secondary"
                    onClick={() => {
                      setEditingSection(null)
                      loadProfile()
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="bio-display-block">
                {user.bio ? (
                  <p className="bio-text">{user.bio}</p>
                ) : (
                  <div className="empty-prompt-box">
                    <p>No bio added yet. Tell fellow alumni about yourself and your journey!</p>
                    <button
                      className="hero-action-btn primary"
                      onClick={() => setEditingSection('bio')}
                    >
                      + Add Your Bio
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* =========================================================
            TAB 2: PERSONAL INFORMATION (WITH PUBLIC/PRIVATE OPTION)
            ========================================================= */}
        {activeTab === 'personal' && (
          <div className="modern-card profile-section-card">
            <div className="section-card-header">
              <div>
                <h2>👤 Personal Information</h2>
                <p className="section-card-sub">
                  Manage your personal contact details and control whether they are public or private.
                </p>
              </div>
              {!editingSection && (
                <button
                  className="inline-edit-btn"
                  onClick={() => setEditingSection('personal')}
                >
                  ✏️ Edit Personal Info
                </button>
              )}
            </div>

            {/* PRIVACY TOGGLE BOX */}
            <div className={`privacy-control-banner ${isPersonalPublic ? 'is-public' : 'is-private'}`}>
              <div className="privacy-banner-icon">
                {isPersonalPublic ? '🌐' : '🔒'}
              </div>
              <div className="privacy-banner-text">
                <div className="privacy-status-title">
                  Personal Information is currently <strong>{isPersonalPublic ? 'PUBLIC' : 'PRIVATE'}</strong>
                </div>
                <p>
                  {isPersonalPublic
                    ? 'Your personal details are visible to other verified alumni in the portal.'
                    : 'Your personal details are strictly private. Only YOU can see them; other alumni cannot view your personal contact details.'}
                </p>
              </div>

              {editingSection && (
                <div className="privacy-toggle-switch-wrapper">
                  <span className="toggle-label-text">Privacy Setting:</span>
                  <div className="privacy-segmented-control">
                    <button
                      type="button"
                      className={`seg-btn ${!isPersonalPublic ? 'active private' : ''}`}
                      onClick={() =>
                        setFormData({
                          ...formData,
                          personalInfo: { ...formData.personalInfo, isPublic: false },
                        })
                      }
                    >
                      🔒 Private
                    </button>
                    <button
                      type="button"
                      className={`seg-btn ${isPersonalPublic ? 'active public' : ''}`}
                      onClick={() =>
                        setFormData({
                          ...formData,
                          personalInfo: { ...formData.personalInfo, isPublic: true },
                        })
                      }
                    >
                      🌐 Public
                    </button>
                  </div>
                </div>
              )}
            </div>

            {editingSection ? (
              <div className="edit-form-block">
                <div className="form-grid-2">
                  <div className="input-group">
                    <label>Phone Number</label>
                    <input
                      type="tel"
                      placeholder="e.g. +91 9876543210"
                      value={formData.personalInfo.phone}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          personalInfo: { ...formData.personalInfo, phone: e.target.value },
                        })
                      }
                      className="styled-input"
                    />
                  </div>

                  <div className="input-group">
                    <label>Personal Email</label>
                    <input
                      type="email"
                      placeholder="e.g. yourname.personal@gmail.com"
                      value={formData.personalInfo.personalEmail}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          personalInfo: {
                            ...formData.personalInfo,
                            personalEmail: e.target.value,
                          },
                        })
                      }
                      className="styled-input"
                    />
                  </div>

                  <div className="input-group">
                    <label>Date of Birth</label>
                    <input
                      type="date"
                      value={formData.personalInfo.dob}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          personalInfo: { ...formData.personalInfo, dob: e.target.value },
                        })
                      }
                      className="styled-input"
                    />
                  </div>

                  <div className="input-group">
                    <label>Gender</label>
                    <select
                      value={formData.personalInfo.gender}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          personalInfo: { ...formData.personalInfo, gender: e.target.value },
                        })
                      }
                      className="styled-input"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Non-Binary">Non-Binary</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label>City / Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Bengaluru"
                      value={formData.personalInfo.city}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          personalInfo: { ...formData.personalInfo, city: e.target.value },
                        })
                      }
                      className="styled-input"
                    />
                  </div>

                  <div className="input-group">
                    <label>State / Province</label>
                    <input
                      type="text"
                      placeholder="e.g. Karnataka"
                      value={formData.personalInfo.state}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          personalInfo: { ...formData.personalInfo, state: e.target.value },
                        })
                      }
                      className="styled-input"
                    />
                  </div>

                  <div className="input-group">
                    <label>Country</label>
                    <input
                      type="text"
                      placeholder="e.g. India"
                      value={formData.personalInfo.country}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          personalInfo: { ...formData.personalInfo, country: e.target.value },
                        })
                      }
                      className="styled-input"
                    />
                  </div>

                  <div className="input-group">
                    <label>Blood Group</label>
                    <select
                      value={formData.personalInfo.bloodGroup}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          personalInfo: {
                            ...formData.personalInfo,
                            bloodGroup: e.target.value,
                          },
                        })
                      }
                      className="styled-input"
                    >
                      <option value="">Select Blood Group</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>
                </div>

                <div className="input-group" style={{ marginTop: '12px' }}>
                  <label>Hobbies &amp; Interests</label>
                  <input
                    type="text"
                    placeholder="e.g. Robotics, Chess, Badminton, Open Source"
                    value={formData.personalInfo.hobbies}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        personalInfo: { ...formData.personalInfo, hobbies: e.target.value },
                      })
                    }
                    className="styled-input"
                  />
                </div>

                <div className="form-save-row">
                  <button
                    className="hero-action-btn primary"
                    onClick={handleSaveProfile}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Personal Info'}
                  </button>
                  <button
                    className="hero-action-btn secondary"
                    onClick={() => {
                      setEditingSection(null)
                      loadProfile()
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="info-display-grid">
                <div className="info-item-card">
                  <span className="info-label">📱 Phone</span>
                  <span className="info-value">
                    {formData.personalInfo.phone || user.phone || 'Not added'}
                  </span>
                </div>

                <div className="info-item-card">
                  <span className="info-label">📧 Personal Email</span>
                  <span className="info-value">
                    {formData.personalInfo.personalEmail || user.email || 'Not added'}
                  </span>
                </div>

                <div className="info-item-card">
                  <span className="info-label">🎂 Date of Birth</span>
                  <span className="info-value">
                    {formData.personalInfo.dob ||
                      (user.dob ? new Date(user.dob).toLocaleDateString() : 'Not added')}
                  </span>
                </div>

                <div className="info-item-card">
                  <span className="info-label">⚧ Gender</span>
                  <span className="info-value">
                    {formData.personalInfo.gender || 'Not specified'}
                  </span>
                </div>

                <div className="info-item-card">
                  <span className="info-label">📍 Location</span>
                  <span className="info-value">
                    {[
                      formData.personalInfo.city,
                      formData.personalInfo.state,
                      formData.personalInfo.country,
                    ]
                      .filter(Boolean)
                      .join(', ') ||
                      user.location ||
                      'Not added'}
                  </span>
                </div>

                <div className="info-item-card">
                  <span className="info-label">🩸 Blood Group</span>
                  <span className="info-value">
                    {formData.personalInfo.bloodGroup || 'Not added'}
                  </span>
                </div>

                <div className="info-item-card full-width">
                  <span className="info-label">🎯 Hobbies &amp; Interests</span>
                  <span className="info-value">
                    {formData.personalInfo.hobbies || 'Not added'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================
            TAB 3: PROFESSIONAL INFORMATION
            ========================================================= */}
        {activeTab === 'professional' && (
          <div className="modern-card profile-section-card">
            <div className="section-card-header">
              <div>
                <h2>💼 Professional Information</h2>
                <p className="section-card-sub">
                  Highlight your current career role, company, industry domain, key skills, and portfolio links.
                </p>
              </div>
              {!editingSection && (
                <button
                  className="inline-edit-btn"
                  onClick={() => setEditingSection('professional')}
                >
                  ✏️ Edit Professional Info
                </button>
              )}
            </div>

            {editingSection ? (
              <div className="edit-form-block">
                <div className="form-grid-2">
                  <div className="input-group">
                    <label>Current Job Title / Designation</label>
                    <input
                      type="text"
                      placeholder="e.g. Lead Full Stack Developer"
                      value={formData.professionalInfo.currentTitle}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          professionalInfo: {
                            ...formData.professionalInfo,
                            currentTitle: e.target.value,
                          },
                        })
                      }
                      className="styled-input"
                    />
                  </div>

                  <div className="input-group">
                    <label>Current Company / Organization</label>
                    <input
                      type="text"
                      placeholder="e.g. Google / Microsoft / Infosys / Startup"
                      value={formData.professionalInfo.company}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          professionalInfo: {
                            ...formData.professionalInfo,
                            company: e.target.value,
                          },
                        })
                      }
                      className="styled-input"
                    />
                  </div>

                  <div className="input-group">
                    <label>Industry / Domain</label>
                    <input
                      type="text"
                      placeholder="e.g. Cloud Computing, FinTech, Healthcare, EdTech"
                      value={formData.professionalInfo.industry}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          professionalInfo: {
                            ...formData.professionalInfo,
                            industry: e.target.value,
                          },
                        })
                      }
                      className="styled-input"
                    />
                  </div>

                  <div className="input-group">
                    <label>Total Experience</label>
                    <input
                      type="text"
                      placeholder="e.g. 3.5 Years"
                      value={formData.professionalInfo.totalExperience}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          professionalInfo: {
                            ...formData.professionalInfo,
                            totalExperience: e.target.value,
                          },
                        })
                      }
                      className="styled-input"
                    />
                  </div>

                  <div className="input-group">
                    <label>LinkedIn Profile URL</label>
                    <input
                      type="url"
                      placeholder="https://linkedin.com/in/username"
                      value={formData.professionalInfo.linkedin}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          professionalInfo: {
                            ...formData.professionalInfo,
                            linkedin: e.target.value,
                          },
                          linkedin: e.target.value,
                        })
                      }
                      className="styled-input"
                    />
                  </div>

                  <div className="input-group">
                    <label>GitHub Profile URL</label>
                    <input
                      type="url"
                      placeholder="https://github.com/username"
                      value={formData.professionalInfo.github}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          professionalInfo: {
                            ...formData.professionalInfo,
                            github: e.target.value,
                          },
                          github: e.target.value,
                        })
                      }
                      className="styled-input"
                    />
                  </div>

                  <div className="input-group full-width">
                    <label>Portfolio / Personal Website URL</label>
                    <input
                      type="url"
                      placeholder="https://yourportfolio.dev"
                      value={formData.professionalInfo.portfolio}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          professionalInfo: {
                            ...formData.professionalInfo,
                            portfolio: e.target.value,
                          },
                          website: e.target.value,
                        })
                      }
                      className="styled-input"
                    />
                  </div>
                </div>

                {/* SKILLS TAG INPUT */}
                <div className="input-group" style={{ marginTop: '16px' }}>
                  <label>Key Skills &amp; Competencies</label>
                  <div className="skill-input-row">
                    <input
                      type="text"
                      placeholder="Type a skill (e.g. React.js, Python, AWS) and press Add"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addSkill()
                        }
                      }}
                      className="styled-input"
                    />
                    <button type="button" className="add-skill-btn" onClick={addSkill}>
                      + Add
                    </button>
                  </div>

                  <div className="skills-chip-container">
                    {formData.professionalInfo.skills.map((skill, idx) => (
                      <span key={idx} className="skill-chip">
                        {skill}
                        <button
                          type="button"
                          className="chip-remove-btn"
                          onClick={() => removeSkill(skill)}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                    {formData.professionalInfo.skills.length === 0 && (
                      <small className="no-skills-hint">No skills added yet.</small>
                    )}
                  </div>
                </div>

                <div className="input-group" style={{ marginTop: '12px' }}>
                  <label>Work Summary &amp; Specialization</label>
                  <textarea
                    rows={4}
                    placeholder="Describe your current engineering work, recent milestones, or leadership responsibilities..."
                    value={formData.professionalInfo.workSummary}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        professionalInfo: {
                          ...formData.professionalInfo,
                          workSummary: e.target.value,
                        },
                      })
                    }
                    className="styled-textarea"
                  />
                </div>

                <div className="form-save-row">
                  <button
                    className="hero-action-btn primary"
                    onClick={handleSaveProfile}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Professional Info'}
                  </button>
                  <button
                    className="hero-action-btn secondary"
                    onClick={() => {
                      setEditingSection(null)
                      loadProfile()
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="professional-display-block">
                <div className="info-display-grid">
                  <div className="info-item-card">
                    <span className="info-label">💼 Current Title</span>
                    <span className="info-value">
                      {formData.professionalInfo.currentTitle || 'Not added'}
                    </span>
                  </div>

                  <div className="info-item-card">
                    <span className="info-label">🏢 Company / Organization</span>
                    <span className="info-value">
                      {formData.professionalInfo.company || 'Not added'}
                    </span>
                  </div>

                  <div className="info-item-card">
                    <span className="info-label">🌐 Industry / Domain</span>
                    <span className="info-value">
                      {formData.professionalInfo.industry || 'Not added'}
                    </span>
                  </div>

                  <div className="info-item-card">
                    <span className="info-label">⏳ Total Experience</span>
                    <span className="info-value">
                      {formData.professionalInfo.totalExperience || 'Not added'}
                    </span>
                  </div>

                  <div className="info-item-card full-width">
                    <span className="info-label">🔗 Professional Profiles</span>
                    <div className="profile-links-row">
                      {formData.professionalInfo.linkedin && (
                        <a
                          href={formData.professionalInfo.linkedin}
                          target="_blank"
                          rel="noreferrer"
                          className="link-chip"
                        >
                          LinkedIn ↗
                        </a>
                      )}
                      {formData.professionalInfo.github && (
                        <a
                          href={formData.professionalInfo.github}
                          target="_blank"
                          rel="noreferrer"
                          className="link-chip"
                        >
                          GitHub ↗
                        </a>
                      )}
                      {formData.professionalInfo.portfolio && (
                        <a
                          href={formData.professionalInfo.portfolio}
                          target="_blank"
                          rel="noreferrer"
                          className="link-chip"
                        >
                          Portfolio Website ↗
                        </a>
                      )}
                      {!formData.professionalInfo.linkedin &&
                        !formData.professionalInfo.github &&
                        !formData.professionalInfo.portfolio && (
                          <span className="info-value">No external links added.</span>
                        )}
                    </div>
                  </div>

                  <div className="info-item-card full-width">
                    <span className="info-label">⚡ Skills &amp; Technologies</span>
                    <div className="skills-chip-container">
                      {formData.professionalInfo.skills.map((skill, idx) => (
                        <span key={idx} className="skill-chip view-only">
                          {skill}
                        </span>
                      ))}
                      {formData.professionalInfo.skills.length === 0 && (
                        <span className="info-value">No skills listed yet.</span>
                      )}
                    </div>
                  </div>

                  {formData.professionalInfo.workSummary && (
                    <div className="info-item-card full-width">
                      <span className="info-label">📝 Work Summary</span>
                      <p className="summary-paragraph">
                        {formData.professionalInfo.workSummary}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================
            TAB 4: MY POSTS
            ========================================================= */}
        {activeTab === 'posts' && (
          <div className="modern-card profile-section-card">
            <div className="section-card-header">
              <div>
                <h2>📰 My Feed Posts ({posts.length})</h2>
                <p className="section-card-sub">
                  Articles, updates, and photos you have shared with the community.
                </p>
              </div>
            </div>

            {loadingPosts ? (
              <div className="profile-loading-state">
                <div className="spinner"></div>
                <p>Loading your posts...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="empty-prompt-box">
                <p>You haven't posted any updates or stories yet.</p>
              </div>
            ) : (
              <div className="my-posts-list">
                {posts.map((post) => (
                  <PostCard key={post._id} post={post} onUpdate={loadMyPosts} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  )
}

export default Profile
