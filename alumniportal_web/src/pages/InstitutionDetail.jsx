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
      const res = await axios.get(`${API_BASE_URL}/api/institutions/${encodeURIComponent(decodedInstitutionName)}`)
      setProfile(res.data)
      setProfileForm({
        name: res.data.name || decodedInstitutionName,
        phone: res.data.phone || '',
        email: res.data.email || '',
        address: res.data.address || '',
        website: res.data.website || '',
      })
    } catch (err) {
      // If not found, keep profile null
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
    setShowProfileModal(true)
  }

  const closeProfileModal = () => {
    setShowProfileModal(false)
    setLogoFile(null)
    setCoverFile(null)
  }

  const handleProfileInputChange = (field, value) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true)
      const token = localStorage.getItem('auth_token')
      if (!token) {
        alert('Authentication required')
        return
      }

      const formData = new FormData()
      formData.append('name', profileForm.name || decodedInstitutionName)
      formData.append('phone', profileForm.phone || '')
      formData.append('email', profileForm.email || '')
      formData.append('address', profileForm.address || '')
      formData.append('website', profileForm.website || '')
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
        }
      }

      await loadProfile()
      alert('Institution profile saved successfully')
      closeProfileModal()
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.message || 'Failed to save profile')
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

  if (loading) {
    return (
      <MainLayout>
        <div className="institution-detail-loading">
          <div className="loading-spinner"></div>
          <p>Loading posts...</p>
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
          <div className="modal-backdrop">
            <div className="modal-card">
              <h2>{profile ? 'Edit Institution Profile' : 'Create Institution Profile'}</h2>
              <p>This information will be shown on the institution page.</p>
              <div className="modal-grid">
                <label>
                  Name
                  <input
                    type="text"
                    value={profileForm.name || ''}
                    onChange={(e) => handleProfileInputChange('name', e.target.value)}
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    value={profileForm.email || ''}
                    onChange={(e) => handleProfileInputChange('email', e.target.value)}
                  />
                </label>
                <label>
                  Phone
                  <input
                    type="text"
                    value={profileForm.phone || ''}
                    onChange={(e) => handleProfileInputChange('phone', e.target.value)}
                  />
                </label>
                <label className="full-width">
                  Address
                  <input
                    type="text"
                    value={profileForm.address || ''}
                    onChange={(e) => handleProfileInputChange('address', e.target.value)}
                  />
                </label>
                <label className="full-width">
                  Website
                  <input
                    type="text"
                    value={profileForm.website || ''}
                    onChange={(e) => handleProfileInputChange('website', e.target.value)}
                  />
                </label>
                <label>
                  Logo
                  <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files[0])} />
                </label>
                <label>
                  Cover Image
                  <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files[0])} />
                </label>
              </div>
              <div className="modal-actions">
                <button className="linkedin-btn-secondary" onClick={closeProfileModal}>Cancel</button>
                <button className="linkedin-btn-primary" onClick={handleSaveProfile} disabled={savingProfile}>
                  {savingProfile ? 'Saving...' : 'Save'}
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
