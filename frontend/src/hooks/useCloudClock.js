import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchCurrentUser } from '../api/authApi'
import { formatCloudTimeOnly, parseCloudTimestampMs } from '../utils/cloudTime'

/**
 * Keeps a live clock anchored to the Cloud Database server time (SELECT NOW()).
 * Uses monotonic performance.now() delta between syncs so changing the laptop's
 * local OS clock does NOT shift the displayed Cloud Time.
 */
export function useCloudClock(initialCloudTime) {
  const initialMs = parseCloudTimestampMs(initialCloudTime)
  const [displayTime, setDisplayTime] = useState(() =>
    initialMs !== null ? formatCloudTimeOnly(initialMs) : '--:--:--',
  )
  const [isSynced, setIsSynced] = useState(() => initialMs !== null)
  const anchorRef = useRef({ serverMs: null, perfMs: null })

  const applyServerTime = useCallback((rawTime) => {
    const parsedMs = parseCloudTimestampMs(rawTime)
    if (parsedMs === null) return
    anchorRef.current = {
      serverMs: parsedMs,
      perfMs: performance.now(),
    }
    setDisplayTime(formatCloudTimeOnly(parsedMs))
    setIsSynced(true)
  }, [])

  const resyncNow = useCallback(async () => {
    try {
      const data = await fetchCurrentUser()
      const raw = data?.cloud_time ?? data?.server_time
      if (raw) {
        applyServerTime(raw)
      }
    } catch {
      // Keep last known synced anchor if transient failure occurs
    }
  }, [applyServerTime])

  useEffect(() => {
    const parsedMs = parseCloudTimestampMs(initialCloudTime)
    if (parsedMs !== null) {
      anchorRef.current = { serverMs: parsedMs, perfMs: performance.now() }
      return undefined
    }

    let active = true
    fetchCurrentUser()
      .then((data) => {
        if (!active) return
        const raw = data?.cloud_time ?? data?.server_time
        if (raw) applyServerTime(raw)
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [initialCloudTime, applyServerTime])

  useEffect(() => {
    const tickId = window.setInterval(() => {
      const { serverMs, perfMs } = anchorRef.current
      if (serverMs === null || perfMs === null) return
      const elapsed = performance.now() - perfMs
      setDisplayTime(formatCloudTimeOnly(serverMs + elapsed))
    }, 1000)

    const syncId = window.setInterval(() => {
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
    resyncNow,
  }
}
