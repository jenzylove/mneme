'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { SendIcon, Brain, Copy, Check, Dot } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'agent'
  content: string
  memoryAction?: 'stored' | 'recalled'
  memoryCount?: number
}

interface Memory {
  id: string
  content: string
  type: 'fact' | 'context' | 'preference'
  timestamp: string
  hash: string
  verified: boolean
}

const SAMPLE_MEMORIES: Memory[] = [
  {
    id: '1',
    content: 'User is working on a DeFi project called Aave',
    type: 'context',
    timestamp: '2 mins ago',
    hash: '0x4a3f...8e21',
    verified: true,
  },
  {
    id: '2',
    content: 'Interested in flash loan mechanisms and use cases',
    type: 'preference',
    timestamp: '1 min ago',
    hash: '0x7b2c...4d92',
    verified: true,
  },
  {
    id: '3',
    content: 'Aave is a leading DeFi lending protocol',
    type: 'fact',
    timestamp: '2 mins ago',
    hash: '0x9e1f...6c34',
    verified: true,
  },
  {
    id: '4',
    content: 'Flash loans enable uncollateralized borrowing within single tx',
    type: 'fact',
    timestamp: '1 min ago',
    hash: '0x2d5a...3b71',
    verified: true,
  },
]

const INITIAL_MESSAGES: Message[] = [
  {
    id: '1',
    role: 'user',
    content: "Hi! I'm working on a DeFi project called Aave.",
  },
  {
    id: '2',
    role: 'agent',
    content: 'Got it. Aave is a leading DeFi lending protocol. What are you exploring?',
    memoryAction: 'stored',
  },
  {
    id: '3',
    role: 'user',
    content: 'I want to research their flash loan mechanism.',
  },
  {
    id: '4',
    role: 'agent',
    content:
      'Flash loans on Aave allow uncollateralized borrowing within a single transaction. Would you like me to dive deeper into a specific use case?',
    memoryAction: 'stored',
  },
]

export default function MnemePage() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [filterTab, setFilterTab] = useState<'all' | 'recent' | 'pinned'>('all')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: String(messages.length + 1),
      role: 'user',
      content: input,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')

    // Simulate agent response
    setTimeout(() => {
      const agentMessage: Message = {
        id: String(messages.length + 2),
        role: 'agent',
        content: `I understand. Let me think about "${input.substring(0, 30)}..."`,
        memoryAction: 'stored',
      }
      setMessages((prev) => [...prev, agentMessage])
    }, 800)
  }

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash)
    setCopied(hash)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="flex flex-col lg:flex-row h-screen">
        {/* LEFT COLUMN - CHAT INTERFACE */}
        <div className="flex-1 lg:w-3/5 flex flex-col border-r border-[#2a2a2a]">
          {/* HEADER */}
          <div className="border-b border-[#2a2a2a] px-6 py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl font-bold tracking-tight">Mneme</div>
              <div className="flex items-center gap-2 bg-[#1a1a1a] px-3 py-1.5 rounded-full border border-[#2a2a2a]">
                <Dot className="w-2 h-2 fill-green-500 text-green-500 animate-pulse" />
                <span className="text-xs font-medium text-gray-300">Connected to Shelby Testnet</span>
              </div>
            </div>
            <p className="text-sm text-gray-400">Persistent memory for AI agents, receipted on-chain</p>
          </div>

          {/* CHAT AREA */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md ${
                    message.role === 'user'
                      ? 'bg-[#a78bfa] bg-opacity-10 border border-[#a78bfa] border-opacity-20 text-white'
                      : 'bg-[#1a1a1a] border border-[#2a2a2a] text-gray-100'
                  } rounded-lg px-4 py-3`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  {message.memoryAction && (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="inline-flex items-center gap-1.5 bg-[#a78bfa] bg-opacity-15 border border-[#a78bfa] border-opacity-30 rounded-full px-2.5 py-1 animate-pulse">
                        {message.memoryAction === 'stored' && (
                          <>
                            <span className="text-xs">💾</span>
                            <span className="text-xs font-medium text-[#a78bfa]">stored memory</span>
                          </>
                        )}
                        {message.memoryAction === 'recalled' && message.memoryCount && (
                          <>
                            <span className="text-xs">🔍</span>
                            <span className="text-xs font-medium text-[#a78bfa]">
                              recalled {message.memoryCount} {message.memoryCount === 1 ? 'memory' : 'memories'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* INPUT AREA */}
          <div className="border-t border-[#2a2a2a] px-6 py-4">
            <div className="flex gap-3 mb-2">
              <Input
                placeholder="Talk to your agent..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder-gray-500 focus:border-[#a78bfa] focus:ring-[#a78bfa]"
              />
              <Button
                onClick={handleSendMessage}
                size="icon"
                className="bg-[#a78bfa] hover:bg-[#9d7fe8] text-black shrink-0"
              >
                <SendIcon className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500">Agent has access to {SAMPLE_MEMORIES.length} memories from this session</p>
          </div>
        </div>

        {/* RIGHT COLUMN - MEMORY VAULT */}
        <div className="w-full lg:w-2/5 flex flex-col border-t lg:border-t-0 border-[#2a2a2a] bg-[#0f0f0f]">
          {/* MEMORY HEADER */}
          <div className="border-b border-[#2a2a2a] px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Memory Vault</h2>
              <Badge
                variant="outline"
                className="bg-[#a78bfa] bg-opacity-10 border-[#a78bfa] border-opacity-30 text-[#a78bfa]"
              >
                {SAMPLE_MEMORIES.length} memories
              </Badge>
            </div>
          </div>

          {/* FILTER TABS */}
          <div className="flex gap-1 px-6 py-4 border-b border-[#2a2a2a]">
            {(['all', 'recent', 'pinned'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  filterTab === tab
                    ? 'bg-[#a78bfa] bg-opacity-20 text-[#a78bfa] border border-[#a78bfa] border-opacity-30'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* MEMORY CARDS */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {SAMPLE_MEMORIES.map((memory) => (
              <div
                key={memory.id}
                className="group bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 hover:border-[#a78bfa] hover:border-opacity-40 transition-all hover:shadow-lg hover:shadow-[#a78bfa] hover:shadow-opacity-10"
              >
                <div className="flex items-start gap-3">
                  <Brain className="w-4 h-4 text-[#a78bfa] mt-1 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-100 leading-snug line-clamp-2">{memory.content}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      <span>{memory.timestamp}</span>
                      <span>•</span>
                      <div className="flex items-center gap-1 font-mono">
                        <span>{memory.hash}</span>
                        <button
                          onClick={() => copyHash(memory.hash)}
                          className="hover:text-gray-400 transition-colors"
                        >
                          {copied === memory.hash ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                    {memory.verified && (
                      <div className="mt-2 flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-green-500 flex items-center justify-center">
                          <Check className="w-2 h-2 text-black" />
                        </div>
                        <span className="text-xs text-green-400">Verified</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* STATS CARD */}
          <div className="border-t border-[#2a2a2a] px-6 py-4">
            <Card className="bg-[#1a1a1a] border-[#2a2a2a] p-4">
              <div className="space-y-2 text-xs text-gray-400">
                <div className="flex justify-between">
                  <span>Storage:</span>
                  <span className="text-gray-200 font-mono">2.3 KB on Shelby</span>
                </div>
                <div className="flex justify-between">
                  <span>Receipts anchored:</span>
                  <span className="text-gray-200 font-mono">{SAMPLE_MEMORIES.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg retrieval:</span>
                  <span className="text-gray-200 font-mono">47ms</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
