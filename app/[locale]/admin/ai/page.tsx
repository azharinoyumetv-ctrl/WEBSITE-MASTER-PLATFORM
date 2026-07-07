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

  const handleSend = async () => {
    if (!prompt.trim()) return
    const userPrompt = prompt
    setPrompt('')
    setMessages(prev => [...prev, { role: 'user', content: userPrompt }])
    setIsGenerating(true)
    
    // Simulate generation
    await new Promise(r => setTimeout(r, 1500))
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: `Here is a drafted response based on your request: "${userPrompt}". \n\nThis is a demonstration of the AI module capabilities. In production, this would stream a response from the LLM provider.`
    }])
    setIsGenerating(false)
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
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">
          <div className="card p-5 flex flex-col">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-500" />
              Copywriting & SEO
            </h3>
            <div className="space-y-4 flex-1">
              <div>
                <label className="form-label">Content Type</label>
                <select className="form-select">
                  <option>Product Description</option>
                  <option>Blog Post Outline</option>
                  <option>SEO Meta Tags</option>
                  <option>Marketing Email</option>
                </select>
              </div>
              <div>
                <label className="form-label">Context / Keywords</label>
                <textarea className="form-textarea" rows={4} placeholder="E.g., lightweight running shoes, carbon fiber, marathon, breathability" />
              </div>
              <div>
                <label className="form-label">Tone</label>
                <select className="form-select">
                  <option>Professional</option>
                  <option>Enthusiastic</option>
                  <option>Urgent</option>
                  <option>Casual</option>
                </select>
              </div>
            </div>
            <button className="btn btn-primary w-full mt-4">
              <Sparkles className="w-4 h-4" />
              Generate Content
            </button>
          </div>

          <div className="card p-5 flex flex-col">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-purple-500" />
              Image Generation
            </h3>
            <div className="space-y-4 flex-1">
              <div>
                <label className="form-label">Image Prompt</label>
                <textarea className="form-textarea" rows={4} placeholder="Describe the image you want to generate..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Aspect Ratio</label>
                  <select className="form-select">
                    <option>1:1 (Square)</option>
                    <option>16:9 (Landscape)</option>
                    <option>9:16 (Portrait)</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Style</label>
                  <select className="form-select">
                    <option>Photorealistic</option>
                    <option>Illustration</option>
                    <option>3D Render</option>
                  </select>
                </div>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-100 border-dashed rounded-xl flex-1 flex flex-col items-center justify-center text-center">
                <ImageIcon className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-sm text-slate-500 font-medium">Preview Area</p>
                <p className="text-xs text-slate-400 mt-1">Generated images will appear here</p>
              </div>
            </div>
            <button className="btn bg-purple-600 hover:bg-purple-700 text-white w-full mt-4">
              <Sparkles className="w-4 h-4" />
              Generate Image
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
