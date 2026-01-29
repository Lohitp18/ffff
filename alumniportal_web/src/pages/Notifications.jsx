import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import MainLayout from '../components/MainLayout'
import './Notifications.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const Notifications = () => {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await axios.get(`${API_BASE_URL}/api/notifications`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })
      // Backend returns { notifications: [...], totalPages, currentPage, total }
      const notificationsData = response.data.notifications || response.data || []
      setNotifications(Array.isArray(notificationsData) ? notificationsData : [])
    } catch (error) {
      console.error('Failed to load notifications:', error)
      setError('Failed to load notifications')
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId) => {
    try {
      await axios.patch(
        `${API_BASE_URL}/api/notifications/${notificationId}/read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          },
        }
      )
      // Update local state
      setNotifications(notifications.map(notif => 
        notif._id === notificationId ? { ...notif, isRead: true } : notif
      ))
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await axios.patch(
        `${API_BASE_URL}/api/notifications/mark-all-read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          },
        }
      )
      // Update local state
      setNotifications(notifications.map(notif => ({ ...notif, isRead: true })))
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  const deleteNotification = async (notificationId) => {
    try {
      await axios.delete(
        `${API_BASE_URL}/api/notifications/${notificationId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          },
        }
      )
      // Remove from local state
      setNotifications(notifications.filter(notif => notif._id !== notificationId))
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }

  const handleNotificationClick = (notification) => {
    // Mark as read when clicked
    if (!notification.isRead) {
      markAsRead(notification._id)
    }

    // Navigate to related content if available
    if (notification.relatedItemId && notification.relatedItemType) {
      if (notification.relatedItemType === 'Post') {
        // Posts are shown on home page
        navigate('/home')
      } else if (notification.relatedItemType === 'Event') {
        navigate('/events')
      } else if (notification.relatedItemType === 'Opportunity') {
        navigate('/opportunities')
      } else if (notification.relatedItemType === 'InstitutionPost') {
        // Navigate to institution page
        if (notification.metadata?.institution) {
          const encodedName = encodeURIComponent(notification.metadata.institution)
          navigate(`/institution/${encodedName}`)
        } else {
          navigate('/institutions')
        }
      }
    }
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'event':
        return '📅'
      case 'opportunity':
        return '💼'
      case 'institution_post':
        return '🏫'
      case 'post':
      default:
        return '📝'
    }
  }

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

  const unreadCount = notifications.filter(n => !n.isRead).length

  if (loading) {
    return (
      <MainLayout>
        <div className="notifications-container">
          <div className="loading">Loading notifications...</div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="notifications-container">
        <div className="notifications-header">
          <h1>Notifications</h1>
          {unreadCount > 0 && (
            <div className="notifications-actions">
              <button 
                className="mark-all-read-btn"
                onClick={markAllAsRead}
              >
                Mark all as read
              </button>
              <span className="unread-badge">{unreadCount} unread</span>
            </div>
          )}
        </div>

        {error && (
          <div className="error-message">{error}</div>
        )}

        {notifications.length === 0 ? (
          <div className="empty-state">
            <p>No notifications</p>
            <button className="refresh-btn" onClick={loadNotifications}>
              Refresh
            </button>
          </div>
        ) : (
          <div className="notifications-list">
            {notifications.map((notification) => (
              <div 
                key={notification._id} 
                className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="notification-icon">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="notification-content">
                  <div className="notification-header">
                    <h3>{notification.title}</h3>
                    {!notification.isRead && (
                      <span className="unread-dot"></span>
                    )}
                  </div>
                  <p>{notification.message}</p>
                  {notification.metadata?.institution && (
                    <span className="notification-institution">
                      🏫 {notification.metadata.institution}
                    </span>
                  )}
                  <div className="notification-footer">
                    <span className="notification-date">
                      {formatDate(notification.createdAt)}
                    </span>
                    <div className="notification-actions">
                      {!notification.isRead && (
                        <button
                          className="mark-read-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            markAsRead(notification._id)
                          }}
                          title="Mark as read"
                        >
                          ✓
                        </button>
                      )}
                      <button
                        className="delete-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (window.confirm('Delete this notification?')) {
                            deleteNotification(notification._id)
                          }
                        }}
                        title="Delete"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  )
}

export default Notifications

