import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import MainLayout from '../components/MainLayout'
import PostCard from '../components/PostCard'
import './Events.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const Events = () => {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      }

      const response = await axios.get(`${API_BASE_URL}/api/content/events`, { headers })
      setEvents(response.data.map((e) => ({ ...e, category: 'Event' })))
    } catch (error) {
      console.error('Failed to load events:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="loading">Loading events...</div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="events-container">
        <div className="page-header">
          <h1>Events</h1>
          <button className="create-btn" onClick={() => navigate('/post-event')}>
            + Post Event
          </button>
        </div>
        <div className="events-grid">
          {events.map((event) => (
            <PostCard key={event._id} post={event} onUpdate={loadEvents} />
          ))}
        </div>
        {events.length === 0 && (
          <div className="empty-state">No events available</div>
        )}
      </div>
      <button className="fab" onClick={() => navigate('/post-event')}>
        + Post Event
      </button>
    </MainLayout>
  )
}

export default Events

