import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useState } from 'react'

export function RegisterForm({ onSubmit, isSubmitting, serverError }) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [invalidFields, setInvalidFields] = useState({
    username: false,
    email: false,
    password: false,
  })

  const handleFieldValidation = (field, el) => {
    setInvalidFields((prev) => ({ ...prev, [field]: !el.validity.valid }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const form = event.currentTarget
    if (!form.checkValidity()) {
      const userEl = form.elements.namedItem('username')
      const emailEl = form.elements.namedItem('email')
      const passEl = form.elements.namedItem('password')
      setInvalidFields({
        username: userEl ? !userEl.validity.valid : false,
        email: emailEl ? !emailEl.validity.valid : false,
        password: passEl ? !passEl.validity.valid : false,
      })
      const firstInvalid = form.querySelector(':invalid')
      firstInvalid?.focus()
      return
    }
    onSubmit({ username, email, password })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {serverError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-[10px] border border-red-200 bg-[var(--color-danger-soft)] px-3.5 py-3 text-sm text-[var(--color-danger)]"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{serverError}</span>
        </div>
      )}

      <div>
        <label
          htmlFor="register-username"
          className="mb-0.5 block text-sm font-medium text-[var(--color-text-primary)]"
        >
          Username
        </label>
        <span id="register-username-hint" className="mb-1.5 block text-xs text-[var(--color-text-muted)]">
          3–32 karakter huruf, angka, titik, atau underscore tanpa spasi
        </span>
        <input
          id="register-username"
          name="username"
          type="text"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value)
            if (invalidFields.username) handleFieldValidation('username', e.target)
          }}
          onBlur={(e) => handleFieldValidation('username', e.target)}
          autoComplete="username"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          enterKeyHint="next"
          pattern="^[a-zA-Z0-9._-]{3,32}$"
          required
          aria-invalid={invalidFields.username ? 'true' : 'false'}
          aria-describedby={
            invalidFields.username
              ? 'register-username-hint register-username-error'
              : 'register-username-hint'
          }
          placeholder="username_anda"
          className={`field-input h-11 w-full rounded-[10px] border border-[var(--color-border)] bg-white px-3.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/25 ${
            invalidFields.username ? 'user-invalid-fallback' : ''
          }`}
        />
        {invalidFields.username && (
          <div id="register-username-error" className="field-error-msg" role="alert">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Gunakan 3–32 karakter (huruf, angka, titik, garis bawah, atau tanda hubung) tanpa spasi.</span>
          </div>
        )}
      </div>

      <div>
        <label
          htmlFor="register-email"
          className="mb-0.5 block text-sm font-medium text-[var(--color-text-primary)]"
        >
          Email
        </label>
        <span id="register-email-hint" className="mb-1.5 block text-xs text-[var(--color-text-muted)]">
          Format alamat email aktif
        </span>
        <input
          id="register-email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (invalidFields.email) handleFieldValidation('email', e.target)
          }}
          onBlur={(e) => handleFieldValidation('email', e.target)}
          autoComplete="email"
          spellCheck={false}
          enterKeyHint="next"
          required
          aria-invalid={invalidFields.email ? 'true' : 'false'}
          aria-describedby={
            invalidFields.email
              ? 'register-email-hint register-email-error'
              : 'register-email-hint'
          }
          placeholder="nama@domain.com"
          className={`field-input h-11 w-full rounded-[10px] border border-[var(--color-border)] bg-white px-3.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/25 ${
            invalidFields.email ? 'user-invalid-fallback' : ''
          }`}
        />
        {invalidFields.email && (
          <div id="register-email-error" className="field-error-msg" role="alert">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Masukkan alamat email yang valid (contoh: nama@domain.com).</span>
          </div>
        )}
      </div>

      <div>
        <label
          htmlFor="register-password"
          className="mb-0.5 block text-sm font-medium text-[var(--color-text-primary)]"
        >
          Password
        </label>
        <span id="register-password-hint" className="mb-1.5 block text-xs text-[var(--color-text-muted)]">
          Minimal 6 karakter
        </span>
        <div className="relative">
          <input
            id="register-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (invalidFields.password) handleFieldValidation('password', e.target)
            }}
            onBlur={(e) => handleFieldValidation('password', e.target)}
            autoComplete="new-password"
            enterKeyHint="done"
            minLength={6}
            required
            aria-invalid={invalidFields.password ? 'true' : 'false'}
            aria-describedby={
              invalidFields.password
                ? 'register-password-hint register-password-error'
                : 'register-password-hint'
            }
            placeholder="Minimal 6 karakter"
            className={`field-input h-11 w-full rounded-[10px] border border-[var(--color-border)] bg-white pr-11 pl-3.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/25 ${
              invalidFields.password ? 'user-invalid-fallback' : ''
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
            aria-pressed={showPassword}
            className="absolute top-1/2 right-1.5 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-[8px] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            )}
          </button>
        </div>
        {invalidFields.password && (
          <div id="register-password-error" className="field-error-msg" role="alert">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Password minimal 6 karakter.</span>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-[var(--color-primary-aa)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        <span>{isSubmitting ? 'Mendaftarkan...' : 'Daftar Akun'}</span>
      </button>
    </form>
  )
}
