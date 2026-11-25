import { useCallback, useEffect, useState } from 'react'
import {
  fetchCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
} from '../api/authApi'
import {
  extractApiError,
  getStoredToken,
  setStoredToken,
} from '../api/client'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [cloudTime, setCloudTime] = useState(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(() => Boolean(getStoredToken()))
  const [authError, setAuthError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const syncSession = useCallback(async () => {
    const token = getStoredToken()
    if (!token) {
      setUser(null)
      setCloudTime(null)
      setIsCheckingAuth(false)
      return
    }
    try {
      const data = await fetchCurrentUser()
      setUser(data?.user ?? data)
      if (data?.cloud_time || data?.server_time) {
        setCloudTime(data.cloud_time ?? data.server_time)
      }
    } catch {
      setStoredToken(null)
      setUser(null)
      setCloudTime(null)
    } finally {
      setIsCheckingAuth(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    const token = getStoredToken()
    if (!token) return undefined

    fetchCurrentUser()
      .then((data) => {
        if (!active) return
        setUser(data?.user ?? data)
        if (data?.cloud_time || data?.server_time) {
          setCloudTime(data.cloud_time ?? data.server_time)
        }
      })
      .catch(() => {
        if (!active) return
        setStoredToken(null)
        setUser(null)
        setCloudTime(null)
      })
      .finally(() => {
        if (active) setIsCheckingAuth(false)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null)
      setCloudTime(null)
    }
    window.addEventListener('conduitmsg:unauthorized', handleUnauthorized)
    return () => {
      window.removeEventListener('conduitmsg:unauthorized', handleUnauthorized)
    }
  }, [])

  const login = useCallback(async ({ login: loginId, password }) => {
    setAuthError('')
    setIsSubmitting(true)
    try {
      const data = await loginUser({ login: loginId.trim(), password })
      const token = data?.token ?? data?.access_token
      if (token) {
        setStoredToken(token)
      }
      if (data?.user) {
        setUser(data.user)
      } else {
        await syncSession()
      }
      if (data?.cloud_time || data?.server_time) {
        setCloudTime(data.cloud_time ?? data.server_time)
      }
      return true
    } catch (error) {
      setAuthError(extractApiError(error, 'Login gagal. Periksa kembali kredensial Anda.'))
      return false
    } finally {
      setIsSubmitting(false)
    }
  }, [syncSession])

  const register = useCallback(async ({ username, email, password }) => {
    setAuthError('')
    setIsSubmitting(true)
    try {
      const data = await registerUser({
        username: username.trim(),
        email: email.trim(),
        password,
      })
      const token = data?.token ?? data?.access_token
      if (token) {
        setStoredToken(token)
      }
      if (data?.user) {
        setUser(data.user)
      } else if (token) {
        await syncSession()
      }
      if (data?.cloud_time || data?.server_time) {
        setCloudTime(data.cloud_time ?? data.server_time)
      }
      return true
    } catch (error) {
      setAuthError(extractApiError(error, 'Registrasi gagal. Periksa kembali data yang dimasukkan.'))
      return false
    } finally {
      setIsSubmitting(false)
    }
  }, [syncSession])

  const logout = useCallback(async () => {
    try {
      await logoutUser()
    } catch {
      // Ignore network/token errors during logout
    } finally {
      setStoredToken(null)
      setUser(null)
      setCloudTime(null)
      setAuthError('')
    }
  }, [])

  const clearError = useCallback(() => setAuthError(''), [])

  return {
    user,
    cloudTime,
    isCheckingAuth,
    isSubmitting,
    authError,
    login,
    register,
    logout,
    clearError,
    refreshMe: syncSession,
  }
}
