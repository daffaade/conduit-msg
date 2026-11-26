import { useCallback, useEffect, useState } from 'react'
import { fetchContacts } from '../api/chatApi'
import { extractApiError } from '../api/client'
import { BackupModal } from '../components/backup/BackupModal'
import { ChatWindow } from '../components/chat/ChatWindow'
import { ContactSidebar } from '../components/chat/ContactSidebar'
import { useBackup } from '../hooks/useBackup'
import { useCloudClock } from '../hooks/useCloudClock'
import { useMessagePolling } from '../hooks/useMessagePolling'

export function ChatPage({ user, initialCloudTime, onLogout }) {
  const [contacts, setContacts] = useState([])
  const [isLoadingContacts, setIsLoadingContacts] = useState(true)
  const [contactsError, setContactsError] = useState('')
  const [selectedContact, setSelectedContact] = useState(null)
  const [isBackupOpen, setIsBackupOpen] = useState(false)

  const { displayTime, isSynced, resyncNow } = useCloudClock(initialCloudTime)
  const {
    logs,
    isLoadingLogs,
    isTriggering,
    feedback,
    loadLogs,
    triggerBackup,
    clearFeedback,
  } = useBackup()

  const {
    messages,
    isLoading: isLoadingMessages,
    isSending,
    error: messagesError,
    sendMessage,
    retryFailedMessage,
  } = useMessagePolling({
    activeContactId: selectedContact?.id ?? null,
    currentUserId: user?.id,
  })

  useEffect(() => {
    let active = true
    fetchContacts()
      .then((list) => {
        if (!active) return
        setContacts(list)
        setContactsError('')
      })
      .catch((err) => {
        if (!active) return
        setContactsError(extractApiError(err, 'Gagal memuat daftar kontak.'))
      })
      .finally(() => {
        if (active) setIsLoadingContacts(false)
      })
    return () => {
      active = false
    }
  }, [])

  const handleOpenBackup = useCallback(() => {
    clearFeedback()
    setIsBackupOpen(true)
    loadLogs()
  }, [clearFeedback, loadLogs])

  const handleCloseBackup = useCallback(() => {
    setIsBackupOpen(false)
  }, [])

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-white">
      <div
        className={`${
          selectedContact ? 'hidden md:flex' : 'flex'
        } h-full w-full md:w-auto`}
      >
        <ContactSidebar
          user={user}
          contacts={contacts}
          selectedContactId={selectedContact?.id ?? null}
          onSelectContact={setSelectedContact}
          isLoading={isLoadingContacts}
          error={contactsError}
          cloudTimeDisplay={displayTime}
          isCloudSynced={isSynced}
          onRefreshClock={resyncNow}
          onOpenBackup={handleOpenBackup}
          onLogout={onLogout}
        />
      </div>

      <div
        className={`${
          selectedContact ? 'flex' : 'hidden md:flex'
        } h-full min-w-0 flex-1`}
      >
        <ChatWindow
          contact={selectedContact}
          currentUserId={user?.id}
          messages={messages}
          isLoading={isLoadingMessages}
          isSending={isSending}
          error={messagesError}
          onSendMessage={sendMessage}
          onRetryMessage={retryFailedMessage}
          onBackMobile={() => setSelectedContact(null)}
          cloudTimeDisplay={displayTime}
          isCloudSynced={isSynced}
          onRefreshClock={resyncNow}
          onOpenBackup={handleOpenBackup}
        />
      </div>

      <BackupModal
        isOpen={isBackupOpen}
        onClose={handleCloseBackup}
        logs={logs}
        isLoadingLogs={isLoadingLogs}
        isTriggering={isTriggering}
        feedback={feedback}
        onTriggerBackup={triggerBackup}
      />
    </div>
  )
}
