import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Landing.css'
// import img from '../front.jpeg'
import hero from '../hero.mp4'
import logo from '../logoo.png' // add your logo image

const Landing = () => {
  const navigate = useNavigate()
  const { user, loading, token } = useAuth()

  useEffect(() => {
    if (!loading && token && user) {
      navigate('/home', { replace: true })
    }
  }, [loading, token, user, navigate])

  return (
    <div className="landing-container">
      <div
        className="landing-hero"
        // style={{ backgroundImage: `url(${img})` }}
        
      >
 <video
    className="landing-video"
    src={hero}
    autoPlay
    muted
    loop
    playsInline
  />
        {/* HEADER */}
        <div className="landing-header">
          <div className="header-center">
            <img src={logo} alt="Logo" className="header-logo" />
            <div className="header-text">
              <h1 className="header-title" >
               ALVA'S EDUCATION FOUNDATION
              </h1>
              <h2 className="header-subtitle">
                ALUMNI PORTAL
              </h2>
            </div>
          </div>
        </div>

        <div className="landing-overlay"></div>

        <div className="landing-content glass-card">
          <h1 className="landing-title">
            
          </h1>

         

          <div className="landing-buttons">
            <button
              className="landing-btn landing-btn-primary"
              onClick={() => navigate('/signin')}
            >
              Sign In
            </button>

            <button
              className="landing-btn landing-btn-secondary"
              onClick={() => navigate('/signup')}
            >
              Sign Up
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

export default Landing