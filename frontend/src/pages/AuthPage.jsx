import { Clock, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { apiClient } from '../api/client'
import { LoginForm } from '../components/auth/LoginForm'
import { RegisterForm } from '../components/auth/RegisterForm'
import { useCloudClock } from '../hooks/useCloudClock'

function BrandMark() {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--color-primary-aa)] text-white">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 6h10a4 4 0 0 1 0 8H9l-5 4V6z" />
        <path d="M14 14h4a2 2 0 0 1 2 2v4l-3-2h-3" />
      </svg>
    </div>
  )
}

export function AuthPage({ onLogin, onRegister, isSubmitting, authError, clearError }) {
  const [mode, setMode] = useState('login')
  const { displayTime, isSynced, isSyncing, resyncNow } = useCloudClock(null)

  const switchMode = (nextMode) => {
    if (nextMode === mode) return
    clearError()
    setMode(nextMode)
  }

  const serverLabel = String(apiClient.defaults.baseURL || '')
    .replace(/^https?:\/\//, '')
    .replace(/\/api\/?$/, '')

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[var(--color-bg-sidebar)] px-4 py-8">
      <div className="w-full max-w-[400px]">
        <section
          aria-labelledby="auth-page-heading"
          className="rounded-[14px] border border-[var(--color-border)] bg-white p-6 sm:p-7"
        >
          <div className="mb-5 flex items-center gap-3">
            <BrandMark />
            <div className="min-w-0">
              <h1
                id="auth-page-heading"
                className="text-lg leading-tight font-semibold text-[var(--color-text-primary)]"
              >
                ConduitMsg
              </h1>
              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                {mode === 'login'
                  ? 'Masuk untuk mengakses percakapan Anda'
                  : 'Buat akun pada Cloud Database bersama'}
              </p>
            </div>
          </div>

          <div
            role="tablist"
            aria-label="Pilih mode autentikasi"
            className="mb-5 grid grid-cols-2 gap-1 rounded-[10px] bg-[var(--color-bg-subtle)] p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              onClick={() => switchMode('login')}
              className={`h-9 cursor-pointer rounded-[8px] text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] ${
                mode === 'login'
                  ? 'bg-white text-[var(--color-text-primary)] shadow-[0_1px_2px_rgba(15,23,42,0.08)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              Masuk
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              onClick={() => switchMode('register')}
              className={`h-9 cursor-pointer rounded-[8px] text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] ${
                mode === 'register'
                  ? 'bg-white text-[var(--color-text-primary)] shadow-[0_1px_2px_rgba(15,23,42,0.08)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              Daftar
            </button>
          </div>

          {mode === 'login' ? (
            <LoginForm
              onSubmit={onLogin}
              isSubmitting={isSubmitting}
              serverError={authError}
            />
          ) : (
            <RegisterForm
              onSubmit={onRegister}
              isSubmitting={isSubmitting}
              serverError={authError}
            />
          )}
        </section>

        <footer className="mt-3.5 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-[var(--color-text-muted)]">
          <span className="truncate font-mono">{serverLabel || '127.0.0.1:8000'}</span>
          <button
            type="button"
            onClick={resyncNow}
            disabled={isSyncing}
            title="Sinkronkan ulang waktu Cloud Database"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-[6px] px-1.5 py-1 transition-colors hover:bg-white hover:text-[var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
          >
            {isSyncing ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-[var(--color-primary-aa)]" aria-hidden="true" />
            ) : (
              <Clock
                className={`h-3.5 w-3.5 ${
                  isSynced ? 'text-[var(--color-success)]' : 'text-[var(--color-text-muted)]'
                }`}
                strokeWidth={1.85}
                aria-hidden="true"
              />
            )}
            <span className="tabular-nums font-medium">
              {isSynced ? `Cloud ${displayTime} WIB` : 'Menunggu server lokal...'}
            </span>
          </button>
        </footer>
      </div>
    </main>
  )
}
