import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { Bot, User } from 'lucide-react'
import type { Message } from '../types'

interface Props {
  message: Message
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user'

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1.5,
        flexDirection: isUser ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
      }}
    >
      <Avatar
        sx={{
          width: 32,
          height: 32,
          bgcolor: isUser ? 'var(--bg-tertiary)' : 'var(--primary)',
          color: isUser ? 'var(--text-secondary)' : '#fff',
          flexShrink: 0,
        }}
      >
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </Avatar>

      <Box
        sx={{
          maxWidth: '75%',
          px: 2,
          py: 1.25,
          borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
          backgroundColor: isUser ? 'var(--primary)' : 'var(--bg-secondary)',
          color: isUser ? '#fff' : 'var(--text-primary)',
        }}
      >
        <Typography variant="body2" sx={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {message.content}
        </Typography>
      </Box>
    </Box>
  )
}
