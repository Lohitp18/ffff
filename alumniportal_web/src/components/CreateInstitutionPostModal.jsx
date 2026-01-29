import { useState } from 'react'
import axios from 'axios'
import './CreatePostModal.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const CreateInstitutionPostModal = ({ institution, onClose, onPostCreated }) => {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [image, setImage] = useState(null)
  const [video, setVideo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title || !content) {
      setError('Title and content are required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('institution', institution)
      formData.append('title', title)
      formData.append('content', content)
      if (image) {
        formData.append('image', image)
      }
      if (video) {
        formData.append('video', video)
      }

      await axios.post(`${API_BASE_URL}/api/content/institution-posts`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'multipart/form-data',
        },
      })

      onPostCreated()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create post')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Post to {institution}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Enter post title"
            />
          </div>
          <div className="form-group">
            <label>Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows="5"
              placeholder="What's on your mind?"
            />
          </div>
          <div className="form-group">
            <label>Image (Optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                setImage(e.target.files[0])
                if (e.target.files[0]) setVideo(null) // Clear video if image is selected
              }}
            />
            {image && (
              <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                Selected: {image.name}
              </p>
            )}
          </div>
          <div className="form-group">
            <label>Video (Optional)</label>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => {
                setVideo(e.target.files[0])
                if (e.target.files[0]) setImage(null) // Clear image if video is selected
              }}
            />
            {video && (
              <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                Selected: {video.name} (Max 100MB)
              </p>
            )}
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? 'Creating...' : 'Create Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateInstitutionPostModal

