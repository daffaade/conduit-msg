import { HardDriveDownload, LogOut, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CloudClockBadge } from '../layout/CloudClockBadge'

function getInitials(username) {
  if (!username) return '?'
  const parts = username.split(/[._-\s]+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return username.slice(0, 2).toUpperCase()
}

export function ContactSidebar({
  user,
  contacts,
  selectedContactId,
  onSelectContact,
  isLoading,
  error,
  cloudTimeDisplay,
  isCloudSynced,
  isCloudSyncing,
  onRefreshClock,
  onOpenBackup,
  onLogout,
}) {
  const [query, setQuery] = useState('')

  const filteredContacts = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return contacts
    return contacts.filter((contact) =>
      String(contact.username || '')
        .toLowerCase()
        .includes(q),
    )
  }, [contacts, query])

  return (
    <aside
      aria-label="Panel akun dan daftar kontak"
      className="flex h-full w-full flex-col border-r border-[var(--color-border)] bg-white md:w-[340px] md:shrink-0"
    >
      {/* Telegram-style Top Account Utility Row */}
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-[var(--color-border)] px-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-aa)] text-xs font-semibold text-white">
            {getInitials(user?.username)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm leading-tight font-semibold text-[var(--color-text-primary)]">
              @{user?.username || 'pengguna'}
            </div>
            <div className="text-xs text-[var(--color-text-muted)]">ConduitMsg</div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {/* Mobile-only Cloud Time & Backup access when right pane is hidden */}
          <div className="md:hidden">
            <CloudClockBadge
              displayTime={cloudTimeDisplay}
              isSynced={isCloudSynced}
              isSyncing={isCloudSyncing}
              onRefresh={onRefreshClock}
            />
          </div>
          <button
            type="button"
            onClick={onOpenBackup}
            aria-label="Buka Desktop Backup Storage"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-[10px] bg-[var(--color-primary-aa)] text-white transition-colors hover:bg-[var(--color-primary-hover)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] md:hidden"
          >
            <HardDriveDownload className="h-4 w-4" strokeWidth={1.85} aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onLogout}
            title="Keluar dari sesi ini"
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] border border-[var(--color-border)] bg-white px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:border-red-200 hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" strokeWidth={1.85} aria-hidden="true" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Telegram-style Recessed Search Bar */}
      <div className="shrink-0 px-3 pt-2.5 pb-2">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]"
            strokeWidth={1.85}
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari kontak..."
            aria-label="Cari kontak berdasarkan username"
            className="h-9.5 w-full rounded-[10px] border border-transparent bg-[var(--color-bg-subtle)] pr-3 pl-9 text-sm text-[var(--color-text-primary)] outline-none transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:bg-white"
          />
        </div>
      </div>

      {/* Contact List (Chatgram Rows) */}
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {isLoading && contacts.length === 0 ? (
          <div className="space-y-1 py-1" aria-live="polite">
            <p className="px-2.5 py-1.5 text-xs text-[var(--color-text-muted)]">
              Memuat daftar kontak...
            </p>
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="flex animate-pulse items-center gap-3 rounded-[10px] px-3 py-2.5"
              >
                <div className="h-10 w-10 rounded-full bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-28 rounded bg-slate-200" />
                  <div className="h-3 w-16 rounded bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div
            role="alert"
            className="m-1 rounded-[10px] border border-red-200 bg-[var(--color-danger-soft)] p-3 text-xs text-[var(--color-danger)]"
          >
            {error}
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm font-medium text-[var(--color-text-secondary)]">
              {query ? 'Kontak tidak cocok dengan pencarian' : 'Belum ada kontak terdaftar lainnya'}
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {query
                ? 'Hapus atau ubah kata kunci di kolom pencarian.'
                : 'Daftarkan akun kedua pada perangkat lain untuk mulai bertukar pesan.'}
            </p>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {filteredContacts.map((contact) => {
              const isActive = contact.id === selectedContactId
              return (
                <li key={contact.id}>
                  <button
                    type="button"
                    onClick={() => onSelectContact(contact)}
                    aria-current={isActive ? 'true' : undefined}
                    className={`flex min-h-[56px] w-full cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] ${
                      isActive
                        ? 'bg-[var(--color-primary-aa)] text-white'
                        : 'bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]'
                    }`}
                  >
                    <div
                      className={`flex h-10.5 w-10.5 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-[var(--color-primary-soft)] text-[var(--color-primary-deep)]'
                      }`}
                    >
                      {getInitials(contact.username)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div
                        className={`truncate text-sm font-semibold ${
                          isActive ? 'text-white' : 'text-[var(--color-text-primary)]'
                        }`}
                      >
                        @{contact.username}
                      </div>
                      <div
                        className={`mt-0.5 text-xs ${
                          isActive ? 'text-white/90' : 'text-[var(--color-text-muted)]'
                        }`}
                      >
                        User #{contact.id}
                      </div>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </aside>
  )
}
