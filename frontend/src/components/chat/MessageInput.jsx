import { Loader2, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export function MessageInput({ recipientUsername, onSend, isSending }) {
  const [text, setText] = useState('')
  const textareaRef = useRef(null)

  const syncHeight = (el) => {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`
  }

  useEffect(() => {
    if (window.innerWidth >= 768) {
      textareaRef.current?.focus()
    }
  }, [recipientUsername])

  const submitMessage = async () => {
    const trimmed = text.trim()
    if (!trimmed || isSending) return
    setText('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    await onSend(trimmed)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    await submitMessage()
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submitMessage()
    }
  }

  return (
    <div className="shrink-0 border-t border-[var(--color-border)] bg-white px-4 py-2.5">
      <form
        onSubmit={handleSubmit}
        className="mx-auto flex max-w-[760px] items-end gap-2.5"
      >
        <label htmlFor="chat-message-input" className="visually-hidden">
          Tulis pesan ke {recipientUsername}
        </label>
        <textarea
          ref={textareaRef}
          id="chat-message-input"
          rows={1}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            syncHeight(e.target)
          }}
          onKeyDown={handleKeyDown}
          placeholder={`Tulis pesan ke @${recipientUsername}...`}
          autoComplete="off"
          enterKeyHint="send"
          className="max-h-32 min-h-[40px] flex-1 resize-none rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-sidebar)] px-3.5 py-2 text-[15px] leading-[1.4] text-[var(--color-text-primary)] outline-none transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:bg-white"
        />
        <button
          type="submit"
          disabled={!text.trim() || isSending}
          aria-label="Kirim pesan"
          title="Kirim (Enter · Shift+Enter untuk baris baru)"
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
