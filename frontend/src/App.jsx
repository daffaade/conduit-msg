import { Loader2 } from 'lucide-react'
import { useAuth } from './hooks/useAuth'
import { AuthPage } from './pages/AuthPage'
import { ChatPage } from './pages/ChatPage'

export function App() {
  const {
    user,
    cloudTime,
    isCheckingAuth,
    isSubmitting,
    authError,
    login,
    register,
    logout,
    clearError,
  } = useAuth()

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[var(--color-bg-sidebar)] text-[var(--color-primary-deep)]">
        <Loader2 className="h-7 w-7 animate-spin text-[var(--color-primary-aa)]" aria-hidden="true" />
        <p className="text-sm font-medium">Memeriksa sesi ConduitMsg...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <AuthPage
        onLogin={login}
        onRegister={register}
        isSubmitting={isSubmitting}
        authError={authError}
        clearError={clearError}
      />
    )
  }

  return <ChatPage user={user} initialCloudTime={cloudTime} onLogout={logout} />
}

export default App
