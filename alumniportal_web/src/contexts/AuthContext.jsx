import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(localStorage.getItem('auth_token'))

  useEffect(() => {
    if (token) {
      // Ensure axios has the token for all subsequent calls
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      // Verify token and get user info
      verifyToken()
    } else {
      setLoading(false)
    }
  }, [token])

  const verifyToken = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/users/profile`)
      setUser(response.data)
    } catch (error) {
      console.error('Token verification failed:', error)
      // Only logout on 401 (Unauthorized) or 403 (Forbidden)
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        logout()
      }
      // For other errors (network, 500), we don't logout to avoid forcing re-login
      // but we should still stop loading
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/signin`, {
        email,
        password,
      })
      const { token: newToken, _id, email: userEmail, status } = response.data
      localStorage.setItem('auth_token', newToken)
      setToken(newToken)
      // Fetch full user profile
      let finalUser = { _id, email: userEmail, status };
      try {
        const userResponse = await axios.get(`${API_BASE_URL}/api/users/profile`, {
          headers: { Authorization: `Bearer ${newToken}` }
        })
        finalUser = userResponse.data;
        setUser(finalUser)
      } catch (err) {
        // If profile fetch fails, use basic user info
        setUser(finalUser)
      }
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
      return { success: true, user: finalUser }
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

  const logout = () => {
    localStorage.removeItem('auth_token')
    setToken(null)
    setUser(null)
    delete axios.defaults.headers.common['Authorization']
  }

  const value = {
    user,
    token,
    login,
    signup,
    logout,
    loading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}


