import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchCurrentUser, fetchServerTime } from '../api/authApi'
import { getStoredToken } from '../api/client'
import { formatCloudTimeOnly, parseCloudTimestampMs } from '../utils/cloudTime'

/**
 * Keeps a live clock anchored to the Cloud Database server time (SELECT NOW()).
 * Uses monotonic performance.now() delta between syncs so changing the laptop's
 * local OS clock does NOT shift the displayed Cloud Time.
 */
export function useCloudClock(initialCloudTime = null) {
  const initialMs = parseCloudTimestampMs(initialCloudTime)
  const [displayTime, setDisplayTime] = useState(() =>
    initialMs !== null ? formatCloudTimeOnly(initialMs) : '--:--:--',
  )
  const [isSynced, setIsSynced] = useState(() => initialMs !== null)
  const [isSyncing, setIsSyncing] = useState(false)
  const anchorRef = useRef({ serverMs: null, perfMs: null })

  const applyServerTime = useCallback((rawTime) => {
    const parsedMs = parseCloudTimestampMs(rawTime)
    if (parsedMs === null) return false
    anchorRef.current = {
      serverMs: parsedMs,
      perfMs: performance.now(),
    }
    setDisplayTime(formatCloudTimeOnly(parsedMs))
    setIsSynced(true)
    return true
  }, [])

  const fetchLatestCloudTime = useCallback(async () => {
    try {
      const data = await fetchServerTime()
      const raw = data?.cloud_time ?? data?.server_time
      if (raw) return raw
    } catch {
      // Fall back to /me when authenticated if /server-time is unavailable
    }

    if (getStoredToken()) {
      const data = await fetchCurrentUser()
      return data?.cloud_time ?? data?.server_time ?? null
    }
    return null
  }, [])

  const resyncNow = useCallback(async () => {
    setIsSyncing(true)
    try {
      const raw = await fetchLatestCloudTime()
      if (raw) {
        applyServerTime(raw)
      }
    } catch {
      // Keep last known synced anchor if transient failure occurs
    } finally {
      setIsSyncing(false)
    }
  }, [applyServerTime, fetchLatestCloudTime])

  useEffect(() => {
    const parsedMs = parseCloudTimestampMs(initialCloudTime)
    if (parsedMs !== null) {
      anchorRef.current = { serverMs: parsedMs, perfMs: performance.now() }
      return undefined
    }

    let active = true
    fetchLatestCloudTime()
      .then((raw) => {
        if (!active || !raw) return
        applyServerTime(raw)
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [initialCloudTime, applyServerTime, fetchLatestCloudTime])

  useEffect(() => {
    const tickId = window.setInterval(() => {
      const { serverMs, perfMs } = anchorRef.current
      if (serverMs === null || perfMs === null) return
      const elapsed = performance.now() - perfMs
      setDisplayTime(formatCloudTimeOnly(serverMs + elapsed))
    }, 1000)

    const syncId = window.setInterval(() => {
      if (document.hidden) return
      resyncNow()
    }, 30000)

    return () => {
      window.clearInterval(tickId)
      window.clearInterval(syncId)
    }
  }, [resyncNow])

  return {
    displayTime,
    isSynced,
    isSyncing,
    resyncNow,
  }
}
