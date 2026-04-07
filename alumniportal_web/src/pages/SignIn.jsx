import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Invitation from "../components/Invitation";
import logo from "../logoo.png";
import "./Auth.css";

const SignIn = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(identifier, password);
    if (result.success) {
      navigate("/home");
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      {/* Left Panel with Interactive Slider */}
      <div className="auth-left-panel">
        <Invitation />
      </div>

      {/* Right Panel with Form */}
      <div className="auth-right-panel">
        <div className="auth-card">
          <h1>Alumni Portal</h1>
          <h2>Sign In</h2>
          {error && <div className="error-message">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email or Username</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                placeholder="Enter your email or username"
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
              />
            </div>
            <div style={{ textAlign: "right", marginTop: "-8px", marginBottom: "12px" }}>
              <Link to="/forgot-password" style={{ fontSize: "0.9rem" }}>
                Forgot password?
              </Link>
            </div>
            <button type="submit" disabled={loading} className="auth-button">
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
          <p className="auth-link">
            <b>
              {" "}
              Don't have an account? <Link to="/signup">Sign Up</Link>
            </b>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
