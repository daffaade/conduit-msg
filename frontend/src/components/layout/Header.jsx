import { ChevronLeft, HardDriveDownload } from 'lucide-react'
import { CloudClockBadge } from './CloudClockBadge'

function getInitials(username) {
  if (!username) return '?'
  const parts = username.split(/[._-\s]+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return username.slice(0, 2).toUpperCase()
}

export function Header({
  contact,
  cloudTimeDisplay,
  isCloudSynced,
  onRefreshClock,
  onOpenBackup,
  onBackMobile,
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border)] bg-white px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        {contact && (
          <button
            type="button"
            onClick={onBackMobile}
            aria-label="Kembali ke daftar kontak"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-[10px] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] md:hidden"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={1.85} aria-hidden="true" />
          </button>
        )}

        {contact ? (
          <>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-aa)] text-xs font-semibold text-white">
              {getInitials(contact.username)}
            </div>
            <div className="min-w-0">
              <div className="truncate text-[15px] leading-tight font-semibold text-[var(--color-text-primary)]">
                @{contact.username}
              </div>
              <div className="truncate text-xs text-[var(--color-text-muted)]">
                Percakapan 1-on-1 · User #{contact.id}
              </div>
            </div>
          </>
        ) : (
          <div className="text-[15px] font-semibold text-[var(--color-text-primary)]">
            ConduitMsg
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <CloudClockBadge
          displayTime={cloudTimeDisplay}
          isSynced={isCloudSynced}
          onRefresh={onRefreshClock}
        />

        <button
          type="button"
          onClick={onOpenBackup}
          className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-[10px] bg-[var(--color-primary-aa)] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] sm:text-[13px]"
        >
          <HardDriveDownload className="h-4 w-4 shrink-0" strokeWidth={1.85} aria-hidden="true" />
          <span className="hidden sm:inline">Backup Data</span>
        </button>
      </div>
    </header>
  )
}
