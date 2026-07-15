'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowRight, ArrowUpRight, Check, CircleHelp, Layers3, Monitor, ShoppingBag, Store, UtensilsCrossed } from 'lucide-react'
import { packages } from '@/lib/constants/packages'

type Category = 'all' | 'brand' | 'commerce' | 'operations' | 'custom'

type CatalogEntry = {
  key: keyof typeof packages
  category: Exclude<Category, 'all'>
  icon: typeof Store
  fit: { en: string; id: string }
  outcome: { en: string; id: string }
  includes: { en: string[]; id: string[] }
}

const entries: CatalogEntry[] = [
  { key: 'landing_page', category: 'brand', icon: Store, fit: { en: 'For a focused launch or campaign', id: 'Untuk peluncuran atau kampanye yang fokus' }, outcome: { en: 'Turn attention into qualified enquiries.', id: 'Ubah perhatian menjadi calon pelanggan yang relevan.' }, includes: { en: ['Conversion-focused page', 'Lead capture form', 'Responsive launch design'], id: ['Halaman fokus konversi', 'Formulir pengumpulan prospek', 'Desain peluncuran responsif'] } },
  { key: 'company_profile', category: 'brand', icon: Layers3, fit: { en: 'For established companies that need trust', id: 'Untuk perusahaan yang membutuhkan kredibilitas' }, outcome: { en: 'Present your business, services, and proof professionally.', id: 'Tampilkan bisnis, layanan, dan bukti Anda secara profesional.' }, includes: { en: ['Multi-page company website', 'Content-management foundation', 'SEO-ready information architecture'], id: ['Situs perusahaan multi-halaman', 'Fondasi pengelolaan konten', 'Struktur informasi siap SEO'] } },
  { key: 'business_website', category: 'brand', icon: Monitor, fit: { en: 'For teams that need control after launch', id: 'Untuk tim yang perlu kontrol setelah peluncuran' }, outcome: { en: 'Run content and operations from a secure workspace.', id: 'Kelola konten dan operasional dari ruang kerja yang aman.' }, includes: { en: ['Admin workspace', 'Role-based access', 'Analytics and notifications'], id: ['Ruang kerja admin', 'Akses berbasis peran', 'Analitik dan notifikasi'] } },
  { key: 'ecommerce', category: 'commerce', icon: ShoppingBag, fit: { en: 'For businesses selling products online', id: 'Untuk bisnis yang menjual produk secara online' }, outcome: { en: 'Sell, accept payments, and manage orders in one place.', id: 'Jual, terima pembayaran, dan kelola pesanan di satu tempat.' }, includes: { en: ['Storefront and product catalog', 'Cart and checkout foundation', 'Orders, payments, and inventory'], id: ['Etalase dan katalog produk', 'Fondasi keranjang dan checkout', 'Pesanan, pembayaran, dan inventaris'] } },
  { key: 'restaurant', category: 'operations', icon: UtensilsCrossed, fit: { en: 'For food and hospitality operations', id: 'Untuk operasional makanan dan hospitality' }, outcome: { en: 'Coordinate menus, reservations, and daily service.', id: 'Koordinasikan menu, reservasi, dan layanan harian.' }, includes: { en: ['Menu and catalog setup', 'Booking workflow', 'Operations-ready workspace'], id: ['Pengaturan menu dan katalog', 'Alur kerja pemesanan', 'Ruang kerja siap operasional'] } },
  { key: 'retail_pos', category: 'operations', icon: Monitor, fit: { en: 'For retailers selling online and in-store', id: 'Untuk peritel daring dan toko fisik' }, outcome: { en: 'Keep sales and stock aligned across your business.', id: 'Selaraskan penjualan dan stok di seluruh bisnis Anda.' }, includes: { en: ['E-commerce storefront', 'Browser POS terminal', 'Stock and payment workflows'], id: ['Etalase e-commerce', 'Terminal POS di browser', 'Alur stok dan pembayaran'] } },
  { key: 'custom', category: 'custom', icon: CircleHelp, fit: { en: 'For specialised workflows or integrations', id: 'Untuk alur kerja atau integrasi khusus' }, outcome: { en: 'Scope a platform around the way your business actually works.', id: 'Rancang platform sesuai cara bisnis Anda benar-benar bekerja.' }, includes: { en: ['Discovery and solution design', 'Bespoke workflow scope', 'Implementation proposal'], id: ['Discovery dan desain solusi', 'Ruang lingkup alur kerja khusus', 'Proposal implementasi'] } },
]

