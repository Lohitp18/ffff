import { useState, useEffect } from 'react'
import axios from 'axios'
import './CreatePostModal.css'

const API_BASE_URL = (() => {
  const configured = (import.meta.env.VITE_API_BASE_URL ?? '').trim()
  if (configured) return configured
  return import.meta.env.DEV ? 'http://localhost:5000' : ''
})()

const CreatePostModal = ({ onClose, onPostCreated }) => {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [mediaFile, setMediaFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const onMediaChange = (e) => {
    const file = e.target.files?.[0]
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setMediaFile(null)
    if (!file) return

    const isImage = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    const isVideo = ['video/mp4', 'video/quicktime'].includes(file.type)
    if (!isImage && !isVideo) {
      setError('Use JPG, PNG, WebP, MP4, or MOV')
      return
    }
    if (isImage && file.size > 5 * 1024 * 1024) {
      setError('Images must be 5MB or smaller')
      return
    }
    if (isVideo && file.size > 50 * 1024 * 1024) {
      setError('Videos must be 50MB or smaller')
      return
    }
    setError('')
    setMediaFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

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
      formData.append('title', title)
      formData.append('content', content)
      if (mediaFile) {
        if (mediaFile.type.startsWith('video/')) {
          formData.append('video', mediaFile)
        } else {
          formData.append('image', mediaFile)
        }
      }

      await axios.post(`${API_BASE_URL}/api/posts`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
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
          <h2>Create Post</h2>
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
            <label>Image or video (optional)</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
              onChange={onMediaChange}
            />
            {previewUrl && mediaFile && (
              <div style={{ marginTop: 12 }}>
                {mediaFile.type.startsWith('video/') ? (
                  <video src={previewUrl} controls style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 8 }} />
                ) : (
                  <img src={previewUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 8, objectFit: 'cover' }} />
                )}
              </div>
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

export default CreatePostModal
