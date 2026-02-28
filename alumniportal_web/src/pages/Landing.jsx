import { useNavigate } from 'react-router-dom'
import './Landing.css'
import img from '../front.jpeg'
import logo from '../logoo.webp' // add your logo image

const Landing = () => {
  const navigate = useNavigate()

  return (
    <div className="landing-container">
      <div
        className="landing-hero"
        style={{ backgroundImage: `url(${img})` }}
      >

        {/* HEADER */}
        <div className="landing-header">
          <div className="header-center">
            <img src={logo} alt="Logo" className="header-logo" />
            <h2 className="header-title">
              Alvas Education Foundation
            </h2>
          </div>
        </div>

        <div className="landing-overlay"></div>

        <div className="landing-content glass-card">
          <h1 className="landing-title">
            <span className="highlight">Alvas Connect</span>
          </h1>

          <p className="landing-subtitle">
            Bridging Students, Alumni & Opportunities
          </p>

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