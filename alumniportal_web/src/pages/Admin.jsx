import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import './Admin.css'
import './Auth.css'
import SasImage from '../components/SasImage'
import SuperAdminLogin from './SuperAdminLogin'

const API_BASE_URL = (() => {
  const configured = (import.meta.env.VITE_API_BASE_URL ?? '').trim()
  if (configured) return configured
  return import.meta.env.DEV ? 'http://localhost:5000' : ''
})()

export const MODULE_DEFINITIONS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    category: 'OVERVIEW',
    description: 'System overview, KPI cards, and quick navigation'
  },
  {
    id: 'users',
    label: 'Users',
    category: 'CORE MODULES',
    description: 'Student and Alumni member accounts, approval and verification'
  },
  {
    id: 'posts',
    label: 'Posts',
    category: 'CORE MODULES',
    description: 'Campus stories, media content, and feed posts moderation'
  },
  {
    id: 'events',
    label: 'Events',
    category: 'CORE MODULES',
    description: 'Alumni summits, reunions, seminars, and attendee registrations'
  },
  {
    id: 'opportunities',
    label: 'Opportunities',
    category: 'CORE MODULES',
    description: 'Career vacancies, internships, referrals, and job postings'
  },
  {
    id: 'reports',
    label: 'Reports',
    category: 'CORE MODULES',
    description: 'Flagged user reports, policy violations, and content moderation'
  },
  {
    id: 'alumniMeet',
    label: 'Alumni Meet',
    category: 'ENGAGEMENT & CONFIG',
    description: 'Annual reunion registrations, batch RSVP tracking, and badge downloads'
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp Messages',
    category: 'ENGAGEMENT & CONFIG',
    description: 'Broadcast directory and instant WhatsApp engagement'
  },
  {
    id: 'credentials',
    label: 'Institutional Credential',
    category: 'ENGAGEMENT & CONFIG',
    description: 'Configure and provision institution college portal login accounts'
  },
  {
    id: 'createSuperAdmin',
    label: 'Create Super Admin',
    category: 'ADMINISTRATION',
    description: 'Create super admin users and configure module display permissions'
  }
]

