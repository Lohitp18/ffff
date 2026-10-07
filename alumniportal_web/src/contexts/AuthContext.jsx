import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const AuthContext = createContext()

const AUTH_TOKEN_KEY = 'auth_token'
const AUTH_REFRESH_KEY = 'auth_refresh_token'
const AUTH_USER_KEY = 'auth_user_profile'

const API_BASE_URL = (() => {
  const configured = (import.meta.env.VITE_API_BASE_URL ?? '').trim()
  if (configured) return configured
  return import.meta.env.DEV ? 'http://localhost:5000' : ''
})()

function readCachedUser() {
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    if (!token) return null
    const raw = localStorage.getItem(AUTH_USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readCachedUser)
  const [loading, setLoading] = useState(!!localStorage.getItem(AUTH_TOKEN_KEY))
  const [token, setToken] = useState(localStorage.getItem(AUTH_TOKEN_KEY))

  const persistUser = (u) => {
    if (u) {
      try {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(u))
      } catch {
        /* ignore */
      }
    } else {
      localStorage.removeItem(AUTH_USER_KEY)
    }
  }

  const logout = useCallback((redirectPath = null) => {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(AUTH_REFRESH_KEY)
    localStorage.removeItem(AUTH_USER_KEY)
    localStorage.removeItem('admin_authenticated')
    localStorage.removeItem('institute_admin_authenticated')
    localStorage.removeItem('institute_admin_college')
    localStorage.removeItem('institute_admin_email')
    setToken(null)
    setUser(null)
    delete axios.defaults.headers.common['Authorization']
    if (redirectPath) {
      window.location.href = redirectPath
    }
  }, [])

  const verifyToken = useCallback(async () => {
    const access = localStorage.getItem(AUTH_TOKEN_KEY)
    if (!access) {
      setLoading(false)
      return
    }
    axios.defaults.headers.common['Authorization'] = `Bearer ${access}`

    try {
      const { data } = await axios.get(`${API_BASE_URL}/api/auth/verify-token`)
      if (data.valid && data.user) {
        setUser(data.user)
        persistUser(data.user)
      } else {
        logout()
      }
    } catch (error) {
      const status = error.response?.status
      if (status === 401 || status === 403) {
        logout()
      }
    } finally {
      setLoading(false)
    }
  }, [logout])

  useEffect(() => {
    const id = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const cfg = error.config
        const status = error.response?.status
        const url = cfg?.url || ''
        if (
          status !== 401 ||
          !cfg ||
          cfg._retry ||
          url.includes('/api/auth/refresh') ||
          url.includes('/api/auth/signin') ||
          url.includes('/api/auth/login') ||
          url.includes('/api/auth/signup')
        ) {
          return Promise.reject(error)
        }
        const rt = localStorage.getItem(AUTH_REFRESH_KEY)
        if (!rt) {
          logout()
          return Promise.reject(error)
        }
        cfg._retry = true
        try {
          const { data } = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
            refreshToken: rt,
          })
          const newTok = data.token
          const newRt = data.refreshToken
          localStorage.setItem(AUTH_TOKEN_KEY, newTok)
          localStorage.setItem(AUTH_REFRESH_KEY, newRt)
          setToken(newTok)
          cfg.headers = cfg.headers || {}
          cfg.headers.Authorization = `Bearer ${newTok}`
          axios.defaults.headers.common['Authorization'] = `Bearer ${newTok}`
          return axios(cfg)
        } catch {
          logout()
          return Promise.reject(error)
        }
      }
    )
    return () => axios.interceptors.response.eject(id)
  }, [logout])

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      verifyToken()
    } else {
      setLoading(false)
    }
  }, [token, verifyToken])

  const login = async (identifier, password, options = {}) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/signin`, {
        identifier,
        password,
        isAdminLogin: Boolean(options?.isAdminLogin),
      })

      if (response.data?.requiresOtp) {
        return {
          requiresOtp: true,
          tempToken: response.data.tempToken,
          phoneMasked: response.data.phoneMasked,
          emailMasked: response.data.emailMasked,
          needsPhone: response.data.needsPhone,
          message: response.data.message,
        }
      }

      const {
        token: newToken,
        refreshToken,
        _id,
        email: userEmail,
        username,
        status,
      } = response.data
      localStorage.setItem(AUTH_TOKEN_KEY, newToken)
      if (refreshToken) {
        localStorage.setItem(AUTH_REFRESH_KEY, refreshToken)
      }
      setToken(newToken)
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`

      let finalUser = { _id, email: userEmail, username, status }
      try {
        const verifyRes = await axios.get(`${API_BASE_URL}/api/auth/verify-token`, {
          headers: { Authorization: `Bearer ${newToken}` },
        })
        if (verifyRes.data?.user) {
          finalUser = verifyRes.data.user
        }
      } catch {
        /* use minimal user from login response */
      }
      setUser(finalUser)
      persistUser(finalUser)
      return { success: true, user: finalUser }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed',
      }
    }
  }

  const verifyAdminOtp = async (tempToken, code) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/admin-verify-otp`, {
        tempToken,
        code: String(code).trim(),
      })
      const {
        token: newToken,
        refreshToken,
        _id,
        email: userEmail,
        username,
        status,
        role,
        isAdmin,
        institution,
        allowedModules,
      } = response.data

      localStorage.setItem(AUTH_TOKEN_KEY, newToken)
      if (refreshToken) {
        localStorage.setItem(AUTH_REFRESH_KEY, refreshToken)
      }
      setToken(newToken)
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`

      let finalUser = { _id, email: userEmail, username, status, role, isAdmin, institution, allowedModules }
      try {
        const verifyRes = await axios.get(`${API_BASE_URL}/api/auth/verify-token`, {
          headers: { Authorization: `Bearer ${newToken}` },
        })
        if (verifyRes.data?.user) {
          finalUser = verifyRes.data.user
        }
      } catch {
        /* fallback to response data */
      }
      setUser(finalUser)
      persistUser(finalUser)
      return { success: true, user: finalUser }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'OTP verification failed',
      }
    }
  }

  const resendAdminOtp = async (tempToken) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/admin-resend-otp`, {
        tempToken,
      })
      return {
        success: true,
        message: response.data?.message || 'New OTP sent to your phone and email.',
        emailMasked: response.data?.emailMasked,
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to resend OTP',
      }
    }
  }

  const submitAdminPhone = async (tempToken, phone) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/admin-submit-phone`, {
        tempToken,
        phone,
      })
      return {
        success: true,
        tempToken: response.data?.tempToken,
        phoneMasked: response.data?.phoneMasked,
        emailMasked: response.data?.emailMasked,
        message: response.data?.message,
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to send OTP to this number',
      }
    }
  }

  const signup = async (userData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/signup`, userData)
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Signup failed',
      }
    }
  }

  const sendSignupOtp = async (phone) => {
    const res = await axios.post(`${API_BASE_URL}/api/auth/send-otp`, {
      purpose: 'signup',
      phone,
    })
    return res.data
  }

  const verifySignupOtp = async (phone, code) => {
    const res = await axios.post(`${API_BASE_URL}/api/auth/verify-otp`, {
      purpose: 'signup',
      phone,
      code: String(code).trim(),
    })
    return res.data
  }

  const sendPasswordResetOtp = async (identifier) => {
    const res = await axios.post(`${API_BASE_URL}/api/auth/forgot-password`, {
      identifier: identifier.trim(),
    })
    return res.data
  }

  const verifyPasswordResetOtp = async (identifier, code) => {
    const res = await axios.post(`${API_BASE_URL}/api/auth/verify-otp`, {
      purpose: 'password_reset',
      identifier: identifier.trim(),
      code: String(code).trim(),
    })
    return res.data
  }

  const resetPasswordWithOtp = async (resetOtpToken, newPassword) => {
    const res = await axios.post(`${API_BASE_URL}/api/auth/reset-password`, {
      resetOtpToken,
      newPassword,
    })
    return res.data
  }

  const value = {
    user,
    token,
    login,
    signup,
    logout,
    loading,
    verifyAdminOtp,
    resendAdminOtp,
    submitAdminPhone,
    sendSignupOtp,
    verifySignupOtp,
    sendPasswordResetOtp,
    verifyPasswordResetOtp,
    resetPasswordWithOtp,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
