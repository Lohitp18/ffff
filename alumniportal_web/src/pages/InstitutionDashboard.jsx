import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './InstitutionDashboard.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const INSTITUTION_DASHBOARD_EMAIL = 'patgarlohit818@gmail.com'
const INSTITUTION_DASHBOARD_PASSWORD = 'Lohit@2004'

const InstitutionDashboard = () => {
  const navigate = useNavigate()
  const [institutions, setInstitutions] = useState([])
  const [selectedInstitution, setSelectedInstitution] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [alumni, setAlumni] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [loadingInstitutions, setLoadingInstitutions] = useState(true)

  useEffect(() => {
    loadInstitutions()
    // Check if already authenticated
    const authStatus = localStorage.getItem('institution_dashboard_auth')
    if (authStatus === 'true') {
      setIsAuthenticated(true)
      const savedInstitution = localStorage.getItem('institution_dashboard_institution')
      if (savedInstitution) {
        setSelectedInstitution(savedInstitution)
        loadAlumni(savedInstitution)
      }
    }
  }, [])

  const loadInstitutions = async () => {
    try {
      setLoadingInstitutions(true)
      const response = await axios.get(`${API_BASE_URL}/api/institutions`)
      setInstitutions(response.data.map(inst => inst.name))
    } catch (error) {
      console.error('Failed to load institutions:', error)
      setError('Failed to load institutions')
    } finally {
      setLoadingInstitutions(false)
    }
  }

  const handleLogin = (e) => {
    e.preventDefault()
    setError('')

    if (!selectedInstitution) {
      setError('Please select an institution')
      return
    }

    if (email !== INSTITUTION_DASHBOARD_EMAIL || password !== INSTITUTION_DASHBOARD_PASSWORD) {
      setError('Invalid email or password')
      return
    }

    setIsAuthenticated(true)
    localStorage.setItem('institution_dashboard_auth', 'true')
    localStorage.setItem('institution_dashboard_institution', selectedInstitution)
    loadAlumni(selectedInstitution)
  }

  const loadAlumni = async (institutionName) => {
    try {
      setLoading(true)
      setError('')
      // Use query parameter instead of URL parameter to avoid encoding issues
      const response = await axios.get(
        `${API_BASE_URL}/api/users/institution-dashboard`,
        {
          params: {
            institutionName: institutionName
          }
        }
      )
      setAlumni(response.data)
    } catch (error) {
      console.error('Failed to load alumni:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load alumni data'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setSelectedInstitution('')
    setAlumni([])
    localStorage.removeItem('institution_dashboard_auth')
    localStorage.removeItem('institution_dashboard_institution')
  }

  const handleInstitutionChange = (e) => {
    const newInstitution = e.target.value
    setSelectedInstitution(newInstitution)
    if (isAuthenticated && newInstitution) {
      loadAlumni(newInstitution)
      localStorage.setItem('institution_dashboard_institution', newInstitution)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="institution-dashboard-container">
        <div className="dashboard-login-card">
          <h1>Institution Dashboard</h1>
          <p className="dashboard-subtitle">Select an institution and login to view alumni data</p>
          
          {error && <div className="error-message">{error}</div>}
          
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Institution *</label>
              {loadingInstitutions ? (
                <div>Loading institutions...</div>
              ) : (
                <select
                  value={selectedInstitution}
                  onChange={(e) => setSelectedInstitution(e.target.value)}
                  required
                >
                  <option value="">Select institution</option>
                  {institutions.map(inst => (
                    <option key={inst} value={inst}>{inst}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter email"
              />
            </div>

            <div className="form-group">
              <label>Password *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter password"
              />
            </div>

            <button type="submit" className="dashboard-login-btn">
              Login
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="institution-dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1>Institution Dashboard</h1>
          <p className="dashboard-institution-name">{selectedInstitution}</p>
        </div>
        <div className="dashboard-header-actions">
          <select
            value={selectedInstitution}
            onChange={handleInstitutionChange}
            className="institution-select"
          >
            {institutions.map(inst => (
              <option key={inst} value={inst}>{inst}</option>
            ))}
          </select>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Loading alumni data...</div>
      ) : (
        <div className="dashboard-content">
          <div className="dashboard-stats">
            <div className="stat-card">
              <div className="stat-value">{alumni.length}</div>
              <div className="stat-label">Total Alumni</div>
            </div>
          </div>

          <div className="alumni-table-container">
            <h2>Alumni Data</h2>
            {alumni.length === 0 ? (
              <p className="no-data">No alumni found for this institution</p>
            ) : (
              <table className="alumni-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Course</th>
                    <th>Year</th>
                    <th>Location</th>
                    <th>Current Company</th>
                    <th>Position</th>
                    <th>Experience</th>
                    <th>Status</th>
                    <th>Joined Date</th>
                  </tr>
                </thead>
                <tbody>
                  {alumni.map((alumnus) => {
                    // Get current company from top level or privateInfo
                    const currentCompany = alumnus.currentCompany || alumnus.privateInfo?.currentCompany || '-'
                    // Get position from top level or privateInfo
                    const position = alumnus.position || alumnus.privateInfo?.currentPosition || '-'
                    // Get experience from top level or privateInfo
                    const experience = alumnus.totalExperience || alumnus.privateInfo?.totalExperience || null
                    const experienceText = experience ? `${experience} years` : '-'
                    
                    return (
                      <tr key={alumnus._id}>
                        <td>{alumnus.name || '-'}</td>
                        <td>{alumnus.email || '-'}</td>
                        <td>{alumnus.phone || '-'}</td>
                        <td>{alumnus.course || '-'}</td>
                        <td>{alumnus.year || '-'}</td>
                        <td>{alumnus.location || '-'}</td>
                        <td>{currentCompany}</td>
                        <td>{position}</td>
                        <td>{experienceText}</td>
                        <td>
                          <span className={`status-badge status-${alumnus.status || 'pending'}`}>
                            {alumnus.status || 'pending'}
                          </span>
                        </td>
                        <td>
                          {alumnus.createdAt
                            ? new Date(alumnus.createdAt).toLocaleDateString()
                            : '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default InstitutionDashboard

