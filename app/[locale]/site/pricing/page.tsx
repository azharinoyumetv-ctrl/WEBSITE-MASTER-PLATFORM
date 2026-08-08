import type { Metadata } from 'next'
import Link from 'next/link'
import { addonsList, getIncludedAddonKeys, packages } from '@/lib/constants/packages'
import { COMPANY } from '@/lib/company'

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  const isId = params.locale === 'id'
  return {
    title: isId ? 'Harga Paket Website dan Platform' : 'Website and Platform Pricing',
    description: isId
      ? 'Harga transparan paket website, e-commerce, POS, dan platform khusus DagangOS.'
      : 'Transparent pricing for DagangOS websites, e-commerce, POS, and custom platforms.',
    alternates: {
      canonical: `/${isId ? 'id' : 'en'}/pricing`,
      languages: { en: '/en/pricing', id: '/id/pricing', 'x-default': '/en/pricing' },
    },
  }
}

const idr = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

export default function PricingPage({ params }: { params: { locale: string } }) {
  const isId = params.locale === 'id'

  return (
    <div className="min-h-screen bg-[#f7fafc] text-slate-950">
      <section className="relative isolate overflow-hidden py-20 text-white dagangos-aurora">
        <div className="absolute inset-0 dagangos-grid opacity-35" />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-emerald-100">
            {isId ? 'Harga publik dan transparan' : 'Public, transparent pricing'}
          </span>
          <h1 className="mt-6 text-4xl font-black tracking-[-0.045em] sm:text-6xl">
            {isId ? 'Pilih ruang lingkup yang sesuai.' : 'Choose the right project scope.'}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-300">
            {isId
              ? 'Semua harga paket di bawah adalah biaya implementasi satu kali. Infrastruktur dan biaya pihak ketiga ditampilkan terpisah.'
              : 'Every package price below is a one-time implementation fee. Infrastructure and third-party charges are disclosed separately.'}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-7 md:grid-cols-2 xl:grid-cols-3">
          {Object.values(packages).map((pkg) => {
            const includedAddons = getIncludedAddonKeys(pkg.key)
            return (
              <article key={pkg.key} className="flex flex-col rounded-[1.5rem] border border-slate-200 bg-white p-7 shadow-[0_16px_45px_rgba(15,23,42,.07)]">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                  {pkg.key === 'custom' ? (isId ? 'Mulai dari' : 'Starting from') : (isId ? 'Sekali bayar' : 'One-time')}
                </p>
                <h2 className="mt-3 text-2xl font-black">{pkg.name}</h2>
                <p className="mt-2 min-h-12 text-sm leading-relaxed text-slate-600">{pkg.desc}</p>
                <p className="mt-5 text-3xl font-black tracking-tight">{idr.format(pkg.price)}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{isId ? 'biaya implementasi satu kali' : 'one-time implementation fee'}</p>

                <div className="mt-6 border-t border-slate-100 pt-5">
                  <h3 className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{isId ? 'Termasuk' : 'Included'}</h3>
                  <ul className="mt-3 space-y-2 text-sm text-slate-700">
                    {pkg.includedCapabilities.map((capability) => <li key={capability} className="flex gap-2"><span className="font-black text-emerald-600">✓</span><span>{capability}</span></li>)}
                    {includedAddons.map((key) => {
                      const addon = addonsList.find((entry) => entry.key === key)
                      return addon ? <li key={key} className="flex gap-2"><span className="font-black text-emerald-600">✓</span><span>{addon.name}</span></li> : null
                    })}
                  </ul>
                </div>

                <Link href={`/${params.locale}/project-setup?package=${pkg.key}`} className="dagangos-cta-gradient mt-7 inline-flex justify-center rounded-xl px-4 py-3 text-sm font-black">
                  {isId ? 'Konfigurasi paket' : 'Configure package'}
                </Link>
              </article>
            )
          })}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-3xl font-black tracking-tight">{isId ? 'Add-on implementasi opsional' : 'Optional implementation add-ons'}</h2>
          <p className="mt-3 max-w-3xl text-slate-600">{isId ? 'Add-on yang sudah termasuk dalam paket pilihan tidak akan ditagihkan lagi saat konfigurasi proyek.' : 'An add-on already included in the selected package will not be charged again during project configuration.'}</p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {addonsList.map((addon) => (
              <div key={addon.key} className="rounded-2xl border border-slate-200 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="font-black">{addon.name}</h3>
                  <p className="font-black text-emerald-700">{idr.format(addon.price)}{addon.priceNote ? ` · ${addon.priceNote}` : ''}</p>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{addon.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-7">
            <h2 className="text-xl font-black">{isId ? 'Biaya di luar paket' : 'Costs outside the package'}</h2>
            <ul className="mt-4 space-y-2 text-sm leading-relaxed text-amber-950">
              <li>• {isId ? 'Domain, VPS/hosting, email, dan lisensi pihak ketiga dibayar sesuai penyedia yang dipilih.' : 'Domain, VPS/hosting, email, and third-party licenses are charged by the selected provider.'}</li>
              <li>• {isId ? 'Payment gateway dapat mengenakan MDR, biaya transaksi, pencairan, refund, atau biaya lain berdasarkan akun merchant Anda.' : 'Payment gateways may charge MDR, transaction, disbursement, refund, or other fees under your merchant account.'}</li>
              <li>• {isId ? 'Pajak, pengiriman, dan layanan operasional lain ditampilkan ketika relevan.' : 'Taxes, shipping, and other operational services are shown when applicable.'}</li>
            </ul>
          </div>
          <div className="rounded-[1.5rem] bg-slate-950 p-7 text-white">
            <h2 className="text-xl font-black">{COMPANY.legalName}</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">{isId ? 'Sebelum pembayaran, Project Setup menampilkan paket, add-on terpilih, dan total yang harus ditinjau pelanggan.' : 'Before payment, Project Setup shows the package, selected add-ons, and total for customer review.'}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href={`/${params.locale}/business`} className="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold">{isId ? 'Informasi bisnis' : 'Business information'}</Link>
              <Link href={`/${params.locale}/site/refund`} className="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold">{isId ? 'Kebijakan refund' : 'Refund policy'}</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
