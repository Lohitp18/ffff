import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import MainLayout from '../components/MainLayout'
import './PostEvent.css'

const API_BASE_URL = (() => {
  const configured = (import.meta.env.VITE_API_BASE_URL ?? '').trim()
  if (configured) return configured
  return import.meta.env.DEV ? 'http://localhost:5000' : ''
})()

const PostEvent = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    location: '',
    googleFormUrl: '',
  })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image file size must be less than 5MB')
        return
      }
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
      setError('')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.title || !formData.description || !formData.date) {
      setError('Title, description, and date are required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const data = new FormData()
      data.append('title', formData.title.trim())
      data.append('description', formData.description.trim())
      data.append('date', formData.date)
      if (formData.location.trim()) {
        data.append('location', formData.location.trim())
      }
      if (formData.googleFormUrl.trim()) {
        data.append('googleFormUrl', formData.googleFormUrl.trim())
      }
      if (imageFile) {
        data.append('image', imageFile)
      }

      await axios.post(
        `${API_BASE_URL}/api/content/events`,
        data,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      )
      navigate('/events')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create event')
    } finally {
      setLoading(false)
    }
  }

  return (
    <MainLayout>
      <div className="post-event-container">
        <h1>Post Event</h1>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit} className="event-form">
          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="Event title"
            />
          </div>

          <div className="form-group">
            <label>Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows="5"
              placeholder="Event description"
            />
          </div>

          <div className="form-group">
            <label>Date &amp; Time *</label>
            <input
              type="datetime-local"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Location (Optional)</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g. Auditorium / Campus Ground / Virtual Meet"
            />
          </div>

          <div className="form-group">
            <label>Google Form / Registration Link (Optional)</label>
            <input
              type="url"
              name="googleFormUrl"
              value={formData.googleFormUrl}
              onChange={handleChange}
              placeholder="https://forms.gle/... or event registration link"
            />
          </div>

          <div className="form-group">
            <label>Event Banner / Poster Image (Optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
            {imagePreview && (
              <div style={{ marginTop: '10px', position: 'relative', display: 'inline-block' }}>
                <img
                  src={imagePreview}
                  alt="Preview"
                  style={{ maxHeight: '180px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(''); }}
                  style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    background: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => navigate('/events')} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </MainLayout>
  )
}

export default PostEvent
