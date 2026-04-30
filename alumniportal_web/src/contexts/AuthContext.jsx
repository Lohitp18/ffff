import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { encryptPayload, decryptPayload } from '../utils/crypto'

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

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(AUTH_REFRESH_KEY)
    localStorage.removeItem(AUTH_USER_KEY)
    setToken(null)
    setUser(null)
    delete axios.defaults.headers.common['Authorization']
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
    
    // Add Encryption Interceptor for Outgoing Requests
    const reqId = axios.interceptors.request.use((config) => {
      // Check if it's a JSON payload and not multipart/form-data
      if (
        config.data &&
        !(config.data instanceof FormData) &&
        (config.headers['Content-Type'] === 'application/json' || !config.headers['Content-Type'])
      ) {
        try {
          const encrypted = encryptPayload(config.data);
          config.data = { payload: encrypted };
        } catch (error) {
          console.error("Encryption failed in interceptor", error);
        }
      }
      return config;
    });

    // Add Decryption Interceptor for Incoming Responses
    const resId = axios.interceptors.response.use(
      (response) => {
        if (response.data && response.data.payload) {
          try {
            const decrypted = decryptPayload(response.data.payload);
            response.data = decrypted;
          } catch (error) {
            console.error("Decryption failed in interceptor", error);
          }
        }
        return response;
      },
      (error) => {
        if (error.response && error.response.data && error.response.data.payload) {
          try {
            const decrypted = decryptPayload(error.response.data.payload);
            error.response.data = decrypted;
          } catch (err) {
            console.error("Decryption failed in error interceptor", err);
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(id);
      axios.interceptors.request.eject(reqId);
      axios.interceptors.response.eject(resId);
    }
  }, [logout])

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      verifyToken()

      // Client-side JWT Validation and Auto-logout
      try {
        const payloadStr = atob(token.split('.')[1])
        const payload = JSON.parse(payloadStr)
        const expiryTime = payload.exp * 1000
        const timeUntilExpiry = expiryTime - Date.now()

        if (timeUntilExpiry <= 0) {
          logout()
        } else {
          const timeoutId = setTimeout(() => {
            // Once the token expires, log out automatically
            logout()
            alert('Your session has expired. Please log in again.')
            window.location.href = '/signin'
          }, timeUntilExpiry)
          
          return () => clearTimeout(timeoutId)
        }
      } catch (error) {
        console.error("Invalid token format", error)
        logout()
      }

    } else {
      setLoading(false)
    }
  }, [token, verifyToken, logout])

  const login = async (identifier, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/signin`, {
        identifier,
        password,
      })
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

  const adminLogin = async (identifier, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/adminlogin`, {
        identifier,
        password,
      })
      const {
        token: newToken,
        refreshToken,
        user: loggedInUser
      } = response.data
      
      localStorage.setItem(AUTH_TOKEN_KEY, newToken)
      if (refreshToken) {
        localStorage.setItem(AUTH_REFRESH_KEY, refreshToken)
      }
      setToken(newToken)
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`

      setUser(loggedInUser)
      persistUser(loggedInUser)
      return { success: true, user: loggedInUser }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed',
      }
    }
  }

  const institutionLogin = async (identifier, password, college) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/institutionsignup`, {
        identifier,
        password,
        college
      })
      const {
        token: newToken,
        refreshToken,
        user: loggedInUser
      } = response.data
      
      localStorage.setItem(AUTH_TOKEN_KEY, newToken)
      if (refreshToken) {
        localStorage.setItem(AUTH_REFRESH_KEY, refreshToken)
      }
      setToken(newToken)
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`

      setUser(loggedInUser)
      persistUser(loggedInUser)
      return { success: true, user: loggedInUser }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed',
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
    adminLogin,
    institutionLogin,
    signup,
    logout,
    loading,
    sendSignupOtp,
    verifySignupOtp,
    sendPasswordResetOtp,
    verifyPasswordResetOtp,
    resetPasswordWithOtp,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
