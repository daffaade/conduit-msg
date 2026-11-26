import { Lock, Mail, User as UserIcon, X, Calendar } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { getInitials } from '../../utils/avatar'
import { formatCloudFullTimestamp } from '../../utils/cloudTime'

export function ProfileModal({ isOpen, onClose, user }) {
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
      aria-labelledby="profile-modal-title"
      className="w-[min(420px,calc(100vw-32px))] rounded-[14px] border border-[var(--color-border)] bg-white p-0 text-[var(--color-text-primary)]"
      style={{ boxShadow: 'var(--shadow-modal)' }}
    >
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
        <h2
          id="profile-modal-title"
          className="text-base font-semibold text-[var(--color-text-primary)]"
        >
          Profil Pribadi
        </h2>
        <form method="dialog">
          <button
            type="submit"
            aria-label="Tutup profil pribadi"
            className="flex h-8.5 w-8.5 cursor-pointer items-center justify-center rounded-[10px] border border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
          >
            <X className="h-4 w-4" strokeWidth={1.85} aria-hidden="true" />
          </button>
        </form>
      </div>

      <div className="p-5">
        <div className="mb-4 flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-aa)] text-sm font-semibold text-white">
            {getInitials(user?.username)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-base font-semibold text-[var(--color-text-primary)]">
              @{user?.username || '-'}
            </div>
            <div className="text-xs text-[var(--color-text-muted)]">
              Sesi terautentikasi aktif
            </div>
          </div>
        </div>

        <dl className="divide-y divide-[var(--color-border)] rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-sidebar)]">
          <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
            <dt className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-muted)]">
              <Mail className="h-3.5 w-3.5 shrink-0" strokeWidth={1.85} aria-hidden="true" />
              <span>Email</span>
            </dt>
            <dd className="truncate text-sm font-medium text-[var(--color-text-primary)]">
              {user?.email || '-'}
            </dd>
          </div>

          <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
            <dt className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-muted)]">
              <UserIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.85} aria-hidden="true" />
              <span>ID Pengguna</span>
            </dt>
            <dd className="tabular-nums font-mono text-sm font-medium text-[var(--color-text-primary)]">
              #{user?.id ?? '-'}
            </dd>
          </div>

          {user?.created_at && (
            <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
              <dt className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-muted)]">
                <Calendar className="h-3.5 w-3.5 shrink-0" strokeWidth={1.85} aria-hidden="true" />
                <span>Terdaftar</span>
              </dt>
              <dd className="tabular-nums text-xs font-medium text-[var(--color-text-primary)]">
                {formatCloudFullTimestamp(user.created_at)} WIB
              </dd>
            </div>
          )}
        </dl>

        <div className="mt-4 flex items-start gap-2.5 rounded-[10px] border border-[var(--color-primary-border)] bg-[var(--color-primary-soft)] px-3.5 py-3 text-xs leading-relaxed text-[var(--color-primary-deep)]">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.85} aria-hidden="true" />
          <span>
            Informasi akun dan riwayat pesan hanya dapat diakses oleh sesi Anda. Pengguna lain hanya
            melihat username Anda di daftar kontak.
          </span>
        </div>
      </div>
    </dialog>
  )
}
