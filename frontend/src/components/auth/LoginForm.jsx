import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useState } from 'react'

export function LoginForm({ onSubmit, isSubmitting, serverError, onSwitchToRegister }) {
  const [loginValue, setLoginValue] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [invalidFields, setInvalidFields] = useState({ login: false, password: false })

  const handleFieldValidation = (field, el) => {
    setInvalidFields((prev) => ({ ...prev, [field]: !el.validity.valid }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const form = event.currentTarget
    if (!form.checkValidity()) {
      const loginEl = form.elements.namedItem('login')
      const passEl = form.elements.namedItem('password')
      setInvalidFields({
        login: loginEl ? !loginEl.validity.valid : false,
        password: passEl ? !passEl.validity.valid : false,
      })
      form.reportValidity()
      return
    }
    onSubmit({ login: loginValue, password })
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
          htmlFor="login-identifier"
          className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]"
        >
          Username atau Email
        </label>
        <input
          id="login-identifier"
          name="login"
          type="text"
          value={loginValue}
          onChange={(e) => {
            setLoginValue(e.target.value)
            if (invalidFields.login) handleFieldValidation('login', e.target)
          }}
          onBlur={(e) => handleFieldValidation('login', e.target)}
          autoComplete="username"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          enterKeyHint="next"
          required
          aria-invalid={invalidFields.login ? 'true' : 'false'}
          aria-describedby={invalidFields.login ? 'login-identifier-error' : undefined}
          placeholder="username atau email@domain.com"
          className="field-input h-11 w-full rounded-[10px] border border-[var(--color-border)] bg-white px-3.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/25"
        />
        <div id="login-identifier-error" className="field-error-msg">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Error: Masukkan username atau alamat email akun Anda.</span>
        </div>
      </div>

      <div>
        <label
          htmlFor="login-password"
          className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]"
        >
          Password
        </label>
        <div className="relative">
          <input
            id="login-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (invalidFields.password) handleFieldValidation('password', e.target)
            }}
            onBlur={(e) => handleFieldValidation('password', e.target)}
            autoComplete="current-password"
            enterKeyHint="done"
            minLength={6}
            required
            aria-invalid={invalidFields.password ? 'true' : 'false'}
            aria-describedby={invalidFields.password ? 'login-password-error' : undefined}
            placeholder="Password"
            className="field-input h-11 w-full rounded-[10px] border border-[var(--color-border)] bg-white pr-11 pl-3.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/25"
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
        <div id="login-password-error" className="field-error-msg">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Error: Password minimal 6 karakter.</span>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-[var(--color-primary-aa)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        <span>{isSubmitting ? 'Memverifikasi...' : 'Masuk'}</span>
      </button>

      <p className="pt-2 text-center text-sm text-[var(--color-text-secondary)]">
        Belum punya akun?{' '}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="cursor-pointer font-semibold text-[var(--color-primary-deep)] underline underline-offset-2 hover:text-[var(--color-primary-aa)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
        >
          Daftar akun baru
        </button>
      </p>
    </form>
  )
}
