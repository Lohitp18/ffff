import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import EnrollmentSelector from "../components/EnrollmentSelector";
import Invitation from "../components/Invitation";
import logo from "../logoo.png";
import "./Auth.css";

const SignUp = () => {
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    phone: "",
    dob: "",
    institution: "",
    program: "",
    course: "",
    specialization: "",
    year: "",
    location: "",
    currentCompany: "",
    position: "",
    totalExperience: "",
    mastersCollege: "",
    mastersCourse: "",
    entrepreneurCompany: "",
    companyType: "",
    password: "",
    confirmPassword: "",
    socialMedia: "",
  });

  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDateChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      dob: e.target.value,
    }));
  };

  const handleEnrollmentChange = (selection) => {
    setFormData((prev) => ({
      ...prev,
      ...selection,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      return setError("Passwords do not match");
    }

    setLoading(true);

    try {
      const signupData = {
        ...formData,
        status,
      };

      const result = await signup(signupData);
      if (result.success) {
        navigate("/signin");
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError("An unexpected error occurred during signup");
    } finally {
      setLoading(false);
    }
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
          <h2>Sign Up</h2>
          {error && <div className="error-message">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Enter your name"
              />
            </div>
            <div className="form-group">
              <label>Username *</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                placeholder="Choose a unique username (for login)"
              />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="Enter your email"
              />
            </div>
            <div className="form-group">
              <label>Phone Number *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                placeholder="Enter your phone number"
              />
            </div>
            <div className="form-group">
              <label>Date of Birth</label>
              <input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleDateChange}
                placeholder="Select date of birth"
              />
            </div>
            <EnrollmentSelector
              onChange={handleEnrollmentChange}
              initialData={{
                institution: formData.institution,
                program: formData.program,
                course: formData.course,
                specialization: formData.specialization,
                year: formData.year,
              }}
            />
            <div className="form-group">
              <label>Current Status *</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                required
              >
                <option value="">Select your status</option>
                <option value="working">Currently Working</option>
                <option value="masters">Doing Masters</option>
                <option value="entrepreneurs">Entrepreneurs</option>
              </select>
            </div>

            {/* Conditional fields based on status */}
            {status === "working" && (
              <>
                <div className="form-group">
                  <label>Job Location</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="Enter your job location"
                  />
                </div>
                <div className="form-group">
                  <label>Company Name</label>
                  <input
                    type="text"
                    name="currentCompany"
                    value={formData.currentCompany}
                    onChange={handleChange}
                    placeholder="Enter your company name"
                  />
                </div>
                <div className="form-group">
                  <label>Position</label>
                  <input
                    type="text"
                    name="position"
                    value={formData.position}
                    onChange={handleChange}
                    placeholder="Enter your position"
                  />
                </div>
                <div className="form-group">
                  <label>Years of Experience</label>
                  <input
                    type="number"
                    name="totalExperience"
                    value={formData.totalExperience}
                    onChange={handleChange}
                    placeholder="Enter years of experience"
                  />
                </div>
              </>
            )}

            {status === "masters" && (
              <>
                <div className="form-group">
                  <label>College Name</label>
                  <input
                    type="text"
                    name="mastersCollege"
                    value={formData.mastersCollege}
                    onChange={handleChange}
                    placeholder="Enter college name"
                  />
                </div>
                <div className="form-group">
                  <label>Course Name</label>
                  <input
                    type="text"
                    name="mastersCourse"
                    value={formData.mastersCourse}
                    onChange={handleChange}
                    placeholder="Enter course name"
                  />
                </div>
              </>
            )}

            {status === "entrepreneurs" && (
              <>
                <div className="form-group">
                  <label>Company Name</label>
                  <input
                    type="text"
                    name="entrepreneurCompany"
                    value={formData.entrepreneurCompany}
                    onChange={handleChange}
                    placeholder="Enter your company name"
                  />
                </div>
                <div className="form-group">
                  <label>Company Type</label>
                  <input
                    type="text"
                    name="companyType"
                    value={formData.companyType}
                    onChange={handleChange}
                    placeholder="Enter company type (e.g., Tech, Healthcare, etc.)"
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label>Password *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Enter your password"
              />
            </div>
            <div className="form-group">
              <label>Confirm Password *</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Confirm your password"
              />
            </div>
            <div className="form-group">
              <label>Social Media Link</label>
              <input
                type="url"
                name="socialMedia"
                value={formData.socialMedia}
                onChange={handleChange}
                placeholder="Enter social media profile URL"
              />
            </div>
            <button type="submit" disabled={loading} className="auth-button">
              {loading ? "Signing up..." : "Sign Up"}
            </button>
          </form>
          <p className="auth-link">
            <b>
              Already have an account? <Link to="/signin">Sign In</Link>
            </b>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
