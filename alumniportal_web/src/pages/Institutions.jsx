import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import MainLayout from '../components/MainLayout'
import './Institutions.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const Institutions = () => {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const institutions = [
    "Alva's Pre-University College, Vidyagiri",
    "Alva's Degree College, Vidyagiri",
    "Alva's Centre for Post Graduate Studies and Research, Vidyagiri",
    "Alva's College of Education, Vidyagiri",
    "Alva's College of Physical Education, Vidyagiri",
    "Alva's Institute of Engineering & Technology (AIET), Mijar",
    "Alva's Ayurvedic Medical College, Vidyagiri",
    "Alva's Homeopathic Medical College, Mijar",
    "Alva's College of Naturopathy and Yogic Science, Mijar",
    "Alva's College of Physiotherapy, Moodbidri",
    "Alva's College of Nursing, Moodbidri",
    "Alva's Institute of Nursing, Moodbidri",
    "Alva's College of Medical Laboratory Technology, Moodbidri",
    "Alva's Law College, Moodbidri",
    "Alva's College, Moodbidri (Affiliated with Mangalore University)",
    "Alva's College of Nursing (Affiliated with Rajiv Gandhi University of Health Sciences, Bangalore)",
    "Alva's Institute of Engineering & Technology (AIET) (Affiliated with Visvesvaraya Technological University, Belgaum)",
  ]

  useEffect(() => {
    loadPosts()
  }, [])

  const loadPosts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/content/institution-posts`)
      setPosts(response.data.map((p) => ({ ...p, category: 'InstitutionPost' })))
    } catch (error) {
      console.error('Failed to load institution posts:', error)
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