export function CatalogClient({ locale }: { locale: string }) {
  const [category, setCategory] = useState<Category>('all')
  const [selectedKey, setSelectedKey] = useState<keyof typeof packages>('landing_page')
  const isIndonesian = locale === 'id'
  const copy = (entry: { en: string; id: string }) => isIndonesian ? entry.id : entry.en
  const money = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
  const visible = useMemo(() => category === 'all' ? entries : entries.filter(entry => entry.category === category), [category])
  const selected = entries.find(entry => entry.key === selectedKey) || entries[0]
  const categories: Array<{ key: Category; label: string }> = [
    { key: 'all', label: isIndonesian ? 'Semua solusi' : 'All solutions' },
    { key: 'brand', label: isIndonesian ? 'Website & merek' : 'Website & brand' },
    { key: 'commerce', label: isIndonesian ? 'E-commerce' : 'E-commerce' },
    { key: 'operations', label: isIndonesian ? 'Operasional' : 'Operations' },
    { key: 'custom', label: isIndonesian ? 'Kebutuhan khusus' : 'Custom needs' },
  ]

  return (
    <div className="min-h-screen bg-[#f7fafc]">
      <section className="relative isolate overflow-hidden bg-slate-950 py-20 text-white dagangos-aurora">
        <div className="absolute inset-0 dagangos-grid opacity-35" />
        <div className="relative mx-auto max-w-6xl px-6 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1.5 text-xs font-bold text-emerald-100"><Layers3 className="h-3.5 w-3.5" /> {isIndonesian ? 'Katalog solusi DagangOS' : 'DagangOS solutions catalog'}</span>
          <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-black tracking-[-0.045em] sm:text-6xl">{isIndonesian ? 'Temukan sistem yang sesuai dengan cara bisnis Anda berjalan.' : 'Find the system that fits how your business actually runs.'}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">{isIndonesian ? 'Jelajahi berdasarkan tujuan bisnis, pahami ruang lingkupnya, lalu mulai percakapan proyek dengan pilihan yang sudah tepat.' : 'Explore by business goal, understand the scope, and start a project conversation with the right choice already selected.'}</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 sm:py-16">
        <div className="flex flex-wrap gap-2" aria-label={isIndonesian ? 'Filter kategori katalog' : 'Catalog category filters'}>
          {categories.map(item => <button key={item.key} onClick={() => setCategory(item.key)} className={`rounded-full px-4 py-2 text-sm font-bold transition ${category === item.key ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/15' : 'border border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-slate-950'}`}>{item.label}</button>)}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="grid gap-4 sm:grid-cols-2">
            {visible.map(entry => {
              const product = packages[entry.key]
              const Icon = entry.icon
              const active = entry.key === selectedKey
              return <button key={entry.key} onClick={() => setSelectedKey(entry.key)} className={`group relative flex min-h-72 flex-col rounded-[1.5rem] border bg-white p-6 text-left transition hover:-translate-y-1 hover:shadow-xl ${active ? 'border-emerald-400 ring-2 ring-emerald-200 shadow-[0_18px_45px_rgba(16,185,129,.15)]' : 'border-slate-200 shadow-[0_10px_30px_rgba(15,23,42,.06)]'}`}>
                <div className="flex items-start justify-between gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-emerald-300"><Icon className="h-5 w-5" /></span><span className="text-xs font-black text-emerald-700">{entry.key === 'custom' ? `${isIndonesian ? 'Mulai' : 'Starting'} ${money(product.price)}` : money(product.price)}</span></div>
                <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{copy(entry.fit)}</p>
                <h2 className="mt-2 text-xl font-black text-slate-950">{product.name}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{copy(entry.outcome)}</p>
                <span className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-bold text-emerald-700">{isIndonesian ? 'Lihat kecocokan' : 'View fit'} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
              </button>
            })}
          </div>

          <aside className="h-fit rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,.10)] lg:sticky lg:top-24">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">{isIndonesian ? 'Pilihan Anda' : 'Your selection'}</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">{packages[selected.key].name}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{copy(selected.outcome)}</p>
            <p className="mt-4 text-xl font-black text-slate-950">{selected.key === 'custom' ? `${isIndonesian ? 'Mulai dari ' : 'Starting at '}` : ''}{money(packages[selected.key].price)}</p>
            <div className="mt-6 border-t border-slate-100 pt-5"><p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{isIndonesian ? 'Yang akan dibahas dengan sales' : 'What sales will scope with you'}</p><ul className="mt-3 space-y-2.5">{selected.includes[isIndonesian ? 'id' : 'en'].map(item => <li key={item} className="flex gap-2 text-sm text-slate-700"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{item}</li>)}</ul></div>
            <Link href={`/${locale}/project-setup?package=${selected.key}&source=solutions_catalog`} className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-300 to-sky-400 px-4 py-3 text-sm font-black text-slate-950 transition hover:-translate-y-0.5"><ArrowUpRight className="h-4 w-4" />{isIndonesian ? 'Diskusikan kebutuhan saya' : 'Discuss my requirements'}</Link>
            <Link href={`/${locale}/contact`} className="mt-3 block text-center text-xs font-bold text-slate-500 hover:text-slate-950">{isIndonesian ? 'Belum yakin? Bicara dengan tim kami.' : 'Not sure yet? Talk to our team.'}</Link>
          </aside>
        </div>
      </section>
    </div>
  )
}
