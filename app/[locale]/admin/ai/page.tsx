'use client'

import { useState } from 'react'
import { Sparkles, MessageSquare, Image as ImageIcon, Search, ChevronRight, Zap, StopCircle, CornerDownLeft, Bot, User, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function AIPage() {
  const [activeTab, setActiveTab] = useState<'chat' | 'generate'>('chat')
  const [prompt, setPrompt] = useState('')
  const [messages, setMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([
    { role: 'assistant', content: 'Hello! I am your platform AI assistant. I can help you draft product descriptions, analyze sales data, or write marketing copy. What can I help you with today?' }
  ])
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  // Content Gen state
  const [genType, setGenType] = useState('Product Description')
  const [genContext, setGenContext] = useState('')
  const [genTone, setGenTone] = useState('Professional')
  const [genResult, setGenResult] = useState('')

  const handleSend = async () => {
    if (!prompt.trim()) return
    const userPrompt = prompt
    setPrompt('')
    setMessages(prev => [...prev, { role: 'user', content: userPrompt }])
    setIsGenerating(true)
    
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userPrompt })
      })
      const data = await res.json()
      if (res.status === 400 && data.error?.includes('API key')) {
        setAiError(data.error)
        setMessages(prev => [...prev, { role: 'assistant', content: 'I am unable to assist until an AI provider is configured.' }])
      } else {
        setAiError(null)
        setMessages(prev => [...prev, { role: 'assistant', content: data.result || data.error }])
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error connecting to the AI service.' }])
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerate = async () => {
    if (!genContext.trim()) return
    setIsGenerating(true)
    setGenResult('')
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: genType, context: genContext, tone: genTone })
      })
      const data = await res.json()
      if (res.status === 400 && data.error?.includes('API key')) {
        setAiError(data.error)
        setGenResult('AI features are disabled until a provider is configured in Settings.')
      } else {
        setAiError(null)
        setGenResult(data.result || data.error)
      }
    } catch (err) {
      setGenResult('Error connecting to the AI service.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="page-container h-[calc(100vh-4rem)] flex flex-col animate-slide-up">
      <div className="section-header flex-shrink-0">
        <div>
          <h2 className="section-title">AI Assistant</h2>
          <p className="section-desc">Generate content and analyze data with platform intelligence</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('chat')}
            className={cn('px-4 py-1.5 text-sm font-medium rounded-md transition-all', activeTab === 'chat' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700')}
          >
            Chat
          </button>
          <button 
            onClick={() => setActiveTab('generate')}
            className={cn('px-4 py-1.5 text-sm font-medium rounded-md transition-all', activeTab === 'generate' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700')}
          >
            Content Gen
          </button>
        </div>
      </div>

      {aiError && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg flex justify-between items-center shadow-sm">
          <div>
            <h3 className="font-bold text-sm">AI Not Configured</h3>
            <p className="text-sm">{aiError}</p>
          </div>
          <a href="./settings" className="text-sm font-semibold underline hover:text-red-800">Go to Settings</a>
        </div>
      )}

      {activeTab === 'chat' && (
        <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Chat history */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {messages.map((msg, i) => (
              <div key={i} className={cn('flex items-start gap-4 max-w-[80%]', msg.role === 'user' ? 'ml-auto flex-row-reverse' : '')}>
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                  msg.role === 'user' ? 'bg-indigo-100' : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                )}>
                  {msg.role === 'user' ? <User className="w-4 h-4 text-indigo-600" /> : <Bot className="w-4 h-4 text-white" />}
                </div>
                <div className={cn(
                  'p-3.5 rounded-xl text-sm leading-relaxed whitespace-pre-wrap',
                  msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-slate-50 border border-slate-100 text-slate-700 rounded-tl-sm'
                )}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isGenerating && (
              <div className="flex items-start gap-4 max-w-[80%]">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex gap-1">
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>

          {/* Chat input */}
          <div className="p-4 bg-white border-t border-slate-100">
            <div className="relative flex items-center">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask the AI anything about your platform..."
                className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
              <button
                onClick={handleSend}
                disabled={isGenerating || !prompt.trim()}
                className="absolute right-2 p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                id="ai-send-btn"
              >
                {isGenerating ? <StopCircle className="w-4 h-4" /> : <CornerDownLeft className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1 no-scrollbar">
              {['"Draft an email to inactive customers"', '"Analyze last week\'s sales"', '"Write a product description for running shoes"'].map(suggest => (
                <button
                  key={suggest}
                  onClick={() => setPrompt(suggest.replace(/"/g, ''))}
                  className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full whitespace-nowrap hover:bg-indigo-100 transition-colors"
                >
                  {suggest}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'generate' && (
        <div className="flex-1 flex justify-center min-h-0">
          <div className="card p-5 flex flex-col w-full max-w-2xl">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-500" />
              Copywriting & SEO
            </h3>
            <div className="space-y-4 flex-1">
              <div>
                <label className="form-label">Content Type</label>
                <select className="form-select" value={genType} onChange={e => setGenType(e.target.value)}>
                  <option>Product Description</option>
                  <option>Blog Post Outline</option>
                  <option>SEO Meta Tags</option>
                  <option>Marketing Email</option>
                </select>
              </div>
              <div>
                <label className="form-label">Context / Keywords</label>
                <textarea className="form-textarea" rows={4} placeholder="E.g., lightweight running shoes, carbon fiber, marathon, breathability" value={genContext} onChange={e => setGenContext(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Tone</label>
                <select className="form-select" value={genTone} onChange={e => setGenTone(e.target.value)}>
                  <option>Professional</option>
                  <option>Enthusiastic</option>
                  <option>Urgent</option>
                  <option>Casual</option>
                </select>
              </div>
              {genResult && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 whitespace-pre-wrap">
                  {genResult}
                </div>
              )}
            </div>
            <button className="btn btn-primary w-full mt-4" onClick={handleGenerate} disabled={isGenerating || !genContext.trim()}>
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isGenerating ? 'Generating...' : 'Generate Content'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
