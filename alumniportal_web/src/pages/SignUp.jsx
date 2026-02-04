import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Auth.css'

const SignUp = () => {
  const [status, setStatus] = useState('') // 'working', 'masters', 'entrepreneurs'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    dob: '',
    institution: '',
    course: '',
    year: '',
    password: '',
    confirmPassword: '',
    socialMedia: '',
    // Conditional fields based on status
    location: '',
    currentCompany: '',
    position: '',
    totalExperience: '',
    mastersCollege: '',
    mastersCourse: '',
    entrepreneurCompany: '',
    companyType: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signup } = useAuth()
  const navigate = useNavigate()

  const institutions = [
    "Alva's institute of engineering and technology",
    "Alva's homeopathic college",
    "Alva's nursing college",
    "Alva's college of naturopathy",
    "Alva's college of allied health sciences",
    "Alva's law college",
    "Alva's physiotherapy",
    "Alva's physical education",
    "Alva's degree college",
    "Alva's pu college",
    "Alva's mba",
  ]

  const courses = [
    'Bcs nursing',
    'Msc nursing',
    'PhD nursing',
    'Llb',
    'Bcom llb',
    'Bballb',
    'Ballb',
    'Bnys',
    'Md clinical naturopathy',
    'Md clinical yoga',
    'CSE',
    'Ise',
    'Ece',
    'Aiml',
    'Csd',
    'Cs datascience',
    'Cs iot',
    'Mechanical',
    'Civil',
    'Agriculture',
    'Electronics',
  ]
  const years = Array.from({ length: 30 }, (_, i) => (new Date().getFullYear() - i).toString())

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleDateChange = (e) => {
    setFormData({ ...formData, dob: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (!formData.institution) {
      setError('Please select an institution')
      return
    }

    if (!formData.course) {
      setError('Please select a course')
      return
    }

    if (!formData.year) {
      setError('Please select a year')
      return
    }

    if (!status) {
      setError('Please select your current status')
      return
    }

    // Validate conditional fields based on status
    if (status === 'working') {
      if (!formData.location) {
        setError('Please enter job location')
        return
      }
      if (!formData.currentCompany) {
        setError('Please enter company name')
        return
      }
      if (!formData.position) {
        setError('Please enter your position')
        return
      }
      if (!formData.totalExperience) {
        setError('Please enter years of experience')
        return
      }
    } else if (status === 'masters') {
      if (!formData.mastersCollege) {
        setError('Please enter college name')
        return
      }
      if (!formData.mastersCourse) {
        setError('Please enter course name')
        return
      }
    } else if (status === 'entrepreneurs') {
      if (!formData.entrepreneurCompany) {
        setError('Please enter company name')
        return
      }
      if (!formData.companyType) {
        setError('Please enter company type')
        return
      }
    }

    setLoading(true)
    const { confirmPassword, ...userData } = formData
    // Map conditional fields to backend expected fields
    if (status === 'working') {
      userData.location = formData.location
      userData.currentCompany = formData.currentCompany
      userData.position = formData.position
      userData.totalExperience = formData.totalExperience
      userData.previousCompany = '' // Not required for working
    } else if (status === 'masters') {
      userData.location = formData.mastersCollege
      userData.currentCompany = formData.mastersCourse
      userData.previousCompany = ''
      userData.totalExperience = '0'
    } else if (status === 'entrepreneurs') {
      userData.location = ''
      userData.currentCompany = formData.entrepreneurCompany
      userData.previousCompany = formData.companyType
      userData.totalExperience = '0'
    }
    // Date is already in YYYY-MM-DD format from date input, backend will parse it
    const result = await signup(userData)
    
    if (result.success) {
      navigate('/signin')
    } else {
      setError(result.message)
    }
    setLoading(false)
  }

  return (
    <div className="auth-container">
      {/* Left Panel with Image */}
      <div className="auth-left-panel">
        <div className="auth-image-container">
          <div className="auth-logo-container">
            <img 
              src="/logo.png" 
              alt="Alva's Alumni" 
              className="auth-logo"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
          <img 
            src="/alumni-signup.jpg" 
            alt="Join Alumni Network" 
            className="auth-image"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }}
          />
          <div style={{display: 'none', color: 'white', fontSize: '48px'}}>🌟</div>
          <h1 className="auth-welcome-text">Join Our Community!</h1>
          <p className="auth-description">
            Become part of our growing alumni network and unlock endless opportunities for networking, career growth, and lifelong connections.
          </p>
        </div>
      </div>

      {/* Right Panel with Form */}
      <div className="auth-right-panel">
        <div className="auth-card">
          <h1>Alumni Portal</h1>
          <h2>Sign Up</h2>
          {error && <div className="error-message">{error}</div>}
          <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Enter your name"
            />
          </div>
          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
            />
          </div>
          <div className="form-group">
            <label>Phone Number *</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              placeholder="Enter your phone number"
            />
          </div>
          <div className="form-group">
            <label>Date of Birth</label>
            <input
              type="date"
              name="dob"
              value={formData.dob}
              onChange={handleDateChange}
              placeholder="Select date of birth"
            />
          </div>
          <div className="form-group">
            <label>Institution *</label>
            <select
              name="institution"
              value={formData.institution}
              onChange={handleChange}
              required
            >
              <option value="">Select institution</option>
              {institutions.map(inst => (
                <option key={inst} value={inst}>{inst}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Course *</label>
            <select
              name="course"
              value={formData.course}
              onChange={handleChange}
              required
            >
              <option value="">Select course</option>
              {courses.map(course => (
                <option key={course} value={course}>{course}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Year of Passed-out *</label>
            <select
              name="year"
              value={formData.year}
              onChange={handleChange}
              required
            >
              <option value="">Select year</option>
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Current Status *</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              required
            >
              <option value="">Select your status</option>
              <option value="working">Currently Working</option>
              <option value="masters">Doing Masters</option>
              <option value="entrepreneurs">Entrepreneurs</option>
            </select>
          </div>

          {/* Conditional fields based on status */}
          {status === 'working' && (
            <>
              <div className="form-group">
                <label>Job Location *</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  required
                  placeholder="Enter your job location"
                />
              </div>
              <div className="form-group">
                <label>Company Name *</label>
                <input
                  type="text"
                  name="currentCompany"
                  value={formData.currentCompany}
                  onChange={handleChange}
                  required
                  placeholder="Enter your company name"
                />
              </div>
              <div className="form-group">
                <label>Position *</label>
                <input
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  required
                  placeholder="Enter your position"
                />
              </div>
              <div className="form-group">
                <label>Years of Experience *</label>
                <input
                  type="number"
                  name="totalExperience"
                  value={formData.totalExperience}
                  onChange={handleChange}
                  required
                  placeholder="Enter years of experience"
                />
              </div>
            </>
          )}

          {status === 'masters' && (
            <>
              <div className="form-group">
                <label>College Name *</label>
                <input
                  type="text"
                  name="mastersCollege"
                  value={formData.mastersCollege}
                  onChange={handleChange}
                  required
                  placeholder="Enter college name"
                />
              </div>
              <div className="form-group">
                <label>Course Name *</label>
                <input
                  type="text"
                  name="mastersCourse"
                  value={formData.mastersCourse}
                  onChange={handleChange}
                  required
                  placeholder="Enter course name"
                />
              </div>
            </>
          )}

          {status === 'entrepreneurs' && (
            <>
              <div className="form-group">
                <label>Company Name *</label>
                <input
                  type="text"
                  name="entrepreneurCompany"
                  value={formData.entrepreneurCompany}
                  onChange={handleChange}
                  required
                  placeholder="Enter your company name"
                />
              </div>
              <div className="form-group">
                <label>Company Type *</label>
                <input
                  type="text"
                  name="companyType"
                  value={formData.companyType}
                  onChange={handleChange}
                  required
                  placeholder="Enter company type (e.g., Tech, Healthcare, etc.)"
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label>Password *</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
            />
          </div>
          <div className="form-group">
            <label>Confirm Password *</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Confirm your password"
            />
          </div>
          <div className="form-group">
            <label>Social Media Link</label>
            <input
              type="url"
              name="socialMedia"
              value={formData.socialMedia}
              onChange={handleChange}
              placeholder="Enter social media profile URL"
            />
          </div>
          <button type="submit" disabled={loading} className="auth-button">
            {loading ? 'Signing up...' : 'Sign Up'}
          </button>
        </form>
          <p className="auth-link">
            Already have an account? <Link to="/signin">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default SignUp


