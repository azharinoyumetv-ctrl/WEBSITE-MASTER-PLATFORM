'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, CheckCircle2, Calculator, Package, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { packages, addonsList, type Addon, type PackageOption } from '@/lib/constants/packages'

type CheckoutErrors = Partial<Record<'package' | 'contactEmail' | string, string>>;

export default function ProjectSetupClient({ tenantId }: { tenantId: string }) {
  const router = useRouter()
  const search = useSearchParams()
  const preselectedPackage = search.get('package') || 'landing_page'

  const [selectedPackage, setSelectedPackage] = useState<string>(preselectedPackage)
  const [enabledAddons, setEnabledAddons] = useState<string[]>([])
  const [requirements, setRequirements] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<CheckoutErrors>({})

  const pkg = packages[selectedPackage] || packages.landing_page
  const pkgPrice = pkg.price
  const addonsPrice = enabledAddons.reduce((acc, key) => {
    const addon = addonsList.find(a => a.key === key)
    return acc + (addon ? addon.price : 0)
  }, 0)
  const total = pkgPrice + addonsPrice

  const toggleAddon = (key: string) => {
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

      toast.success('Order created successfully')
      router.push(`/orders/${data.orderId}`)
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="py-20 bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">Start Your Project</h1>
          <p className="text-lg text-slate-600">
            Choose a package, tell us what you need, and pay securely to get started.
          </p>
        </div>
      </section>

      <section className="py-16 max-w-7xl mx-auto px-6 md:px-8 space-y-16">
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900">1. Choose Package</h2>
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
                    selectedPackage === item.key ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-slate-900">{item.name}</p>
                      <p className="text-sm text-slate-500">{item.desc}</p>
                    </div>
                    <span className="text-sm font-bold text-indigo-600 ml-4 whitespace-nowrap">
                      Rp {item.price.toLocaleString('id-ID')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            {errors.package && <p className="text-sm text-red-600">{errors.package}</p>}
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900">2. Add-ons</h2>
            <div className="grid gap-4">
              {addonsList.map((addon: Addon) => {
                const selected = enabledAddons.includes(addon.key)
                return (
                  <button
                    key={addon.key}
                    type="button"
                    onClick={() => toggleAddon(addon.key)}
                    className={`text-left p-4 rounded-xl border flex justify-between items-center transition ${
                      selected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-300'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{addon.name}</p>
                      <p className="text-sm text-slate-500">{addon.desc}</p>
                    </div>
                    <span className="text-sm font-semibold text-indigo-600 ml-4 whitespace-nowrap">
                      +Rp {addon.price.toLocaleString('id-ID')}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-5 h-5 text-indigo-600" />
            <h2 className="text-2xl font-bold text-slate-900">3. Your Details</h2>
          </div>
          <p className="text-slate-500 mb-6">
            Share only what’s relevant for your selected package.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {pkg.requirementsFields.map(field => {
              const meta = (pkg as any).requirementFieldLabels?.[field] || {}
              const inputType = meta.type || 'text'
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

        <div className="bg-slate-900 text-white rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-sm text-slate-300 mb-1">Selected package</p>
            <p className="text-xl font-semibold">{pkg.name}</p>
            <p className="text-sm text-slate-300 mt-1">
              {enabledAddons.length > 0 ? `${enabledAddons.length} add-on${enabledAddons.length > 1 ? 's' : ''} selected` : 'No add-ons'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-300 mb-1">Total to pay</p>
            <p className="text-3xl font-bold">Rp {total.toLocaleString('id-ID')}</p>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={submitOrder}
              className="mt-3 inline-flex items-center gap-2 bg-white text-slate-900 font-semibold px-5 py-3 rounded-xl hover:bg-slate-100 transition disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {isSubmitting ? 'Submitting...' : 'Continue to Payment'}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
