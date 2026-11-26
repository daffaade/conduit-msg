import { ArrowDown, MessageSquare } from 'lucide-react'
import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { formatCloudDateLabel, getCloudDateKey } from '../../utils/cloudTime'
import { Header } from '../layout/Header'
import { MessageBubble } from './MessageBubble'
import { MessageInput } from './MessageInput'

export function ChatWindow({
  contact,
  currentUserId,
  messages,
  isLoading,
  isSending,
  error,
  onSendMessage,
  onRetryMessage,
  onDismissFailedMessage,
  onBackMobile,
  cloudTimeDisplay,
  isCloudSynced,
  isCloudSyncing,
  onRefreshClock,
  onOpenBackup,
}) {
  const scrollContainerRef = useRef(null)
  const bottomAnchorRef = useRef(null)
  const prevCountRef = useRef(0)
  const isNearBottomRef = useRef(true)
  const [showScrollBottom, setShowScrollBottom] = useState(false)

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    const nearBottom = distanceFromBottom < 140
    isNearBottomRef.current = nearBottom
    setShowScrollBottom(distanceFromBottom > 200)
  }, [])

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    bottomAnchorRef.current?.scrollIntoView({ behavior, block: 'end' })
  }, [])

  useEffect(() => {
    const supportsInitialTarget =
      typeof CSS !== 'undefined' &&
      typeof CSS.supports === 'function' &&
      CSS.supports('scroll-initial-target', 'nearest')

    const isInitialLoad = prevCountRef.current === 0 && messages.length > 0
    const hasNewMessages = messages.length > prevCountRef.current
    const lastMessage = messages[messages.length - 1]
    const lastIsOwn = lastMessage && Number(lastMessage.sender_id) === Number(currentUserId)
    prevCountRef.current = messages.length

    if (
      bottomAnchorRef.current &&
      ((isInitialLoad && !supportsInitialTarget) ||
        (hasNewMessages && (isNearBottomRef.current || lastIsOwn)))
    ) {
      scrollToBottom(isInitialLoad ? 'instant' : 'smooth')
    }
  }, [messages, currentUserId, scrollToBottom])

  useEffect(() => {
    prevCountRef.current = 0
    isNearBottomRef.current = true
  }, [contact?.id])

  return (
    <main className="relative flex min-w-0 flex-1 flex-col bg-[var(--color-bg-subtle)]">
      <Header
        contact={contact}
        cloudTimeDisplay={cloudTimeDisplay}
        isCloudSynced={isCloudSynced}
        isCloudSyncing={isCloudSyncing}
        onRefreshClock={onRefreshClock}
        onOpenBackup={onOpenBackup}
        onBackMobile={onBackMobile}
      />

      {!contact ? (
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[12px] border border-[var(--color-border)] bg-white text-[var(--color-text-muted)]">
            <MessageSquare className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
            Pilih percakapan
          </p>
          <p className="mt-1 max-w-[280px] text-xs leading-relaxed text-[var(--color-text-muted)]">
            Pilih salah satu kontak di panel kiri untuk mulai bertukar pesan.
          </p>
        </div>
      ) : (
        <>
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-4 py-4 sm:px-6"
          >
            <div className="mx-auto flex min-h-full w-full max-w-[760px] flex-col">
              {isLoading && messages.length === 0 ? (
                <div className="my-auto text-center text-sm text-[var(--color-text-muted)]">
                  Memuat riwayat pesan...
                </div>
              ) : error ? (
                <div
                  role="alert"
                  className="mx-auto my-auto max-w-md rounded-[10px] border border-red-200 bg-[var(--color-danger-soft)] px-4 py-3 text-center text-sm text-[var(--color-danger)]"
                >
                  {error}
                </div>
              ) : messages.length === 0 ? (
                <div className="my-auto text-center">
                  <div className="inline-block rounded-[10px] border border-[var(--color-border)] bg-white px-4 py-3">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">
                      Belum ada pesan dengan @{contact.username}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                      Tulis pesan di bawah untuk memulai percakapan.
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const prevMsg = index > 0 ? messages[index - 1] : null
                  const nextMsg = index < messages.length - 1 ? messages[index + 1] : null
                  const currDateKey = getCloudDateKey(msg.sent_at)
                  const prevDateKey = prevMsg ? getCloudDateKey(prevMsg.sent_at) : null
                  const nextDateKey = nextMsg ? getCloudDateKey(nextMsg.sent_at) : null
                  const showDateDivider = Boolean(currDateKey && currDateKey !== prevDateKey)

                  const sameAsPrev =
                    Boolean(prevMsg) &&
                    !showDateDivider &&
                    Number(prevMsg.sender_id) === Number(msg.sender_id) &&
                    prevMsg._status !== 'failed'
                  const sameAsNext =
                    Boolean(nextMsg) &&
                    currDateKey === nextDateKey &&
                    Number(nextMsg.sender_id) === Number(msg.sender_id) &&
                    msg._status !== 'failed'

                  return (
                    <Fragment key={msg.id}>
                      {showDateDivider && (
                        <div className="my-3 flex justify-center">
                          <span className="rounded-[6px] border border-[var(--color-border)] bg-white px-3 py-1 text-xs font-medium text-[var(--color-text-secondary)]">
                            {formatCloudDateLabel(msg.sent_at)}
                          </span>
                        </div>
                      )}
                      <MessageBubble
                        message={msg}
                        isOutgoing={Number(msg.sender_id) === Number(currentUserId)}
                        isGroupStart={!sameAsPrev}
                        isGroupEnd={!sameAsNext}
                        isLatest={index === messages.length - 1}
                        onRetry={onRetryMessage}
                        onDismissFailed={onDismissFailedMessage}
                      />
                    </Fragment>
                  )
                })
              )}
              <div ref={bottomAnchorRef} aria-hidden="true" className="h-1 shrink-0" />
            </div>
          </div>

          {showScrollBottom && (
            <button
              type="button"
              onClick={() => scrollToBottom('smooth')}
              aria-label="Gulir ke pesan terbaru"
              title="Ke pesan terbaru"
              style={{ boxShadow: 'var(--shadow-bubble)' }}
              className="absolute right-5 bottom-[72px] flex h-9 w-9 cursor-pointer items-center justify-center rounded-[10px] border border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-primary-border)] hover:text-[var(--color-primary-deep)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
            >
              <ArrowDown className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            </button>
          )}

          <MessageInput
            recipientUsername={contact.username}
            onSend={onSendMessage}
            isSending={isSending}
          />
        </>
      )}
    </main>
  )
}
