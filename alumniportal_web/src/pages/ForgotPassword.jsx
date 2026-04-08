import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Invitation from "../components/Invitation";
import "./Auth.css";

const ForgotPassword = () => {
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetOtpToken, setResetOtpToken] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    sendPasswordResetOtp,
    verifyPasswordResetOtp,
    resetPasswordWithOtp,
  } = useAuth();
  const navigate = useNavigate();

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!identifier.trim()) {
      setError("Enter your email, phone number, or username");
      return;
    }
    setSending(true);
    try {
      await sendPasswordResetOtp(identifier.trim());
      setInfo("OTP sent successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not send code");
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!otp.trim() || otp.trim().length !== 6) {
      setError("Enter the 6-digit code");
      return;
    }
    setVerifying(true);
    try {
      const data = await verifyPasswordResetOtp(identifier, otp);
      setResetOtpToken(data.resetOtpToken);
      setInfo("Verified. Choose a new password below.");
    } catch (err) {
      setError(err.response?.data?.message || "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setSubmitting(true);
    try {
      await resetPasswordWithOtp(resetOtpToken, newPassword);
      navigate("/signin", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Could not reset password");
    } finally {
      setSubmitting(false);
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
          <h2>Reset password</h2>
          <p style={{ fontSize: "0.9rem", opacity: 0.85 }}>
            Enter your registered email (OTP by email) or phone / username (OTP
            by SMS and WhatsApp). Use the 6-digit code to continue.
          </p>
          {error && <div className="error-message">{error}</div>}
          {info && (
            <div
              className="error-message"
              style={{
                background: "rgba(0,128,0,0.12)",
                borderColor: "green",
                color: "#0a5",
              }}
            >
              {info}
            </div>
          )}

          {!resetOtpToken ? (
            <form onSubmit={handleVerify}>
              <div className="form-group">
                <label>Email, phone, or username</label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  placeholder="Registered email, phone, or username"
                  disabled={verifying}
                />
              </div>
              <button
                type="button"
                className="auth-button"
                disabled={sending}
                onClick={handleSendCode}
                style={{ marginBottom: 12 }}
              >
                {sending ? "Sending…" : "Send OTP"}
              </button>
              <div className="form-group">
                <label>6-digit code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="Enter code"
                  required
                />
              </div>
              <button type="submit" disabled={verifying} className="auth-button">
                {verifying ? "Verifying…" : "Verify code"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleReset}>
              <div className="form-group">
                <label>New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="form-group">
                <label>Confirm password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="auth-button"
              >
                {submitting ? "Saving…" : "Update password"}
              </button>
            </form>
          )}

          <p className="auth-link">
            <b>
              <Link to="/signin">Back to sign in</Link>
            </b>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
