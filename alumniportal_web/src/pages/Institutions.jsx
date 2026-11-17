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
      const rawInsts = Array.isArray(instsRes.data) ? instsRes.data : []
      setInstitutions(rawInsts)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredInstitutions = institutions.filter((inst) => {
    const name = typeof inst === 'string' ? inst : inst.name || ''
    return name.toLowerCase().includes(query.toLowerCase())
  })

  const getPostCount = (institutionName) => {
    return posts.filter(post => post.institution === institutionName).length
  }

  const handleInstitutionClick = (institutionName) => {
    const encodedName = encodeURIComponent(institutionName)
    navigate(`/institution/${encodedName}`)
  }

  if (loading) {
    return (
      <MainLayout fullWidth={true}>
        <div className="loading" style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          Loading institutions and campus directories...
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout fullWidth={true}>
      <div className="institutions-container">
        <div className="institutions-hero-header">
          <div className="institutions-hero-content">
            <span className="institutions-category-tag">Alva's Education Foundation</span>
            <h1>Institutions & Constituent Colleges</h1>
            <p>
              Explore and connect with campuses, specialized departments, and academic institutions across Alva's.
            </p>
          </div>
          <div className="institutions-hero-stats">
            <div className="inst-stat-pill">
              <span className="stat-number">{institutions.length}</span>
              <span className="stat-label">Institutions</span>
            </div>
            <div className="inst-stat-pill">
              <span className="stat-number">{posts.length}</span>
              <span className="stat-label">Campus Posts</span>
            </div>
          </div>
        </div>

        <div className="institutions-search-bar-wrap">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" className="search-svg-icon">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search by college name, degree, or specialization..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="institution-search-input-modern"
          />
          {query && (
            <button className="search-clear-modern" onClick={() => setQuery('')}>
              ✕
            </button>
          )}
        </div>

        <div className="institutions-grid-modern">
          {filteredInstitutions.map((inst, index) => {
            const instName = typeof inst === 'string' ? inst : inst.name
            const postCount = getPostCount(instName)
            const estYear = typeof inst === 'object' && inst.establishedYear ? inst.establishedYear : '1995'

            return (
              <div
                key={index}
                className="institution-card-modern"
                onClick={() => handleInstitutionClick(instName)}
              >
                <div className="inst-card-top">
                  <div className="inst-avatar-monogram">
                    {instName.charAt(0).toUpperCase()}
                  </div>
                  <div className="inst-badge-group">
                    {estYear && <span className="inst-badge-year">Est. {estYear}</span>}
                    <span className="inst-badge-posts">{postCount} {postCount === 1 ? 'post' : 'posts'}</span>
                  </div>
                </div>

                <div className="inst-card-body">
                  <h3 className="inst-card-title">{instName}</h3>
                  <p className="inst-card-desc">
                    {typeof inst === 'object' && inst.description
                      ? inst.description
                      : `Premier constituent institution under Alva's Education Foundation, Moodubidire.`}
                  </p>
                </div>

                <div className="inst-card-footer">
                  <span className="inst-location-pill">📍 Moodubidire, Karnataka</span>
                  <span className="inst-view-btn">
                    Visit Campus →
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {filteredInstitutions.length === 0 && (
          <div className="institutions-empty-state">
            <h3>No institutions found</h3>
            <p>No colleges matched your search "{query}". Try another term.</p>
          </div>
        )}
      </div>
    </MainLayout>
  )
}

export default Institutions

