import { RotateCcw, X } from 'lucide-react'
import { formatCloudBubbleTime } from '../../utils/cloudTime'

export function MessageBubble({
  message,
  isOutgoing,
  isGroupStart = true,
  isGroupEnd = true,
  isLatest,
  onRetry,
  onDismissFailed,
}) {
  const isSending = message._status === 'sending'
  const isFailed = message._status === 'failed'
  const bubbleTime = message.sent_at
    ? formatCloudBubbleTime(message.sent_at)
    : isSending
      ? 'Mengirim...'
      : ''

  const cornerClass = isOutgoing
    ? isGroupEnd
      ? 'rounded-[12px] rounded-br-[4px]'
      : 'rounded-[12px]'
    : isGroupEnd
      ? 'rounded-[12px] rounded-bl-[4px]'
      : 'rounded-[12px]'

  return (
    <div
      className={`flex max-w-[82%] flex-col sm:max-w-[68%] ${
        isOutgoing ? 'self-end items-end' : 'self-start items-start'
      } ${isGroupStart ? 'mt-2 first:mt-0' : 'mt-0.5'} ${
        isLatest ? 'chat-scroll-target' : ''
      }`}
    >
      <div
        style={{ boxShadow: 'var(--shadow-bubble)' }}
        className={`${cornerClass} px-3.5 py-2 text-[14.5px] leading-[1.45] sm:text-[15px] ${
          isOutgoing
            ? 'border border-[var(--color-primary-border)] bg-[var(--color-primary-soft)] text-[var(--color-text-primary)]'
            : 'border border-[var(--color-border)] bg-white text-[var(--color-text-primary)]'
        } ${isFailed ? 'border-red-200 opacity-85' : ''} ${isSending ? 'opacity-85' : ''}`}
      >
        <div className="flex flex-wrap items-end justify-end gap-x-2.5 gap-y-0.5">
          <span className="min-w-0 flex-1 break-words whitespace-pre-wrap">
            {message.message_text}
          </span>
          {bubbleTime && !isFailed && (
            <span
              title={isSending ? 'Mengirim pesan ke server' : 'Waktu tercatat di Cloud Database (WIB)'}
              className={`tabular-nums shrink-0 pb-[1px] text-[11.5px] leading-none select-none ${
                isOutgoing
                  ? 'text-[var(--color-primary-deep)]'
                  : 'text-[var(--color-text-muted)]'
              }`}
            >
              {bubbleTime}
            </span>
          )}
        </div>
      </div>

      {isFailed && (
        <div className="mt-1 flex items-center gap-1">
          <button
            type="button"
            onClick={() => onRetry?.(message)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-[8px] px-2.5 py-1 text-xs font-semibold text-[var(--color-danger)] transition-colors hover:bg-[var(--color-danger-soft)] focus-visible:outline-2 focus-visible:outline-[var(--color-danger)]"
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            <span>Gagal terkirim · Kirim ulang</span>
          </button>
          {onDismissFailed && (
            <button
              type="button"
              onClick={() => onDismissFailed(message)}
              aria-label="Hapus pesan gagal"
              title="Hapus pesan gagal"
              className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-[6px] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
