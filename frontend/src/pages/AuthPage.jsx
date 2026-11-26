import { Send } from 'lucide-react'
import { useState } from 'react'
import { LoginForm } from '../components/auth/LoginForm'
import { RegisterForm } from '../components/auth/RegisterForm'

export function AuthPage({ onLogin, onRegister, isSubmitting, authError, clearError }) {
  const [mode, setMode] = useState('login')

  const switchMode = (nextMode) => {
    clearError()
    setMode(nextMode)
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--color-bg-sidebar)] p-6">
      <section
        aria-labelledby="auth-page-heading"
        className="w-full max-w-[380px] rounded-[14px] border border-[var(--color-border)] bg-white p-7"
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3.5 flex h-11 w-11 items-center justify-center rounded-[10px] bg-[var(--color-primary-aa)] text-white">
            <Send className="h-5 w-5" strokeWidth={1.85} aria-hidden="true" />
          </div>
          <h1
            id="auth-page-heading"
            className="text-xl font-semibold text-[var(--color-text-primary)]"
          >
            {mode === 'login' ? 'Masuk ke ConduitMsg' : 'Daftar Akun ConduitMsg'}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {mode === 'login'
              ? 'Masukkan kredensial akun untuk terhubung ke server lokal.'
              : 'Buat akun baru pada Cloud Database bersama.'}
          </p>
        </div>

        {mode === 'login' ? (
          <LoginForm
            onSubmit={onLogin}
            isSubmitting={isSubmitting}
            serverError={authError}
            onSwitchToRegister={() => switchMode('register')}
          />
        ) : (
          <RegisterForm
            onSubmit={onRegister}
            isSubmitting={isSubmitting}
            serverError={authError}
            onSwitchToLogin={() => switchMode('login')}
          />
        )}
      </section>
    </main>
  )
}
