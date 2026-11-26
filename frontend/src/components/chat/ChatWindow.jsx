import { Fragment, useEffect, useRef } from 'react'
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
  onBackMobile,
  cloudTimeDisplay,
  isCloudSynced,
  isCloudSyncing,
  onRefreshClock,
  onOpenBackup,
}) {
  const bottomAnchorRef = useRef(null)
  const prevCountRef = useRef(0)

  useEffect(() => {
    const supportsInitialTarget =
      typeof CSS !== 'undefined' &&
      typeof CSS.supports === 'function' &&
      CSS.supports('scroll-initial-target', 'nearest')

    const isInitialLoad = prevCountRef.current === 0 && messages.length > 0
    const hasNewMessages = messages.length > prevCountRef.current
    prevCountRef.current = messages.length

    if (bottomAnchorRef.current && ((isInitialLoad && !supportsInitialTarget) || hasNewMessages)) {
      bottomAnchorRef.current.scrollIntoView({
        behavior: isInitialLoad ? 'instant' : 'smooth',
        block: 'end',
      })
    }
  }, [messages.length, contact?.id])

  useEffect(() => {
    prevCountRef.current = 0
  }, [contact?.id])

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-[var(--color-bg-subtle)]">
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
        <div className="flex flex-1 items-center justify-center p-6 text-center">
          <p className="rounded-[10px] border border-[var(--color-border)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--color-text-secondary)]">
            Pilih kontak di panel kiri untuk membuka percakapan.
          </p>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            <div className="mx-auto flex min-h-full w-full max-w-[760px] flex-col gap-2">
              {isLoading && messages.length === 0 ? (
                <div className="my-auto text-center text-sm text-[var(--color-text-muted)]">
                  Memuat riwayat pesan dari Cloud Database...
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
                  const currDateKey = getCloudDateKey(msg.sent_at)
                  const prevDateKey = prevMsg ? getCloudDateKey(prevMsg.sent_at) : null
                  const showDateDivider = Boolean(currDateKey && currDateKey !== prevDateKey)

                  return (
                    <Fragment key={msg.id}>
                      {showDateDivider && (
                        <div className="my-2 flex justify-center">
                          <span className="rounded-[6px] border border-[var(--color-border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)]">
                            {formatCloudDateLabel(msg.sent_at)}
                          </span>
                        </div>
                      )}
                      <MessageBubble
                        message={msg}
                        isOutgoing={Number(msg.sender_id) === Number(currentUserId)}
                        isLatest={index === messages.length - 1}
                        onRetry={onRetryMessage}
                      />
                    </Fragment>
                  )
                })
              )}
              <div ref={bottomAnchorRef} aria-hidden="true" />
            </div>
          </div>

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
