import { useCallback, useState } from 'react'
import { fetchBackupLogsApi, requestBackupApi } from '../api/backupApi'
import { extractApiError } from '../api/client'
import { sortByCloudTimestamp } from '../utils/cloudTime'

export function useBackup() {
  const [logs, setLogs] = useState([])
  const [isLoadingLogs, setIsLoadingLogs] = useState(false)
  const [isTriggering, setIsTriggering] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [lastCounts, setLastCounts] = useState(null)

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
      const fileName =
        result?.file_name ?? result?.backup_log?.file_name ?? result?.log?.file_name
      const counts = result?.counts ?? null
      setLastCounts(counts)

      const summary =
        counts && typeof counts === 'object'
          ? ` (${counts.users ?? 0} pengguna, ${counts.messages ?? 0} pesan)`
          : ''
      setFeedback({
        type: 'success',
        text: fileName
          ? `Backup tersimpan di PC Backup Storage: ${fileName}${summary}.`
          : `Backup berhasil disimpan ke PC Backup Storage${summary}.`,
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
    lastCounts,
    loadLogs,
    triggerBackup,
    clearFeedback,
  }
}
