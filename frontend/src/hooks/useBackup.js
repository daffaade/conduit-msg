import { useCallback, useState } from 'react'
import { fetchBackupLogsApi, requestBackupApi } from '../api/backupApi'
import { extractApiError } from '../api/client'
import { sortByCloudTimestamp } from '../utils/cloudTime'

export function useBackup() {
  const [logs, setLogs] = useState([])
  const [isLoadingLogs, setIsLoadingLogs] = useState(false)
  const [isTriggering, setIsTriggering] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const loadLogs = useCallback(async () => {
    setIsLoadingLogs(true)
    try {
      const list = await fetchBackupLogsApi()
      const sorted = sortByCloudTimestamp(list, 'backed_up_at').reverse()
      setLogs(sorted)
    } catch (err) {
      setFeedback({
        type: 'error',
        text: extractApiError(err, 'Gagal memuat riwayat backup.'),
      })
    } finally {
      setIsLoadingLogs(false)
    }
  }, [])

  const triggerBackup = useCallback(async () => {
    setIsTriggering(true)
    setFeedback(null)
    try {
      const result = await requestBackupApi()
      const fileName = result?.file_name ?? result?.log?.file_name
      setFeedback({
        type: 'success',
        text: fileName
          ? `Backup berhasil disimpan ke PC Backup Storage (${fileName}).`
          : 'Backup berhasil disimpan ke PC Backup Storage.',
      })
      await loadLogs()
    } catch (err) {
      setFeedback({
        type: 'error',
        text: extractApiError(
          err,
          'Backup gagal. Pastikan service PC Backup Storage sedang aktif.',
        ),
      })
      await loadLogs()
    } finally {
      setIsTriggering(false)
    }
  }, [loadLogs])

  const clearFeedback = useCallback(() => setFeedback(null), [])

  return {
    logs,
    isLoadingLogs,
    isTriggering,
    feedback,
    loadLogs,
    triggerBackup,
    clearFeedback,
  }
}
