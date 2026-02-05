import { useNavigate } from 'react-router-dom'
import './Landing.css'

const Landing = () => {
  const navigate = useNavigate()

  return (
    <div className="landing-container">
      {/* Large Image at Top */}
      <div className="landing-image-section">
        <img 
          src="/alumni-signin.jpg" 
          alt="Alva's Alumni Network" 
          className="landing-hero-image"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
        <div className="landing-image-placeholder" style={{display: 'none'}}>
          <span className="placeholder-icon">🎓</span>
        </div>
      </div>

      {/* Content Section */}
      <div className="landing-content">
        {/* Alvas Connect Text */}
        <h1 className="landing-title">Alvas Connect</h1>
        
        {/* Sign In and Sign Up Buttons */}
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
  )
}

export default Landing

