import { useState } from 'react'
import type { Message } from '../types'

const WELCOME: Message = {
  id: 'welcome',
  role: 'assistant',
  content: '你好！我是你的 AI 助手，可以帮你分析聊天记录、回答问题或提供建议。请告诉我你想了解什么？',
}

export function useAgentChat() {
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [loading, setLoading] = useState(false)

  const send = (text: string) => {
    if (!text.trim() || loading) return

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    // TODO: 接入真实 AI 接口
    setTimeout(() => {
      const reply: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: 'Agent 功能正在开发中，敬请期待。',
      }
      setMessages(prev => [...prev, reply])
      setLoading(false)
    }, 800)
  }

  return { messages, loading, send }
}
