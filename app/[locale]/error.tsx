'use client'

import { useEffect } from 'react'
import { AlertOctagon, RotateCcw, Home } from 'lucide-react'
import Link from 'next/link'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Unhandled runtime error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6 animate-scale-in">
        <div className="w-20 h-20 rounded-2xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center mx-auto shadow-sm">
          <AlertOctagon className="w-10 h-10 text-rose-600 dark:text-rose-400 animate-pulse" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Something Went Wrong</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto">
            An unexpected error occurred during execution. Our team has been notified.
          </p>
          {error.digest && (
            <p className="text-[10px] font-mono text-slate-400 mt-2 bg-slate-100 dark:bg-slate-800 py-1 px-2 rounded-md inline-block">
              Digest: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button 
            onClick={() => reset()} 
            className="btn btn-primary flex items-center justify-center gap-2 focus:ring-2 focus:ring-indigo-500"
          >
            <RotateCcw className="w-4 h-4" /> Try Again
          </button>
          <Link 
            href="/" 
            className="btn btn-secondary flex items-center justify-center gap-2 focus:ring-2 focus:ring-indigo-500"
          >
            <Home className="w-4 h-4" /> Return Home
          </Link>
        </div>
      </div>
    </div>
  )
}
