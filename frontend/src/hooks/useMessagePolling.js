import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchMessages, sendMessageApi } from '../api/chatApi'
import { extractApiError } from '../api/client'
import { sortByCloudTimestamp } from '../utils/cloudTime'

const POLLING_INTERVAL_MS = 2500

export function useMessagePolling({ activeContactId, currentUserId }) {
  const [threadState, setThreadState] = useState({
    contactId: null,
    messages: [],
    pendingMessages: [],
    error: '',
    loaded: false,
  })
  const [isSending, setIsSending] = useState(false)
  const activeContactRef = useRef(activeContactId)
  const isPollingRef = useRef(false)

  useEffect(() => {
    activeContactRef.current = activeContactId
  }, [activeContactId])

  const loadMessages = useCallback(async (contactId, { silent = false } = {}) => {
    if (!contactId || isPollingRef.current) return
    isPollingRef.current = true
    try {
      const list = await fetchMessages(contactId)
      if (activeContactRef.current !== contactId) return
      setThreadState((prev) => ({
        contactId,
        messages: sortByCloudTimestamp(list, 'sent_at'),
        pendingMessages: prev.contactId === contactId ? prev.pendingMessages : [],
        error: '',
        loaded: true,
      }))
    } catch (err) {
      if (activeContactRef.current !== contactId) return
      if (!silent) {
        setThreadState((prev) => ({
          contactId,
          messages: prev.contactId === contactId ? prev.messages : [],
          pendingMessages: prev.contactId === contactId ? prev.pendingMessages : [],
          error: extractApiError(err, 'Gagal memuat riwayat pesan.'),
          loaded: true,
        }))
      }
    } finally {
      isPollingRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!activeContactId) return undefined

    let active = true
    let timerId = null

    const scheduleNext = () => {
      if (!active) return
      timerId = window.setTimeout(async () => {
        if (!active || activeContactRef.current !== activeContactId) return
        if (!document.hidden) {
          await loadMessages(activeContactId, { silent: true })
        }
        scheduleNext()
      }, POLLING_INTERVAL_MS)
    }

    fetchMessages(activeContactId)
      .then((list) => {
        if (!active || activeContactRef.current !== activeContactId) return
        setThreadState({
          contactId: activeContactId,
          messages: sortByCloudTimestamp(list, 'sent_at'),
          pendingMessages: [],
          error: '',
          loaded: true,
        })
      })
      .catch((err) => {
        if (!active || activeContactRef.current !== activeContactId) return
        setThreadState({
          contactId: activeContactId,
          messages: [],
          pendingMessages: [],
          error: extractApiError(err, 'Gagal memuat riwayat pesan.'),
          loaded: true,
        })
      })
      .finally(() => {
        if (active) scheduleNext()
      })

    return () => {
      active = false
      if (timerId !== null) window.clearTimeout(timerId)
    }
  }, [activeContactId, loadMessages])

  const sendMessage = useCallback(
    async (text) => {
      const trimmed = text.trim()
      if (!activeContactId || !trimmed) return
      const targetContactId = activeContactId
      const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

      setIsSending(true)
      setThreadState((prev) => ({
        ...prev,
        contactId: targetContactId,
        pendingMessages: [
          ...(prev.contactId === targetContactId ? prev.pendingMessages : []),
          {
            id: tempId,
            sender_id: currentUserId,
            receiver_id: targetContactId,
            message_text: trimmed,
            sent_at: null,
            _status: 'sending',
          },
        ],
        loaded: true,
      }))

      try {
        const created = await sendMessageApi({
          receiverId: targetContactId,
          messageText: trimmed,
        })

        if (activeContactRef.current !== targetContactId) return

        if (created && created.id) {
          setThreadState((prev) => {
            if (prev.contactId !== targetContactId) return prev
            const exists = prev.messages.some((m) => m.id === created.id)
            const nextMessages = exists ? prev.messages : [...prev.messages, created]
            return {
              ...prev,
              messages: sortByCloudTimestamp(nextMessages, 'sent_at'),
              pendingMessages: prev.pendingMessages.filter((item) => item.id !== tempId),
              loaded: true,
            }
          })
        } else {
          setThreadState((prev) => ({
            ...prev,
            pendingMessages: prev.pendingMessages.filter((item) => item.id !== tempId),
          }))
          await loadMessages(targetContactId, { silent: true })
        }
      } catch {
        if (activeContactRef.current !== targetContactId) return
        setThreadState((prev) => ({
          ...prev,
          contactId: targetContactId,
          pendingMessages: prev.pendingMessages.map((item) =>
            item.id === tempId ? { ...item, _status: 'failed' } : item,
          ),
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
        pendingMessages: prev.pendingMessages.filter((item) => item.id !== failedMsg.id),
      }))
      await sendMessage(failedMsg.message_text)
    },
    [sendMessage],
  )

  const dismissFailedMessage = useCallback((failedMsg) => {
    setThreadState((prev) => ({
      ...prev,
      pendingMessages: prev.pendingMessages.filter((item) => item.id !== failedMsg.id),
    }))
  }, [])

  const isCurrentContact = threadState.contactId === activeContactId
  return {
    messages: isCurrentContact
      ? [...threadState.messages, ...threadState.pendingMessages]
      : [],
    isLoading: Boolean(activeContactId) && (!isCurrentContact || !threadState.loaded),
    isSending,
    error: isCurrentContact ? threadState.error : '',
    sendMessage,
    retryFailedMessage,
    dismissFailedMessage,
  }
}
