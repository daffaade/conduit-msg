import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchContacts } from '../api/chatApi'
import { extractApiError } from '../api/client'

const CONTACTS_POLL_MS = 12000

export function useContacts() {
  const [contacts, setContacts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const inFlightRef = useRef(false)

  const loadContacts = useCallback(async ({ silent = false } = {}) => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    if (!silent) {
      setIsRefreshing(true)
    }
    try {
      const list = await fetchContacts()
      setContacts(list)
      setError('')
    } catch (err) {
      if (!silent) {
        setError(extractApiError(err, 'Gagal memuat daftar kontak.'))
      }
    } finally {
      inFlightRef.current = false
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    let timerId = null

    const scheduleNext = () => {
      if (!active) return
      timerId = window.setTimeout(async () => {
        if (!active) return
        if (!document.hidden) {
          await loadContacts({ silent: true })
        }
        scheduleNext()
      }, CONTACTS_POLL_MS)
    }

    const loadInitial = async () => {
      inFlightRef.current = true
      try {
        const list = await fetchContacts()
        if (!active) return
        setContacts(list)
        setError('')
      } catch {
        // Retry once after a short delay for transient network/server congestion
        await new Promise((resolve) => window.setTimeout(resolve, 1500))
        if (!active) return
        try {
          const list = await fetchContacts()
          if (!active) return
          setContacts(list)
          setError('')
        } catch (retryErr) {
          if (!active) return
          setError(extractApiError(retryErr, 'Gagal memuat daftar kontak.'))
        }
      } finally {
        inFlightRef.current = false
        if (active) {
          setIsLoading(false)
          scheduleNext()
        }
      }
    }

    loadInitial()

    return () => {
      active = false
      if (timerId !== null) window.clearTimeout(timerId)
    }
  }, [loadContacts])

  return {
    contacts,
    isLoading,
    isRefreshing,
    error,
    refreshContacts: () => loadContacts({ silent: false }),
  }
}
