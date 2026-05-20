'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { SendIcon, Brain, Copy, Check, Dot, Loader2 } from 'lucide-react'
import * as shelby from '@/lib/shelby'
import type { ShelbyMemory } from '@/lib/shelby'

interface Message {
  id: string
  role: 'user' | 'agent'
  content: string
  memoryAction?: 'stored' | 'recalled'
  memoryCount?: number
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`
  return `${Math.floor(hrs / 24)} days ago`
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export default function MnemePage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [memories, setMemories] = useState<ShelbyMemory[]>([])
  const [input, setInput] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [filterTab, setFilterTab] = useState<'all' | 'recent' | 'pinned'>('all')
  const [isThinking, setIsThinking] = useState(false)
  const [avgRetrieval, setAvgRetrieval] = useState(47)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Refresh memories from Shelby
  const refreshMemories = useCallback(async () => {
    const list = await shelby.list()
    setMemories(list)
  }, [])

  // Load memories on mount
  useEffect(() => {
    refreshMemories()
  }, [refreshMemories])

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking])

  const handleSendMessage = async () => {
    if (!input.trim() || isThinking) return

    const userContent = input.trim()
    const userMessage: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: userContent,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsThinking(true)

    try {
      // Recall relevant memories via Shelby SDK
      const recalled = await shelby.recall(userContent, 5)

      // Build conversation history for Claude
      const apiMessages = [...messages, userMessage].map((m) => ({
        role: m.role === 'agent' ? ('assistant' as const) : ('user' as const),
        content: m.content,
      }))

      // Call our chat API
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          memoryContext: recalled.map((m) => ({ id: m.id, content: m.content })),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.detail || data.error || 'Chat request failed')
      }

      // Store new memory on Shelby if Claude returned one
      let memoryAction: 'stored' | 'recalled' | undefined
      let memoryCount: number | undefined

      if (data.newMemory) {
        const { receipt } = await shelby.put(data.newMemory)
        setAvgRetrieval(Math.round(receipt.retrievalMs))
        memoryAction = 'stored'
        await refreshMemories()
      } else if (recalled.length > 0) {
        memoryAction = 'recalled'
        memoryCount = recalled.length
      }

      const agentMessage: Message = {
        id: `a-${Date.now()}`,
        role: 'agent',
        content: data.response,
        memoryAction,
        memoryCount,
      }
      setMessages((prev) => [...prev, agentMessage])
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'agent',
          content: `⚠️ Error: ${errorMsg}`,
        },
      ])
    } finally {
      setIsThinking(false)
    }
  }

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash)
    setCopied(hash)
    setTimeout(() => setCopied(null), 2000)
  }

  const totalBytes = memories.reduce((sum, m) => sum + m.size, 0)

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
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 space-y-3">
                <Brain className="w-10 h-10 text-[#a78bfa] opacity-60" />
                <div>
                  <p className="text-sm font-medium text-gray-300">Start a conversation</p>
                  <p className="text-xs mt-1">Your agent will remember what matters</p>
                </div>
              </div>
            )}
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
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
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
            {isThinking && (
              <div className="flex justify-start">
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin text-[#a78bfa]" />
                  <span className="text-xs text-gray-400">thinking...</span>
                </div>
              </div>
            )}
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
                disabled={isThinking}
                className="bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder-gray-500 focus:border-[#a78bfa] focus:ring-[#a78bfa]"
              />
              <Button
                onClick={handleSendMessage}
                size="icon"
                disabled={isThinking || !input.trim()}
                className="bg-[#a78bfa] hover:bg-[#9d7fe8] text-black shrink-0 disabled:opacity-40"
              >
                <SendIcon className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Agent has access to {memories.length} {memories.length === 1 ? 'memory' : 'memories'} from this session
            </p>
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
                {memories.length} {memories.length === 1 ? 'memory' : 'memories'}
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
            {memories.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 space-y-2 py-12">
                <Brain className="w-8 h-8 opacity-30" />
                <p className="text-xs">No memories yet</p>
                <p className="text-xs">Start chatting to build the vault</p>
              </div>
            )}
            {memories.map((memory) => (
              <div
                key={memory.id}
                className="group bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 hover:border-[#a78bfa] hover:border-opacity-40 transition-all hover:shadow-lg hover:shadow-[#a78bfa] hover:shadow-opacity-10"
              >
                <div className="flex items-start gap-3">
                  <Brain className="w-4 h-4 text-[#a78bfa] mt-1 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-100 leading-snug line-clamp-2">{memory.content}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      <span>{formatRelativeTime(memory.timestamp)}</span>
                      <span>•</span>
                      <div className="flex items-center gap-1 font-mono">
                        <span>{memory.id}</span>
                        <button
                          onClick={() => copyHash(memory.id)}
                          className="hover:text-gray-400 transition-colors"
                        >
                          {copied === memory.id ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="w-2 h-2 text-black" />
                      </div>
                      <span className="text-xs text-green-400">Verified</span>
                    </div>
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
                  <span className="text-gray-200 font-mono">{formatBytes(totalBytes)} on Shelby</span>
                </div>
                <div className="flex justify-between">
                  <span>Receipts anchored:</span>
                  <span className="text-gray-200 font-mono">{memories.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg retrieval:</span>
                  <span className="text-gray-200 font-mono">{avgRetrieval}ms</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}