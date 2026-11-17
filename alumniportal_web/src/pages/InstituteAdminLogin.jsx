import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import CreateInstitutionPostModal from '../components/CreateInstitutionPostModal'
import { useAuth } from '../contexts/AuthContext'
import './Auth.css'
import './AdminAuth.css'
import './InstituteAdmin.css'
import '../components/CreatePostModal.css'
import SasImage from '../components/SasImage'
import SasVideo from '../components/SasVideo'

const API_BASE_URL = (() => {
  const configured = (import.meta.env.VITE_API_BASE_URL ?? '').trim()
  if (configured) return configured
  return import.meta.env.DEV ? 'http://localhost:5000' : ''
})()

const InstituteAdminLogin = () => {
  const navigate = useNavigate()
  const { user, login, logout, loading: authLoading, verifyAdminOtp, resendAdminOtp, submitAdminPhone } = useAuth()

  // Login steps: 'select' | 'login' | 'otp' | 'needs_phone'
  const [step, setStep] = useState('select')
  const [searchTerm, setSearchTerm] = useState('')
  const [college, setCollege] = useState(localStorage.getItem('institute_admin_college') || '')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem('institute_admin_authenticated') === 'true'
  )
  const [institutions, setInstitutions] = useState([])

  // 2FA / OTP State
  const [tempToken, setTempToken] = useState('')
  const [phoneMasked, setPhoneMasked] = useState('')
  const [emailMasked, setEmailMasked] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [phoneInput, setPhoneInput] = useState('')
  const [countdown, setCountdown] = useState(0)

  // Countdown timer
  useEffect(() => {
    let timer
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [countdown])

  // Active module in the left sidebar
  const [activeTab, setActiveTab] = useState('dashboard')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Posts State
  const [posts, setPosts] = useState([])
  const [postsLoading, setPostsLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingPost, setEditingPost] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)

  // Add Post Form State (embedded)
  const [postFormTitle, setPostFormTitle] = useState('')
  const [postFormContent, setPostFormContent] = useState('')
  const [postFormImage, setPostFormImage] = useState(null)
  const [postFormVideo, setPostFormVideo] = useState(null)
  const [postFormMediaPreview, setPostFormMediaPreview] = useState(null)
  const [postCreating, setPostCreating] = useState(false)
  const [postMessage, setPostMessage] = useState('')

  // Events State
  const [events, setEvents] = useState([])
  const [eventsLoading, setEventsLoading] = useState(false)

  // Create Event Form State
  const [eventFormTitle, setEventFormTitle] = useState('')
  const [eventFormDate, setEventFormDate] = useState('')
  const [eventFormLocation, setEventFormLocation] = useState('')
  const [eventFormImage, setEventFormImage] = useState(null)
  const [eventFormImagePreview, setEventFormImagePreview] = useState('')
  const [eventFormDescription, setEventFormDescription] = useState('')
  const [eventFormGoogleFormUrl, setEventFormGoogleFormUrl] = useState('')
  const [eventCreating, setEventCreating] = useState(false)
  const [eventMessage, setEventMessage] = useState('')
  const [eventError, setEventError] = useState('')

  // Opportunities State
  const [opportunities, setOpportunities] = useState([])
  const [opportunitiesLoading, setOpportunitiesLoading] = useState(false)
  const [opportunityFormTitle, setOpportunityFormTitle] = useState('')
  const [opportunityFormCompany, setOpportunityFormCompany] = useState('')
  const [opportunityFormType, setOpportunityFormType] = useState('Full-time')
  const [opportunityFormLocation, setOpportunityFormLocation] = useState('')
  const [opportunityFormApplyLink, setOpportunityFormApplyLink] = useState('')
  const [opportunityFormDescription, setOpportunityFormDescription] = useState('')
  const [opportunityFormImage, setOpportunityFormImage] = useState(null)
  const [opportunityFormImagePreview, setOpportunityFormImagePreview] = useState('')
  const [opportunityCreating, setOpportunityCreating] = useState(false)
  const [opportunityMessage, setOpportunityMessage] = useState('')
  const [opportunityError, setOpportunityError] = useState('')

  // Users / Alumni State
  const [alumniUsers, setAlumniUsers] = useState([])
  const [alumniLoading, setAlumniLoading] = useState(false)
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [userStatusFilter, setUserStatusFilter] = useState('all')
  const [userCourseFilter, setUserCourseFilter] = useState('all')
  const [userYearFilter, setUserYearFilter] = useState('all')
  const [selectedUserDetail, setSelectedUserDetail] = useState(null)

  // Auth token & headers helper
  const getAuthToken = () => localStorage.getItem('auth_token') || ''
  const getAuthHeaders = (extra = {}) => {
    const token = getAuthToken()
    const headers = {
      'x-institution': college || localStorage.getItem('institute_admin_college') || '',
      'x-admin-email': localStorage.getItem('institute_admin_email') || '',
      'x-institution-admin': 'true',
      ...extra,
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    return headers
  }

  // Fetch institutions for login selection
  useEffect(() => {
    const fetchInstitutions = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/institutions/credentials`)
        if (Array.isArray(response.data) && response.data.length > 0) {
          setInstitutions(response.data)
        } else {
          const fallbackRes = await axios.get(`${API_BASE_URL}/api/institutions`)
          setInstitutions(Array.isArray(fallbackRes.data) ? fallbackRes.data : [])
        }
      } catch (err) {
        try {
          const fallbackRes = await axios.get(`${API_BASE_URL}/api/institutions`)
          setInstitutions(Array.isArray(fallbackRes.data) ? fallbackRes.data : [])
        } catch {
          setInstitutions([])
        }
      }
    }
    fetchInstitutions()
  }, [])

  // Auto-load data once authenticated with a college
  useEffect(() => {
    if (isAuthenticated && college) {
      loadAlumniUsers(college)
      loadPosts(college)
      loadEvents(college)
      loadOpportunities(college)
    }
  }, [isAuthenticated, college])

  // Watch auth logout
  useEffect(() => {
    if (isAuthenticated && !authLoading && !user) {
      localStorage.removeItem('institute_admin_authenticated')
      localStorage.removeItem('institute_admin_college')
      localStorage.removeItem('institute_admin_email')
      setIsAuthenticated(false)
    }
  }, [isAuthenticated, user, authLoading])

  // ==========================================
  // DATA LOADERS
  // ==========================================

  const loadAlumniUsers = async (institutionName) => {
    if (!institutionName) return
    setAlumniLoading(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/api/users/institution-dashboard`, {
        params: { institutionName }
      })
      setAlumniUsers(Array.isArray(response.data) ? response.data : [])
    } catch (err) {
      console.error('Failed to load alumni:', err)
      setAlumniUsers([])
    } finally {
      setAlumniLoading(false)
    }
  }

  const loadPosts = async (institutionName) => {
    if (!institutionName) return
    setPostsLoading(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/api/content/institution-posts`)
      const institutionPosts = (response.data || [])
        .filter((post) => post.institution === institutionName)
        .map((post) => ({ ...post, category: 'InstitutionPost' }))
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      setPosts(institutionPosts)
    } catch (err) {
      console.error('Failed to load posts:', err)
      setPosts([])
    } finally {
      setPostsLoading(false)
    }
  }

  const loadEvents = async (institutionName) => {
    if (!institutionName) return
    setEventsLoading(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/api/content/institution-events`, {
        params: { institution: institutionName }
      })
      setEvents(Array.isArray(response.data) ? response.data : [])
    } catch (err) {
      console.error('Failed to load events:', err)
      setEvents([])
    } finally {
      setEventsLoading(false)
    }
  }

  const loadOpportunities = async (institutionName) => {
    if (!institutionName) return
    setOpportunitiesLoading(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/api/content/opportunities`, {
        params: { institution: institutionName }
      })
      const list = Array.isArray(response.data) ? response.data : []
      const filtered = list.filter((o) => !o.institution || o.institution.toLowerCase() === institutionName.toLowerCase())
      setOpportunities(filtered)
    } catch (err) {
      console.error('Failed to load opportunities:', err)
      setOpportunities([])
    } finally {
      setOpportunitiesLoading(false)
    }
  }

  // ==========================================
  // AUTHENTICATION HANDLERS
  // ==========================================

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    if (!college) {
      setError('Please select an institution')
      setLoading(false)
      return
    }

    const trimmedEmail = email.trim().toLowerCase()
    const trimmedPassword = password.trim()

    const authResult = await login(trimmedEmail, trimmedPassword, { isAdminLogin: true })

    if (authResult.requiresOtp) {
      setTempToken(authResult.tempToken || '')
      if (authResult.needsPhone) {
        setStep('needs_phone')
        setError(authResult.message || 'Please link a phone number to receive your login OTP.')
      } else {
        setPhoneMasked(authResult.phoneMasked || '')
        setEmailMasked(authResult.emailMasked || '')
        setStep('otp')
        setCountdown(45)
        setSuccess('')
      }
      setLoading(false)
      return
    }

    if (!authResult.success) {
      setError(authResult.message || 'Login failed. Please check your credentials.')
      setLoading(false)
      return
    }

    const userRole = authResult.user?.role
    const isAuthorized = userRole === 'instituteadmin' || userRole === 'admin' || authResult.user?.isAdmin === true
    if (!isAuthorized) {
      setError('Access denied: You do not have institution administrator privileges.')
      setLoading(false)
      return
    }

    // Verify institution matches unless super admin
    if (authResult.user?.institution && authResult.user.institution !== college && !authResult.user.isAdmin) {
      setError('Credentials do not match the selected institution')
      setLoading(false)
      return
    }

    localStorage.setItem('institute_admin_authenticated', 'true')
    localStorage.setItem('institute_admin_college', college)
    localStorage.setItem('institute_admin_email', email)
    setIsAuthenticated(true)
    setLoading(false)
  }

  const handleOtpSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    if (!otpCode || otpCode.trim().length !== 6) {
      setError('Please enter the 6-digit OTP code')
      setLoading(false)
      return
    }

    const authResult = await verifyAdminOtp(tempToken, otpCode.trim())
    if (!authResult.success) {
      setError(authResult.message || 'Invalid or expired OTP code')
      setLoading(false)
      return
    }

    const userRole = authResult.user?.role
    const isAuthorized = userRole === 'instituteadmin' || userRole === 'admin' || authResult.user?.isAdmin === true
    if (!isAuthorized) {
      setError('Access denied: You do not have institution administrator privileges.')
      setLoading(false)
      return
    }

    if (authResult.user?.institution && authResult.user.institution !== college && !authResult.user.isAdmin) {
      setError('Credentials do not match the selected institution')
      setLoading(false)
      return
    }

    localStorage.setItem('institute_admin_authenticated', 'true')
    localStorage.setItem('institute_admin_college', college)
    localStorage.setItem('institute_admin_email', email)
    setIsAuthenticated(true)
    setLoading(false)
  }

  const handleResendOtp = async () => {
    if (countdown > 0) return
    setError('')
    setSuccess('')
    setLoading(true)

    const result = await resendAdminOtp(tempToken)
    if (result.success) {
      setSuccess('A new OTP verification code has been dispatched.')
      setCountdown(45)
      if (result.emailMasked) setEmailMasked(result.emailMasked)
    } else {
      setError(result.message || 'Failed to resend OTP')
    }
    setLoading(false)
  }

  const handleSubmitPhone = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    if (!phoneInput || phoneInput.trim().replace(/\D/g, '').length < 10) {
      setError('Please enter a valid 10-digit mobile number')
      setLoading(false)
      return
    }

    const result = await submitAdminPhone(tempToken, phoneInput.trim())
    if (result.success) {
      setTempToken(result.tempToken || tempToken)
      setPhoneMasked(result.phoneMasked || '')
      if (result.emailMasked) setEmailMasked(result.emailMasked)
      setStep('otp')
      setCountdown(45)
      setSuccess('')
    } else {
      setError(result.message || 'Failed to send OTP to this phone number')
    }
    setLoading(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('institute_admin_authenticated')
    localStorage.removeItem('institute_admin_college')
    localStorage.removeItem('institute_admin_email')
    setIsAuthenticated(false)
    setCollege('')
    setPosts([])
    setEvents([])
    setAlumniUsers([])
    logout()
    navigate('/instituteadmin')
  }

  // ==========================================
  // USERS / ALUMNI ACTIONS
  // ==========================================

  const handleUpdateUserStatus = async (userId, action) => {
    if (!window.confirm(`Are you sure you want to ${action} this alumnus account?`)) return
    try {
      const endpoint = action === 'approve' ? 'approve-user' : action
      await axios.patch(
        `${API_BASE_URL}/api/admin/${endpoint}/${userId}`,
        {},
        {
          headers: getAuthHeaders(),
        }
      )
      await loadAlumniUsers(college)
      alert(`User ${action}d successfully`)
    } catch (err) {
      console.error(`Failed to ${action} user:`, err)
      alert(`Failed to ${action} user: ${err.response?.data?.message || err.message}`)
    }
  }

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to permanently delete user "${userName || 'this user'}"? All their posts and profile data will be permanently removed.`)) {
      return
    }
    try {
      await axios.delete(
        `${API_BASE_URL}/api/admin/users/${userId}`,
        {
          headers: getAuthHeaders(),
        }
      )
      await loadAlumniUsers(college)
      if (selectedUserDetail?._id === userId) {
        setSelectedUserDetail(null)
      }
      alert('User deleted successfully')
    } catch (err) {
      console.error('Failed to delete user:', err)
      alert(`Failed to delete user: ${err.response?.data?.message || err.message}`)
    }
  }

  const downloadAlumniCSV = () => {
    if (!alumniUsers || alumniUsers.length === 0) {
      alert('No alumni records available to export.')
      return
    }

    const headers = [
      'Name', 'Email', 'Phone', 'Course', 'Year', 'Specialization',
      'Current Company', 'Total Experience', 'Location', 'Status'
    ]

    const csvContent = [
      headers.join(','),
      ...alumniUsers.map((u) => [
        `"${(u.name || '').replace(/"/g, '""')}"`,
        `"${(u.email || '').replace(/"/g, '""')}"`,
        `"${(u.phone || '').replace(/"/g, '""')}"`,
        `"${(u.course || '').replace(/"/g, '""')}"`,
        `"${(u.year || '').toString().replace(/"/g, '""')}"`,
        `"${(u.specialization || '').replace(/"/g, '""')}"`,
        `"${(u.privateInfo?.currentCompany || '').replace(/"/g, '""')}"`,
        `"${u.privateInfo?.totalExperience || 0}"`,
        `"${(u.location || '').replace(/"/g, '""')}"`,
        `"${(u.status || 'pending').replace(/"/g, '""')}"`
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

  // Filtered Alumni List
  const filteredAlumni = useMemo(() => {
    return alumniUsers.filter((u) => {
      const q = userSearchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.phone || '').toLowerCase().includes(q) ||
        (u.course || '').toLowerCase().includes(q) ||
        (u.year || '').toString().includes(q) ||
        (u.privateInfo?.currentCompany || '').toLowerCase().includes(q)

      const matchesStatus =
        userStatusFilter === 'all' ||
        (u.status || 'pending').toLowerCase() === userStatusFilter.toLowerCase()

      const matchesCourse =
        userCourseFilter === 'all' || (u.course || '').toLowerCase() === userCourseFilter.toLowerCase()

      const matchesYear =
        userYearFilter === 'all' || (u.year || '').toString() === userYearFilter.toString()

      return matchesSearch && matchesStatus && matchesCourse && matchesYear
    })
  }, [alumniUsers, userSearchQuery, userStatusFilter, userCourseFilter, userYearFilter])

  // Unique filters from alumni users
  const uniqueCourses = useMemo(() => {
    return Array.from(new Set(alumniUsers.map((u) => u.course).filter(Boolean))).sort()
  }, [alumniUsers])

  const uniqueYears = useMemo(() => {
    return Array.from(new Set(alumniUsers.map((u) => u.year).filter(Boolean))).sort((a, b) => b - a)
  }, [alumniUsers])

  // ==========================================
  // POSTS ACTIONS
  // ==========================================

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return
    try {
      let deleted = false
      const endpoints = [
        `${API_BASE_URL}/api/content/institution-posts/${postId}`,
        `${API_BASE_URL}/api/content/posts/${postId}`,
        `${API_BASE_URL}/api/admin/institution-posts/${postId}`,
        `${API_BASE_URL}/api/admin/posts/${postId}`,
        `${API_BASE_URL}/api/posts/${postId}`,
      ]

      for (const endpoint of endpoints) {
        try {
          await axios.delete(endpoint, {
            headers: getAuthHeaders(),
          })
          deleted = true
          break
        } catch (err) {
          if (err.response?.status === 404) {
            continue
          }
          throw err
        }
      }

      if (!deleted) {
        throw new Error('Post not found or already deleted')
      }

      loadPosts(college)
      alert('Post deleted successfully')
    } catch (err) {
      alert('Failed to delete post: ' + (err.response?.data?.message || err.message))
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

  const handleCreatePostSubmit = async (e) => {
    e.preventDefault()
    if (!postFormTitle.trim() || !postFormContent.trim()) {
      alert('Please fill in both the title and description')
      return
    }

    setPostCreating(true)
    setPostMessage('')
    try {
      const formData = new FormData()
      formData.append('institution', college)
      formData.append('title', postFormTitle.trim())
      formData.append('content', postFormContent.trim())
      if (postFormImage) formData.append('image', postFormImage)
      if (postFormVideo) formData.append('video', postFormVideo)

      await axios.post(`${API_BASE_URL}/api/content/institution-posts`, formData, {
        headers: getAuthHeaders({ 'Content-Type': 'multipart/form-data' }),
      })

      setPostFormTitle('')
      setPostFormContent('')
      setPostFormImage(null)
      setPostFormVideo(null)
      setPostFormMediaPreview(null)
      setPostMessage('Post published successfully!')
      loadPosts(college)
      setTimeout(() => {
        setActiveTab('posts')
        setPostMessage('')
      }, 1000)
    } catch (err) {
      alert('Failed to create post: ' + (err.response?.data?.message || err.message))
    } finally {
      setPostCreating(false)
    }
  }

  // ==========================================
  // EVENTS ACTIONS
  // ==========================================

  const handleCreateEventSubmit = async (e) => {
    e.preventDefault()
    if (!eventFormTitle.trim() || !eventFormDate || !eventFormDescription.trim()) {
      setEventError('Please fill in the title, date/time, and description.')
      return
    }

    setEventCreating(true)
    setEventError('')
    setEventMessage('')

    try {
      const formData = new FormData()
      formData.append('title', eventFormTitle.trim())
      formData.append('description', eventFormDescription.trim())
      formData.append('date', eventFormDate)
      formData.append('location', eventFormLocation.trim() || 'Institution Campus')
      formData.append('institution', college)
      if (eventFormGoogleFormUrl.trim()) {
        formData.append('googleFormUrl', eventFormGoogleFormUrl.trim())
      }
      if (eventFormImage) {
        formData.append('image', eventFormImage)
      }

      await axios.post(`${API_BASE_URL}/api/content/events`, formData, {
        headers: getAuthHeaders({ 'Content-Type': 'multipart/form-data' }),
      })

      // Reset form
      setEventFormTitle('')
      setEventFormDate('')
      setEventFormLocation('')
      setEventFormImage(null)
      setEventFormImagePreview('')
      setEventFormDescription('')
      setEventFormGoogleFormUrl('')
      setEventMessage('Event published successfully!')
      loadEvents(college)
      setTimeout(() => {
        setActiveTab('events')
        setEventMessage('')
      }, 1000)
    } catch (err) {
      setEventError(err.response?.data?.message || err.message || 'Failed to create event')
    } finally {
      setEventCreating(false)
    }
  }

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return
    try {
      let deleted = false
      const endpoints = [
        `${API_BASE_URL}/api/content/events/${eventId}`,
        `${API_BASE_URL}/api/admin/events/${eventId}`,
      ]

      for (const endpoint of endpoints) {
        try {
          await axios.delete(endpoint, {
            headers: getAuthHeaders(),
          })
          deleted = true
          break
        } catch (err) {
          if (err.response?.status === 404) {
            continue
          }
          throw err
        }
      }

      if (!deleted) {
        throw new Error('Event not found or already deleted')
      }

      loadEvents(college)
      alert('Event deleted successfully')
    } catch (err) {
      alert('Failed to delete event: ' + (err.response?.data?.message || err.message))
    }
  }

  const handleOpportunityImageChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be under 5MB')
        return
      }
      setOpportunityFormImage(file)
      setOpportunityFormImagePreview(URL.createObjectURL(file))
    }
  }

  const handleCreateOpportunitySubmit = async (e) => {
    e.preventDefault()
    setOpportunityError('')
    setOpportunityMessage('')

    if (!opportunityFormTitle.trim() || !opportunityFormDescription.trim()) {
      setOpportunityError('Title and description are required')
      return
    }

    setOpportunityCreating(true)
    try {
      const formData = new FormData()
      formData.append('title', opportunityFormTitle.trim())
      formData.append('description', opportunityFormDescription.trim())
      formData.append('company', opportunityFormCompany.trim() || 'Institution Placement / Opportunity')
      formData.append('type', opportunityFormType || 'Full-time')
      formData.append('location', opportunityFormLocation.trim() || "Alva's Campus / Flexible")
      formData.append('applyLink', opportunityFormApplyLink.trim())
      formData.append('institution', college)
      formData.append('status', 'approved')

      if (opportunityFormImage) {
        formData.append('image', opportunityFormImage)
      }

      await axios.post(`${API_BASE_URL}/api/content/opportunities`, formData, {
        headers: getAuthHeaders({ 'Content-Type': 'multipart/form-data' }),
      })

      // Reset form
      setOpportunityFormTitle('')
      setOpportunityFormCompany('')
      setOpportunityFormType('Full-time')
      setOpportunityFormLocation('')
      setOpportunityFormApplyLink('')
      setOpportunityFormDescription('')
      setOpportunityFormImage(null)
      setOpportunityFormImagePreview('')
      setOpportunityMessage('Opportunity published successfully!')
      loadOpportunities(college)
      setTimeout(() => {
        setActiveTab('opportunities')
        setOpportunityMessage('')
      }, 1000)
    } catch (err) {
      setOpportunityError(err.response?.data?.message || err.message || 'Failed to create opportunity')
    } finally {
      setOpportunityCreating(false)
    }
  }

  const handleDeleteOpportunity = async (opportunityId) => {
    if (!window.confirm('Are you sure you want to delete this opportunity?')) return
    try {
      let deleted = false
      const endpoints = [
        `${API_BASE_URL}/api/content/opportunities/${opportunityId}`,
        `${API_BASE_URL}/api/admin/opportunities/${opportunityId}`,
      ]

      for (const endpoint of endpoints) {
        try {
          await axios.delete(endpoint, {
            headers: getAuthHeaders(),
          })
          deleted = true
          break
        } catch (err) {
          if (err.response?.status === 404) {
            continue
          }
          throw err
        }
      }

      if (!deleted) {
        throw new Error('Opportunity not found or already deleted')
      }

      loadOpportunities(college)
      alert('Opportunity deleted successfully')
    } catch (err) {
      alert('Failed to delete opportunity: ' + (err.response?.data?.message || err.message))
    }
  }

  // Media URL Helper
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

  // KPI Calculations
  const pendingUsersCount = alumniUsers.filter((u) => u.status === 'pending').length
  const approvedUsersCount = alumniUsers.filter((u) => u.status === 'approved').length

  // ==========================================
  // VIEW: NOT AUTHENTICATED (LOGIN SCREEN)
  // ==========================================
  if (!isAuthenticated) {
    const filteredInstitutions = institutions.filter((inst) =>
      (inst.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleSelectInstitution = (inst) => {
      setCollege(inst.name)
      if (inst.email) {
        setEmail(inst.email)
      }
      setStep('login')
      setError('')
      setSuccess('')
    }

    return (
      <div className="admin-auth-page">
        <div className="admin-auth-card">
          {/* Header */}
          <div className="admin-auth-header">
            <div className="admin-auth-logo-wrap">
              <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="2.2" fill="none">
                <path d="M3 21h18M3 10h18M5 10v11M19 10v11M9 10v11M15 10v11M12 2L2 7h20L12 2z" />
              </svg>
            </div>
            <div>
              <span className="admin-auth-badge institute">Institution Admin Portal</span>
            </div>
            <h1 className="admin-auth-title">
              {step === 'select'
                ? 'Select Your College'
                : step === 'otp'
                ? 'Two-Factor Verification'
                : step === 'needs_phone'
                ? 'Link Mobile for OTP'
                : 'Institution Sign In'}
            </h1>
            <p className="admin-auth-subtitle">
              {step === 'select'
                ? 'Choose your educational institution to access its admin portal'
                : step === 'otp'
                ? 'Enter the 6-digit one-time code sent to your registered mobile number'
                : step === 'needs_phone'
                ? 'Provide your mobile number to receive your login verification OTP'
                : `Sign in to manage alumni, publish posts, and organize events for ${college}`}
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <div className="admin-auth-alert error">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="admin-auth-alert success">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span>{success}</span>
            </div>
          )}

          {/* STEP 1: SELECT INSTITUTION */}
          {step === 'select' && (
            <div>
              <div className="admin-inst-selector-card">
                <input
                  type="text"
                  placeholder="🔍 Search for your college or campus..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="admin-inst-search-input"
                  autoFocus
                />
                <div className="admin-inst-list">
                  {filteredInstitutions.length > 0 ? (
                    filteredInstitutions.map((inst, index) => (
                      <div
                        key={index}
                        className={`admin-inst-item ${college === inst.name ? 'selected' : ''}`}
                        onClick={() => handleSelectInstitution(inst)}
                      >
                        <span style={{ fontSize: '18px' }}>🏛️</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {inst.name}
                          </div>
                          {inst.email && (
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                              {inst.email}
                            </div>
                          )}
                        </div>
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" style={{ color: '#64748b' }}>
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                      No institutions found matching "{searchTerm}"
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CREDENTIALS */}
          {step === 'login' && (
            <div>
              <div className="admin-selected-badge">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  <span>🏛️</span>
                  <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {college}
                  </strong>
                </div>
                <button type="button" onClick={() => setStep('select')}>
                  Change
                </button>
              </div>

              <form onSubmit={handleLogin} className="admin-auth-form">
                <div className="admin-auth-field">
                  <label className="admin-auth-label">Administrator Email / Username</label>
                  <div className="admin-auth-input-wrap">
                    <span className="admin-auth-input-icon">
                      <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="Enter institution admin email"
                      className="admin-auth-input"
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div className="admin-auth-field">
                  <label className="admin-auth-label">Password</label>
                  <div className="admin-auth-input-wrap">
                    <span className="admin-auth-input-icon">
                      <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Enter administrator password"
                      className="admin-auth-input"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="admin-auth-toggle-pwd"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="admin-auth-btn-primary"
                  style={{ background: 'linear-gradient(135deg, #059669 0%, #0284c7 100%)' }}
                >
                  {loading ? (
                    <>
                      <span className="admin-auth-spinner" />
                      Verifying Credentials...
                    </>
                  ) : (
                    <>Continue with OTP Verification →</>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* STEP 3: OTP VERIFICATION */}
          {step === 'otp' && (
            <div className="admin-otp-wrap">
              <div className="admin-otp-shield">
                <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="2.2" fill="none">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
              </div>

              <div className="admin-otp-info-box">
                <div>Institution: <strong>{college}</strong></div>
                <div style={{ marginTop: '6px', fontWeight: 600 }}>Enter 6-digit verification code sent to:</div>
                {phoneMasked && <div>📱 <strong>{phoneMasked}</strong></div>}
                {emailMasked && <div>📧 <strong>{emailMasked}</strong></div>}
                {!phoneMasked && !emailMasked && <div><strong>Registered Mobile &amp; Email</strong></div>}
              </div>

              <form onSubmit={handleOtpSubmit} style={{ width: '100%' }}>
                <input
                  type="text"
                  maxLength="6"
                  placeholder="••••••"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  required
                  autoFocus
                  className="admin-otp-input-field"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />

                <button
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className="admin-auth-btn-primary"
                >
                  {loading ? (
                    <>
                      <span className="admin-auth-spinner" />
                      Validating OTP...
                    </>
                  ) : (
                    <>Verify &amp; Enter Institution Portal</>
                  )}
                </button>
              </form>

              <div className="admin-otp-actions">
                <button
                  type="button"
                  className="admin-otp-resend-btn"
                  style={{ color: '#10b981' }}
                  onClick={handleResendOtp}
                  disabled={countdown > 0 || loading}
                >
                  {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP'}
                </button>

                <button
                  type="button"
                  className="admin-otp-back-btn"
                  onClick={() => {
                    setStep('login')
                    setOtpCode('')
                    setError('')
                    setSuccess('')
                  }}
                >
                  ← Back to credentials
                </button>
              </div>
            </div>
          )}


          {/* STEP 4: ACCOUNT NEEDS PHONE */}
          {step === 'needs_phone' && (
            <form onSubmit={handleSubmitPhone} className="admin-auth-form">
              <div className="admin-auth-alert info">
                <span>No OTP mobile number is configured for <strong>{college}</strong>. Please enter a 10-digit mobile number to receive OTP.</span>
              </div>

              <div className="admin-auth-field">
                <label className="admin-auth-label">10-Digit Mobile Number</label>
                <div className="admin-auth-input-wrap">
                  <span className="admin-auth-input-icon">
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </span>
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    required
                    placeholder="e.g. 9876543210"
                    className="admin-auth-input"
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="admin-auth-btn-primary"
                style={{ background: 'linear-gradient(135deg, #059669 0%, #0284c7 100%)' }}
              >
                {loading ? (
                  <>
                    <span className="admin-auth-spinner" />
                    Sending OTP...
                  </>
                ) : (
                  <>Send Verification Code via SMS</>
                )}
              </button>

              <div style={{ textAlign: 'center', marginTop: '12px' }}>
                <button
                  type="button"
                  className="admin-otp-back-btn"
                  onClick={() => {
                    setStep('login')
                    setError('')
                  }}
                >
                  ← Back
                </button>
              </div>
            </form>
          )}

          {/* Footer */}
          <div className="admin-auth-footer">
            <a href="/signin">← Back to Regular User Sign In</a>
            <div style={{ marginTop: '8px' }}>
              <a href="/super-admin-login" style={{ color: '#818cf8' }}>Go to Super Admin Portal →</a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ==========================================
  // VIEW: AUTHENTICATED (MODERN SIDEBAR DASHBOARD)
  // ==========================================
  return (
    <div className="inst-pro-layout">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div className="inst-pro-backdrop" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* LEFT SIDEBAR NAVIGATION */}
      <aside className={`inst-pro-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Sidebar Brand Header */}
        <div className="inst-sidebar-brand">
          <div className="inst-brand-wrap">
            <div className="inst-emblem-badge">
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.2" fill="none">
                <path d="M3 21h18M3 10h18M5 10v11M19 10v11M9 10v11M15 10v11M12 2L2 7h20L12 2z"/>
              </svg>
            </div>
            <div className="inst-brand-text">
              <span className="inst-brand-title" title={college}>
                {college}
              </span>
              <span className="inst-brand-badge">Institution Portal</span>
            </div>
          </div>
          <button
            type="button"
            className="inst-mobile-close-btn"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close Sidebar"
          >
            ✕
          </button>
        </div>

        {/* Sidebar Navigation Links */}
        <nav className="inst-sidebar-nav">
          <div className="inst-nav-group-label">OVERVIEW</div>

          <button
            type="button"
            className={`inst-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('dashboard')
              setMobileMenuOpen(false)
            }}
          >
            <span className="inst-nav-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
                <rect x="3" y="3" width="7" height="9" rx="1"/>
                <rect x="14" y="3" width="7" height="5" rx="1"/>
                <rect x="14" y="12" width="7" height="9" rx="1"/>
                <rect x="3" y="16" width="7" height="5" rx="1"/>
              </svg>
            </span>
            <span className="inst-nav-label">Dashboard</span>
          </button>

          <div className="inst-nav-group-label">STUDENTS & ALUMNI</div>

          <button
            type="button"
            className={`inst-nav-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('users')
              setMobileMenuOpen(false)
            }}
          >
            <span className="inst-nav-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </span>
            <span className="inst-nav-label">Users / Members</span>
            {pendingUsersCount > 0 ? (
              <span className="inst-nav-badge warning">{pendingUsersCount} pending</span>
            ) : (
              <span className="inst-nav-badge">{alumniUsers.length}</span>
            )}
          </button>

          <div className="inst-nav-group-label">CAMPUS ENGAGEMENT</div>

          <button
            type="button"
            className={`inst-nav-item ${activeTab === 'posts' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('posts')
              setMobileMenuOpen(false)
            }}
          >
            <span className="inst-nav-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </span>
            <span className="inst-nav-label">Posts</span>
            <span className="inst-nav-badge">{posts.length}</span>
          </button>

          <button
            type="button"
            className={`inst-nav-item ${activeTab === 'addPost' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('addPost')
              setMobileMenuOpen(false)
            }}
          >
            <span className="inst-nav-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="16"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
            </span>
            <span className="inst-nav-label">+ Add a Post</span>
          </button>

          <button
            type="button"
            className={`inst-nav-item ${activeTab === 'events' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('events')
              setMobileMenuOpen(false)
            }}
          >
            <span className="inst-nav-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </span>
            <span className="inst-nav-label">Events</span>
            <span className="inst-nav-badge">{events.length}</span>
          </button>

          <button
            type="button"
            className={`inst-nav-item ${activeTab === 'createEvent' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('createEvent')
              setMobileMenuOpen(false)
            }}
          >
            <span className="inst-nav-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
                <path d="M12 2v20M2 12h20"/>
              </svg>
            </span>
            <span className="inst-nav-label">+ Create an Event</span>
          </button>

          <button
            type="button"
            className={`inst-nav-item ${activeTab === 'opportunities' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('opportunities')
              setMobileMenuOpen(false)
            }}
          >
            <span className="inst-nav-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
              </svg>
            </span>
            <span className="inst-nav-label">Opportunities</span>
            <span className="inst-nav-badge">{opportunities.length}</span>
          </button>

          <button
            type="button"
            className={`inst-nav-item ${activeTab === 'createOpportunity' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('createOpportunity')
              setMobileMenuOpen(false)
            }}
          >
            <span className="inst-nav-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="16"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
            </span>
            <span className="inst-nav-label">+ Post Opportunity</span>
          </button>

          <div className="inst-nav-group-label">INSTITUTION PORTAL</div>

          <button
            type="button"
            className="inst-nav-item"
            onClick={() => navigate(`/institution/${encodeURIComponent(college)}`)}
          >
            <span className="inst-nav-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </span>
            <span className="inst-nav-label">View College Page</span>
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="inst-sidebar-footer">
          <div className="inst-user-card">
            <div className="inst-user-avatar">
              {(college || 'I')[0].toUpperCase()}
            </div>
            <div className="inst-user-info">
              <span className="inst-user-name">
                College Admin
                <span style={{ fontSize: '10px', background: '#dbeafe', color: '#1d4ed8', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px', fontWeight: '600' }}>
                  instituteadmin
                </span>
              </span>
              <span className="inst-user-sub" title={user?.email || localStorage.getItem('institute_admin_email') || ''}>
                {user?.email || localStorage.getItem('institute_admin_email') || 'Logged in'}
              </span>
            </div>
          </div>
          <button type="button" className="inst-nav-item inst-logout-btn" onClick={handleLogout}>
            <span className="inst-nav-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </span>
            <span className="inst-nav-label">Logout</span>
          </button>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <div className="inst-pro-main">
        {/* Sleek Topbar */}
        <header className="inst-pro-topbar">
          <div className="inst-topbar-left">
            <button
              type="button"
              className="inst-mobile-toggle-btn"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open Navigation Menu"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none">
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <div className="inst-breadcrumb">
              <span className="inst-breadcrumb-college" title={college}>{college}</span>
              <span className="inst-breadcrumb-sep">/</span>
              <span className="inst-breadcrumb-active">
                {activeTab === 'dashboard' && 'Dashboard Overview'}
                {activeTab === 'users' && 'Institution Users & Alumni'}
                {activeTab === 'posts' && 'Campus Posts'}
                {activeTab === 'addPost' && 'Add Announcement Post'}
                {activeTab === 'events' && 'College Events'}
                {activeTab === 'createEvent' && 'Create an Event'}
                {activeTab === 'opportunities' && 'Career Opportunities & Jobs'}
                {activeTab === 'createOpportunity' && 'Post an Opportunity'}
              </span>
            </div>
          </div>

          <div className="inst-topbar-right">
            <div className="inst-live-badge">
              <span className="inst-live-dot"></span>
              Live College Portal
            </div>
            <button
              type="button"
              className="inst-quick-btn"
              onClick={() => setActiveTab('addPost')}
            >
              + Post
            </button>
            <button
              type="button"
              className="inst-quick-btn"
              onClick={() => setActiveTab('createOpportunity')}
            >
              + Opportunity
            </button>
            <button
              type="button"
              className="inst-quick-btn primary"
              onClick={() => setActiveTab('createEvent')}
            >
              + Event
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="inst-main-content">
          {/* ========================================================
             1. DASHBOARD OVERVIEW MODULE
             ======================================================== */}
          {activeTab === 'dashboard' && (
            <div>
              {/* Top KPI Cards */}
              <div className="inst-kpi-grid">
                <div className="inst-kpi-card" onClick={() => setActiveTab('users')}>
                  <div className="inst-kpi-info">
                    <span className="inst-kpi-label">Total Members</span>
                    <span className="inst-kpi-value">{alumniUsers.length}</span>
                    <span className="inst-kpi-sub">{approvedUsersCount} verified alumni</span>
                  </div>
                  <div className="inst-kpi-icon-box blue">
                    <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                    </svg>
                  </div>
                </div>

                <div className="inst-kpi-card" onClick={() => setActiveTab('users')}>
                  <div className="inst-kpi-info">
                    <span className="inst-kpi-label">Pending Verifications</span>
                    <span className="inst-kpi-value">{pendingUsersCount}</span>
                    <span className="inst-kpi-sub">
                      {pendingUsersCount > 0 ? 'Requires your approval' : 'All users verified'}
                    </span>
                  </div>
                  <div className="inst-kpi-icon-box amber">
                    <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                  </div>
                </div>

                <div className="inst-kpi-card" onClick={() => setActiveTab('posts')}>
                  <div className="inst-kpi-info">
                    <span className="inst-kpi-label">College Posts</span>
                    <span className="inst-kpi-value">{posts.length}</span>
                    <span className="inst-kpi-sub">Published stories & updates</span>
                  </div>
                  <div className="inst-kpi-icon-box green">
                    <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>
                </div>

                <div className="inst-kpi-card" onClick={() => setActiveTab('events')}>
                  <div className="inst-kpi-info">
                    <span className="inst-kpi-label">College Events</span>
                    <span className="inst-kpi-value">{events.length}</span>
                    <span className="inst-kpi-sub">Conferences & reunions</span>
                  </div>
                  <div className="inst-kpi-icon-box purple">
                    <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Action Banners */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#0f172a' }}>📅 Organize a College Event</h3>
                  <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
                    Create an alumni event with an official poster, description, and submit a Google Form link for attendee RSVPs.
                  </p>
                  <button type="button" className="inst-btn-primary" onClick={() => setActiveTab('createEvent')}>
                    + Create Event with Google Form
                  </button>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#0f172a' }}>📢 Share a Campus Post</h3>
                  <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
                    Post an achievement, campus announcement, or placement highlight with media to your institution's feed.
                  </p>
                  <button type="button" className="inst-btn-primary" onClick={() => setActiveTab('addPost')}>
                    + Add New Post
                  </button>
                </div>
              </div>

              {/* Recent Pending Users Quick Alert */}
              {pendingUsersCount > 0 && (
                <div className="inst-section-card">
                  <div className="inst-section-header">
                    <div>
                      <div className="inst-section-title">
                        Pending User Approvals
                        <span className="inst-count-pill" style={{ background: '#fef3c7', color: '#b45309' }}>
                          {pendingUsersCount} awaiting review
                        </span>
                      </div>
                      <div className="inst-section-subtitle">
                        Approve or reject new students/alumni accounts registered under {college}
                      </div>
                    </div>
                    <button type="button" className="inst-quick-btn primary" onClick={() => { setActiveTab('users'); setUserStatusFilter('pending'); }}>
                      Review All
                    </button>
                  </div>
                  <div className="inst-table-container">
                    <table className="inst-data-table">
                      <thead>
                        <tr>
                          <th>Member</th>
                          <th>Course & Year</th>
                          <th>Email & Phone</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {alumniUsers.filter((u) => u.status === 'pending').slice(0, 5).map((user) => (
                          <tr key={user._id}>
                            <td>
                              <div className="inst-user-cell">
                                <div className="inst-avatar-small">
                                  {user.profileImage ? (
                                    <SasImage src={getImageUrl(user.profileImage)} alt={user.name} className="inst-avatar-img" />
                                  ) : (
                                    (user.name || 'U')[0].toUpperCase()
                                  )}
                                </div>
                                <div className="inst-user-names">
                                  <span className="inst-user-fullname">{user.name || 'Alumnus'}</span>
                                  <span className="inst-user-email">@{user.username || user.email?.split('@')[0]}</span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="inst-course-badge">{user.course || 'Degree'}</span>
                              <div className="inst-year-text">Batch: {user.year || '—'}</div>
                            </td>
                            <td>
                              <div>{user.email}</div>
                              <div className="inst-phone-text">{user.phone || 'No phone'}</div>
                            </td>
                            <td>
                              <span className="inst-status-pill pending">Pending</span>
                            </td>
                            <td>
                              <div className="inst-action-btns">
                                <button type="button" className="inst-btn-sm approve" onClick={() => handleUpdateUserStatus(user._id, 'approve')}>
                                  ✓ Approve
                                </button>
                                <button type="button" className="inst-btn-sm reject" onClick={() => handleUpdateUserStatus(user._id, 'reject')}>
                                  ✕ Reject
                                </button>
                                <button
                                  type="button"
                                  className="inst-btn-sm reject"
                                  style={{ background: '#dc2626', color: '#fff' }}
                                  onClick={() => handleDeleteUser(user._id, user.name)}
                                  title="Permanently Delete User"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================
             2. ALL USERS MODULE (SUPER-ADMIN STYLE TABLE)
             ======================================================== */}
          {activeTab === 'users' && (
            <div className="inst-section-card">
              <div className="inst-section-header">
                <div>
                  <div className="inst-section-title">
                    Institution Members & Alumni
                    <span className="inst-count-pill">{filteredAlumni.length} of {alumniUsers.length}</span>
                  </div>
                  <div className="inst-section-subtitle">
                    All students and alumni accounts affiliated with {college}
                  </div>
                </div>
                <button type="button" className="inst-export-btn" onClick={downloadAlumniCSV}>
                  📥 Export CSV
                </button>
              </div>

              {/* Filters & Search Toolbar */}
              <div className="inst-toolbar">
                <div className="inst-search-wrap">
                  <span className="inst-search-icon">🔍</span>
                  <input
                    type="text"
                    className="inst-search-input"
                    placeholder="Search name, email, phone, company..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                  />
                </div>

                <div className="inst-filters-group">
                  <select
                    className="inst-filter-select"
                    value={userStatusFilter}
                    onChange={(e) => setUserStatusFilter(e.target.value)}
                  >
                    <option value="all">All Statuses ({alumniUsers.length})</option>
                    <option value="approved">Approved ({approvedUsersCount})</option>
                    <option value="pending">Pending ({pendingUsersCount})</option>
                    <option value="rejected">Rejected</option>
                  </select>

                  <select
                    className="inst-filter-select"
                    value={userCourseFilter}
                    onChange={(e) => setUserCourseFilter(e.target.value)}
                  >
                    <option value="all">All Courses</option>
                    {uniqueCourses.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>

                  <select
                    className="inst-filter-select"
                    value={userYearFilter}
                    onChange={(e) => setUserYearFilter(e.target.value)}
                  >
                    <option value="all">All Batches / Years</option>
                    {uniqueYears.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>

                  {(userSearchQuery || userStatusFilter !== 'all' || userCourseFilter !== 'all' || userYearFilter !== 'all') && (
                    <button
                      type="button"
                      className="inst-quick-btn"
                      onClick={() => {
                        setUserSearchQuery('')
                        setUserStatusFilter('all')
                        setUserCourseFilter('all')
                        setUserYearFilter('all')
                      }}
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Members Table */}
              {alumniLoading ? (
                <div className="loading">Loading institution alumni and students...</div>
              ) : filteredAlumni.length === 0 ? (
                <div className="empty-state">
                  <p>No alumni records found matching your filters.</p>
                </div>
              ) : (
                <div className="inst-table-container">
                  <table className="inst-data-table">
                    <thead>
                      <tr>
                        <th>Member</th>
                        <th>Email & Contact</th>
                        <th>Academic Course</th>
                        <th>Batch / Year</th>
                        <th>Career / Company</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAlumni.map((alumnus) => {
                        const status = (alumnus.status || 'pending').toLowerCase()
                        return (
                          <tr key={alumnus._id}>
                            <td>
                              <div className="inst-user-cell">
                                <div className="inst-avatar-small">
                                  {alumnus.profileImage ? (
                                    <SasImage src={getImageUrl(alumnus.profileImage)} alt={alumnus.name} className="inst-avatar-img" />
                                  ) : (
                                    (alumnus.name || 'U')[0].toUpperCase()
                                  )}
                                </div>
                                <div className="inst-user-names">
                                  <span className="inst-user-fullname">{alumnus.name || 'Alumnus'}</span>
                                  <span className="inst-user-email">{alumnus.specialization || alumnus.headline || 'Member'}</span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className="inst-contact-cell">
                                <div>{alumnus.email}</div>
                                <div className="inst-phone-text">{alumnus.phone || '—'}</div>
                              </div>
                            </td>
                            <td>
                              <span className="inst-course-badge">{alumnus.course || 'Degree'}</span>
                            </td>
                            <td>
                              <strong>{alumnus.year || '—'}</strong>
                            </td>
                            <td>
                              <div style={{ fontSize: '12.5px', color: '#1e293b' }}>
                                {alumnus.privateInfo?.currentCompany || alumnus.location || '—'}
                              </div>
                            </td>
                            <td>
                              <span className={`inst-status-pill ${status}`}>
                                {status}
                              </span>
                            </td>
                            <td>
                              <div className="inst-action-btns">
                                {status === 'pending' && (
                                  <>
                                    <button
                                      type="button"
                                      className="inst-btn-sm approve"
                                      onClick={() => handleUpdateUserStatus(alumnus._id, 'approve')}
                                      title="Approve User"
                                    >
                                      ✓ Approve
                                    </button>
                                    <button
                                      type="button"
                                      className="inst-btn-sm reject"
                                      onClick={() => handleUpdateUserStatus(alumnus._id, 'reject')}
                                      title="Reject User"
                                    >
                                      ✕ Reject
                                    </button>
                                  </>
                                )}
                                <button
                                  type="button"
                                  className="inst-btn-sm view"
                                  onClick={() => setSelectedUserDetail(alumnus)}
                                  title="View User Details"
                                >
                                  View Details
                                </button>
                                <button
                                  type="button"
                                  className="inst-btn-sm reject"
                                  style={{ background: '#dc2626', color: '#fff' }}
                                  onClick={() => handleDeleteUser(alumnus._id, alumnus.name)}
                                  title="Permanently Delete User"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ========================================================
             3. POSTS MODULE (LIST / EDIT / DELETE)
             ======================================================== */}
          {activeTab === 'posts' && (
            <div className="inst-section-card">
              <div className="inst-section-header">
                <div>
                  <div className="inst-section-title">
                    Institution Posts & Announcements
                    <span className="inst-count-pill">{posts.length} posts</span>
                  </div>
                  <div className="inst-section-subtitle">
                    Official stories, achievements, and notices for {college}
                  </div>
                </div>
                <button
                  type="button"
                  className="inst-quick-btn primary"
                  onClick={() => setActiveTab('addPost')}
                >
                  + Add New Post
                </button>
              </div>

              {postsLoading ? (
                <div className="loading">Loading posts...</div>
              ) : posts.length === 0 ? (
                <div className="empty-state">
                  <p>No posts published yet for {college}.</p>
                  <button
                    type="button"
                    className="inst-btn-primary"
                    onClick={() => setActiveTab('addPost')}
                  >
                    Create Your First Post
                  </button>
                </div>
              ) : (
                <div className="inst-posts-grid">
                  {posts.map((post) => (
                    <div key={post._id} className="inst-post-card">
                      {(post.imageUrl || post.mediaUrl) && (
                        <SasImage
                          src={getImageUrl(post.imageUrl || post.mediaUrl)}
                          alt={post.title}
                          className="inst-post-media"
                        />
                      )}
                      {post.videoUrl && (
                        <SasVideo
                          src={getVideoUrl(post.videoUrl)}
                          controls
                          className="inst-post-media"
                        />
                      )}
                      <div className="inst-post-body">
                        <div className="inst-post-title">{post.title || 'Untitled Announcement'}</div>
                        <div className="inst-post-desc">{post.content || post.description || ''}</div>
                        <div className="inst-post-meta">
                          <span>📅 {new Date(post.createdAt).toLocaleDateString()}</span>
                          <span className={`inst-status-pill ${post.status || 'approved'}`}>
                            {post.status || 'published'}
                          </span>
                        </div>
                        <div className="inst-card-actions" style={{ marginTop: '12px' }}>
                          <button
                            type="button"
                            className="inst-btn-sm view"
                            onClick={() => handleEditPost(post)}
                            style={{ marginRight: '8px' }}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            className="inst-btn-sm reject"
                            onClick={() => handleDeletePost(post._id)}
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

          {/* ========================================================
             4. ADD A POST MODULE (NORMAL POST CREATION)
             ======================================================== */}
          {activeTab === 'addPost' && (
            <div className="inst-section-card">
              <div className="inst-section-header">
                <div>
                  <div className="inst-section-title">Add a Campus Announcement / Post</div>
                  <div className="inst-section-subtitle">
                    Normal post publishing with title, text content, and image or video attachment
                  </div>
                </div>
                <button
                  type="button"
                  className="inst-quick-btn"
                  onClick={() => setActiveTab('posts')}
                >
                  ← Back to Posts
                </button>
              </div>

              <div className="inst-form-container">
                {postMessage && (
                  <div style={{ padding: '12px', background: '#dcfce7', color: '#15803d', borderRadius: '8px', marginBottom: '16px', fontWeight: 600 }}>
                    {postMessage}
                  </div>
                )}

                <form onSubmit={handleCreatePostSubmit}>
                  <div className="inst-form-group">
                    <label className="inst-form-label">Post Title *</label>
                    <input
                      type="text"
                      className="inst-form-input"
                      placeholder="e.g. Annual Campus Placement Milestone 2026"
                      value={postFormTitle}
                      onChange={(e) => setPostFormTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="inst-form-group">
                    <label className="inst-form-label">Post Content / Caption *</label>
                    <textarea
                      className="inst-form-textarea"
                      placeholder="Write your campus update, story, or announcement here..."
                      value={postFormContent}
                      onChange={(e) => setPostFormContent(e.target.value)}
                      required
                      rows="6"
                    />
                  </div>

                  <div className="inst-form-group">
                    <label className="inst-form-label">Media Attachment (Image or Video)</label>
                    <div className="inst-image-picker-box">
                      {postFormMediaPreview ? (
                        <div>
                          {postFormImage && (
                            <img src={postFormMediaPreview} alt="Preview" className="inst-image-preview" />
                          )}
                          {postFormVideo && (
                            <video src={postFormMediaPreview} controls className="inst-image-preview" />
                          )}
                          <div>
                            <button
                              type="button"
                              className="inst-btn-sm reject"
                              onClick={() => {
                                setPostFormImage(null)
                                setPostFormVideo(null)
                                setPostFormMediaPreview(null)
                              }}
                            >
                              Remove Attachment
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <input
                            type="file"
                            accept="image/*,video/mp4,video/quicktime"
                            id="inst-post-file-input"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              const file = e.target.files[0]
                              if (!file) return
                              if (file.type.startsWith('image/')) {
                                setPostFormImage(file)
                                setPostFormVideo(null)
                                setPostFormMediaPreview(URL.createObjectURL(file))
                              } else if (file.type.startsWith('video/')) {
                                setPostFormVideo(file)
                                setPostFormImage(null)
                                setPostFormMediaPreview(URL.createObjectURL(file))
                              }
                            }}
                          />
                          <label htmlFor="inst-post-file-input" style={{ cursor: 'pointer' }}>
                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📸 / 🎥</div>
                            <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#2563eb' }}>
                              Click to choose an Image or Video
                            </span>
                            <div className="inst-form-hint">Supports JPG, PNG, WEBP, MP4, MOV (max 50MB)</div>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="inst-submit-row">
                    <button type="submit" className="inst-btn-primary" disabled={postCreating}>
                      {postCreating ? 'Publishing...' : '🚀 Publish Announcement'}
                    </button>
                    <button
                      type="button"
                      className="inst-btn-secondary"
                      onClick={() => setActiveTab('posts')}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ========================================================
             5. EVENTS MODULE (VIEW COLLEGE EVENTS)
             ======================================================== */}
          {activeTab === 'events' && (
            <div className="inst-section-card">
              <div className="inst-section-header">
                <div>
                  <div className="inst-section-title">
                    College Events & Reunions
                    <span className="inst-count-pill">{events.length} events</span>
                  </div>
                  <div className="inst-section-subtitle">
                    Upcoming and past events with Google Form registration links
                  </div>
                </div>
                <button
                  type="button"
                  className="inst-quick-btn primary"
                  onClick={() => setActiveTab('createEvent')}
                >
                  + Create an Event
                </button>
              </div>

              {eventsLoading ? (
                <div className="loading">Loading college events...</div>
              ) : events.length === 0 ? (
                <div className="empty-state">
                  <p>No events scheduled for {college} yet.</p>
                  <button
                    type="button"
                    className="inst-btn-primary"
                    onClick={() => setActiveTab('createEvent')}
                  >
                    + Create Your First Event
                  </button>
                </div>
              ) : (
                <div className="inst-events-grid">
                  {events.map((ev) => (
                    <div key={ev._id} className="inst-event-card">
                      <div className="inst-event-banner-wrap">
                        {(ev.imageUrl || ev.mediaUrl) ? (
                          <SasImage
                            src={getImageUrl(ev.imageUrl || ev.mediaUrl)}
                            alt={ev.title}
                            className="inst-event-banner-img"
                          />
                        ) : (
                          <div className="inst-event-fallback-banner">
                            <span style={{ fontSize: '30px' }}>🎓</span>
                            <span style={{ fontSize: '13px', fontWeight: 600 }}>{college}</span>
                          </div>
                        )}
                      </div>

                      <div className="inst-event-body">
                        <div className="inst-event-title">{ev.title}</div>
                        <div className="inst-event-meta-row">
                          <span>📅 {new Date(ev.date).toLocaleDateString()}</span>
                          <span>📍 {ev.location || 'College Campus'}</span>
                        </div>
                        <div className="inst-event-desc">{ev.description}</div>

                        {/* Google Form Link Button */}
                        {ev.googleFormUrl ? (
                          <a
                            href={ev.googleFormUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inst-google-form-btn"
                          >
                            📝 Open Google Form Registration
                          </a>
                        ) : (
                          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '10px' }}>
                            No registration link provided
                          </div>
                        )}

                        <div className="inst-card-actions">
                          <button
                            type="button"
                            className="inst-btn-sm reject"
                            onClick={() => handleDeleteEvent(ev._id)}
                          >
                            🗑️ Delete Event
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================
             6. CREATE AN EVENT MODULE
             (Image, below description, Google Form link, submit)
             ======================================================== */}
          {activeTab === 'createEvent' && (
            <div className="inst-section-card">
              <div className="inst-section-header">
                <div>
                  <div className="inst-section-title">Create an Event</div>
                  <div className="inst-section-subtitle">
                    Upload event poster image, specify description below image, and attach a Google Form link for attendee submissions
                  </div>
                </div>
                <button
                  type="button"
                  className="inst-quick-btn"
                  onClick={() => setActiveTab('events')}
                >
                  ← Back to Events
                </button>
              </div>

              <div className="inst-form-container">
                {eventMessage && (
                  <div style={{ padding: '12px', background: '#dcfce7', color: '#15803d', borderRadius: '8px', marginBottom: '16px', fontWeight: 600 }}>
                    {eventMessage}
                  </div>
                )}
                {eventError && (
                  <div style={{ padding: '12px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '16px', fontWeight: 600 }}>
                    {eventError}
                  </div>
                )}

                <form onSubmit={handleCreateEventSubmit}>
                  {/* Event Title */}
                  <div className="inst-form-group">
                    <label className="inst-form-label">Event Title / Name *</label>
                    <input
                      type="text"
                      className="inst-form-input"
                      placeholder="e.g. Alva's Alumni Global Summit 2026"
                      value={eventFormTitle}
                      onChange={(e) => setEventFormTitle(e.target.value)}
                      required
                    />
                  </div>

                  {/* Date & Location Grid */}
                  <div className="inst-form-grid">
                    <div className="inst-form-group">
                      <label className="inst-form-label">Event Date & Time *</label>
                      <input
                        type="datetime-local"
                        className="inst-form-input"
                        value={eventFormDate}
                        onChange={(e) => setEventFormDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="inst-form-group">
                      <label className="inst-form-label">Location / Venue</label>
                      <input
                        type="text"
                        className="inst-form-input"
                        placeholder="e.g. Campus Auditorium / Google Meet"
                        value={eventFormLocation}
                        onChange={(e) => setEventFormLocation(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* 1. Image Upload (Banner) */}
                  <div className="inst-form-group">
                    <label className="inst-form-label">Event Banner / Poster Image</label>
                    <div className="inst-image-picker-box">
                      {eventFormImagePreview ? (
                        <div>
                          <img src={eventFormImagePreview} alt="Event Preview" className="inst-image-preview" />
                          <div>
                            <button
                              type="button"
                              className="inst-btn-sm reject"
                              onClick={() => {
                                setEventFormImage(null)
                                setEventFormImagePreview('')
                              }}
                            >
                              Remove Image
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            id="inst-event-image-input"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              const file = e.target.files[0]
                              if (file) {
                                setEventFormImage(file)
                                setEventFormImagePreview(URL.createObjectURL(file))
                              }
                            }}
                          />
                          <label htmlFor="inst-event-image-input" style={{ cursor: 'pointer' }}>
                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🖼️</div>
                            <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#2563eb' }}>
                              Click to choose Event Banner Image
                            </span>
                            <div className="inst-form-hint">Supports JPG, PNG, WEBP (recommended 1200x600)</div>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. Below Image: Description */}
                  <div className="inst-form-group">
                    <label className="inst-form-label">Event Description (Below Image) *</label>
                    <textarea
                      className="inst-form-textarea"
                      placeholder="Write full event details, agenda, guest speakers, timings, and instructions for alumni..."
                      value={eventFormDescription}
                      onChange={(e) => setEventFormDescription(e.target.value)}
                      required
                      rows="6"
                    />
                  </div>

                  {/* 3. Google Form Link for Submission */}
                  <div className="inst-form-group inst-google-form-highlight">
                    <label className="inst-form-label" style={{ color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>📝</span> Google Form Registration Link
                    </label>
                    <input
                      type="url"
                      className="inst-form-input"
                      placeholder="https://docs.google.com/forms/d/e/... or https://forms.gle/..."
                      value={eventFormGoogleFormUrl}
                      onChange={(e) => setEventFormGoogleFormUrl(e.target.value)}
                      style={{ borderColor: '#86efac' }}
                    />
                    <div className="inst-form-hint" style={{ color: '#15803d' }}>
                      Submit your Google Form URL above. Alumni and students will click this link to register and submit their details.
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="inst-submit-row">
                    <button type="submit" className="inst-btn-primary" disabled={eventCreating}>
                      {eventCreating ? 'Submitting & Publishing...' : '🚀 Submit & Publish Event'}
                    </button>
                    <button
                      type="button"
                      className="inst-btn-secondary"
                      onClick={() => setActiveTab('events')}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ========================================================
             7. OPPORTUNITIES MODULE (LIST / DELETE)
             ======================================================== */}
          {activeTab === 'opportunities' && (
            <div className="inst-section-card">
              <div className="inst-section-header">
                <div>
                  <div className="inst-section-title">
                    Opportunities & Placements
                    <span className="inst-count-pill">{opportunities.length}</span>
                  </div>
                  <div className="inst-section-subtitle">
                    Job postings, campus drives, and internships published for {college}
                  </div>
                </div>
                <button
                  type="button"
                  className="inst-btn-primary"
                  onClick={() => setActiveTab('createOpportunity')}
                >
                  + Post New Opportunity
                </button>
              </div>

              {opportunitiesLoading ? (
                <div className="loading">Loading opportunities...</div>
              ) : opportunities.length === 0 ? (
                <div className="empty-state">
                  <p>No career opportunities posted for {college} yet.</p>
                  <button
                    type="button"
                    className="inst-btn-primary"
                    onClick={() => setActiveTab('createOpportunity')}
                  >
                    + Post First Opportunity
                  </button>
                </div>
              ) : (
                <div className="inst-events-grid">
                  {opportunities.map((opp) => (
                    <div key={opp._id} className="inst-event-card">
                      <div className="inst-event-banner-wrap">
                        {opp.imageUrl ? (
                          <SasImage
                            src={getImageUrl(opp.imageUrl)}
                            alt={opp.title}
                            className="inst-event-banner-img"
                          />
                        ) : (
                          <div className="inst-event-fallback-banner">
                            <span style={{ fontSize: '30px' }}>💼</span>
                            <span style={{ fontSize: '13px', fontWeight: 600 }}>{opp.company || college}</span>
                          </div>
                        )}
                      </div>

                      <div className="inst-event-body">
                        <div className="inst-event-title">{opp.title}</div>
                        <div className="inst-event-meta-row">
                          <span>🏢 {opp.company || 'Company'}</span>
                          {opp.type && <span>🏷️ {opp.type}</span>}
                          {opp.location && <span>📍 {opp.location}</span>}
                        </div>
                        <div className="inst-event-desc">{opp.description}</div>

                        {opp.applyLink && (
                          <a
                            href={opp.applyLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inst-google-form-btn"
                            style={{ background: '#0284c7' }}
                          >
                            🔗 Apply Link / Info
                          </a>
                        )}

                        <div className="inst-card-actions">
                          <button
                            type="button"
                            className="inst-btn-sm reject"
                            onClick={() => handleDeleteOpportunity(opp._id)}
                          >
                            🗑️ Delete Opportunity
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================
             8. CREATE OPPORTUNITY MODULE
             ======================================================== */}
          {activeTab === 'createOpportunity' && (
            <div className="inst-section-card">
              <div className="inst-section-header">
                <div>
                  <div className="inst-section-title">Create Career Opportunity</div>
                  <div className="inst-section-subtitle">
                    Post a job opening, internship, or placement drive for students & alumni of {college}
                  </div>
                </div>
                <button
                  type="button"
                  className="inst-quick-btn"
                  onClick={() => setActiveTab('opportunities')}
                >
                  ← Back to Opportunities
                </button>
              </div>

              <div className="inst-form-container">
                {opportunityMessage && (
                  <div style={{ padding: '12px', background: '#dcfce7', color: '#15803d', borderRadius: '8px', marginBottom: '16px', fontWeight: 600 }}>
                    {opportunityMessage}
                  </div>
                )}
                {opportunityError && (
                  <div style={{ padding: '12px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '16px', fontWeight: 600 }}>
                    {opportunityError}
                  </div>
                )}

                <form onSubmit={handleCreateOpportunitySubmit}>
                  {/* Opportunity Title */}
                  <div className="inst-form-group">
                    <label className="inst-form-label">Job / Role Title *</label>
                    <input
                      type="text"
                      className="inst-form-input"
                      placeholder="e.g. Junior Full Stack Developer, Research Assistant"
                      value={opportunityFormTitle}
                      onChange={(e) => setOpportunityFormTitle(e.target.value)}
                      required
                    />
                  </div>

                  {/* Company & Type Grid */}
                  <div className="inst-form-grid">
                    <div className="inst-form-group">
                      <label className="inst-form-label">Company / Organization *</label>
                      <input
                        type="text"
                        className="inst-form-input"
                        placeholder="e.g. Google, Infosys, Alva's Research Labs"
                        value={opportunityFormCompany}
                        onChange={(e) => setOpportunityFormCompany(e.target.value)}
                        required
                      />
                    </div>
                    <div className="inst-form-group">
                      <label className="inst-form-label">Opportunity Type *</label>
                      <select
                        className="inst-form-input"
                        value={opportunityFormType}
                        onChange={(e) => setOpportunityFormType(e.target.value)}
                      >
                        <option value="Full-time">Full-time</option>
                        <option value="Internship">Internship</option>
                        <option value="Part-time">Part-time</option>
                        <option value="Contract">Contract</option>
                        <option value="Remote">Remote</option>
                      </select>
                    </div>
                  </div>

                  {/* Location & Apply Link Grid */}
                  <div className="inst-form-grid">
                    <div className="inst-form-group">
                      <label className="inst-form-label">Location</label>
                      <input
                        type="text"
                        className="inst-form-input"
                        placeholder="e.g. Bangalore / Mangalore / Remote"
                        value={opportunityFormLocation}
                        onChange={(e) => setOpportunityFormLocation(e.target.value)}
                      />
                    </div>
                    <div className="inst-form-group">
                      <label className="inst-form-label">Application URL / Portal Link</label>
                      <input
                        type="url"
                        className="inst-form-input"
                        placeholder="https://company.com/apply or google form"
                        value={opportunityFormApplyLink}
                        onChange={(e) => setOpportunityFormApplyLink(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Poster / Logo Image */}
                  <div className="inst-form-group">
                    <label className="inst-form-label">Poster / Company Logo (Optional, JPG/PNG under 5MB)</label>
                    <input
                      type="file"
                      accept="image/*"
                      className="inst-form-input"
                      onChange={handleOpportunityImageChange}
                    />
                    {opportunityFormImagePreview && (
                      <div style={{ marginTop: '10px' }}>
                        <img
                          src={opportunityFormImagePreview}
                          alt="Preview"
                          style={{ maxHeight: '180px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Job Description */}
                  <div className="inst-form-group">
                    <label className="inst-form-label">Job Description & Eligibility Requirements *</label>
                    <textarea
                      className="inst-form-textarea"
                      rows={6}
                      placeholder="Specify role responsibilities, required qualifications, eligibility criteria, CTC/stipend, and instructions..."
                      value={opportunityFormDescription}
                      onChange={(e) => setOpportunityFormDescription(e.target.value)}
                      required
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="inst-submit-row">
                    <button type="submit" className="inst-btn-primary" disabled={opportunityCreating}>
                      {opportunityCreating ? 'Publishing Opportunity...' : '🚀 Publish Opportunity'}
                    </button>
                    <button
                      type="button"
                      className="inst-btn-secondary"
                      onClick={() => setActiveTab('opportunities')}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ========================================================
         USER DETAILS MODAL (VIEW FULL DETAILS)
         ======================================================== */}
      {selectedUserDetail && (
        <div className="inst-modal-overlay" onClick={() => setSelectedUserDetail(null)}>
          <div className="inst-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="inst-modal-header">
              <h3>Member Profile Details</h3>
              <button
                type="button"
                className="inst-modal-close"
                onClick={() => setSelectedUserDetail(null)}
              >
                ✕
              </button>
            </div>
            <div className="inst-modal-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div className="inst-avatar-small" style={{ width: '56px', height: '56px', fontSize: '20px' }}>
                  {selectedUserDetail.profileImage ? (
                    <SasImage src={getImageUrl(selectedUserDetail.profileImage)} alt={selectedUserDetail.name} className="inst-avatar-img" />
                  ) : (
                    (selectedUserDetail.name || 'U')[0].toUpperCase()
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                    {selectedUserDetail.name}
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>
                    {selectedUserDetail.email}
                  </div>
                  <span className={`inst-status-pill ${selectedUserDetail.status || 'pending'}`} style={{ marginTop: '4px' }}>
                    {selectedUserDetail.status || 'pending'}
                  </span>
                </div>
              </div>

              <div className="inst-modal-grid">
                <div className="inst-modal-item">
                  <label>Institution</label>
                  <span>{selectedUserDetail.institution || college}</span>
                </div>
                <div className="inst-modal-item">
                  <label>Course / Program</label>
                  <span>{selectedUserDetail.course || '—'}</span>
                </div>
                <div className="inst-modal-item">
                  <label>Batch / Year</label>
                  <span>{selectedUserDetail.year || '—'}</span>
                </div>
                <div className="inst-modal-item">
                  <label>Specialization</label>
                  <span>{selectedUserDetail.specialization || '—'}</span>
                </div>
                <div className="inst-modal-item">
                  <label>Phone Number</label>
                  <span>{selectedUserDetail.phone || '—'}</span>
                </div>
                <div className="inst-modal-item">
                  <label>Location / City</label>
                  <span>{selectedUserDetail.location || '—'}</span>
                </div>
                <div className="inst-modal-item">
                  <label>Current Company</label>
                  <span>{selectedUserDetail.privateInfo?.currentCompany || '—'}</span>
                </div>
                <div className="inst-modal-item">
                  <label>Experience</label>
                  <span>{selectedUserDetail.privateInfo?.totalExperience ? `${selectedUserDetail.privateInfo.totalExperience} years` : '—'}</span>
                </div>
              </div>

              {selectedUserDetail.headline && (
                <div style={{ marginTop: '16px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Headline / Bio</label>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#334155' }}>{selectedUserDetail.headline}</p>
                </div>
              )}

              <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="inst-btn-sm reject"
                  style={{ background: '#dc2626', color: '#fff', padding: '8px 16px', borderRadius: '6px', fontSize: '13px' }}
                  onClick={() => handleDeleteUser(selectedUserDetail._id, selectedUserDetail.name)}
                >
                  Permanently Delete User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT POST MODAL */}
      {showEditModal && editingPost && (
        <CreateInstitutionPostModal
          institution={college}
          initialData={editingPost}
          onClose={() => {
            setShowEditModal(false)
            setEditingPost(null)
          }}
          onPostCreated={handlePostCreated}
        />
      )}
    </div>
  )
}

export default InstituteAdminLogin
