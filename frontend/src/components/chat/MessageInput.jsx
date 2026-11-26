import { Loader2, Send } from 'lucide-react'
import { useState } from 'react'

export function MessageInput({ recipientUsername, onSend, isSending }) {
  const [text, setText] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || isSending) return
    setText('')
    await onSend(trimmed)
  }

  return (
    <div className="shrink-0 border-t border-[var(--color-border)] bg-white px-4 py-2.5">
      <form
        onSubmit={handleSubmit}
        className="mx-auto flex max-w-[760px] items-center gap-2.5"
      >
        <label htmlFor="chat-message-input" className="visually-hidden">
          Tulis pesan ke {recipientUsername}
        </label>
        <input
          id="chat-message-input"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tulis pesan..."
          autoComplete="off"
          enterKeyHint="send"
          className="h-10 flex-1 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-sidebar)] px-3.5 text-[15px] text-[var(--color-text-primary)] outline-none transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:bg-white"
        />
        <button
          type="submit"
          disabled={!text.trim() || isSending}
          aria-label="Kirim pesan"
          className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-[10px] bg-[var(--color-primary-aa)] text-white transition-colors hover:bg-[var(--color-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSending ? (
            <Loader2 className="h-4.5 w-4.5 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-4.5 w-4.5" strokeWidth={1.85} aria-hidden="true" />
          )}
        </button>
      </form>
    </div>
  )
}
