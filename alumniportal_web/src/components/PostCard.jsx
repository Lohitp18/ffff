import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './PostCard.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'inappropriate_content', label: 'Inappropriate Content' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'false_information', label: 'False Information' },
  { value: 'copyright_violation', label: 'Copyright Violation' },
  { value: 'other', label: 'Other' },
]

const PostCard = ({ post, onUpdate }) => {
  const [isLiked, setIsLiked] = useState(() => post.isLiked || false)
  const [likeCount, setLikeCount] = useState(post.likeCount || (Array.isArray(post.likes) ? post.likes.length : 0))
  const [loading, setLoading] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportDescription, setReportDescription] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [reportError, setReportError] = useState('')
  const navigate = useNavigate()

  const getPostType = () => {
    return post.category || post.type || 'Post'
  }

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null
    if (imagePath.startsWith('http')) return imagePath
    return `${API_BASE_URL}${imagePath.startsWith('/') ? imagePath : '/' + imagePath}`
  }

  const handleLike = async () => {
    if (loading) return
    setLoading(true)

    try {
      let endpoint
      const postType = getPostType()
      
      if (postType === 'Event') {
        endpoint = `${API_BASE_URL}/api/content/events/${post._id}/like`
      } else if (postType === 'Opportunity') {
        endpoint = `${API_BASE_URL}/api/content/opportunities/${post._id}/like`
      } else if (postType === 'InstitutionPost') {
        endpoint = `${API_BASE_URL}/api/content/institution-posts/${post._id}/like`
      } else {
        endpoint = `${API_BASE_URL}/api/posts/${post._id}/like`
      }

      const response = await axios.patch(endpoint, {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })

      setIsLiked(response.data.liked)
      setLikeCount(response.data.likeCount)
    } catch (error) {
      console.error('Failed to toggle like:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleShare = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        alert('Please login to share posts')
        return
      }

      // Show share options
      const shareOption = window.confirm(
        'Choose share method:\n\nOK = Share to Portal (creates a post)\nCancel = Copy to Clipboard'
      )

      if (shareOption) {
        // Share to portal using API
        try {
          const postType = getPostType()
          const shareData = {
            title: `Shared: ${post.title || 'Check this out!'}`,
            content: `${post.content || post.description || ''}\n\n[Shared from ${postType}]`,
            originalPostId: post._id,
            originalPostType: postType,
          }

          await axios.post(
            `${API_BASE_URL}/api/posts/share`,
            shareData,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          )

          alert('Post shared successfully! It will be visible after admin approval.')
          if (onUpdate) onUpdate()
        } catch (error) {
          console.error('Failed to share post:', error)
          alert(error.response?.data?.message || 'Failed to share post. Please try again.')
        }
      } else {
        // Copy to clipboard
        const shareData = {
          title: post.title || 'Check this out!',
          text: post.content || post.description || '',
          url: `${window.location.origin}/home`,
        }
        const textToCopy = `${shareData.title}\n\n${shareData.text}\n\n${shareData.url}`
        await navigator.clipboard.writeText(textToCopy)
        alert('Post link copied to clipboard!')
      }
    } catch (error) {
      console.error('Share error:', error)
      alert('Failed to share. Please try again.')
    }
  }

  const openReportModal = () => {
    setReportReason('')
    setReportDescription('')
    setReportError('')
    setShowReportModal(true)
  }

  const handleReportSubmit = async () => {
    if (!reportReason) {
      setReportError('Please select a reason')
      return
    }
    setReportError('')
    setReportSubmitting(true)
    try {
      const postType = getPostType()
      let endpoint
      if (postType === 'Event') {
        endpoint = `${API_BASE_URL}/api/content/events/${post._id}/report`
      } else if (postType === 'Opportunity') {
        endpoint = `${API_BASE_URL}/api/content/opportunities/${post._id}/report`
      } else if (postType === 'InstitutionPost') {
        endpoint = `${API_BASE_URL}/api/content/institution-posts/${post._id}/report`
      } else {
        endpoint = `${API_BASE_URL}/api/posts/${post._id}/report`
      }

      await axios.post(
        endpoint,
        { reason: reportReason, description: reportDescription || '' },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          },
        }
      )
      setShowReportModal(false)
      alert('Report submitted successfully. Thank you for your feedback.')
    } catch (error) {
      console.error('Failed to submit report:', error)
      setReportError(error.response?.data?.message || 'Failed to submit report. Please try again.')
    } finally {
      setReportSubmitting(false)
    }
  }

  const handleUserClick = () => {
    if (post.authorId?._id || post.postedBy?._id) {
      navigate(`/user/${post.authorId?._id || post.postedBy?._id}`)
    }
  }

  const isInstitutionPost = Boolean(post.institution)
  const authorName = post.authorId?.name || post.postedBy?.name
  const authorHeadline = post.authorId?.headline || post.postedBy?.headline
  const authorImage = post.authorId?.profileImage || post.postedBy?.profileImage

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  return (
    <article className="linkedin-post-card">
      {/* Post Header */}
      <div className="post-card-header">
        {!isInstitutionPost && authorName && (
          <div className="post-author" onClick={handleUserClick} style={{ cursor: 'pointer' }}>
            <div className="post-author-avatar">
              {authorImage ? (
                <img 
                  src={getImageUrl(authorImage)} 
                  alt={authorName} 
                />
              ) : (
                <div className="avatar-placeholder">
                  {authorName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="post-author-info">
              <div className="post-author-name">
                {authorName}
              </div>
              <div className="post-author-meta">
                {authorHeadline || 'Alumni'}
                {post.date && ` • ${formatDate(post.date)}`}
                {!post.date && post.createdAt && ` • ${formatDate(post.createdAt)}`}
                {/* Don't display email - email is not shown in post metadata */}
              </div>
            </div>
          </div>
        )}
        {post.institution && (
          <div className="post-institution" onClick={() => navigate(`/institution/${encodeURIComponent(post.institution)}`)} style={{ cursor: "pointer" }}>
            <span className="institution-badge">🏫 {post.institution}</span>
          </div>
        )}
      </div>

      {/* Post Content */}
      <div className="post-card-content">
        {post.title && (
          <h3 className="post-title">{post.title}</h3>
        )}
        {(post.content || post.description) && (
          <p className="post-text">{post.content || post.description}</p>
        )}
        {post.imageUrl && (
          <div className="post-image-container">
            <img
              src={getImageUrl(post.imageUrl)}
              alt={post.title}
              className="post-image"
            />
          </div>
        )}
        {post.videoUrl && (
          <div className="post-video-container">
            <video
              src={getImageUrl(post.videoUrl)}
              controls
              playsInline
              webkit-playsinline="true"
              className="post-video"
              style={{
                width: '100%',
                maxHeight: '500px',
                borderRadius: '8px',
                backgroundColor: '#000'
              }}
            >
              Your browser does not support the video tag.
            </video>
          </div>
        )}
        {post.applyLink && (
          <div className="post-apply-section">
            <a
              href={post.applyLink}
              target="_blank"
              rel="noopener noreferrer"
              className="post-apply-link"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#0a66c2">
                <path d="M20 6H16V4C16 2.89 15.11 2 14 2H10C8.89 2 8 2.89 8 4V6H4C2.89 6 2.01 6.89 2.01 8L2 19C2 20.11 2.89 21 4 21H20C21.11 21 22 20.11 22 19V8C22 6.89 21.11 6 20 6ZM10 4H14V6H10V4ZM20 19H4V8H20V19Z"/>
              </svg>
              <span>Apply on company website</span>
            </a>
          </div>
        )}
      </div>

      {/* Post Stats */}
      {(likeCount > 0 || post.comments?.length > 0) && (
        <div className="post-stats">
          {likeCount > 0 && (
            <div className="post-stat-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#0a66c2">
                <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
              </svg>
              <span>{likeCount}</span>
            </div>
          )}
        </div>
      )}

      {/* Post Actions */}
      <div className="post-card-actions">
        <button
          className={`post-action ${isLiked ? 'active' : ''}`}
          onClick={handleLike}
          disabled={loading}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill={isLiked ? '#0a66c2' : 'none'} stroke={isLiked ? '#0a66c2' : '#666'}>
            <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
          </svg>
          <span>Like</span>
        </button>
        <button className="post-action" onClick={handleShare}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666">
            <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
          </svg>
          <span>Share</span>
        </button>
        <button className="post-action" onClick={openReportModal}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          <span>Report</span>
        </button>
      </div>

      {showReportModal && (
        <div className="report-modal-backdrop" onClick={() => setShowReportModal(false)}>
          <div className="report-modal" onClick={(e) => e.stopPropagation()}>
            <div className="report-modal-header">
              <h3>Report Post</h3>
              <button type="button" className="report-modal-close" onClick={() => setShowReportModal(false)} aria-label="Close">×</button>
            </div>
            <p className="report-modal-desc">Please select a reason for reporting this post:</p>
            {reportError && <div className="report-modal-error">{reportError}</div>}
            <div className="report-modal-body">
              <label>
                Reason <span className="required">*</span>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  required
                >
                  <option value="">Select a reason</option>
                  {REPORT_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </label>
              <label>
                Additional details (optional)
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Please provide more details..."
                  rows={3}
                />
              </label>
            </div>
            <div className="report-modal-actions">
              <button type="button" className="linkedin-btn-secondary" onClick={() => setShowReportModal(false)} disabled={reportSubmitting}>Cancel</button>
              <button type="button" className="linkedin-btn-primary" onClick={handleReportSubmit} disabled={reportSubmitting}>
                {reportSubmitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  )
}

export default PostCard