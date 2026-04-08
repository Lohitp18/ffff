import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import EnrollmentSelector from "../components/EnrollmentSelector";
import Invitation from "../components/Invitation";
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
  const [otpInfo, setOtpInfo] = useState("");
  const [otp, setOtp] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [signupOtpToken, setSignupOtpToken] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [loading, setLoading] = useState(false);
  const { sendSignupOtp, verifySignupOtp, signup } = useAuth();
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
    setOtpInfo("");

    if (formData.password !== formData.confirmPassword) {
      return setError("Passwords do not match");
    }

    if (!otpRequested) {
      setSendingOtp(true);
      try {
        await sendSignupOtp(formData.phone.trim());
        setOtpRequested(true);
        setOtpInfo("OTP sent successfully.");
      } catch (err) {
        setError(err.response?.data?.message || "Could not send OTP");
      } finally {
        setSendingOtp(false);
      }
      return;
    }

    if (!signupOtpToken) {
      return setError("Please verify OTP before signing up.");
    }

    setLoading(true);
    try {
      const result = await signup({
        ...formData,
        status,
        signupOtpToken,
      });
      if (result.success) {
        navigate("/signin");
      } else {
        setError(result.message);
      }
    } catch (_err) {
      setError("An unexpected error occurred during signup");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setOtpInfo("");
    if (!formData.phone?.trim()) {
      setError("Enter your phone number first");
      return;
    }
    setSendingOtp(true);
    try {
      await sendSignupOtp(formData.phone.trim());
      setOtpInfo("OTP sent successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not resend OTP");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError("");
    setOtpInfo("");
    if (!otp.trim() || otp.trim().length !== 6) {
      return setError("Enter the 6-digit OTP");
    }
    setVerifyingOtp(true);
    try {
      const data = await verifySignupOtp(formData.phone.trim(), otp.trim());
      setSignupOtpToken(data.signupOtpToken);
      setOtpInfo("OTP verified. Click Sign Up to complete registration.");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired OTP");
    } finally {
      setVerifyingOtp(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-left-panel">
        <Invitation />
      </div>

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
              <label>Phone number *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={(e) => {
                  handleChange(e);
                  setOtpRequested(false);
                  setSignupOtpToken("");
                  setOtp("");
                  setOtpInfo("");
                }}
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
                <option value="other">Other</option>
              </select>
            </div>

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
            {otpRequested && (
              <>
                <div className="form-group">
                  <label>Enter OTP *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="6-digit OTP"
                  />
                </div>
                <div className="otp-actions">
                  <button
                    type="button"
                    className="auth-button"
                    disabled={verifyingOtp || !!signupOtpToken}
                    onClick={handleVerifyOtp}
                  >
                    {signupOtpToken
                      ? "OTP Verified ✓"
                      : verifyingOtp
                        ? "Verifying..."
                        : "Verify OTP"}
                  </button>
                  <button
                    type="button"
                    className="auth-button"
                    disabled={sendingOtp || !!signupOtpToken}
                    onClick={handleResendOtp}
                  >
                    {sendingOtp ? "Sending…" : "Resend OTP"}
                  </button>
                </div>
              </>
            )}
            {otpInfo && (
              <div className="success-message">
                {otpInfo}
              </div>
            )}
            <button type="submit" disabled={loading || sendingOtp} className="auth-button">
              {loading
                ? "Signing up..."
                : otpRequested
                  ? "Sign Up"
                  : sendingOtp
                    ? "Sending OTP..."
                    : "Submit & Send OTP"}
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
