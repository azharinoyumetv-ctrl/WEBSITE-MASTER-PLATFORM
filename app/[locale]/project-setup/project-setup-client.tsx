'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowRight, Calculator, CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
  packages,
  addonsList,
  getBillableAddonKeys,
  getIncludedAddonKeys,
  requirementFieldLabels,
  type Addon,
  type PackageOption,
} from '@/lib/constants/packages'

type CheckoutErrors = Partial<Record<'package' | 'contactEmail' | string, string>>;

export default function ProjectSetupClient({ tenantId }: { tenantId: string }) {
  const search = useSearchParams()
  const requestedPackage = search.get('package') || 'landing_page'
  const preselectedPackage = packages[requestedPackage] ? requestedPackage : 'landing_page'
  const requestedAddons = (search.get('addons')?.split(',').filter(Boolean) || [])
    .filter(key => addonsList.some(addon => addon.key === key))
  const preselectedAddons = getBillableAddonKeys(preselectedPackage, requestedAddons)

  const [selectedPackage, setSelectedPackage] = useState<string>(preselectedPackage)
  const [enabledAddons, setEnabledAddons] = useState<string[]>(preselectedAddons)
  const [requirements, setRequirements] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<CheckoutErrors>({})

  const pkg = packages[selectedPackage] || packages.landing_page
  const includedAddonKeys = getIncludedAddonKeys(selectedPackage)
  const includedAddonSet = new Set(includedAddonKeys)
  const sortedAddons = [...addonsList].sort((left, right) =>
    Number(includedAddonSet.has(right.key)) - Number(includedAddonSet.has(left.key))
  )
  const pkgPrice = pkg.price
  const addonsPrice = enabledAddons.reduce((acc, key) => {
    const addon = addonsList.find(a => a.key === key)
    return acc + (addon ? addon.price : 0)
  }, 0)
  const total = pkgPrice + addonsPrice

  const toggleAddon = (key: string) => {
    if (includedAddonSet.has(key)) return
    setEnabledAddons(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
    setErrors(prev => ({ ...prev, addons: '' }))
  }

  const handleRequirementChange = (field: string, value: string) => {
    setRequirements(prev => ({ ...prev, [field]: value }))
    setErrors(prev => {
      const next = { ...prev }
      delete (next as any)[field]
      return next
    })
  }

  const validate = (): boolean => {
    const next: CheckoutErrors = {}
    if (!selectedPackage) next.package = 'Please select a package'
    if (!requirements.contactEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requirements.contactEmail)) {
      next.contactEmail = 'Valid contact email is required'
    }
    const required = pkg.requirementsFields.filter(f => f !== 'timeline')
    for (const field of required) {
      if (!requirements[field] || requirements[field].trim().length === 0) {
        next[field] = 'This field is required'
      }
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submitOrder = async () => {
    if (!validate()) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/project-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          packageKey: selectedPackage,
          addons: enabledAddons,
          total,
          currency: 'IDR',
          requirements,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create order')
      }

      const paymentResponse = await fetch('/api/project-setup/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: data.orderId }),
      })
      const payment = await paymentResponse.json()
      if (!paymentResponse.ok || !payment.success || !payment.paymentUrl) {
        throw new Error(payment.error || 'Your project request was saved, but payment could not be started')
      }

      toast.success('Redirecting to secure payment')
      window.location.assign(payment.paymentUrl)
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f7fafc]">
      <section className="relative isolate overflow-hidden py-20 text-white dagangos-aurora">
        <div className="absolute inset-0 dagangos-grid opacity-40" />
        <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl dagangos-orb" />
        <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-sky-400/20 blur-3xl dagangos-orb-delayed" />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-emerald-100"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" /> DagangOS project concierge</span>
          <h1 className="mt-6 text-4xl md:text-6xl font-black tracking-[-0.045em] mb-4">Start Your Project</h1>
          <p className="mx-auto max-w-2xl text-lg text-slate-300">
            Choose a package, tell us what you need, and pay securely to get started.
          </p>
        </div>
      </section>

      <section className="py-16 max-w-7xl mx-auto px-6 md:px-8 space-y-12">
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,.08)] space-y-6">
            <div><p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Step 01</p><h2 className="mt-2 text-2xl font-black text-slate-950">Choose Package</h2></div>
            <div className="grid gap-4">
              {Object.values(packages).map((item: PackageOption) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setSelectedPackage(item.key)
                    setEnabledAddons([])
                    setRequirements({})
                    setErrors(prev => ({ ...prev, package: '' }))
                  }}
                  className={`text-left p-4 rounded-xl border transition ${
                    selectedPackage === item.key ? 'border-emerald-400 bg-emerald-50 shadow-sm' : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-slate-900">{item.name}</p>
                      <p className="text-sm text-slate-500">{item.desc}</p>
                    </div>
                    <span className="text-sm font-bold text-emerald-700 ml-4 whitespace-nowrap">
                      Rp {item.price.toLocaleString('id-ID')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            {errors.package && <p className="text-sm text-red-600">{errors.package}</p>}
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,.08)] space-y-6">
            <div><p className="text-xs font-black uppercase tracking-[0.16em] text-sky-700">Step 02</p><h2 className="mt-2 text-2xl font-black text-slate-950">One-time implementation add-ons</h2><p className="mt-1 text-xs text-slate-500">Items already covered by your package are marked as included and will never be charged again.</p></div>
            <div data-package-inclusions className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
              <div className="flex items-center gap-2 text-sm font-black text-emerald-950">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Already included in {pkg.name}
              </div>
              <ul className="mt-3 grid gap-2 text-sm text-emerald-900 sm:grid-cols-2">
                {pkg.includedCapabilities.map(capability => (
                  <li key={capability} className="flex items-start gap-2">
                    <span aria-hidden="true" className="mt-1 text-emerald-500">✓</span>
                    <span>{capability}</span>
                  </li>
                ))}
              </ul>
              {includedAddonKeys.length === 0 && (
                <p className="mt-3 border-t border-emerald-200 pt-3 text-xs font-semibold text-emerald-800">
                  No catalog add-ons are bundled with this package; every selectable item below is optional.
                </p>
              )}
            </div>
            <div className="grid gap-4">
              {sortedAddons.map((addon: Addon) => {
                const selected = enabledAddons.includes(addon.key)
                const included = includedAddonSet.has(addon.key)
                return (
                  <button
                    key={addon.key}
                    type="button"
                    data-addon-key={addon.key}
                    disabled={included}
                    aria-pressed={included ? undefined : selected}
                    onClick={() => toggleAddon(addon.key)}
                    className={`flex flex-col items-start justify-between gap-3 rounded-xl border p-4 text-left transition sm:flex-row sm:items-center ${
                      included
                        ? 'cursor-not-allowed border-emerald-200 bg-emerald-50/70'
                        : selected
                          ? 'border-sky-400 bg-sky-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md'
                    }`}
                  >
                    <div className="pr-4">
                      <p className="font-semibold text-slate-900">{addon.name}</p>
                      <p className="text-sm text-slate-500">{addon.desc}</p>
                    </div>
                    {included ? (
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Included in {pkg.name}
                      </span>
                    ) : (
                      <span className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
                        <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700">Optional add-on</span>
                        <span className="whitespace-nowrap text-sm font-semibold text-sky-700">+Rp {addon.price.toLocaleString('id-ID')}</span>
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden bg-white border border-slate-200 rounded-[1.75rem] p-6 md:p-8 shadow-[0_16px_45px_rgba(15,23,42,.08)]">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-cyan-400 to-sky-500" />
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-5 h-5 text-emerald-600" />
            <div><p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Step 03</p><h2 className="mt-1 text-2xl font-black text-slate-950">Your Details</h2></div>
          </div>
          <p className="text-slate-500 mb-6">
            Share only what’s relevant for your selected package.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {pkg.requirementsFields.map(field => {
              const meta = requirementFieldLabels[field] || {}
              return (
                <div key={field} className={field === 'detailedRequirements' || field === 'projectDescription' ? 'md:col-span-2' : ''}>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {meta.label || field}
                  </label>
                  <textarea
                    rows={field === 'detailedRequirements' || field === 'projectDescription' ? 4 : 2}
                    value={requirements[field] || ''}
                    onChange={e => handleRequirementChange(field, e.target.value)}
                    placeholder={meta.placeholder || ''}
                    className="form-input w-full"
                  />
                  {errors[field] && <p className="text-sm text-red-600 mt-1">{errors[field]}</p>}
                </div>
              )
            })}
          </div>
        </div>

        <div className="relative isolate overflow-hidden bg-slate-950 text-white rounded-[1.75rem] p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-2xl">
          <div className="absolute inset-0 dagangos-aurora opacity-80" />
          <div className="relative">
          <div>
            <p className="text-sm text-slate-300 mb-1">Selected package</p>
            <p className="text-xl font-semibold">{pkg.name}</p>
            <p className="text-sm text-slate-300 mt-1">
              {enabledAddons.length > 0 ? `${enabledAddons.length} add-on${enabledAddons.length > 1 ? 's' : ''} selected` : 'No add-ons'}
            </p>
            {includedAddonKeys.length > 0 && (
              <p className="mt-1 text-xs font-semibold text-emerald-200">
                {includedAddonKeys.length} add-on {includedAddonKeys.length === 1 ? 'capability is' : 'capabilities are'} already included
              </p>
            )}
          </div>
          <div className="relative text-right">
            <p className="text-sm text-slate-300 mb-1">Total to pay</p>
            <p className="text-3xl font-bold">Rp {total.toLocaleString('id-ID')}</p>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={submitOrder}
              className="mt-3 inline-flex items-center gap-2 bg-gradient-to-r from-emerald-300 to-sky-400 text-slate-950 font-black px-5 py-3 rounded-xl hover:-translate-y-0.5 transition disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {isSubmitting ? 'Submitting...' : 'Continue to Payment'}
            </button>
          </div>
        </div>
        </div>
      </section>
    </div>
  )
}
