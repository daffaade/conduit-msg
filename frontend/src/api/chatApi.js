import { apiClient } from './client'

export async function fetchContacts() {
  const { data } = await apiClient.get('/contacts')
  return Array.isArray(data) ? data : (data?.contacts ?? data?.data ?? [])
}

export async function fetchMessages(userId) {
  const { data } = await apiClient.get(`/messages/${userId}`)
  return Array.isArray(data) ? data : (data?.messages ?? data?.data ?? [])
}

export async function sendMessageApi({ receiverId, messageText }) {
  const { data } = await apiClient.post('/messages', {
    receiver_id: receiverId,
    message_text: messageText,
  })
  if (data?.data && typeof data.data === 'object') {
    return data.data
  }
  if (data?.message && typeof data.message === 'object') {
    return data.message
  }
  return data
}
