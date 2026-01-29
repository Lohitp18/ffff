import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import MainLayout from '../components/MainLayout'
import './Alumni.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const Alumni = () => {
  const [alumni, setAlumni] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedInstitution, setSelectedInstitution] = useState('')
  const [selectedCourse, setSelectedCourse] = useState('')
  const [connections, setConnections] = useState([])
  const [connecting, setConnecting] = useState({})
  const navigate = useNavigate()
  const { user } = useAuth()

  const years = Array.from({ length: 30 }, (_, i) => (new Date().getFullYear() - i).toString())
  const institutions = ['AIET', 'AIT', 'AIIMS', 'NIT', 'IIT']
  const courses = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'MBA', 'MCA']

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null
    if (imagePath.startsWith('http')) return imagePath
    return `${API_BASE_URL}${imagePath.startsWith('/') ? imagePath : '/' + imagePath}`
  }

  const loadAlumni = async () => {
    setLoading(true)
    try {
      const params = {}
      if (selectedYear) params.year = selectedYear
      if (selectedInstitution) params.institution = selectedInstitution
      if (selectedCourse) params.course = selectedCourse
      if (searchTerm.trim()) params.q = searchTerm.trim()

      const response = await axios.get(`${API_BASE_URL}/api/users/approved`, {
        params,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })
      setAlumni(response.data)
    } catch (error) {
      console.error('Failed to load alumni:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAlumni()
    loadConnections()
  }, [selectedYear, selectedInstitution, selectedCourse, searchTerm, user])

  const loadConnections = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (token && user) {
        const response = await axios.get(`${API_BASE_URL}/api/connections`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        setConnections(response.data || [])
      }
    } catch (error) {
      console.error('Failed to load connections:', error)
    }
  }

  const getConnectionStatus = (alumId) => {
    if (!user || alumId === user._id) return null
    
    const connection = connections.find(conn => {
      const requesterId = conn.requester?._id || conn.requester
      const recipientId = conn.recipient?._id || conn.recipient
      return (
        (requesterId === user._id && recipientId === alumId) ||
        (requesterId === alumId && recipientId === user._id)
      )
    })
    
    if (!connection) return { status: 'none', connection: null, isRequester: false }
    
    const requesterId = connection.requester?._id || connection.requester
    const isRequester = requesterId === user._id
    
    return {
      status: connection.status,
      connection: connection,
      isRequester: isRequester
    }
  }

  const handleConnect = async (alumId, e) => {
    e.stopPropagation() // Prevent navigation when clicking connect button
    
    if (connecting[alumId]) return
    
    try {
      setConnecting({ ...connecting, [alumId]: true })
      await axios.post(
        `${API_BASE_URL}/api/connections/${alumId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          },
        }
      )
      // Reload connections to update status
      await loadConnections()
      // Trigger event to update connections count in MainLayout
      window.dispatchEvent(new Event('connectionsUpdated'))
    } catch (error) {
      console.error('Failed to send connection request:', error)
      alert(error.response?.data?.message || 'Failed to send connection request')
    } finally {
      setConnecting({ ...connecting, [alumId]: false })
    }
  }

  const handleDisconnect = async (connectionId, e) => {
    e.stopPropagation()
    
    if (!window.confirm('Are you sure you want to disconnect?')) return
    
    if (connecting[connectionId]) return
    
    try {
      setConnecting({ ...connecting, [connectionId]: true })
      await axios.delete(
        `${API_BASE_URL}/api/connections/${connectionId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          },
        }
      )
      // Reload connections to update status
      await loadConnections()
      // Trigger event to update connections count in MainLayout
      window.dispatchEvent(new Event('connectionsUpdated'))
    } catch (error) {
      console.error('Failed to disconnect:', error)
      alert(error.response?.data?.message || 'Failed to disconnect')
    } finally {
      setConnecting({ ...connecting, [connectionId]: false })
    }
  }

  const handleWithdraw = async (connectionId, e) => {
    e.stopPropagation()
    
    if (connecting[connectionId]) return
    
    try {
      setConnecting({ ...connecting, [connectionId]: true })
      await axios.delete(
        `${API_BASE_URL}/api/connections/${connectionId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          },
        }
      )
      // Reload connections to update status
      await loadConnections()
      // Trigger event to update connections count in MainLayout
      window.dispatchEvent(new Event('connectionsUpdated'))
    } catch (error) {
      console.error('Failed to withdraw connection request:', error)
      alert(error.response?.data?.message || 'Failed to withdraw request')
    } finally {
      setConnecting({ ...connecting, [connectionId]: false })
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="loading">Loading alumni...</div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="alumni-container">
        <div className="filters-section">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search alumni..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filters-row">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="filter-select"
            >
              <option value="">All Years</option>
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <select
              value={selectedInstitution}
              onChange={(e) => setSelectedInstitution(e.target.value)}
              className="filter-select"
            >
              <option value="">All Institutions</option>
              {institutions.map((inst) => (
                <option key={inst} value={inst}>{inst}</option>
              ))}
            </select>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="filter-select"
            >
              <option value="">All Courses</option>
              {courses.map((course) => (
                <option key={course} value={course}>{course}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="alumni-grid">
          {alumni.map((alum) => {
            const connectionInfo = getConnectionStatus(alum._id)
            const isCurrentUser = user && alum._id === user._id
            const connectionId = connectionInfo?.connection?._id
            
            return (
              <div
                key={alum._id}
                className="alumni-card"
                onClick={() => navigate(`/user/${alum._id}`)}
              >
                <div className="alumni-avatar">
                  {alum.profileImage ? (
                    <img src={getImageUrl(alum.profileImage)} alt={alum.name} />
                  ) : (
                    <span>{alum.name?.charAt(0)?.toUpperCase() || '👤'}</span>
                  )}
                </div>
                <h3>{alum.name}</h3>
                {alum.headline && <p className="headline">{alum.headline}</p>}
                <p className="alumni-info">{[alum.institution, alum.course, alum.year].filter(Boolean).join(' • ')}</p>
                {!isCurrentUser && (
                  <div className="alumni-actions" onClick={(e) => e.stopPropagation()}>
                    {connectionInfo?.status === 'none' && (
                      <button
                        className="connect-btn"
                        onClick={(e) => handleConnect(alum._id, e)}
                        disabled={connecting[alum._id]}
                      >
                        {connecting[alum._id] ? 'Connecting...' : 'Connect'}
                      </button>
                    )}
                    {connectionInfo?.status === 'pending' && connectionInfo.isRequester && (
                      <button
                        className="connect-btn withdraw"
                        onClick={(e) => handleWithdraw(connectionId, e)}
                        disabled={connecting[connectionId]}
                      >
                        {connecting[connectionId] ? 'Withdrawing...' : 'Withdraw'}
                      </button>
                    )}
                    {connectionInfo?.status === 'pending' && !connectionInfo.isRequester && (
                      <button className="connect-btn pending" disabled>
                        Pending
                      </button>
                    )}
                    {connectionInfo?.status === 'accepted' && (
                      <button
                        className="connect-btn disconnect"
                        onClick={(e) => handleDisconnect(connectionId, e)}
                        disabled={connecting[connectionId]}
                      >
                        {connecting[connectionId] ? 'Disconnecting...' : 'Disconnect'}
                      </button>
                    )}
                    {connectionInfo?.status === 'rejected' && (
                      <button
                        className="connect-btn"
                        onClick={(e) => handleConnect(alum._id, e)}
                        disabled={connecting[alum._id]}
                      >
                        {connecting[alum._id] ? 'Connecting...' : 'Connect'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        {alumni.length === 0 && !loading && (
          <div className="empty-state">No alumni found</div>
        )}
      </div>
    </MainLayout>
  )
}

export default Alumni

