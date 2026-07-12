import React, { useState, useRef, useEffect } from 'react'

function ChatBox() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: '你好！👋\n\n我是你的 GitHub 仓库智能助手。\n\n请输入 GitHub 仓库链接，我会帮你分析代码、回答问题。',
    }
  ])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState(null)
  const [streamingMessageId, setStreamingMessageId] = useState(null)
  const messagesEndRef = useRef(null)
  const threadId = useRef(crypto.randomUUID())

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingMessageId])

  // 发送消息
  const sendMessage = async () => {
    if (!input.trim() || isSending) return

    const userMessage = input.trim()
    setInput('')
    setIsSending(true)
    setError(null)

    // 添加用户消息
    const userMsg = {
      id: Date.now(),
      type: 'human',
      content: userMessage,
    }
    setMessages(prev => [...prev, userMsg])

    // 创建 AI 消息占位符
    const aiMsgId = Date.now() + 1
    setMessages(prev => [...prev, {
      id: aiMsgId,
      type: 'ai',
      content: '',
    }])
    setStreamingMessageId(aiMsgId)

    try {
      const response = await fetch('http://localhost:8000/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: {
            messages: [
              {
                type: 'human',
                content: userMessage
              }
            ]
          },
          config: {
            configurable: {
              thread_id: threadId.current
            }
          }
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let aiContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              if (parsed.type === 'text') {
                aiContent += parsed.content
                setMessages(prev => prev.map(msg =>
                  msg.id === aiMsgId ? { ...msg, content: aiContent } : msg
                ))
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', e)
            }
          }
        }
      }

    } catch (err) {
      console.error('Chat error:', err)
      setError(err.message)
      setMessages(prev => prev.map(msg =>
        msg.id === aiMsgId ? { ...msg, content: `❌ 错误：${err.message}\n\n请检查后端服务是否运行在 http://localhost:8000` } : msg
      ))
    } finally {
      setIsSending(false)
      setStreamingMessageId(null)
    }
  }

  // 处理输入
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 消息列表 */}
      <div className="space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-4 animate-fade-in ${
              msg.type === 'human' ? 'justify-end' : ''
            }`}
          >
            {/* AI 消息 */}
            {msg.type === 'ai' && (
              <div className="flex items-start gap-4 max-w-[85%]">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-tech-blue to-tech-cyan flex items-center justify-center text-xl shadow-lg">
                  🤖
                </div>
                <div className="flex-1 min-w-0">
                  <div className="backdrop-blur-md bg-panel-bg border border-tech-cyan/30 rounded-2xl rounded-tl-sm p-4 shadow-lg shadow-tech-cyan/10">
                    <p className="whitespace-pre-wrap text-gray-100 leading-relaxed font-light">
                      {msg.content}
                    </p>
                    {streamingMessageId === msg.id && (
                      <span className="inline-block w-2 h-4 ml-1 bg-tech-cyan animate-typing align-middle"></span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 用户消息 */}
            {msg.type === 'human' && (
              <div className="flex items-start gap-4 max-w-[85%]">
                <div className="flex-1 text-right">
                  <div className="backdrop-blur-md bg-gradient-to-r from-tech-blue/20 to-tech-purple/20 border border-tech-blue/30 rounded-2xl rounded-tr-sm p-4 shadow-lg shadow-tech-blue/10">
                    <p className="text-gray-100 leading-relaxed font-light">
                      {msg.content}
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-tech-purple to-tech-blue flex items-center justify-center text-xl shadow-lg">
                  👤
                </div>
              </div>
            )}

            {/* 错误消息 */}
            {error && (
              <div className="w-full flex items-start gap-4 animate-fade-in">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center text-xl">
                  ⚠️
                </div>
                <div className="flex-1 max-w-[85%]">
                  <div className="backdrop-blur-md bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
                    <p className="text-red-200 leading-relaxed">
                      {error}
                    </p>
                    <button
                      onClick={() => setError(null)}
                      className="mt-2 text-red-400 hover:text-red-300 text-sm underline"
                    >
                      忽略
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 底部输入区 */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
        <div className="max-w-3xl mx-auto">
          <div className="backdrop-blur-xl bg-panel-bg border border-white/10 rounded-2xl shadow-2xl shadow-tech-cyan/10 overflow-hidden">
            <div className="relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入 GitHub 仓库链接，开始探索..."
                disabled={isSending}
                rows={1}
                className="w-full bg-transparent text-gray-100 placeholder-gray-400 px-6 py-4 resize-none max-h-40"
                style={{
                  height: 'auto',
                  minHeight: '56px',
                }}
              />
              <div className="absolute bottom-3 right-3 text-xs text-gray-500">
                {isSending ? '发送中...' : 'Enter 发送，Shift+Enter 换行'}
              </div>
            </div>

            <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-t border-white/5">
              <button
                onClick={() => setInput(input => input.slice(0, -1))}
                disabled={!input || isSending}
                className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="删除"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
                </svg>
              </button>

              <button
                onClick={sendMessage}
                disabled={!input.trim() || isSending}
                className="send-btn px-8 py-3 bg-gradient-to-r from-tech-cyan to-tech-blue rounded-xl text-black font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                {isSending ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    生成中...
                  </>
                ) : (
                  <>
                    发送
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 底部留白 */}
      <div className="h-4"></div>
      <div ref={messagesEndRef} />
    </div>
  )
}

export default ChatBox
