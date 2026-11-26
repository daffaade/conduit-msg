import { useCallback, useEffect, useState } from 'react'
import { fetchContacts } from '../api/chatApi'
import { extractApiError } from '../api/client'

const CONTACTS_POLL_MS = 12000

export function useContacts() {
  const [contacts, setContacts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')

  const loadContacts = useCallback(async ({ silent = false } = {}) => {
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
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    fetchContacts()
      .then((list) => {
        if (!active) return
        setContacts(list)
        setError('')
      })
      .catch((err) => {
        if (!active) return
        setError(extractApiError(err, 'Gagal memuat daftar kontak.'))
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    const intervalId = window.setInterval(() => {
      if (document.hidden) return
      loadContacts({ silent: true })
    }, CONTACTS_POLL_MS)

    return () => {
      active = false
      window.clearInterval(intervalId)
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
