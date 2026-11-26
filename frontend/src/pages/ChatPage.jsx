import { useCallback, useState } from 'react'
import { BackupModal } from '../components/backup/BackupModal'
import { ChatWindow } from '../components/chat/ChatWindow'
import { ContactSidebar } from '../components/chat/ContactSidebar'
import { useBackup } from '../hooks/useBackup'
import { useCloudClock } from '../hooks/useCloudClock'
import { useContacts } from '../hooks/useContacts'
import { useMessagePolling } from '../hooks/useMessagePolling'

export function ChatPage({ user, initialCloudTime, onLogout }) {
  const {
    contacts,
    isLoading: isLoadingContacts,
    error: contactsError,
  } = useContacts()
  const [selectedContact, setSelectedContact] = useState(null)
  const [isBackupOpen, setIsBackupOpen] = useState(false)

  const { displayTime, isSynced, isSyncing, resyncNow } = useCloudClock(initialCloudTime)
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
          isCloudSyncing={isSyncing}
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
          isCloudSyncing={isSyncing}
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
