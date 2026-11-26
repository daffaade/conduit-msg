import { apiClient } from './client'

export async function requestBackupApi() {
  const { data } = await apiClient.post('/backup/request')
  return data
}

export async function fetchBackupLogsApi() {
  const { data } = await apiClient.get('/backup/logs')
  return Array.isArray(data) ? data : (data?.logs ?? data?.data ?? [])
}
