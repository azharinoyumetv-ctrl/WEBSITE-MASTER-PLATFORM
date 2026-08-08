import type { Metadata } from 'next'
import fs from 'fs'
import path from 'path'
import ReactMarkdown from 'react-markdown'

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  const isId = params.locale === 'id'
  return {
    title: isId ? 'Kebijakan Pembatalan dan Refund' : 'Cancellation and Refund Policy',
    description: isId ? 'Ketentuan pembatalan dan refund proyek DagangOS.' : 'Cancellation and refund terms for DagangOS projects.',
    alternates: { canonical: `/${isId ? 'id' : 'en'}/site/refund` },
  }
}

export default function RefundPage({ params }: { params: { locale: string } }) {
  const isId = params.locale === 'id'
  const filename = isId ? 'Refund_Policy_id.md' : 'Refund_Policy.md'
  const markdown = fs.readFileSync(path.join(process.cwd(), 'legal', filename), 'utf8')

  return (
    <div className="min-h-screen bg-[#f7fafc]">
      <section className="relative isolate overflow-hidden py-20 text-white dagangos-aurora">
        <div className="absolute inset-0 dagangos-grid opacity-35" />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <h1 className="text-4xl font-black tracking-[-0.045em] sm:text-6xl">{isId ? 'Pembatalan & Refund' : 'Cancellation & Refunds'}</h1>
          <p className="mt-5 text-slate-300">{isId ? 'Ketentuan publik untuk proyek dan layanan DagangOS.' : 'Public terms for DagangOS projects and services.'}</p>
        </div>
      </section>
      <article className="prose prose-slate mx-auto my-14 max-w-4xl rounded-[1.5rem] border border-slate-200 bg-white px-6 py-10 shadow-sm sm:px-10">
        <ReactMarkdown>{markdown}</ReactMarkdown>
      </article>
    </div>
  )
}
