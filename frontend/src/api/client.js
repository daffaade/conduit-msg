import axios from 'axios'

const TOKEN_STORAGE_KEY = 'conduitmsg_token'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 15000,
})

export function getStoredToken() {
  return window.localStorage.getItem(TOKEN_STORAGE_KEY)
}

export function setStoredToken(token) {
  if (token) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token)
  } else {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY)
  }
}

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = String(error.config?.url || '')
    if (error.response?.status === 401 && !requestUrl.includes('/login')) {
      setStoredToken(null)
      window.dispatchEvent(new CustomEvent('conduitmsg:unauthorized'))
    }
    return Promise.reject(error)
  },
)

export function extractApiError(error, fallback = 'Terjadi kesalahan pada server.') {
  const data = error?.response?.data
  if (data?.errors && typeof data.errors === 'object') {
    const firstKey = Object.keys(data.errors)[0]
    const firstVal = data.errors[firstKey]
    if (Array.isArray(firstVal) && firstVal.length > 0) {
      return firstVal[0]
    }
  }
  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message
  }
  if (error?.code === 'ERR_NETWORK') {
    return 'Tidak dapat terhubung ke Application Server lokal. Pastikan Laravel berjalan.'
  }
  return fallback
}
