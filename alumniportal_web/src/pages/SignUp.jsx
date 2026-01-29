import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Auth.css'

const SignUp = () => {
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
    favTeacher: '',
    socialMedia: '',
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

    setLoading(true)
    const { confirmPassword, ...userData } = formData
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
            <label>Favourite Teacher</label>
            <input
              type="text"
              name="favTeacher"
              value={formData.favTeacher}
              onChange={handleChange}
              placeholder="Enter favourite teacher name"
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


