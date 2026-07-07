'use client'

import { MessageCircle } from 'lucide-react'
import { useState, useEffect } from 'react'

export function WhatsAppWidget({ phoneNumber = '628999155182', message = 'Hello, I have a question about DagangOS!' }: { phoneNumber?: string, message?: string }) {
  const [isVisible, setIsVisible] = useState(false)

  // Delay showing the widget slightly for a better entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 1500)
    return () => clearTimeout(timer)
  }, [])

  if (!isVisible) return null

  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="relative group">
        {/* Tooltip */}
        <div className="absolute -top-12 right-0 bg-white text-slate-800 text-sm font-medium py-2 px-4 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap border border-slate-100">
          Chat with us on WhatsApp
          {/* Tooltip triangle */}
          <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white border-b border-r border-slate-100 transform rotate-45"></div>
        </div>

        {/* Button */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-14 h-14 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-full shadow-xl transition-transform hover:scale-110 active:scale-95"
          aria-label="Chat on WhatsApp"
        >
          <MessageCircle className="w-7 h-7" />
          
          {/* Ping animation indicator */}
          <span className="absolute top-0 right-0 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-white"></span>
          </span>
        </a>
      </div>
    </div>
  )
}
