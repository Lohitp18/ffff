import { useNavigate } from 'react-router-dom'
import './Landing.css'
import img from '../banner-4.jpg'

const Landing = () => {
  const navigate = useNavigate()

  return (
    <div className="landing-container">
      {/* Hero Section with Background Image */}
      <div
        className="landing-hero"
        style={{ backgroundImage: `url(${img})` }}
      >
        {/* Overlay */}
        <div className="landing-overlay"></div>

        {/* Content */}
        <div className="landing-content">
          <h1 className="landing-title">Alvas Connect</h1>

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
