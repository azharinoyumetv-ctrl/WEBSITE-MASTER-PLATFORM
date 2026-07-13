'use client'

import { useEffect, useState } from 'react'
import { getPublicReceiptHtml } from '@/lib/actions/pos'
import { notFound } from 'next/navigation'

export default function ReceiptPage({ params }: { params: { id: string } }) {
  const [receiptHtml, setReceiptHtml] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPublicReceiptHtml(params.id).then(res => {
      if (res.success && res.receiptHtml) {
        setReceiptHtml(res.receiptHtml)
        setTimeout(() => {
          window.print()
        }, 500)
      }
      setLoading(false)
    })
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500 animate-pulse">Loading receipt...</div>
      </div>
    )
  }

  if (!receiptHtml) {
    return notFound()
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 print:bg-white print:py-0">
      <div className="max-w-md mx-auto bg-white p-6 border border-slate-200 rounded-xl shadow-sm print:border-none print:shadow-none">
        <div dangerouslySetInnerHTML={{ __html: receiptHtml }} />
        
        <div className="mt-8 flex gap-4 print:hidden justify-center">
          <button 
            onClick={() => window.print()} 
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition"
          >
            Print Receipt
          </button>
          <a 
            href="/" 
            className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition"
          >
            Back to Store
          </a>
        </div>
      </div>
    </div>
  )
}
