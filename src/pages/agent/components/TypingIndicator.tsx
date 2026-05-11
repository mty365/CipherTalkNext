import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { Bot } from 'lucide-react'

export function TypingIndicator() {
  return (
    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
      <Avatar
        sx={{ width: 32, height: 32, bgcolor: 'var(--primary)', color: '#fff', flexShrink: 0 }}
      >
        <Bot size={16} />
      </Avatar>
      <Box
        sx={{
          px: 2,
          py: 1.25,
          borderRadius: '4px 16px 16px 16px',
          backgroundColor: 'var(--bg-secondary)',
        }}
      >
        <Typography variant="body2" sx={{ color: 'var(--text-tertiary)' }}>
          正在思考...
        </Typography>
      </Box>
    </Box>
  )
}
