import { apiClient } from './client'

export async function registerUser({ username, email, password }) {
  const { data } = await apiClient.post('/register', {
    username,
    email,
    password,
  })
  return data
}

export async function loginUser({ login, password }) {
  const { data } = await apiClient.post('/login', {
    login,
    password,
  })
  return data
}

export async function logoutUser() {
  const { data } = await apiClient.post('/logout')
  return data
}

export async function fetchCurrentUser() {
  const { data } = await apiClient.get('/me')
  return data
}
