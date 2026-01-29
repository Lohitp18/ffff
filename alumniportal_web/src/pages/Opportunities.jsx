import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import MainLayout from '../components/MainLayout'
import PostCard from '../components/PostCard'
import './Opportunities.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const Opportunities = () => {
  const [opportunities, setOpportunities] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadOpportunities()
  }, [])

  const loadOpportunities = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      }

      const response = await axios.get(`${API_BASE_URL}/api/content/opportunities`, { headers })
      setOpportunities(response.data.map((o) => ({ ...o, category: 'Opportunity' })))
    } catch (error) {
      console.error('Failed to load opportunities:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="loading">Loading opportunities...</div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="opportunities-container">
        <div className="page-header">
          <h1>Opportunities</h1>
          <button className="create-btn" onClick={() => navigate('/post-opportunity')}>
            + Post Opportunity
          </button>
        </div>
        <div className="opportunities-grid">
          {opportunities.map((opp) => (
            <PostCard key={opp._id} post={opp} onUpdate={loadOpportunities} />
          ))}
        </div>
        {opportunities.length === 0 && (
          <div className="empty-state">No opportunities available</div>
        )}
      </div>
      <button className="fab" onClick={() => navigate('/post-opportunity')}>
        + Post Opportunity
      </button>
    </MainLayout>
  )
}

export default Opportunities

