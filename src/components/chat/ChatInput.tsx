'use client'

import { useState, useRef, useEffect } from 'react'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!disabled) inputRef.current?.focus()
  }, [disabled])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 border-t p-3 dark:border-gray-700">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={disabled ? 'Please wait...' : 'Ask a question about this data...'}
        disabled={disabled}
        className="flex-1 rounded border px-3 py-2 text-sm outline-none focus:border-purple-400 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="rounded bg-purple-600 px-4 py-2 text-sm text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
      >
        Send
      </button>
    </form>
  )
}
