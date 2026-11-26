import { RotateCcw } from 'lucide-react'
import { formatCloudBubbleTime } from '../../utils/cloudTime'

export function MessageBubble({ message, isOutgoing, isLatest, onRetry }) {
  const bubbleTime = message.sent_at
    ? formatCloudBubbleTime(message.sent_at)
    : message._status === 'sending'
      ? '...'
      : ''

  return (
    <div
      className={`flex max-w-[82%] flex-col sm:max-w-[68%] ${
        isOutgoing ? 'self-end items-end' : 'self-start items-start'
      } ${isLatest ? 'chat-scroll-target' : ''}`}
    >
      <div
        style={{ boxShadow: 'var(--shadow-bubble)' }}
        className={`px-3.5 py-2.5 text-[15px] leading-[1.45] break-words whitespace-pre-wrap ${
          isOutgoing
            ? 'rounded-[12px] rounded-br-[4px] border border-[var(--color-primary-border)] bg-[var(--color-primary-soft)] text-[var(--color-text-primary)]'
            : 'rounded-[12px] rounded-bl-[4px] border border-[var(--color-border)] bg-white text-[var(--color-text-primary)]'
        } ${message._status === 'failed' ? 'opacity-80' : ''}`}
      >
        <span>{message.message_text}</span>
        {bubbleTime && message._status !== 'failed' && (
          <span
            title="Waktu tercatat di Cloud Database"
            className={`tabular-nums float-right mt-1.5 ml-3 inline-block text-xs leading-none select-none ${
              isOutgoing
                ? 'text-[var(--color-primary-deep)]'
                : 'text-[var(--color-text-muted)]'
            }`}
          >
            {bubbleTime}
          </span>
        )}
      </div>

      {message._status === 'failed' && (
        <button
          type="button"
          onClick={() => onRetry?.(message)}
          className="mt-1 inline-flex cursor-pointer items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-danger)] transition-colors hover:bg-[var(--color-danger-soft)] focus-visible:outline-2 focus-visible:outline-[var(--color-danger)]"
        >
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
          <span>Gagal terkirim · Kirim ulang</span>
        </button>
      )}
    </div>
  )
}
