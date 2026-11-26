import { CheckCircle2, HardDriveDownload, Loader2, RefreshCw, X, XCircle } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { formatCloudFullTimestamp } from '../../utils/cloudTime'

export function BackupModal({
  isOpen,
  onClose,
  logs,
  isLoadingLogs,
  isTriggering,
  feedback,
  onTriggerBackup,
  onRefreshLogs,
}) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen && !dialog.open) {
      dialog.showModal()
    } else if (!isOpen && dialog.open) {
      dialog.close()
    }
  }, [isOpen])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const handleClose = () => {
      dialog.returnValue = ''
      onClose()
    }

    dialog.addEventListener('close', handleClose)

    let cleanupOutside = null
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      let pressedOutside = false
      const isOutside = (e) => {
        const rect = dialog.getBoundingClientRect()
        return (
          e.clientX < rect.left ||
          e.clientX > rect.right ||
          e.clientY < rect.top ||
          e.clientY > rect.bottom
        )
      }
      const onPointerDown = (e) => {
        pressedOutside = isOutside(e)
      }
      const onPointerUp = (e) => {
        if (pressedOutside && isOutside(e) && dialog.open) {
          dialog.close()
        }
        pressedOutside = false
      }
      dialog.addEventListener('pointerdown', onPointerDown)
      dialog.addEventListener('pointerup', onPointerUp)
      cleanupOutside = () => {
        dialog.removeEventListener('pointerdown', onPointerDown)
        dialog.removeEventListener('pointerup', onPointerUp)
      }
    }

    return () => {
      dialog.removeEventListener('close', handleClose)
      cleanupOutside?.()
    }
  }, [onClose])

  return (
    <dialog
      ref={dialogRef}
      {...{ closedby: 'any' }}
      aria-labelledby="backup-modal-title"
      className="w-[min(540px,calc(100vw-32px))] rounded-[14px] border border-[var(--color-border)] bg-white p-0 text-[var(--color-text-primary)]"
      style={{ boxShadow: 'var(--shadow-modal)' }}
    >
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
        <h2
          id="backup-modal-title"
          className="text-base font-semibold text-[var(--color-text-primary)] sm:text-lg"
        >
          Desktop Backup Storage
        </h2>
        <form method="dialog">
          <button
            type="submit"
            aria-label="Tutup dialog backup"
            className="flex h-8.5 w-8.5 cursor-pointer items-center justify-center rounded-[10px] border border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
          >
            <X className="h-4 w-4" strokeWidth={1.85} aria-hidden="true" />
          </button>
        </form>
      </div>

      <div className="p-5">
        <div className="mb-4 flex flex-col gap-3 rounded-[10px] border border-[var(--color-primary-border)] bg-[var(--color-primary-soft)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-relaxed text-[var(--color-text-primary)]">
            Simpan salinan data pengguna, pesan, dan log dari Cloud Database ke penyimpanan lokal PC
            Backup Storage.
          </p>
          <button
            type="button"
            onClick={onTriggerBackup}
            disabled={isTriggering}
            className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-[var(--color-primary-aa)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isTriggering ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <HardDriveDownload className="h-4 w-4" strokeWidth={1.85} aria-hidden="true" />
            )}
            <span>{isTriggering ? 'Mencadangkan...' : 'Backup Sekarang'}</span>
          </button>
        </div>

        {feedback && (
          <div
            role="status"
            className={`mb-4 flex items-start gap-2.5 rounded-[10px] border px-3.5 py-3 text-sm ${
              feedback.type === 'success'
                ? 'border-emerald-200 bg-[var(--color-success-soft)] text-[var(--color-success)]'
                : 'border-red-200 bg-[var(--color-danger-soft)] text-[var(--color-danger)]'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        <div className="mb-2.5 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-[var(--color-text-secondary)]">
            Riwayat Permintaan Backup Anda
          </h3>
          {onRefreshLogs && (
            <button
              type="button"
              onClick={onRefreshLogs}
              disabled={isLoadingLogs}
              className="inline-flex cursor-pointer items-center gap-1 rounded-[6px] px-2 py-1 text-xs font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)] disabled:cursor-wait"
            >
              <RefreshCw
                className={`h-3 w-3 ${isLoadingLogs ? 'animate-spin text-[var(--color-primary-aa)]' : ''}`}
                strokeWidth={2}
                aria-hidden="true"
              />
              <span>Segarkan</span>
            </button>
          )}
        </div>

        <div className="max-h-[260px] space-y-2 overflow-y-auto pr-0.5">
          {isLoadingLogs && logs.length === 0 ? (
            <div className="py-8 text-center text-sm text-[var(--color-text-muted)]">
              Memuat riwayat log backup...
            </div>
          ) : logs.length === 0 ? (
            <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-sidebar)] px-4 py-6 text-center">
              <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                Belum ada riwayat backup pada akun ini
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                Klik tombol &ldquo;Backup Sekarang&rdquo; di atas untuk menyimpan salinan pertama ke
                PC Backup Storage.
              </p>
            </div>
          ) : (
            logs.map((log) => {
              const isSuccess = String(log.status).toUpperCase() === 'SUCCESS'
              return (
                <div
                  key={log.id ?? `${log.file_name}-${log.backed_up_at}`}
                  className="flex items-center justify-between gap-3 rounded-[10px] border border-[var(--color-border)] bg-white px-3.5 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="truncate font-mono text-sm font-medium text-[var(--color-text-primary)]">
                      {log.file_name || 'backup_snapshot.json'}
                    </div>
                    <div className="tabular-nums mt-0.5 text-xs text-[var(--color-text-muted)]">
                      {formatCloudFullTimestamp(log.backed_up_at)} WIB
                    </div>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-[6px] px-2.5 py-1.5 text-xs font-semibold ${
                      isSuccess
                        ? 'bg-[var(--color-success-soft)] text-[var(--color-success)]'
                        : 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]'
                    }`}
                  >
                    {isSuccess ? (
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    <span>{isSuccess ? 'SUCCESS' : 'FAILED'}</span>
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </dialog>
  )
}
