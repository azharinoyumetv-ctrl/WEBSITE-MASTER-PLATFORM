'use client'

import { useTranslations } from 'next-intl'

type GuideItem = { title: string; description: string }

export function PackageDetails({ packageKey }: { packageKey: string }) {
  const guide = useTranslations('PurchaseGuide')
  const storefront = useTranslations('Storefront')
  const deliverables = guide.raw(`deliverables.${packageKey}`) as string[]
  return (
    <div data-package-comparison className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5" aria-live="polite">
      <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">{guide('best_for')}</p>
      <p className="mt-1 font-semibold text-emerald-950">{guide(`audience.${packageKey}`)}</p>
      <h3 className="mt-4 text-sm font-bold text-emerald-950">{guide('included_in', { name: storefront(`package_copy.${packageKey}.name`) })}</h3>
      <ul className="mt-3 grid gap-2 text-sm text-emerald-900 sm:grid-cols-2">
        {deliverables.map(item => <li key={item} className="flex gap-2"><span aria-hidden="true">✓</span><span>{item}</span></li>)}
      </ul>
    </div>
  )
}

export function PurchaseScope() {
  const guide = useTranslations('PurchaseGuide')
  const items = guide.raw('scope_items') as GuideItem[]
  return (
    <section data-purchase-scope className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left">
      <h3 className="font-bold text-slate-950">{guide('scope_title')}</h3>
      <dl className="mt-4 space-y-4">
        {items.map(item => <div key={item.title}><dt className="text-sm font-semibold text-slate-900">{item.title}</dt><dd className="mt-1 text-xs leading-relaxed text-slate-600">{item.description}</dd></div>)}
      </dl>
    </section>
  )
}

export function ProjectDeliveryGuide() {
  const guide = useTranslations('PurchaseGuide')
  const steps = guide.raw('delivery_steps') as GuideItem[]
  return (
    <section data-project-delivery className="rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm md:p-8" aria-labelledby="project-delivery-heading">
      <h2 id="project-delivery-heading" className="text-2xl font-black tracking-tight text-slate-950">{guide('delivery_title')}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">{guide('delivery_description')}</p>
      <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {steps.map((step, index) => (
          <li key={step.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800" aria-hidden="true">{index + 1}</span>
            <h3 className="mt-3 text-sm font-bold text-slate-950">{step.title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">{step.description}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
