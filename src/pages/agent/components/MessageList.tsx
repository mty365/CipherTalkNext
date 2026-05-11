import { useEffect, useRef } from 'react'
import Paper from '@mui/material/Paper'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'
import type { Message } from '../types'

interface Props {
  messages: Message[]
  loading: boolean
}

export function MessageList({ messages, loading }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  return (
    <Paper
      variant="outlined"
      sx={{
        flex: 1,
        overflowY: 'auto',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        borderRadius: 2,
        borderColor: 'var(--border-color)',
        backgroundColor: 'var(--bg-primary)',
      }}
    >
      {messages.map(msg => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      {loading && <TypingIndicator />}
      <div ref={bottomRef} />
    </Paper>
  )
}
