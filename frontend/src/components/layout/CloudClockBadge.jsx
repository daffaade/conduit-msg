import { Clock } from 'lucide-react'

export function CloudClockBadge({ displayTime, isSynced, onRefresh }) {
  return (
    <button
      type="button"
      onClick={onRefresh}
      title={
        isSynced
          ? 'Waktu tersinkron dengan Cloud Database (SELECT NOW()). Klik untuk sinkron ulang.'
          : 'Menyinkronkan waktu Cloud Database...'
      }
      className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-sidebar)] px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-primary-border)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary-deep)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
    >
      <Clock
        className={`h-3.5 w-3.5 shrink-0 ${
          isSynced ? 'text-[var(--color-success)]' : 'text-[var(--color-text-muted)]'
        }`}
        strokeWidth={1.85}
        aria-hidden="true"
      />
      <span className="hidden text-[var(--color-text-muted)] sm:inline">Cloud</span>
      <span className="tabular-nums text-xs font-semibold text-[var(--color-text-primary)] sm:text-[13px]">
        {displayTime}
      </span>
    </button>
  )
}
