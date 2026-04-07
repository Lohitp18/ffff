import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import MainLayout from '../components/MainLayout'
import './Institutions.css'

const API_BASE_URL = (() => {
  const configured = (import.meta.env.VITE_API_BASE_URL ?? '').trim()
  if (configured) return configured
  return import.meta.env.DEV ? 'http://localhost:5000' : ''
})()

const Institutions = () => {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [institutions, setInstitutions] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [postsRes, instsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/content/institution-posts`),
        axios.get(`${API_BASE_URL}/api/institutions`)
      ])

      setPosts(postsRes.data.map((p) => ({ ...p, category: 'InstitutionPost' })))
      setInstitutions(instsRes.data.map(inst => inst.name))
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredInstitutions = institutions.filter((inst) =>
    inst.toLowerCase().includes(query.toLowerCase())
  )

  const getPostCount = (institutionName) => {
    return posts.filter(post => post.institution === institutionName).length
  }

  const handleInstitutionClick = (institutionName) => {
    // Encode the institution name for URL
    const encodedName = encodeURIComponent(institutionName)
    navigate(`/institution/${encodedName}`)
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="loading">Loading institution posts...</div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="institutions-container">
        <div className="institutions-header">
          <h1>Institutions</h1>
          <p>Browse and post to different institutions</p>
        </div>
        <div className="institutions-search">
          <div className="search-header">
            <input
              type="text"
              placeholder="Search institutions..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="institution-search-input"
            />
          </div>
        </div>
        <div className="institutions-list">
          {filteredInstitutions.map((institution, index) => {
            const postCount = getPostCount(institution)
            return (
              <div
                key={index}
                className="institution-card"
                onClick={() => handleInstitutionClick(institution)}
                style={{ cursor: 'pointer' }}
              >
                <div className="institution-icon">🏫</div>
                <div className="institution-info">
                  <h3>{institution}</h3>
                  <p>{postCount} {postCount === 1 ? 'post' : 'posts'}</p>
                </div>
                <div className="institution-arrow">→</div>
              </div>
            )
          })}
        </div>
        {filteredInstitutions.length === 0 && (
          <div className="empty-state">No institutions found</div>
        )}
      </div>
    </MainLayout>
  )
}

export default Institutions

