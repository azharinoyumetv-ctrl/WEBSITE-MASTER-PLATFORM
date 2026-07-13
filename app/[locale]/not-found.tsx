'use client'

import Link from 'next/link'
import { FileQuestion, ArrowLeft, Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6 animate-scale-in">
        <div className="w-20 h-20 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center mx-auto shadow-sm">
          <FileQuestion className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Page Not Found</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto">
            The page you are looking for doesn't exist or has been moved. Please check the URL or return home.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button 
            onClick={() => window.history.back()} 
            className="btn btn-secondary flex items-center justify-center gap-2 focus:ring-2 focus:ring-indigo-500"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
          <Link 
            href="/" 
            className="btn btn-primary flex items-center justify-center gap-2 focus:ring-2 focus:ring-indigo-500"
          >
            <Home className="w-4 h-4" /> Return Home
          </Link>
        </div>
      </div>
    </div>
  )
}
