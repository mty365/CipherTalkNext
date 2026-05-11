import { useState } from 'react'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import { Send } from 'lucide-react'

interface Props {
  onSend: (text: string) => void
  disabled?: boolean
}

export function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState('')

  const submit = () => {
    const text = value.trim()
    if (!text || disabled) return
    onSend(text)
    setValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <Box sx={{ mt: 2, display: 'flex', gap: 1, alignItems: 'flex-end' }}>
      <TextField
        fullWidth
        multiline
        maxRows={4}
        placeholder="输入消息，按 Enter 发送…"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        size="small"
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            backgroundColor: 'var(--bg-secondary)',
            '& fieldset': { borderColor: 'var(--border-color)' },
            '&:hover fieldset': { borderColor: 'var(--primary)' },
            '&.Mui-focused fieldset': { borderColor: 'var(--primary)' },
          },
          '& .MuiInputBase-input': {
            color: 'var(--text-primary)',
            fontSize: 14,
          },
          '& .MuiInputBase-input::placeholder': {
            color: 'var(--text-tertiary)',
            opacity: 1,
          },
        }}
      />
      <IconButton
        onClick={submit}
        disabled={!value.trim() || disabled}
        sx={{
          bgcolor: 'var(--primary)',
          color: '#fff',
          borderRadius: 2,
          width: 40,
          height: 40,
          flexShrink: 0,
          '&:hover': { bgcolor: 'var(--primary-hover)' },
          '&.Mui-disabled': { bgcolor: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' },
        }}
      >
        <Send size={18} />
      </IconButton>
    </Box>
  )
}
