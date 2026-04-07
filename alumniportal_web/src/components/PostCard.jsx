import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './PostCard.css'
import SasImage from './SasImage'
import SasVideo from './SasVideo'

const API_BASE_URL = (() => {
  const configured = (import.meta.env.VITE_API_BASE_URL ?? '').trim()
  if (configured) return configured
  return import.meta.env.DEV ? 'http://localhost:5000' : ''
})()

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
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [sharePortalLoading, setSharePortalLoading] = useState(false)
  const navigate = useNavigate()

  const getPostType = () => {
    return post.category || post.type || 'Post'
  }

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null
    if (imagePath.startsWith('http')) return imagePath
    return `${API_BASE_URL}${imagePath.startsWith('/') ? imagePath : '/' + imagePath}`
  }

  const getSharePageUrl = () => {
    const id = post._id ? String(post._id) : ''
    return `${window.location.origin}/home?post=${encodeURIComponent(id)}`
  }

  const getShareSummaryText = () => {
    const title = post.title || post.institution || 'Alvas Alumni Portal'
    const body = (post.content || post.description || '').trim().slice(0, 280)
    const link = getSharePageUrl()
    return body ? `${title}\n\n${body}\n\n${link}` : `${title}\n\n${link}`
  }

  /** One media URL for download (matches how the card shows image vs video). */
  const getPrimaryMediaUrl = () => {
    const t = getPostType()
    if (t === 'InstitutionPost') {
      if (post.imageUrl) return getImageUrl(post.imageUrl)
      if (post.videoUrl) return getImageUrl(post.videoUrl)
      return null
    }
    const isVideo =
      post.mediaType === 'video' ||
      (!!post.videoUrl && post.mediaType !== 'image')
    if (isVideo) {
      const u = post.mediaUrl || post.videoUrl
      return u ? getImageUrl(u) : null
    }
    const u = post.mediaUrl || post.imageUrl
    return u ? getImageUrl(u) : null
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

  const openShareModal = () => {
    setShareCopied(false)
    setShowShareModal(true)
  }

  const closeShareModal = () => {
    setShowShareModal(false)
    setShareCopied(false)
  }

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(getShareSummaryText())
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer')
  }

  const shareViaFacebook = () => {
    const u = encodeURIComponent(getSharePageUrl())
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      '_blank',
      'noopener,noreferrer,width=580,height=400'
    )
  }

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(getSharePageUrl())
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2500)
    } catch {
      alert('Could not copy. Copy manually:\n' + getSharePageUrl())
    }
  }

  const downloadShare = async () => {
    const mediaUrl = getPrimaryMediaUrl()
    const pageUrl = getSharePageUrl()
    const shortId = post._id ? String(post._id).slice(-8) : 'export'

    if (mediaUrl) {
      try {
        const res = await fetch(mediaUrl, { mode: 'cors' })
        if (!res.ok) throw new Error('fetch failed')
        const blob = await res.blob()
        const type = blob.type || ''
        let ext = 'bin'
        if (type.includes('jpeg') || type.includes('jpg')) ext = 'jpg'
        else if (type.includes('png')) ext = 'png'
        else if (type.includes('webp')) ext = 'webp'
        else if (type.includes('mp4')) ext = 'mp4'
        else if (type.includes('quicktime') || type.includes('video')) ext = 'mov'
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `alumni-media-${shortId}.${ext}`
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(a.href)
      } catch {
        window.open(mediaUrl, '_blank', 'noopener,noreferrer')
      }
    } else {
      const title = post.title || 'Alumni post'
      const body = post.content || post.description || ''
      const text = `${title}\n\n${body}\n\n${pageUrl}`
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `alumni-post-${shortId}.txt`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(a.href)
    }
  }

  const shareToPortal = async () => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      alert('Sign in to repost on the portal.')
      navigate('/signin', { state: { from: { pathname: '/home' } } })
      closeShareModal()
      return
    }
    setSharePortalLoading(true)
    try {
      const postType = getPostType()
      await axios.post(
        `${API_BASE_URL}/api/posts/share`,
        {
          title: `Shared: ${post.title || 'Check this out!'}`,
          content: `${post.content || post.description || ''}\n\n[Shared from ${postType}]`,
          originalPostId: post._id,
          originalPostType: postType,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      alert('Shared to the portal. It will appear after admin approval.')
      if (onUpdate) onUpdate()
      closeShareModal()
    } catch (error) {
      console.error('Failed to share post:', error)
      alert(error.response?.data?.message || 'Could not share to portal.')
    } finally {
      setSharePortalLoading(false)
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
  const authorUsername = post.authorId?.username || post.postedBy?.username
  const authorName = authorUsername ? `@${authorUsername}` : (post.authorId?.name || post.postedBy?.name)
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
    <article className="linkedin-post-card" id={post._id ? `feed-post-${post._id}` : undefined}>
      {/* Post Header */}
      <div className="post-card-header">
        {!isInstitutionPost && authorName && (
          <div className="post-author" onClick={handleUserClick} style={{ cursor: 'pointer' }}>
            <div className="post-author-avatar">
              {authorImage ? (
                <SasImage src={getImageUrl(authorImage)} alt={authorName} />
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
        {getPostType() === 'InstitutionPost' ? (
          <>
            {post.imageUrl && (
              <div className="post-image-container">
                <SasImage src={getImageUrl(post.imageUrl)} alt={post.title} className="post-image" />
              </div>
            )}
            {post.videoUrl && (
              <div className="post-video-container">
                <SasVideo
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
                </SasVideo>
              </div>
            )}
          </>
        ) : (
          (() => {
            const primary = post.mediaUrl || post.imageUrl || post.videoUrl
            if (!primary) return null
            const isVideo =
              post.mediaType === 'video' ||
              (!!post.videoUrl && post.mediaType !== 'image')
            if (isVideo) {
              return (
                <div className="post-video-container">
                  <SasVideo
                    src={getImageUrl(post.mediaUrl || post.videoUrl)}
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
                  </SasVideo>
                </div>
              )
            }
            return (
              <div className="post-image-container">
                <SasImage src={getImageUrl(post.mediaUrl || post.imageUrl)} alt={post.title} className="post-image" />
              </div>
            )
          })()
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
        <button type="button" className="post-action" onClick={openShareModal} aria-haspopup="dialog" aria-expanded={showShareModal}>
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

      {showShareModal && (
        <div className="share-modal-backdrop" onClick={closeShareModal} role="presentation">
          <div className="share-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="share-modal-title">
            <div className="share-modal-header">
              <h3 id="share-modal-title">Share</h3>
              <button type="button" className="share-modal-close" onClick={closeShareModal} aria-label="Close">×</button>
            </div>
            <p className="share-modal-hint">Share this post with others</p>
            <div className="share-modal-grid">
              <button type="button" className="share-option" onClick={shareViaWhatsApp}>
                <span className="share-option-icon" aria-hidden>💬</span>
                <span className="share-option-label">WhatsApp</span>
              </button>
              <button type="button" className="share-option" onClick={copyShareLink}>
                <span className="share-option-icon" aria-hidden>🔗</span>
                <span className="share-option-label">{shareCopied ? 'Copied!' : 'Copy link'}</span>
              </button>
              <button type="button" className="share-option" onClick={shareViaFacebook}>
                <span className="share-option-icon" aria-hidden>📘</span>
                <span className="share-option-label">Facebook</span>
              </button>
              <button type="button" className="share-option" onClick={downloadShare}>
                <span className="share-option-icon" aria-hidden>⬇️</span>
                <span className="share-option-label">Download</span>
              </button>
            </div>
            <div className="share-modal-divider" />
            <button
              type="button"
              className="share-portal-btn"
              onClick={shareToPortal}
              disabled={sharePortalLoading}
            >
              {sharePortalLoading ? 'Sharing…' : 'Repost on Alumni Portal'}
            </button>
          </div>
        </div>
      )}

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