const Admin = () => {
  const navigate = useNavigate()
  const { user, login, logout, loading } = useAuth()
  const [isAuthenticated, setIsAuthenticated] = useState(localStorage.getItem('admin_authenticated') === 'true')
  const [activeTab, setActiveTab] = useState('dashboard')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  const SUPER_ADMIN_EMAIL = 'patgarlohit818@gmail.com'
  const SUPER_ADMIN_PASSWORD = 'Lohit@2004'
  const [stats, setStats] = useState({})
  const [users, setUsers] = useState([])
  const [posts, setPosts] = useState([])
  const [events, setEvents] = useState([])
  const [opportunities, setOpportunities] = useState([])
  const [reports, setReports] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [postsLoading, setPostsLoading] = useState(false)
  const [eventsLoading, setEventsLoading] = useState(false)
  const [opportunitiesLoading, setOpportunitiesLoading] = useState(false)
  const [reportsLoading, setReportsLoading] = useState(false)
  const [rsvpDownloading, setRsvpDownloading] = useState(false)
  const [rsvps, setRsvps] = useState([])
  const [rsvpsLoading, setRsvpsLoading] = useState(false)
  const [studentsExportLoading, setStudentsExportLoading] = useState(false)

  // Filter states
  const [filters, setFilters] = useState({
    institution: '',
    course: '',
    year: '',
    company: '',
    username: '',
    status: ''
  })

  // Statistics state
  const [statistics, setStatistics] = useState({
    byYear: {},
    byInstitution: {},
    byCourse: {},
    byCompany: {},
    entrepreneurs: 0,
    higherEducation: 0
  })

  const [detailedStats, setDetailedStats] = useState(null)
  const [detailedStatsLoading, setDetailedStatsLoading] = useState(false)

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      return {}
    }
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }

  // Super admin creation and module permissions state
  const [superAdmins, setSuperAdmins] = useState([])
  const [superAdminsLoading, setSuperAdminsLoading] = useState(false)
  const [adminFormName, setAdminFormName] = useState('')
  const [adminFormEmail, setAdminFormEmail] = useState('')
  const [adminFormPassword, setAdminFormPassword] = useState('')
  const [adminFormPhone, setAdminFormPhone] = useState('')
  const [adminFormModules, setAdminFormModules] = useState([
    'dashboard', 'users', 'posts', 'events', 'opportunities', 'reports', 'alumniMeet', 'whatsapp', 'credentials', 'createSuperAdmin'
  ])
  const [adminFormError, setAdminFormError] = useState('')
  const [adminFormSuccess, setAdminFormSuccess] = useState('')
  const [creatingAdmin, setCreatingAdmin] = useState(false)

  // Module access check for currently logged in admin
  const isModuleAllowed = (moduleId) => {
    const email = (user?.email || '').toLowerCase()
    if (email === 'patgarlohit818@gmail.com' || email === 'admin@alumniportal.com') {
      return true
    }
    if (user?.allowedModules && Array.isArray(user.allowedModules) && user.allowedModules.length > 0) {
      return user.allowedModules.includes(moduleId)
    }
    return true
  }

  // Ensure active tab is within permitted modules
  useEffect(() => {
    const email = (user?.email || '').toLowerCase()
    if (email === 'patgarlohit818@gmail.com' || email === 'admin@alumniportal.com') {
      return
    }
    if (user?.allowedModules && Array.isArray(user.allowedModules) && user.allowedModules.length > 0) {
      if (!user.allowedModules.includes(activeTab)) {
        const firstPermitted = MODULE_DEFINITIONS.find((m) => user.allowedModules.includes(m.id))
        if (firstPermitted) {
          setActiveTab(firstPermitted.id)
        }
      }
    }
  }, [user?.allowedModules, user?.email, activeTab])

  const loadSuperAdmins = async () => {
    setSuperAdminsLoading(true)
    setAdminFormError('')
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin/super-admins`, {
        headers: getAuthHeaders()
      })
      setSuperAdmins(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.error('Failed to load super admins:', err)
      setAdminFormError('Failed to load super admin accounts')
    } finally {
      setSuperAdminsLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'createSuperAdmin') {
      loadSuperAdmins()
    }
  }, [activeTab])

  const handleCreateSuperAdmin = async (e) => {
    e.preventDefault()
    setAdminFormError('')
    setAdminFormSuccess('')

    if (!adminFormName || !adminFormEmail || !adminFormPassword) {
      setAdminFormError('Please fill in Name, Email, and Password')
      return
    }

    if (adminFormPassword.length < 6) {
      setAdminFormError('Password must be at least 6 characters long')
      return
    }

    if (!adminFormPhone || adminFormPhone.trim().replace(/\D/g, '').length < 10) {
      setAdminFormError('Please enter a valid 10-digit mobile number for login OTP verification')
      return
    }

    if (adminFormModules.length === 0) {
      setAdminFormError('Please select at least one module for this Super Admin to access')
      return
    }

    setCreatingAdmin(true)
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/admin/super-admins`,
        {
          name: adminFormName.trim(),
          email: adminFormEmail.trim(),
          password: adminFormPassword,
          phone: adminFormPhone.trim(),
          allowedModules: adminFormModules
        },
        { headers: getAuthHeaders() }
      )

      if (res.data?.success) {
        setAdminFormSuccess(res.data.message || 'Super Admin created successfully!')
        setAdminFormName('')
        setAdminFormEmail('')
        setAdminFormPassword('')
        setAdminFormPhone('')
        setAdminFormModules(MODULE_DEFINITIONS.map((m) => m.id))
        loadSuperAdmins()
      }
    } catch (err) {
      setAdminFormError(err.response?.data?.message || 'Failed to create Super Admin')
    } finally {
      setCreatingAdmin(false)
    }
  }

  const handleDeleteSuperAdmin = async (adminId, adminEmail) => {
    if (!window.confirm(`Are you sure you want to delete Super Admin: ${adminEmail}?`)) return
    setAdminFormError('')
    setAdminFormSuccess('')

    try {
      const res = await axios.delete(
        `${API_BASE_URL}/api/admin/super-admins/${adminId}`,
        { headers: getAuthHeaders() }
      )
      if (res.data?.success) {
        setAdminFormSuccess(res.data.message || 'Super Admin removed successfully')
        loadSuperAdmins()
      }
    } catch (err) {
      setAdminFormError(err.response?.data?.message || 'Failed to remove Super Admin')
    }
  }

  const toggleModuleSelection = (modId) => {
    setAdminFormModules((prev) =>
      prev.includes(modId) ? prev.filter((id) => id !== modId) : [...prev, modId]
    )
  }

  const selectAllModules = () => {
    setAdminFormModules(MODULE_DEFINITIONS.map((m) => m.id))
  }

  const clearAllModules = () => {
    setAdminFormModules([])
  }

  // Institution credentials states
  const [institutions, setInstitutions] = useState([])
  const [credentials, setCredentials] = useState([])
  const [credentialsLoading, setCredentialsLoading] = useState(false)
  const [credCollege, setCredCollege] = useState('')
  const [credUsername, setCredUsername] = useState('')
  const [credPassword, setCredPassword] = useState('')
  const [credPhone, setCredPhone] = useState('')
  const [credError, setCredError] = useState('')
  const [credSuccess, setCredSuccess] = useState('')

  const loadCredentialsData = async () => {
    setCredentialsLoading(true);
    setCredError('');
    setCredSuccess('');
    try {
      const [instRes, credRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/institutions`, { headers: getAuthHeaders() }),
        axios.get(`${API_BASE_URL}/api/admin/institution-credentials`, { headers: getAuthHeaders() })
      ]);
      setInstitutions(instRes.data);
      setCredentials(credRes.data);
    } catch (err) {
      console.error('Failed to load credentials data:', err);
      setCredError('Failed to load institution credentials data');
    } finally {
      setCredentialsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'credentials') {
      loadCredentialsData();
    }
  }, [activeTab]);

  const handleCreateCredential = async (e) => {
    e.preventDefault();
    setCredError('');
    setCredSuccess('');

    if (!credCollege || !credUsername || !credPassword) {
      setCredError('Institution, username, and password are required');
      return;
    }

    if (!credPhone || credPhone.trim().replace(/\D/g, '').length < 10) {
      setCredError('Please enter a valid 10-digit mobile number for login OTP verification');
      return;
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/admin/institution-credentials`,
        {
          institution: credCollege,
          username: credUsername,
          password: credPassword,
          phone: credPhone.trim()
        },
        { headers: getAuthHeaders() }
      );

      if (response.data.success) {
        setCredSuccess(response.data.message || 'Credentials configured successfully');
        setCredCollege('');
        setCredUsername('');
        setCredPassword('');
        setCredPhone('');
        // Reload list
        const credList = await axios.get(
          `${API_BASE_URL}/api/admin/institution-credentials`,
          { headers: getAuthHeaders() }
        );
        setCredentials(credList.data);
      }
    } catch (err) {
      setCredError(err.response?.data?.message || 'Failed to configure credentials');
    }
  };

  const handleDeleteCredential = async (id) => {
    if (!window.confirm('Are you sure you want to delete these credentials?')) return;
    setCredError('');
    setCredSuccess('');

    try {
      const response = await axios.delete(
        `${API_BASE_URL}/api/admin/institution-credentials/${id}`,
        { headers: getAuthHeaders() }
      );

      if (response.data.success) {
        setCredSuccess('Credentials deleted successfully');
        // Reload list
        const credList = await axios.get(
          `${API_BASE_URL}/api/admin/institution-credentials`,
          { headers: getAuthHeaders() }
        );
        setCredentials(credList.data);
      }
    } catch (err) {
      setCredError('Failed to delete credentials');
    }
  };


  useEffect(() => {
    if (isAuthenticated) {
      if (!loading && !user) {
        const token = localStorage.getItem('auth_token')
        if (!token) {
          localStorage.removeItem('admin_authenticated')
          setIsAuthenticated(false)
        }
      } else if (user) {
        loadDashboardStats()
      }
    }
  }, [user, isAuthenticated, loading])

  const handleAdminLogin = async (e) => {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)

    const result = await login(loginEmail, loginPassword)
    if (result.success) {
      const emailLower = (result.user?.email || '').toLowerCase()
      const isAdminUser =
        result.user?.role === 'admin' ||
        result.user?.role === 'superadmin' ||
        result.user?.isAdmin === true ||
        emailLower === 'patgarlohit818@gmail.com' ||
        emailLower === 'admin@alumniportal.com'

      if (isAdminUser) {
        localStorage.setItem('admin_authenticated', 'true')
        setIsAuthenticated(true)
        setTimeout(() => {
          loadDashboardStats()
        }, 100)
      } else if (result.user?.role === 'instituteadmin') {
        setLoginError('This account has the role "instituteadmin". Please sign in via the Institution Admin Portal (/instituteadmin).')
      } else {
        setLoginError('Access denied: You do not have administrator privileges.')
      }
    } else {
      setLoginError(result.message || 'Invalid admin credentials')
    }
    setLoginLoading(false)
  }


  const loadDashboardStats = async () => {
    try {
      const [usersRes, postsRes, eventsRes, oppsRes, instPostsRes, reportsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/admin/approved-users`, { headers: getAuthHeaders() }),
        axios.get(`${API_BASE_URL}/api/admin/approved-posts`, { headers: getAuthHeaders() }),
        axios.get(`${API_BASE_URL}/api/admin/approved-events`, { headers: getAuthHeaders() }),
        axios.get(`${API_BASE_URL}/api/admin/approved-opportunities`, { headers: getAuthHeaders() }),
        axios.get(`${API_BASE_URL}/api/admin/approved-institution-posts`, { headers: getAuthHeaders() }),
        axios.get(`${API_BASE_URL}/api/reports/stats`, { headers: getAuthHeaders() }),
      ])

      const [pendingUsersRes, pendingPostsRes, pendingEventsRes, pendingOppsRes, pendingInstPostsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/admin/users`, { headers: getAuthHeaders() }),
        axios.get(`${API_BASE_URL}/api/admin/pending-posts`, { headers: getAuthHeaders() }),
        axios.get(`${API_BASE_URL}/api/admin/pending-events`, { headers: getAuthHeaders() }),
        axios.get(`${API_BASE_URL}/api/admin/pending-opportunities`, { headers: getAuthHeaders() }),
        axios.get(`${API_BASE_URL}/api/admin/pending-institution-posts`, { headers: getAuthHeaders() }),
      ])

      setStats({
        totalUsers: usersRes.data.length,
        pendingUsers: pendingUsersRes.data.length,
        totalPosts: postsRes.data.length,
        pendingPosts: pendingPostsRes.data.length,
        totalEvents: eventsRes.data.length,
        pendingEvents: pendingEventsRes.data.length,
        totalOpportunities: oppsRes.data.length,
        pendingOpportunities: pendingOppsRes.data.length,
        totalInstitutionPosts: instPostsRes.data.length,
        pendingInstitutionPosts: pendingInstPostsRes.data.length,
        totalReports: reportsRes.data.total,
        pendingReports: reportsRes.data.pending,
      })

      // Also load detailed statistics if on dashboard
      loadDetailedStatistics()
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const loadDetailedStatistics = async () => {
    setDetailedStatsLoading(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/api/admin/detailed-stats`, { headers: getAuthHeaders() })
      setDetailedStats(response.data)
    } catch (error) {
      console.error('Failed to load detailed stats:', error)
    } finally {
      setDetailedStatsLoading(false)
    }
  }


  const loadUsers = async () => {
    setUsersLoading(true)
    try {
      const [pendingRes, approvedRes, blockedRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/admin/users`, { headers: getAuthHeaders() }).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/api/admin/approved-users`, { headers: getAuthHeaders() }).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/api/admin/blocked-users`, { headers: getAuthHeaders() }).catch(() => ({ data: [] }))
      ])
      const allUsers = [...pendingRes.data, ...approvedRes.data, ...blockedRes.data]
      setUsers(allUsers)
      calculateStatistics(allUsers, posts, events, opportunities)
    } catch (error) {
      console.error('Failed to load users:', error)
      setUsers([])
    } finally {
      setUsersLoading(false)
    }
  }

  const loadPosts = async () => {
    setPostsLoading(true)
    try {
      const [pendingRes, approvedRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/admin/pending-posts`, { headers: getAuthHeaders() }),
        axios.get(`${API_BASE_URL}/api/admin/approved-posts`, { headers: getAuthHeaders() })
      ])
      const allPosts = [...pendingRes.data, ...approvedRes.data]
      setPosts(allPosts)
      calculateStatistics(users, allPosts, events, opportunities)
    } catch (error) {
      console.error('Failed to load posts:', error)
      setPosts([])
    } finally {
      setPostsLoading(false)
    }
  }

  const loadEvents = async () => {
    setEventsLoading(true)
    try {
      const [pendingRes, approvedRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/admin/pending-events`, { headers: getAuthHeaders() }),
        axios.get(`${API_BASE_URL}/api/admin/approved-events`, { headers: getAuthHeaders() })
      ])
      const allEvents = [...pendingRes.data, ...approvedRes.data]
      setEvents(allEvents)
      calculateStatistics(users, posts, allEvents, opportunities)
    } catch (error) {
      console.error('Failed to load events:', error)
      setEvents([])
    } finally {
      setEventsLoading(false)
    }
  }

  const loadOpportunities = async () => {
    setOpportunitiesLoading(true)
    try {
      const [pendingRes, approvedRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/admin/pending-opportunities`, { headers: getAuthHeaders() }),
        axios.get(`${API_BASE_URL}/api/admin/approved-opportunities`, { headers: getAuthHeaders() })
      ])
      const allOpportunities = [...pendingRes.data, ...approvedRes.data]
      setOpportunities(allOpportunities)
      calculateStatistics(users, posts, events, allOpportunities)
    } catch (error) {
      console.error('Failed to load opportunities:', error)
      setOpportunities([])
    } finally {
      setOpportunitiesLoading(false)
    }
  }

  const loadReports = async () => {
    setReportsLoading(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/api/reports?status=all`, { headers: getAuthHeaders() })
      setReports(response.data.reports || response.data || [])
    } catch (error) {
      console.error('Failed to load reports:', error)
      setReports([])
    } finally {
      setReportsLoading(false)
    }
  }

  const loadRsvps = async () => {
    setRsvpsLoading(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/api/admin/rsvps`, { headers: getAuthHeaders() })
      setRsvps(response.data || [])
    } catch (error) {
      console.error('Failed to load RSVPs:', error)
      setRsvps([])
    } finally {
      setRsvpsLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      if (activeTab === 'users') loadUsers()
      if (activeTab === 'posts') loadPosts()
      if (activeTab === 'events') loadEvents()
      if (activeTab === 'opportunities') loadOpportunities()
      if (activeTab === 'reports') loadReports()
      if (activeTab === 'whatsapp') loadUsers() // Load users for WhatsApp tab
      if (activeTab === 'alumniMeet') loadRsvps()
      if (activeTab === 'createSuperAdmin') loadSuperAdmins()
    }
  }, [activeTab, isAuthenticated])

  // Recalculate statistics when data changes
  useEffect(() => {
    if (users.length > 0 || posts.length > 0 || events.length > 0 || opportunities.length > 0) {
      calculateStatistics(users, posts, events, opportunities)
    }
  }, [users, posts, events, opportunities])

  const handleUserAction = async (userId, action) => {
    try {
      await axios.patch(
        `${API_BASE_URL}/api/admin/${action}/${userId}`,
        {},
        { headers: getAuthHeaders() }
      )
      loadUsers()
      loadDashboardStats()
      alert(`User ${action}ed successfully`)
    } catch (error) {
      alert(error.response?.data?.error || `Failed to ${action} user`)
    }
  }

  const handleContentAction = async (id, type, action) => {
    try {
      await axios.put(
        `${API_BASE_URL}/api/admin/${type}/${id}/status`,
        { status: action },
        { headers: getAuthHeaders() }
      )
      if (type === 'posts') loadPosts()
      if (type === 'events') loadEvents()
      if (type === 'opportunities') loadOpportunities()
      loadDashboardStats()
      alert(`Content ${action}ed successfully`)
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update content')
    }
  }

  const handleDeleteContent = async (id, type) => {
    if (!window.confirm(`Are you sure you want to delete this ${type.slice(0, -1)}?`)) return
    try {
      await axios.delete(
        `${API_BASE_URL}/api/admin/${type}/${id}`,
        { headers: getAuthHeaders() }
      )
      if (type === 'posts') loadPosts()
      if (type === 'events') loadEvents()
      if (type === 'opportunities') loadOpportunities()
      loadDashboardStats()
      alert(`${type.slice(0, -1)} deleted successfully`)
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete content')
    }
  }

  const handleReportAction = async (reportId, status) => {
    try {
      await axios.patch(
        `${API_BASE_URL}/api/reports/${reportId}/status`,
        { status },
        { headers: getAuthHeaders() }
      )
      loadReports()
      loadDashboardStats()
      alert('Report status updated successfully')
    } catch (error) {
      alert('Failed to update report')
    }
  }

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null
    if (imagePath.startsWith('http')) return imagePath
    return `${API_BASE_URL}${imagePath.startsWith('/') ? imagePath : '/' + imagePath}`
  }

  // Calculate statistics
  const calculateStatistics = (allUsers, allPosts, allEvents, allOpportunities) => {
    const stats = {
      byYear: {},
      byInstitution: {},
      byCourse: {},
      byCompany: {},
      entrepreneurs: 0,
      higherEducation: 0
    }

    // User statistics
    allUsers.forEach(user => {
      // By year
      if (user.year) {
        stats.byYear[user.year] = (stats.byYear[user.year] || 0) + 1
      }
      // By institution
      if (user.institution) {
        stats.byInstitution[user.institution] = (stats.byInstitution[user.institution] || 0) + 1
      }
      // By course
      if (user.course) {
        stats.byCourse[user.course] = (stats.byCourse[user.course] || 0) + 1
      }
      // Entrepreneurs (check if has entrepreneur company or currentStatus)
      if (user.privateInfo?.currentCompany && user.privateInfo?.currentCompany.toLowerCase().includes('entrepreneur')) {
        stats.entrepreneurs++
      }
      // Higher education (hasMasters or mastersUniversity)
      if (user.privateInfo?.hasMasters || user.privateInfo?.mastersUniversity) {
        stats.higherEducation++
      }
    })

    // Company statistics from opportunities
    allOpportunities.forEach(opp => {
      if (opp.company) {
        stats.byCompany[opp.company] = (stats.byCompany[opp.company] || 0) + 1
      }
    })

    setStatistics(stats)
  }

  // Get unique values for filters
  const getUniqueValues = (data, field) => {
    const values = new Set()
    data.forEach(item => {
      let value = null
      if (item[field]) {
        value = item[field]
      } else if (item.authorId && typeof item.authorId === 'object' && item.authorId[field]) {
        value = item.authorId[field]
      } else if (item.postedBy && typeof item.postedBy === 'object' && item.postedBy[field]) {
        value = item.postedBy[field]
      }
      if (value && value.trim() !== '') {
        values.add(value)
      }
    })
    return Array.from(values).sort()
  }

  // Filter data based on active filters
  const getFilteredData = (data, type) => {
    let filtered = [...data]

    if (type === 'users') {
      if (filters.username) {
        const q = filters.username.toLowerCase()
        filtered = filtered.filter(u => (u.username || '').toLowerCase().includes(q))
      }
      if (filters.status) {
        filtered = filtered.filter(u => (u.status || 'pending') === filters.status)
      }
      if (filters.institution) {
        filtered = filtered.filter(u => u.institution === filters.institution)
      }
      if (filters.course) {
        filtered = filtered.filter(u => u.course === filters.course)
      }
      if (filters.year) {
        filtered = filtered.filter(u => u.year === filters.year)
      }
      if (filters.company) {
        const companyFilter = filters.company.toLowerCase()
        filtered = filtered.filter(u => {
          const currentCompany = u.privateInfo?.currentCompany || ''
          const previousCompanies = u.privateInfo?.previousCompanies || []
          const companyMatch = currentCompany.toLowerCase().includes(companyFilter) ||
            previousCompanies.some(pc => pc.company && pc.company.toLowerCase().includes(companyFilter))
          return companyMatch
        })
      }
    } else if (type === 'posts') {
      if (filters.institution) {
        filtered = filtered.filter(p => {
          const userInstitution = p.authorId?.institution || p.postedBy?.institution
          return userInstitution === filters.institution
        })
      }
      if (filters.course) {
        filtered = filtered.filter(p => {
          const userCourse = p.authorId?.course || p.postedBy?.course
          return userCourse === filters.course
        })
      }
      if (filters.year) {
        filtered = filtered.filter(p => {
          const userYear = p.authorId?.year || p.postedBy?.year
          return userYear === filters.year
        })
      }
    } else if (type === 'events') {
      if (filters.institution) {
        filtered = filtered.filter(e => {
          const userInstitution = e.postedBy?.institution
          return userInstitution === filters.institution
        })
      }
      if (filters.course) {
        filtered = filtered.filter(e => {
          const userCourse = e.postedBy?.course
          return userCourse === filters.course
        })
      }
      if (filters.year) {
        filtered = filtered.filter(e => {
          const userYear = e.postedBy?.year
          return userYear === filters.year
        })
      }
    } else if (type === 'opportunities') {
      if (filters.company) {
        filtered = filtered.filter(o => o.company === filters.company)
      }
      if (filters.institution) {
        filtered = filtered.filter(o => {
          const userInstitution = o.postedBy?.institution
          return userInstitution === filters.institution
        })
      }
      if (filters.course) {
        filtered = filtered.filter(o => {
          const userCourse = o.postedBy?.course
          return userCourse === filters.course
        })
      }
      if (filters.year) {
        filtered = filtered.filter(o => {
          const userYear = o.postedBy?.year
          return userYear === filters.year
        })
      }
    }

    return filtered
  }

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }

  const clearFilters = () => {
    setFilters({
      institution: '',
      course: '',
      year: '',
      company: '',
      username: '',
      status: ''
    })
  }

  const downloadRSVPs = async () => {
    try {
      setRsvpDownloading(true)
      const response = await axios.get(`${API_BASE_URL}/api/admin/rsvps/export`, {
        headers: getAuthHeaders(),
        responseType: 'blob',
      })
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.href = url
      link.setAttribute('download', `alumni_rsvp_${Date.now()}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Failed to download RSVP data', error)
      alert(error.response?.data?.message || 'Failed to download RSVP data')
    } finally {
      setRsvpDownloading(false)
    }
  }

  const buildStudentExportQuery = () => {
    const params = new URLSearchParams()
    if (filters.institution) params.append('institution', filters.institution)
    if (filters.course) params.append('course', filters.course)
    if (filters.year) params.append('year', filters.year)
    if (filters.company) params.append('company', filters.company)
    params.append('status', 'all')
    return params.toString()
  }

  const downloadStudentsCSV = async () => {
    try {
      setStudentsExportLoading(true)
      const response = await axios.get(
        `${API_BASE_URL}/api/admin/students/export/csv?${buildStudentExportQuery()}`,
        {
          headers: getAuthHeaders(),
          responseType: 'blob',
        }
      )
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.href = url
      link.setAttribute('download', `registered_students_${Date.now()}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Failed to download students CSV', error)
      alert(error.response?.data?.message || 'Failed to download students CSV')
    } finally {
      setStudentsExportLoading(false)
    }
  }

  const downloadStudentsPDF = async () => {
    try {
      setStudentsExportLoading(true)
      const response = await axios.get(
        `${API_BASE_URL}/api/admin/students/export/pdf?${buildStudentExportQuery()}`,
        {
          headers: getAuthHeaders(),
          responseType: 'blob',
        }
      )
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.href = url
      link.setAttribute('download', `registered_students_${Date.now()}.pdf`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Failed to download students PDF', error)
      alert(error.response?.data?.message || 'Failed to download students PDF')
    } finally {
      setStudentsExportLoading(false)
    }
  }

  const downloadStudentCSV = async (studentId) => {
    try {
      setStudentsExportLoading(true)
      const response = await axios.get(
        `${API_BASE_URL}/api/admin/students/${studentId}/export/csv`,
        { headers: getAuthHeaders(), responseType: 'blob' }
      )
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.href = url
      link.setAttribute('download', `student_${studentId}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Failed to download student CSV', error)
      alert(error.response?.data?.message || 'Failed to download student CSV')
    } finally {
      setStudentsExportLoading(false)
    }
  }

  const downloadStudentPDF = async (studentId) => {
    try {
      setStudentsExportLoading(true)
      const response = await axios.get(
        `${API_BASE_URL}/api/admin/students/${studentId}/export/pdf`,
        { headers: getAuthHeaders(), responseType: 'blob' }
      )
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.href = url
      link.setAttribute('download', `student_${studentId}.pdf`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Failed to download student PDF', error)
      alert(error.response?.data?.message || 'Failed to download student PDF')
    } finally {
      setStudentsExportLoading(false)
    }
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <SuperAdminLogin
        onSuccess={() => {
          setIsAuthenticated(true)
          setTimeout(() => {
            loadDashboardStats()
          }, 100)
        }}
      />
    )
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_authenticated')
    logout()
    setIsAuthenticated(false)
  }

  const downloadCSV = (data, filename) => {
    if (!data || data.length === 0) return

    // Get headers from the first object
    // Flatting nested objects for CSV
    const flattenObject = (obj, prefix = '') => {
      let result = {}
      for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key]) && !(obj[key] instanceof Date)) {
          const flatChild = flattenObject(obj[key], `${prefix}${key}_`)
          result = { ...result, ...flatChild }
        } else if (Array.isArray(obj[key])) {
          result[`${prefix}${key}`] = JSON.stringify(obj[key])
        } else {
          result[`${prefix}${key}`] = obj[key]
        }
      }
      return result
    }

    const flattenedData = data.map(item => flattenObject(item))

    // Get all unique headers from all objects
    const allHeadersSet = new Set()
    flattenedData.forEach(item => Object.keys(item).forEach(key => allHeadersSet.add(key)))
    const headers = Array.from(allHeadersSet)

    const csvContent = [
      headers.join(','),
      ...flattenedData.map(row =>
        headers.map(header => {
          const value = row[header] === undefined || row[header] === null ? '' : row[header]
          const stringValue = String(value).replace(/"/g, '""')
          return `"${stringValue}"`
        }).join(',')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="admin-pro-layout">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div className="admin-pro-backdrop" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* LEFT SIDEBAR */}
      <aside className={`admin-pro-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-logo-wrap">
            <div className="brand-emblem-badge">
              <svg viewBox="0 0 24 24" width="22" height="22" stroke="#ffffff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                <path d="M6 12v5c3 3 9 3 12 0v-5"/>
              </svg>
            </div>
            <div className="brand-text">
              <span className="brand-title">Alumni Portal</span>
              <span className="brand-badge">Super Admin</span>
            </div>
          </div>
          <button 
            type="button"
            className="mobile-close-btn" 
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close Navigation Menu"
          >
            ✕
          </button>
        </div>

        {/* Navigation list */}
        <nav className="admin-sidebar-nav">
          {['OVERVIEW', 'CORE MODULES', 'ENGAGEMENT & CONFIG', 'ADMINISTRATION'].map((category) => {
            const categoryModules = MODULE_DEFINITIONS.filter(
              (m) => m.category === category && isModuleAllowed(m.id)
            )
            if (categoryModules.length === 0) return null

            return (
              <div key={category} className="admin-nav-group-section">
                <div className="admin-nav-group-label">{category}</div>
                {categoryModules.map((item) => {
                  let badgeCount = null
                  let badgeDanger = false
                  if (item.id === 'users' && stats.pendingUsers > 0) badgeCount = stats.pendingUsers
                  if (item.id === 'posts' && stats.pendingPosts > 0) badgeCount = stats.pendingPosts
                  if (item.id === 'events' && stats.pendingEvents > 0) badgeCount = stats.pendingEvents
                  if (item.id === 'opportunities' && stats.pendingOpportunities > 0) badgeCount = stats.pendingOpportunities
                  if (item.id === 'reports' && stats.pendingReports > 0) {
                    badgeCount = stats.pendingReports
                    badgeDanger = true
                  }

                  const getModuleIcon = (id) => {
                    switch (id) {
                      case 'dashboard':
                        return (
                          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                            <rect x="3" y="3" width="7" height="9" rx="1"/>
                            <rect x="14" y="3" width="7" height="5" rx="1"/>
                            <rect x="14" y="12" width="7" height="9" rx="1"/>
                            <rect x="3" y="16" width="7" height="5" rx="1"/>
                          </svg>
                        )
                      case 'users':
                        return (
                          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                          </svg>
                        )
                      case 'posts':
                        return (
                          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                          </svg>
                        )
                      case 'events':
                        return (
                          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                          </svg>
                        )
                      case 'opportunities':
                        return (
                          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                          </svg>
                        )
                      case 'reports':
                        return (
                          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                            <line x1="4" y1="22" x2="4" y2="15"/>
                          </svg>
                        )
                      case 'alumniMeet':
                        return (
                          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                            <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                            <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                          </svg>
                        )
                      case 'whatsapp':
                        return (
                          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                          </svg>
                        )
                      case 'credentials':
                        return (
                          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                            <path d="M21 2l-2 2m-1.5 1.5L14 9l-1.5-1.5-4 4 1.5 1.5L9 14l-5 5H2v-2l5-5 1.5 1.5 4-4-1.5-1.5 3.5-3.5z"/>
                            <circle cx="17.5" cy="6.5" r="2.5"/>
                          </svg>
                        )
                      case 'createSuperAdmin':
                        return (
                          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                            <path d="M12 8v4"/>
                            <path d="M12 16h.01"/>
                          </svg>
                        )
                      default:
                        return (
                          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                            <circle cx="12" cy="12" r="10"/>
                          </svg>
                        )
                    }
                  }

                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`admin-nav-item ${activeTab === item.id ? 'active' : ''}`}
                      onClick={() => {
                        setActiveTab(item.id)
                        setMobileMenuOpen(false)
                      }}
                      title={item.label}
                    >
                      <span className="admin-nav-icon">{getModuleIcon(item.id)}</span>
                      <span className="admin-nav-label">{item.label}</span>
                      {badgeCount !== null && (
                        <span className={`admin-nav-badge ${badgeDanger ? 'danger' : ''}`}>
                          {badgeCount}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </nav>

        {/* Sidebar Footer with Super Admin Profile and Logout */}
        <div className="sidebar-footer">
          <div className="sidebar-user-card">
            <div className="user-avatar-badge">SA</div>
            <div className="user-details">
              <span className="user-name">Super Admin</span>
              <span className="user-role" title={user?.email || 'patgarlohit818@gmail.com'}>
                {user?.email || 'patgarlohit818@gmail.com'}
              </span>
            </div>
          </div>
          <button type="button" className="admin-nav-item admin-logout-btn" onClick={handleLogout}>
            <span className="admin-nav-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </span>
            <span className="admin-nav-label">Logout</span>
          </button>
        </div>
      </aside>

      {/* MAIN VIEW AREA */}
      <div className="admin-pro-main">
        {/* Sleek Topbar */}
        <header className="admin-pro-topbar">
          <div className="topbar-left">
            <button 
              type="button"
              className="mobile-hamburger-btn" 
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open Navigation Menu"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none">
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <div className="breadcrumb-area">
              <span className="breadcrumb-root">Super Admin</span>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-current">
                {MODULE_DEFINITIONS.find((m) => m.id === activeTab)?.label || 'Dashboard Overview'}
              </span>
            </div>
          </div>

          <div className="topbar-right">
            <span className="live-status-pill">
              <span className="status-dot"></span> Online
            </span>
            <button 
              type="button"
              className="topbar-action-btn"
              onClick={loadDashboardStats}
              title="Refresh Data"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                <polyline points="23 4 23 10 17 10"/>
                <polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              Refresh
            </button>
            <button 
              type="button"
              className="topbar-action-btn portal-btn"
              onClick={() => navigate('/')}
            >
              Public Site ↗
            </button>
          </div>
        </header>

        {/* Top KPI Cards (Featured when on Dashboard) */}
        {activeTab === 'dashboard' && (
          <div className="dashboard-kpi-strip">
            <div className="kpi-card" onClick={() => setActiveTab('users')}>
              <div className="kpi-icon-wrap user-kpi">
                <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div className="kpi-body">
                <span className="kpi-title">Total Users</span>
                <span className="kpi-value">{stats.totalUsers || 0}</span>
              </div>
              {stats.pendingUsers > 0 && (
                <span className="kpi-badge warning">{stats.pendingUsers} pending</span>
              )}
            </div>

            <div className="kpi-card" onClick={() => setActiveTab('posts')}>
              <div className="kpi-icon-wrap post-kpi">
                <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              </div>
              <div className="kpi-body">
                <span className="kpi-title">Total Posts</span>
                <span className="kpi-value">{stats.totalPosts || 0}</span>
              </div>
              {stats.pendingPosts > 0 && (
                <span className="kpi-badge warning">{stats.pendingPosts} pending</span>
              )}
            </div>

            <div className="kpi-card" onClick={() => setActiveTab('events')}>
              <div className="kpi-icon-wrap event-kpi">
                <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <div className="kpi-body">
                <span className="kpi-title">Events</span>
                <span className="kpi-value">{stats.totalEvents || 0}</span>
              </div>
              {stats.pendingEvents > 0 && (
                <span className="kpi-badge warning">{stats.pendingEvents} pending</span>
              )}
            </div>

            <div className="kpi-card" onClick={() => setActiveTab('opportunities')}>
              <div className="kpi-icon-wrap opp-kpi">
                <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
              </div>
              <div className="kpi-body">
                <span className="kpi-title">Opportunities</span>
                <span className="kpi-value">{stats.totalOpportunities || 0}</span>
              </div>
              {stats.pendingOpportunities > 0 && (
                <span className="kpi-badge warning">{stats.pendingOpportunities} pending</span>
              )}
            </div>

            <div className="kpi-card" onClick={() => setActiveTab('reports')}>
              <div className="kpi-icon-wrap report-kpi">
                <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
              </div>
              <div className="kpi-body">
                <span className="kpi-title">Reports</span>
                <span className="kpi-value">{stats.totalReports || 0}</span>
              </div>
              {stats.pendingReports > 0 && (
                <span className="kpi-badge danger">{stats.pendingReports} pending</span>
              )}
            </div>
          </div>
        )}

        <div className="admin-content-full">
        {activeTab === 'dashboard' && (
          <div className="dashboard-view-full">
            <h2>Overview</h2>
            <div className="dashboard-grid-full">
              <div className="dashboard-card-full">
                <h3>Quick Actions</h3>
                <div className="quick-actions-full">
                  <button onClick={() => navigate('/institutionadmin')} className="action-btn-full">
                    🏫 Post to Institutions
                  </button>
              <button onClick={downloadRSVPs} className="action-btn-full" disabled={rsvpDownloading}>
                📥 {rsvpDownloading ? 'Downloading RSVPs...' : 'Download Alumni Meet RSVPs'}
              </button>
                  <div className="action-info">
                    <span>Review Pending Users: {stats.pendingUsers || 0}</span>
                  </div>
                  <div className="action-info">
                    <span>Review Pending Posts: {stats.pendingPosts || 0}</span>
                  </div>
                  <div className="action-info">
                    <span>Review Pending Events: {stats.pendingEvents || 0}</span>
                  </div>
                  <div className="action-info">
                    <span>Review Pending Opportunities: {stats.pendingOpportunities || 0}</span>
                  </div>
                  <div className="action-info">
                    <span>Review Reports: {stats.pendingReports || 0}</span>
                  </div>
                </div>
              </div>

              {/* Statistics Cards */}
              <div className="dashboard-card-full">
                <h3>Statistics</h3>
                {/* Use detailedStats if available, otherwise fallback to local statistics */}
                {detailedStats ? (
                  <>
                    <div className="stat-item">
                      <h4>Total Institutions</h4>
                      <div className="stat-big-number">{detailedStats.counts.institutions}</div>
                    </div>

                    <div className="stat-item">
                      <h4>Users by Institution (Top 5)</h4>
                      <div className="stat-list">
                        {Object.entries(detailedStats.distribution.institution)
                          .map(([inst, count]) => (
                            <div key={inst} className="stat-row">
                              <span title={inst}>{inst.substring(0, 20)}{inst.length > 20 ? '...' : ''}:</span>
                              <strong>{count}</strong>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div className="stat-item">
                      <h4>Users by Year</h4>
                      <div className="stat-list">
                        {Object.entries(detailedStats.distribution.year)
                          .map(([year, count]) => (
                            <div key={year} className="stat-row">
                              <span>{year}:</span>
                              <strong>{count}</strong>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div className="stat-item">
                      <h4>Career Insights</h4>
                      <div className="stat-list">
                        <div className="stat-row">
                          <span>Entrepreneurs:</span>
                          <strong>{detailedStats.career.entrepreneurs}</strong>
                        </div>
                        <div className="stat-row">
                          <span>Higher Ed:</span>
                          <strong>{detailedStats.career.higherEducation}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="stat-item" style={{ gridColumn: 'span 2' }}>
                      <h4>Registration Trend (Last 30 Days)</h4>
                      <div style={{ height: '100px', display: 'flex', alignItems: 'flex-end', gap: '4px', padding: '10px 0' }}>
                        {detailedStats.registrationsTrend.map(day => (
                          <div
                            key={day._id}
                            title={`${day._id}: ${day.count} registrations`}
                            style={{
                              flex: 1,
                              background: '#0a66c2',
                              height: `${Math.min(100, (day.count / (Math.max(...detailedStats.registrationsTrend.map(d => d.count)) || 1)) * 100)}%`,
                              borderRadius: '2px 2px 0 0'
                            }}
                          ></div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="statistics-grid">
                    <div className="stat-item">
                      <h4>By Year</h4>
                      <div className="stat-list">
                        {Object.entries(statistics.byYear)
                          .sort((a, b) => b[0].localeCompare(a[0]))
                          .slice(0, 5)
                          .map(([year, count]) => (
                            <div key={year} className="stat-row">
                              <span>{year}:</span>
                              <strong>{count}</strong>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div className="stat-item">
                      <h4>By Institution</h4>
                      <div className="stat-list">
                        {Object.entries(statistics.byInstitution)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 5)
                          .map(([institution, count]) => (
                            <div key={institution} className="stat-row">
                              <span>{institution.substring(0, 30)}...</span>
                              <strong>{count}</strong>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div className="stat-item">
                      <h4>Entrepreneurs</h4>
                      <div className="stat-big-number">{statistics.entrepreneurs}</div>
                    </div>

                    <div className="stat-item">
                      <h4>Higher Education</h4>
                      <div className="stat-big-number">{statistics.higherEducation}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}


        {activeTab === 'users' && (
          <div className="admin-section-full">
            <h2>All Users</h2>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <button
                onClick={downloadStudentsCSV}
                className="action-btn-full"
                disabled={studentsExportLoading}
              >
                📥 {studentsExportLoading ? 'Exporting...' : 'Export Excel (CSV)'}
              </button>
              <button
                onClick={downloadStudentsPDF}
                className="action-btn-full"
                disabled={studentsExportLoading}
              >
                📄 {studentsExportLoading ? 'Exporting...' : 'Export PDF'}
              </button>
            </div>

            {/* Filters */}
            <div className="admin-filters">
              <input
                type="text"
                value={filters.username}
                onChange={(e) => handleFilterChange('username', e.target.value)}
                placeholder="Filter by Username"
                className="filter-input"
              />

              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="filter-select"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="blocked">Blocked</option>
              </select>

              <select
                value={filters.institution}
                onChange={(e) => handleFilterChange('institution', e.target.value)}
                className="filter-select"
              >
                <option value="">All Institutions</option>
                {getUniqueValues(users, 'institution').map(inst => (
                  <option key={inst} value={inst}>{inst}</option>
                ))}
              </select>

              <select
                value={filters.course}
                onChange={(e) => handleFilterChange('course', e.target.value)}
                className="filter-select"
              >
                <option value="">All Courses</option>
                {getUniqueValues(users, 'course').map(course => (
                  <option key={course} value={course}>{course}</option>
                ))}
              </select>

              <select
                value={filters.year}
                onChange={(e) => handleFilterChange('year', e.target.value)}
                className="filter-select"
              >
                <option value="">All Years</option>
                {getUniqueValues(users, 'year').map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>

              <input
                type="text"
                value={filters.company}
                onChange={(e) => handleFilterChange('company', e.target.value)}
                placeholder="Filter by Company"
                className="filter-input"
              />

              <button onClick={clearFilters} className="clear-filters-btn">Clear Filters</button>
            </div>

            {usersLoading ? (
              <div className="loading">Loading users...</div>
            ) : getFilteredData(users, 'users').length === 0 ? (
              <div className="empty-state">No users found</div>
            ) : (
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Photo</th>
                      <th>Name</th>
                      <th>Institution</th>
                      <th>Course</th>
                      <th>Year</th>
                      <th>Headline</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredData(users, 'users').map((user) => (
                      <tr key={user._id}>
                        <td>
                          <div className="user-avatar-small">
                            {user.profileImage ? (
                              <SasImage src={getImageUrl(user.profileImage)} alt={user.name} />
                            ) : (
                              <span>{user.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                            )}
                          </div>
                        </td>
                        <td>{user.name || 'N/A'}</td>
                        <td>{user.institution || '-'}</td>
                        <td>{user.course || '-'}</td>
                        <td>{user.year || '-'}</td>
                        <td>{user.headline || '-'}</td>
                        <td>
                          <span className={`status-badge ${user.status}`}>
                            {user.status || 'pending'}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            {user.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleUserAction(user._id, 'approve')}
                                  className="btn-approve"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleUserAction(user._id, 'reject')}
                                  className="btn-reject"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {user.status === 'approved' && (
                              <button
                                onClick={() => handleUserAction(user._id, 'block')}
                                className="btn-block"
                              >
                                Block
                              </button>
                            )}
                            {user.status === 'blocked' && (
                              <button
                                onClick={() => handleUserAction(user._id, 'unblock')}
                                className="btn-approve"
                              >
                                Unblock
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => downloadStudentCSV(user._id)}
                              className="btn-view"
                              disabled={studentsExportLoading}
                            >
                              Export Excel
                            </button>
                            <button
                              type="button"
                              onClick={() => downloadStudentPDF(user._id)}
                              className="btn-view"
                              disabled={studentsExportLoading}
                            >
                              Export PDF
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'posts' && (
          <div className="admin-section-full">
            <h2>All Posts</h2>

            {/* Filters */}
            <div className="admin-filters">
              <select
                value={filters.institution}
                onChange={(e) => handleFilterChange('institution', e.target.value)}
                className="filter-select"
              >
                <option value="">All Institutions</option>
                {getUniqueValues(posts, 'institution').map(inst => (
                  <option key={inst} value={inst}>{inst}</option>
                ))}
              </select>

              <select
                value={filters.course}
                onChange={(e) => handleFilterChange('course', e.target.value)}
                className="filter-select"
              >
                <option value="">All Courses</option>
                {getUniqueValues(posts, 'course').map(course => (
                  <option key={course} value={course}>{course}</option>
                ))}
              </select>

              <select
                value={filters.year}
                onChange={(e) => handleFilterChange('year', e.target.value)}
                className="filter-select"
              >
                <option value="">All Years</option>
                {getUniqueValues(posts, 'year').map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>

              <button onClick={clearFilters} className="clear-filters-btn">Clear Filters</button>
            </div>

            {postsLoading ? (
              <div className="loading">Loading posts...</div>
            ) : getFilteredData(posts, 'posts').length === 0 ? (
              <div className="empty-state">No posts found</div>
            ) : (
              <div className="content-list">
                {getFilteredData(posts, 'posts').map((post) => (
                  <div key={post._id} className="content-item">
                    <div className="content-header">
                      <h3>{post.title || 'Untitled Post'}</h3>
                      <span className={`status-badge ${post.status || 'pending'}`}>
                        {post.status || 'pending'}
                      </span>
                    </div>
                    <p>{post.content || post.description || 'No content'}</p>
                    {post.imageUrl && (
                      <img
                        src={`${API_BASE_URL}${post.imageUrl}`}
                        alt={post.title}
                        className="content-image"
                      />
                    )}
                    <div className="content-meta">
                      <span>
                        <strong>Posted by:</strong> {post.authorId?.name || post.postedBy?.name || 'Unknown'}
                        {post.authorId?.username ? ` (@${post.authorId.username})` : post.postedBy?.username ? ` (@${post.postedBy.username})` : ''}
                      </span>
                      <span>
                        <strong>Institution/Course/Year:</strong> {post.authorId?.institution || post.postedBy?.institution || 'N/A'} • {post.authorId?.course || post.postedBy?.course || 'N/A'} • {post.authorId?.year || post.postedBy?.year || 'N/A'}
                      </span>
                      <span><strong>Headline:</strong> {post.authorId?.headline || post.postedBy?.headline || '-'}</span>
                      <span><strong>Phone:</strong> {post.authorId?.phone || post.postedBy?.phone || '-'}</span>
                      <span>Created: {new Date(post.createdAt).toLocaleDateString()}</span>
                      {post.likes && <span>Likes: {post.likes.length || 0}</span>}
                    </div>
                    <div className="content-actions">
                      {post.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleContentAction(post._id, 'posts', 'approved')}
                            className="btn-approve"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleContentAction(post._id, 'posts', 'rejected')}
                            className="btn-reject"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {post.status === 'approved' && (
                        <button
                          onClick={() => handleContentAction(post._id, 'posts', 'rejected')}
                          className="btn-reject"
                        >
                          Reject
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteContent(post._id, 'posts')}
                        className="btn-delete"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'events' && (
          <div className="admin-section-full">
            <h2>All Events</h2>

            {/* Filters */}
            <div className="admin-filters">
              <select
                value={filters.institution}
                onChange={(e) => handleFilterChange('institution', e.target.value)}
                className="filter-select"
              >
                <option value="">All Institutions</option>
                {getUniqueValues(events, 'institution').map(inst => (
                  <option key={inst} value={inst}>{inst}</option>
                ))}
              </select>

              <select
                value={filters.course}
                onChange={(e) => handleFilterChange('course', e.target.value)}
                className="filter-select"
              >
                <option value="">All Courses</option>
                {getUniqueValues(events, 'course').map(course => (
                  <option key={course} value={course}>{course}</option>
                ))}
              </select>

              <select
                value={filters.year}
                onChange={(e) => handleFilterChange('year', e.target.value)}
                className="filter-select"
              >
                <option value="">All Years</option>
                {getUniqueValues(events, 'year').map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>

              <button onClick={clearFilters} className="clear-filters-btn">Clear Filters</button>
            </div>

            {eventsLoading ? (
              <div className="loading">Loading events...</div>
            ) : getFilteredData(events, 'events').length === 0 ? (
              <div className="empty-state">No events found</div>
            ) : (
              <div className="content-list">
                {getFilteredData(events, 'events').map((event) => (
                  <div key={event._id} className="content-item">
                    <div className="content-header">
                      <h3>{event.title || 'Untitled Event'}</h3>
                      <span className={`status-badge ${event.status || 'pending'}`}>
                        {event.status || 'pending'}
                      </span>
                    </div>
                    <p>{event.description || event.content || 'No description'}</p>
                    {event.imageUrl && (
                      <img
                        src={`${API_BASE_URL}${event.imageUrl}`}
                        alt={event.title}
                        className="content-image"
                      />
                    )}
                    <div className="content-meta">
                      <span>
                        <strong>Posted by:</strong> {event.postedBy?.name || 'Unknown'}
                        {event.postedBy?.username ? ` (@${event.postedBy.username})` : ''}
                      </span>
                      <span>
                        <strong>Institution/Course/Year:</strong> {event.postedBy?.institution || 'N/A'} • {event.postedBy?.course || 'N/A'} • {event.postedBy?.year || 'N/A'}
                      </span>
                      <span><strong>Headline:</strong> {event.postedBy?.headline || '-'}</span>
                      <span><strong>Phone:</strong> {event.postedBy?.phone || '-'}</span>
                      <span>Date: {event.date || new Date(event.createdAt).toLocaleDateString()}</span>
                      <span>Location: {event.location || 'N/A'}</span>
                      {event.likes && <span>Likes: {event.likes.length || 0}</span>}
                    </div>
                    <div className="content-actions">
                      {event.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleContentAction(event._id, 'events', 'approved')}
                            className="btn-approve"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleContentAction(event._id, 'events', 'rejected')}
                            className="btn-reject"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {event.status === 'approved' && (
                        <button
                          onClick={() => handleContentAction(event._id, 'events', 'rejected')}
                          className="btn-reject"
                        >
                          Reject
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteContent(event._id, 'events')}
                        className="btn-delete"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'opportunities' && (
          <div className="admin-section-full">
            <h2>All Opportunities</h2>

            {/* Filters */}
            <div className="admin-filters">
              <select
                value={filters.company}
                onChange={(e) => handleFilterChange('company', e.target.value)}
                className="filter-select"
              >
                <option value="">All Companies</option>
                {getUniqueValues(opportunities, 'company').map(company => (
                  <option key={company} value={company}>{company}</option>
                ))}
              </select>

              <select
                value={filters.institution}
                onChange={(e) => handleFilterChange('institution', e.target.value)}
                className="filter-select"
              >
                <option value="">All Institutions</option>
                {getUniqueValues(opportunities, 'institution').map(inst => (
                  <option key={inst} value={inst}>{inst}</option>
                ))}
              </select>

              <select
                value={filters.course}
                onChange={(e) => handleFilterChange('course', e.target.value)}
                className="filter-select"
              >
                <option value="">All Courses</option>
                {getUniqueValues(opportunities, 'course').map(course => (
                  <option key={course} value={course}>{course}</option>
                ))}
              </select>

              <select
                value={filters.year}
                onChange={(e) => handleFilterChange('year', e.target.value)}
                className="filter-select"
              >
                <option value="">All Years</option>
                {getUniqueValues(opportunities, 'year').map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>

              <button onClick={clearFilters} className="clear-filters-btn">Clear Filters</button>
            </div>

            {opportunitiesLoading ? (
              <div className="loading">Loading opportunities...</div>
            ) : getFilteredData(opportunities, 'opportunities').length === 0 ? (
              <div className="empty-state">No opportunities found</div>
            ) : (
              <div className="content-list">
                {getFilteredData(opportunities, 'opportunities').map((opp) => (
                  <div key={opp._id} className="content-item">
                    <div className="content-header">
                      <h3>{opp.title || 'Untitled Opportunity'}</h3>
                      <span className={`status-badge ${opp.status || 'pending'}`}>
                        {opp.status || 'pending'}
                      </span>
                    </div>
                    <p>{opp.description || opp.content || 'No description'}</p>
                    {opp.imageUrl && (
                      <img
                        src={`${API_BASE_URL}${opp.imageUrl}`}
                        alt={opp.title}
                        className="content-image"
                      />
                    )}
                    <div className="content-meta">
                      <span><strong>Company:</strong> {opp.company || 'N/A'}</span>
                      <span>
                        <strong>Posted by:</strong> {opp.postedBy?.name || 'Unknown'}
                        {opp.postedBy?.username ? ` (@${opp.postedBy.username})` : ''}
                      </span>
                      <span>
                        <strong>Institution/Course/Year:</strong> {opp.postedBy?.institution || 'N/A'} • {opp.postedBy?.course || 'N/A'} • {opp.postedBy?.year || 'N/A'}
                      </span>
                      <span><strong>Headline:</strong> {opp.postedBy?.headline || '-'}</span>
                      <span><strong>Phone:</strong> {opp.postedBy?.phone || '-'}</span>
                      <span>Type: {opp.type || 'Full-time'}</span>
                      {opp.applyLink && <span>🔗 <a href={opp.applyLink} target="_blank" rel="noopener noreferrer">Apply Link</a></span>}
                      {opp.likes && <span>Likes: {opp.likes.length || 0}</span>}
                    </div>
                    <div className="content-actions">
                      {opp.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleContentAction(opp._id, 'opportunities', 'approved')}
                            className="btn-approve"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleContentAction(opp._id, 'opportunities', 'rejected')}
                            className="btn-reject"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {opp.status === 'approved' && (
                        <button
                          onClick={() => handleContentAction(opp._id, 'opportunities', 'rejected')}
                          className="btn-reject"
                        >
                          Reject
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteContent(opp._id, 'opportunities')}
                        className="btn-delete"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="admin-section-full">
            <h2>All Reports</h2>
            {reportsLoading ? (
              <div className="loading">Loading reports...</div>
            ) : reports.length === 0 ? (
              <div className="empty-state">No reports found</div>
            ) : (
              <div className="reports-list">
                {reports.map((report) => (
                  <div key={report._id} className="report-item">
                    <div className="report-header">
                      <div>
                        <strong>Type:</strong> {report.reportedItemType || 'Unknown'}
                        {' | '}
                        <strong>Reason:</strong> {report.reason || 'No reason provided'}
                      </div>
                      <span className={`status-badge ${report.status || 'pending'}`}>
                        {report.status || 'pending'}
                      </span>
                    </div>
                    <p><strong>Description:</strong> {report.description || 'No description'}</p>
                    <div className="report-meta">
                      <span>Reported by: {report.reporterId?.name || 'Unknown User'}</span>
                      <span>Date: {report.createdAt ? new Date(report.createdAt).toLocaleDateString() : 'N/A'}</span>
                      {report.reviewedBy && (
                        <span>Reviewed by: {report.reviewedBy?.name || 'Admin'}</span>
                      )}
                    </div>
                    {report.reportedItem && (
                      <div className="reported-item">
                        <strong>Reported Content:</strong>
                        <p>{report.reportedItem.title || report.reportedItem.content || 'Content not available'}</p>
                        {report.reportedItem.authorId && (
                          <p>Author: {report.reportedItem.authorId.name || 'Unknown'}</p>
                        )}
                        {report.reportedItem.postedBy && (
                          <p>Posted by: {report.reportedItem.postedBy.name || 'Unknown'}</p>
                        )}
                      </div>
                    )}
                    <div className="content-actions">
                      {report.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleReportAction(report._id, 'reviewed')}
                            className="btn-approve"
                          >
                            Mark Reviewed
                          </button>
                          <button
                            onClick={() => handleReportAction(report._id, 'resolved')}
                            className="btn-approve"
                          >
                            Resolve
                          </button>
                          <button
                            onClick={() => handleReportAction(report._id, 'dismissed')}
                            className="btn-reject"
                          >
                            Dismiss
                          </button>
                        </>
                      )}
                      {report.status === 'reviewed' && (
                        <>
                          <button
                            onClick={() => handleReportAction(report._id, 'resolved')}
                            className="btn-approve"
                          >
                            Resolve
                          </button>
                          <button
                            onClick={() => handleReportAction(report._id, 'dismissed')}
                            className="btn-reject"
                          >
                            Dismiss
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'alumniMeet' && (
          <div className="admin-section-full">
            <h2>Alumni Meet Registrations</h2>
            <div style={{ marginBottom: '16px' }}>
              <button onClick={downloadRSVPs} className="action-btn-full" disabled={rsvpDownloading}>
                📥 {rsvpDownloading ? 'Downloading RSVPs...' : 'Download RSVPs (Excel/CSV)'}
              </button>
            </div>
            {rsvpsLoading ? (
              <div className="loading">Loading registrations...</div>
            ) : rsvps.length === 0 ? (
              <div className="empty-state">No registrations yet</div>
            ) : (
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Full Name</th>
                      <th>Year</th>
                      <th>Course / Dept</th>
                      <th>Organization</th>
                      <th>Designation</th>
                      <th>City</th>
                      <th>Email</th>
                      <th>Contact</th>
                      <th>Attending</th>
                      <th>Family</th>
                      <th>Adults</th>
                      <th>Kids</th>
                      <th>Submitted At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rsvps.map((r) => (
                      <tr key={r._id}>
                        <td>{r.fullName}</td>
                        <td>{r.yearOfGraduation || '-'}</td>
                        <td>{r.courseDept || '-'}</td>
                        <td>{r.organization || '-'}</td>
                        <td>{r.designation || '-'}</td>
                        <td>{r.city || '-'}</td>
                        <td>{r.email}</td>
                        <td>{r.contactNumber || '-'}</td>
                        <td>{r.attending || '-'}</td>
                        <td>{r.accompaniedByFamily || '-'}</td>
                        <td>{r.adults || '-'}</td>
                        <td>{r.kids || '-'}</td>
                        <td>{r.createdAt ? new Date(r.createdAt).toLocaleString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'whatsapp' && (
          <div className="admin-section-full">
            <h2>WhatsApp Messages to Users</h2>
            {usersLoading ? (
              <div className="loading">Loading users...</div>
            ) : users.length === 0 ? (
              <div className="empty-state">No users found</div>
            ) : (
              <div className="whatsapp-users-list">
                <div className="whatsapp-header">
                  <p>Total Users: {users.length}</p>
                </div>
                <div className="users-grid">
                  {users.map((user) => (
                    <div key={user._id} className="whatsapp-user-card">
                      <div className="user-avatar-small">
                        {user.profileImage ? (
                          <SasImage src={getImageUrl(user.profileImage)} alt={user.name} />
                        ) : (
                          <span>{user.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                        )}
                      </div>
                      <div className="user-name">{user.name || 'N/A'}</div>
                      {user.phone && (
                        <a
                          href={`https://wa.me/${user.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="whatsapp-link"
                        >
                          💬 Message on WhatsApp
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'credentials' && (
          <div className="admin-section-full">
            <h2>Institution Credentials Management</h2>
            <p className="section-desc">Configure username and password for each college portal</p>
            
            {credError && <div className="error-message" style={{ background: '#f8d7da', color: '#721c24', padding: '12px', borderRadius: '4px', margin: '15px 0' }}>{credError}</div>}
            {credSuccess && <div className="success-message" style={{ background: '#d4edda', color: '#155724', padding: '12px', borderRadius: '4px', margin: '15px 0', fontWeight: 'bold' }}>{credSuccess}</div>}

            <div className="credentials-container" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px', marginTop: '20px' }}>
              {/* Form Block */}
              <div className="credentials-form-card" style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Configure Credentials</h3>
                <div style={{ marginBottom: '15px', padding: '10px 12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '13px', color: '#1e40af' }}>
                  <strong>Assigned Role:</strong> <code>instituteadmin</code> (strictly separate from <code>admin</code>).
                </div>
                <form onSubmit={handleCreateCredential}>
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Select Institution</label>
                    <select
                      value={credCollege}
                      onChange={(e) => setCredCollege(e.target.value)}
                      required
                      style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', background: '#fff' }}
                    >
                      <option value="">-- Choose Institution --</option>
                      {institutions.map((inst, index) => (
                        <option key={index} value={inst.name}>{inst.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Username / Email</label>
                    <input
                      type="text"
                      placeholder="Enter username"
                      value={credUsername}
                      onChange={(e) => setCredUsername(e.target.value)}
                      required
                      style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Password</label>
                    <input
                      type="password"
                      placeholder="Enter password"
                      value={credPassword}
                      onChange={(e) => setCredPassword(e.target.value)}
                      required
                      style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                      Phone Number (for Login OTP) <span style={{ color: '#e11d48' }}>*</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 9876543210 (10 digits)"
                      value={credPhone}
                      onChange={(e) => setCredPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      required
                      style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', boxSizing: 'border-box' }}
                    />
                    <small style={{ color: '#64748b', fontSize: '12px' }}>
                      An OTP will be sent to this phone number via SMS on every login attempt.
                    </small>
                  </div>
                  <button type="submit" className="action-btn-full" style={{ width: '100%', padding: '12px', background: '#0a66c2', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>
                    Save Credentials
                  </button>
                </form>
              </div>

              {/* List Block */}
              <div className="credentials-list-card" style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Configured Institution Credentials</h3>
                {credentialsLoading ? (
                  <div className="loading" style={{ padding: '20px 0', textAlign: 'center' }}>Loading credentials...</div>
                ) : credentials.length === 0 ? (
                  <div className="empty-state" style={{ padding: '40px 0', textAlign: 'center', color: '#666' }}>No credentials configured yet.</div>
                ) : (
                  <div className="table-responsive" style={{ marginTop: '15px', overflowX: 'auto' }}>
                    <table className="alumni-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
                          <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Institution</th>
                          <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Username</th>
                          <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>OTP Mobile</th>
                          <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Role</th>
                          <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Configured Date</th>
                          <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {credentials.map((cred) => (
                          <tr key={cred._id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '12px', fontWeight: '500' }}>{cred.institution}</td>
                            <td style={{ padding: '12px' }}>{cred.username}</td>
                            <td style={{ padding: '12px' }}>
                              {cred.phone ? (
                                <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>{cred.phone}</code>
                              ) : (
                                <span style={{ color: '#94a3b8', fontSize: '12px' }}>None</span>
                              )}
                            </td>
                            <td style={{ padding: '12px' }}>
                              <span style={{
                                display: 'inline-block',
                                padding: '3px 8px',
                                background: '#e0f2fe',
                                color: '#0369a1',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: '600'
                              }}>
                                {cred.role || 'instituteadmin'}
                              </span>
                            </td>
                            <td style={{ padding: '12px', color: '#666', fontSize: '13px' }}>
                              {new Date(cred.createdAt).toLocaleDateString()}
                            </td>
                            <td style={{ padding: '12px' }}>
                              <button
                                onClick={() => handleDeleteCredential(cred._id)}
                                style={{ padding: '6px 12px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CREATE SUPER ADMIN MODULE */}
        {activeTab === 'createSuperAdmin' && (
          <div className="admin-section-full">
            <div className="section-header-compact">
              <div>
                <h2 className="section-title-sm">Create Super Admin</h2>
                <p className="section-desc-sm">
                  Create new Super Admin accounts and specify which modules they are permitted to display.
                </p>
              </div>
              <button
                type="button"
                className="btn-refresh-sm"
                onClick={loadSuperAdmins}
                disabled={superAdminsLoading}
              >
                <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" strokeWidth="2.2" fill="none">
                  <polyline points="23 4 23 10 17 10"/>
                  <polyline points="1 20 1 14 7 14"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
                {superAdminsLoading ? 'Refreshing...' : 'Refresh List'}
              </button>
            </div>

            {adminFormError && (
              <div className="sa-alert error">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>{adminFormError}</span>
              </div>
            )}

            {adminFormSuccess && (
              <div className="sa-alert success">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <span>{adminFormSuccess}</span>
              </div>
            )}

            <div className="sa-grid-layout">
              {/* Creation Form Card */}
              <div className="sa-card">
                <div className="sa-card-header">
                  <div className="sa-card-title">Add New Super Admin</div>
                  <div className="sa-card-subtitle">Set account credentials and select module permissions</div>
                </div>

                <form onSubmit={handleCreateSuperAdmin} className="sa-form">
                  <div className="sa-form-row">
                    <div className="form-group-sm">
                      <label className="form-label-sm">
                        Full Name <span className="req-star">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. John Doe"
                        value={adminFormName}
                        onChange={(e) => setAdminFormName(e.target.value)}
                        required
                        className="form-input-sm"
                      />
                    </div>

                    <div className="form-group-sm">
                      <label className="form-label-sm">
                        Email Address <span className="req-star">*</span>
                      </label>
                      <input
                        type="email"
                        placeholder="e.g. admin.dept@college.edu"
                        value={adminFormEmail}
                        onChange={(e) => setAdminFormEmail(e.target.value)}
                        required
                        className="form-input-sm"
                      />
                    </div>

                    <div className="form-group-sm">
                      <label className="form-label-sm">
                        Password <span className="req-star">*</span>
                      </label>
                      <input
                        type="password"
                        placeholder="Min 6 characters"
                        value={adminFormPassword}
                        onChange={(e) => setAdminFormPassword(e.target.value)}
                        required
                        className="form-input-sm"
                      />
                    </div>

                    <div className="form-group-sm">
                      <label className="form-label-sm">
                        Phone (for Login OTP) <span className="req-star">*</span>
                      </label>
                      <input
                        type="tel"
                        placeholder="e.g. 9876543210 (10 digits)"
                        value={adminFormPhone}
                        onChange={(e) => setAdminFormPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        required
                        className="form-input-sm"
                      />
                    </div>
                  </div>

                  {/* Module Access Selector */}
                  <div className="sa-module-picker-wrap">
                    <div className="sa-module-picker-top">
                      <div>
                        <span className="sa-module-picker-title">Module Display Permissions</span>
                        <span className="sa-module-picker-count">
                          {adminFormModules.length} of {MODULE_DEFINITIONS.length} selected
                        </span>
                      </div>
                      <div className="sa-module-picker-actions">
                        <button
                          type="button"
                          className="btn-link-sm"
                          onClick={selectAllModules}
                        >
                          Select All
                        </button>
                        <span className="divider-dot">•</span>
                        <button
                          type="button"
                          className="btn-link-sm text-muted"
                          onClick={clearAllModules}
                        >
                          Clear All
                        </button>
                      </div>
                    </div>

                    <div className="sa-modules-grid">
                      {MODULE_DEFINITIONS.map((mod) => {
                        const isSelected = adminFormModules.includes(mod.id)
                        return (
                          <div
                            key={mod.id}
                            className={`sa-module-chip-card ${isSelected ? 'selected' : ''}`}
                            onClick={() => toggleModuleSelection(mod.id)}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="sa-module-checkbox"
                            />
                            <div className="sa-module-chip-info">
                              <div className="sa-module-chip-title-row">
                                <span className="sa-module-name">{mod.label}</span>
                                <span className="sa-module-id-badge">ID: {mod.id}</span>
                              </div>
                              <span className="sa-module-desc">{mod.description}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="sa-form-submit-row">
                    <button
                      type="submit"
                      className="btn-primary-sm"
                      disabled={creatingAdmin}
                    >
                      {creatingAdmin ? (
                        <>Creating Super Admin...</>
                      ) : (
                        <>
                          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" style={{ marginRight: '6px' }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                          Create Super Admin
                        </>
                      )}
                    </button>
                    <span className="form-hint-sm">
                      The super admin will only be able to view and manage the modules selected above.
                    </span>
                  </div>
                </form>
              </div>

              {/* Existing Super Admins Table */}
              <div className="sa-card">
                <div className="sa-card-header">
                  <div className="sa-card-title">
                    Existing Super Admins
                    <span className="sa-count-badge">{superAdmins.length}</span>
                  </div>
                  <div className="sa-card-subtitle">
                    Registered super admins and their configured module access
                  </div>
                </div>

                {superAdminsLoading ? (
                  <div className="sa-loading-state">
                    Loading super administrator accounts...
                  </div>
                ) : superAdmins.length === 0 ? (
                  <div className="sa-empty-state">
                    No super administrators found.
                  </div>
                ) : (
                  <div className="sa-table-wrap">
                    <table className="sa-table">
                      <thead>
                        <tr>
                          <th>Super Admin</th>
                          <th>Role</th>
                          <th>OTP Mobile</th>
                          <th>Allowed Modules</th>
                          <th>Created</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {superAdmins.map((adm) => {
                          const isCurrent = user?._id === adm._id || user?.email?.toLowerCase() === adm.email?.toLowerCase()
                          const isMaster = adm.email === 'patgarlohit818@gmail.com' || adm.email === 'admin@alumniportal.com'
                          const hasCustomModules = Array.isArray(adm.allowedModules) && adm.allowedModules.length > 0

                          return (
                            <tr key={adm._id}>
                              <td>
                                <div className="sa-user-cell">
                                  <div className="sa-user-avatar">
                                    {(adm.name || adm.email || 'A')[0].toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="sa-user-name">
                                      {adm.name || 'Admin'}
                                      {isCurrent && <span className="sa-self-badge">You</span>}
                                    </div>
                                    <div className="sa-user-email">{adm.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className="sa-status-badge">
                                  {adm.role || 'admin'}
                                </span>
                              </td>
                              <td>
                                {adm.phone ? (
                                  <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>{adm.phone}</code>
                                ) : (
                                  <span style={{ color: '#94a3b8', fontSize: '12px' }}>None</span>
                                )}
                              </td>
                              <td>
                                <div className="sa-modules-pill-wrap">
                                  {!hasCustomModules ? (
                                    <span className="sa-module-pill-all">All Modules (Full Access)</span>
                                  ) : (
                                    adm.allowedModules.map((mId) => {
                                      const found = MODULE_DEFINITIONS.find((m) => m.id === mId)
                                      return (
                                        <span key={mId} className="sa-module-pill">
                                          {found ? found.label : mId}
                                          <span className="sa-pill-id">[{mId}]</span>
                                        </span>
                                      )
                                    })
                                  )}
                                </div>
                              </td>
                              <td>
                                <span className="sa-date-cell">
                                  {adm.createdAt ? new Date(adm.createdAt).toLocaleDateString() : '—'}
                                </span>
                              </td>
                              <td>
                                {isCurrent || isMaster ? (
                                  <span className="sa-protected-badge" title="Master / current account cannot be deleted">
                                    Protected
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    className="btn-danger-sm"
                                    onClick={() => handleDeleteSuperAdmin(adm._id, adm.email)}
                                    title="Delete Super Admin"
                                  >
                                    Delete
                                  </button>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
)
}

export default Admin
