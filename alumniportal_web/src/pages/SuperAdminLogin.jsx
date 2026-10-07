import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './AdminAuth.css'

const SuperAdminLogin = ({ onSuccess }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  // 2FA / OTP State
  const [step, setStep] = useState('credentials') // 'credentials' | 'otp' | 'needs_phone'
  const [tempToken, setTempToken] = useState('')
  const [phoneMasked, setPhoneMasked] = useState('')
  const [emailMasked, setEmailMasked] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [phoneInput, setPhoneInput] = useState('')
  const [countdown, setCountdown] = useState(0)

  const { login, verifyAdminOtp, resendAdminOtp, submitAdminPhone } = useAuth()
  const navigate = useNavigate()

  // Countdown timer for resend OTP
  useEffect(() => {
    let timer
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [countdown])

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    const trimmedEmail = email.trim().toLowerCase()
    const result = await login(trimmedEmail, password, { isAdminLogin: true })

    if (result.requiresOtp) {
      setTempToken(result.tempToken || '')
      if (result.needsPhone) {
        setStep('needs_phone')
        setError(result.message || 'Please link a phone number to receive your login OTP.')
      } else {
        setPhoneMasked(result.phoneMasked || '')
        setEmailMasked(result.emailMasked || '')
        setStep('otp')
        setCountdown(45)
        setSuccess('')
      }
    } else if (result.success) {
      const emailLower = (result.user?.email || '').toLowerCase()
      const isAdminUser =
        result.user?.role === 'admin' ||
        result.user?.role === 'superadmin' ||
        result.user?.isAdmin === true ||
        emailLower === 'patgarlohit818@gmail.com' ||
        emailLower === 'admin@alumniportal.com'

      if (isAdminUser) {
        localStorage.setItem('admin_authenticated', 'true')
        if (onSuccess) {
          onSuccess()
        } else {
          navigate('/admin')
        }
      } else {
        setError('Access denied: You do not have super administrator privileges.')
      }
    } else {
      setError(result.message || 'Invalid super admin credentials')
    }
    setLoading(false)
  }

  const handleOtpSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    if (!otpCode || otpCode.trim().length !== 6) {
      setError('Please enter the 6-digit OTP code')
      setLoading(false)
      return
    }

    const result = await verifyAdminOtp(tempToken, otpCode.trim())
    if (result.success) {
      const emailLower = (result.user?.email || '').toLowerCase()
      const isAdminUser =
        result.user?.role === 'admin' ||
        result.user?.role === 'superadmin' ||
        result.user?.isAdmin === true ||
        emailLower === 'patgarlohit818@gmail.com' ||
        emailLower === 'admin@alumniportal.com'

      if (isAdminUser) {
        localStorage.setItem('admin_authenticated', 'true')
        if (onSuccess) {
          onSuccess()
        } else {
          navigate('/admin')
        }
      } else {
        setError('Access denied: You do not have super administrator privileges.')
      }
    } else {
      setError(result.message || 'Invalid or expired OTP code')
    }
    setLoading(false)
  }

  const handleResendOtp = async () => {
    if (countdown > 0) return
    setError('')
    setSuccess('')
    setLoading(true)

    const result = await resendAdminOtp(tempToken)
    if (result.success) {
      setSuccess('A new OTP verification code has been dispatched.')
      setCountdown(45)
      if (result.emailMasked) setEmailMasked(result.emailMasked)
    } else {
      setError(result.message || 'Failed to resend OTP')
    }
    setLoading(false)
  }

  const handleSubmitPhone = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    if (!phoneInput || phoneInput.trim().replace(/\D/g, '').length < 10) {
      setError('Please enter a valid 10-digit mobile number')
      setLoading(false)
      return
    }

    const result = await submitAdminPhone(tempToken, phoneInput.trim())
    if (result.success) {
      setTempToken(result.tempToken || tempToken)
      setPhoneMasked(result.phoneMasked || '')
      if (result.emailMasked) setEmailMasked(result.emailMasked)
      setStep('otp')
      setCountdown(45)
      setSuccess('')
    } else {
      setError(result.message || 'Failed to send OTP to this phone number')
    }
    setLoading(false)
  }

  return (
    <div className="admin-auth-page">
      <div className="admin-auth-card">
        {/* Header */}
        <div className="admin-auth-header">
          <div className="admin-auth-logo-wrap">
            <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="2.2" fill="none">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <circle cx="12" cy="11" r="3" />
              <path d="M12 14v3" />
            </svg>
          </div>
          <div>
            <span className="admin-auth-badge super">Super Admin Portal</span>
          </div>
          <h1 className="admin-auth-title">
            {step === 'otp' ? 'Two-Factor Verification' : step === 'needs_phone' ? 'Register OTP Mobile' : 'Super Admin Sign In'}
          </h1>
          <p className="admin-auth-subtitle">
            {step === 'otp'
              ? 'Enter the 6-digit one-time password sent to your phone'
              : step === 'needs_phone'
              ? 'Provide your phone number to receive login OTP verification'
              : 'Secure access restricted to authorized super administrators'}
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="admin-auth-alert error">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="admin-auth-alert success">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>{success}</span>
          </div>
        )}

        {/* STEP 1: CREDENTIALS */}
        {step === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit} className="admin-auth-form">
            <div className="admin-auth-field">
              <label className="admin-auth-label">Administrator Email</label>
              <div className="admin-auth-input-wrap">
                <span className="admin-auth-input-icon">
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@alumniportal.com"
                  className="admin-auth-input"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="admin-auth-field">
              <label className="admin-auth-label">Password</label>
              <div className="admin-auth-input-wrap">
                <span className="admin-auth-input-icon">
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter administrator password"
                  className="admin-auth-input"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="admin-auth-toggle-pwd"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="admin-auth-btn-primary">
              {loading ? (
                <>
                  <span className="admin-auth-spinner" />
                  Verifying Credentials...
                </>
              ) : (
                <>Continue with OTP Verification →</>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: OTP VERIFICATION */}
        {step === 'otp' && (
          <div className="admin-otp-wrap">
            <div className="admin-otp-shield">
              <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="2.2" fill="none">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
              </svg>
            </div>

            <div className="admin-otp-info-box">
              <div style={{ marginBottom: '6px', fontWeight: 600 }}>Enter 6-digit verification code sent to:</div>
              {phoneMasked && <div>📱 <strong>{phoneMasked}</strong></div>}
              {emailMasked && <div>📧 <strong>{emailMasked}</strong></div>}
              {!phoneMasked && !emailMasked && <div><strong>Registered Mobile &amp; Email</strong></div>}
            </div>

            <form onSubmit={handleOtpSubmit} style={{ width: '100%' }}>
              <input
                type="text"
                maxLength="6"
                placeholder="••••••"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                required
                autoFocus
                className="admin-otp-input-field"
                inputMode="numeric"
                autoComplete="one-time-code"
              />

              <button type="submit" disabled={loading || otpCode.length !== 6} className="admin-auth-btn-primary">
                {loading ? (
                  <>
                    <span className="admin-auth-spinner" />
                    Validating OTP...
                  </>
                ) : (
                  <>Verify &amp; Enter Super Admin Panel</>
                )}
              </button>
            </form>

            <div className="admin-otp-actions">
              <button
                type="button"
                className="admin-otp-resend-btn"
                onClick={handleResendOtp}
                disabled={countdown > 0 || loading}
              >
                {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP'}
              </button>

              <button
                type="button"
                className="admin-otp-back-btn"
                onClick={() => {
                  setStep('credentials')
                  setOtpCode('')
                  setError('')
                  setSuccess('')
                }}
              >
                ← Back to credentials
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: ACCOUNT NEEDS PHONE */}
        {step === 'needs_phone' && (
          <form onSubmit={handleSubmitPhone} className="admin-auth-form">
            <div className="admin-auth-alert info">
              <span>This admin account does not have an OTP phone number linked yet. Please enter your mobile number to receive OTP.</span>
            </div>

            <div className="admin-auth-field">
              <label className="admin-auth-label">10-Digit Mobile Number</label>
              <div className="admin-auth-input-wrap">
                <span className="admin-auth-input-icon">
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </span>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  required
                  placeholder="e.g. 9876543210"
                  className="admin-auth-input"
                  autoFocus
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="admin-auth-btn-primary">
              {loading ? (
                <>
                  <span className="admin-auth-spinner" />
                  Sending OTP...
                </>
              ) : (
                <>Send Verification Code via SMS</>
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              <button
                type="button"
                className="admin-otp-back-btn"
                onClick={() => {
                  setStep('credentials')
                  setError('')
                }}
              >
                ← Back
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <div className="admin-auth-footer">
          <Link to="/signin">← Back to Regular User Sign In</Link>
          <div style={{ marginTop: '8px' }}>
            <Link to="/instituteadmin" style={{ color: '#38bdf8' }}>Go to Institution Admin Portal →</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SuperAdminLogin
