import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import MainLayout from '../components/MainLayout'
import './Connections.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const Connections = () => {
  const navigate = useNavigate()
  const [connections, setConnections] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    loadConnections()
  }, [])

  const loadConnections = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/connections`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })
      setConnections(response.data)
    } catch (error) {
      console.error('Failed to load connections:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnectionAction = async (id, status) => {
    try {
      await axios.put(
        `${API_BASE_URL}/api/connections/${id}`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          },
        }
      )
      loadConnections()
    } catch (error) {
      console.error('Failed to update connection:', error)
    }
  }

  const isIncoming = (connection) => {
    return connection.recipient?._id === user?._id
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="loading">Loading connections...</div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="connections-container">
        <h1>Connections</h1>
        <div className="connections-list">
          {connections.map((conn) => {
            const requester = conn.requester || {}
            const recipient = conn.recipient || {}
            const status = conn.status || 'pending'
            const isPending = status === 'pending'
            const incoming = isIncoming(conn)

            return (
              <div key={conn._id} className="connection-item">
                <div className="connection-avatar">
                  {requester.profileImage ? (
                    <img src={requester.profileImage} alt={requester.name} />
                  ) : (
                    <span>👤</span>
                  )}
                </div>
                <div className="connection-info">
                  <h3>{requester.name} → {recipient.name}</h3>
                  <p className="connection-status">Status: {status}</p>
                  {incoming && isPending && (
                    <p className="connection-note">Incoming request</p>
                  )}
                </div>
                {isPending && incoming && (
                  <div className="connection-actions">
                    <button
                      className="accept-btn"
                      onClick={() => handleConnectionAction(conn._id, 'accepted')}
                    >
                      ✓ Accept
                    </button>
                    <button
                      className="reject-btn"
                      onClick={() => handleConnectionAction(conn._id, 'rejected')}
                    >
                      ✕ Reject
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        {connections.length === 0 && (
          <div className="empty-state">No connections</div>
        )}
      </div>
    </MainLayout>
  )
}

export default Connections

