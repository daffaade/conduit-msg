import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchMessages, sendMessageApi } from '../api/chatApi'
import { extractApiError } from '../api/client'
import { sortByCloudTimestamp } from '../utils/cloudTime'

const POLLING_INTERVAL_MS = 2500

export function useMessagePolling({ activeContactId, currentUserId }) {
  const [threadState, setThreadState] = useState({
    contactId: null,
    messages: [],
    failedMessages: [],
    error: '',
    loaded: false,
  })
  const [isSending, setIsSending] = useState(false)
  const activeContactRef = useRef(activeContactId)

  useEffect(() => {
    activeContactRef.current = activeContactId
  }, [activeContactId])

  const loadMessages = useCallback(async (contactId, { silent = false } = {}) => {
    if (!contactId) return
    try {
      const list = await fetchMessages(contactId)
      if (activeContactRef.current !== contactId) return
      setThreadState((prev) => ({
        contactId,
        messages: sortByCloudTimestamp(list, 'sent_at'),
        failedMessages: prev.contactId === contactId ? prev.failedMessages : [],
        error: '',
        loaded: true,
      }))
    } catch (err) {
      if (activeContactRef.current !== contactId) return
      if (!silent) {
        setThreadState((prev) => ({
          contactId,
          messages: prev.contactId === contactId ? prev.messages : [],
          failedMessages: prev.contactId === contactId ? prev.failedMessages : [],
          error: extractApiError(err, 'Gagal memuat riwayat pesan.'),
          loaded: true,
        }))
      }
    }
  }, [])

  useEffect(() => {
    if (!activeContactId) return undefined

    let active = true
    fetchMessages(activeContactId)
      .then((list) => {
        if (!active || activeContactRef.current !== activeContactId) return
        setThreadState({
          contactId: activeContactId,
          messages: sortByCloudTimestamp(list, 'sent_at'),
          failedMessages: [],
          error: '',
          loaded: true,
        })
      })
      .catch((err) => {
        if (!active || activeContactRef.current !== activeContactId) return
        setThreadState({
          contactId: activeContactId,
          messages: [],
          failedMessages: [],
          error: extractApiError(err, 'Gagal memuat riwayat pesan.'),
          loaded: true,
        })
      })

    const intervalId = window.setInterval(() => {
      loadMessages(activeContactId, { silent: true })
    }, POLLING_INTERVAL_MS)

    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [activeContactId, loadMessages])

  const sendMessage = useCallback(
    async (text) => {
      if (!activeContactId || !text.trim()) return
      setIsSending(true)
      const tempId = `failed-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      try {
        const created = await sendMessageApi({
          receiverId: activeContactId,
          messageText: text.trim(),
        })
        if (created && created.id) {
          setThreadState((prev) => {
            const base = prev.contactId === activeContactId ? prev.messages : []
            const exists = base.some((m) => m.id === created.id)
            const next = exists ? base : [...base, created]
            return {
              ...prev,
              contactId: activeContactId,
              messages: sortByCloudTimestamp(next, 'sent_at'),
              loaded: true,
            }
          })
        } else {
          await loadMessages(activeContactId, { silent: true })
        }
      } catch {
        setThreadState((prev) => ({
          ...prev,
          contactId: activeContactId,
          failedMessages: [
            ...(prev.contactId === activeContactId ? prev.failedMessages : []),
            {
              id: tempId,
              sender_id: currentUserId,
              receiver_id: activeContactId,
              message_text: text.trim(),
              sent_at: null,
              _status: 'failed',
            },
          ],
          loaded: true,
        }))
      } finally {
        setIsSending(false)
      }
    },
    [activeContactId, currentUserId, loadMessages],
  )

  const retryFailedMessage = useCallback(
    async (failedMsg) => {
      setThreadState((prev) => ({
        ...prev,
        failedMessages: prev.failedMessages.filter((item) => item.id !== failedMsg.id),
      }))
      await sendMessage(failedMsg.message_text)
    },
    [sendMessage],
  )

  const isCurrentContact = threadState.contactId === activeContactId
  return {
    messages: isCurrentContact
      ? [...threadState.messages, ...threadState.failedMessages]
      : [],
    isLoading: Boolean(activeContactId) && (!isCurrentContact || !threadState.loaded),
    isSending,
    error: isCurrentContact ? threadState.error : '',
    sendMessage,
    retryFailedMessage,
  }
}
