import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import MainLayout from '../components/MainLayout'
import './PostOpportunity.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const PostOpportunity = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    company: '',
    applyLink: '',
    type: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.title || !formData.description) {
      setError('Title and description are required')
      return
    }

    setLoading(true)
    setError('')

    try {
      await axios.post(
        `${API_BASE_URL}/api/content/opportunities`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          },
        }
      )
      navigate('/opportunities')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create opportunity')
    } finally {
      setLoading(false)
    }
  }

  return (
    <MainLayout>
      <div className="post-opportunity-container">
        <h1>Post Opportunity</h1>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit} className="opportunity-form">
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="Job title"
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows="5"
              placeholder="Job description"
            />
          </div>
          <div className="form-group">
            <label>Company</label>
            <input
              type="text"
              name="company"
              value={formData.company}
              onChange={handleChange}
              placeholder="Company name"
            />
          </div>
          <div className="form-group">
            <label>Apply Link</label>
            <input
              type="url"
              name="applyLink"
              value={formData.applyLink}
              onChange={handleChange}
              placeholder="https://..."
            />
          </div>
          <div className="form-group">
            <label>Type</label>
            <input
              type="text"
              name="type"
              value={formData.type}
              onChange={handleChange}
              placeholder="e.g., Full-time, Part-time"
            />
          </div>
          <div className="form-actions">
            <button type="button" onClick={() => navigate('/opportunities')} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? 'Creating...' : 'Create Opportunity'}
            </button>
          </div>
        </form>
      </div>
    </MainLayout>
  )
}

export default PostOpportunity

