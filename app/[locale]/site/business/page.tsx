import type { Metadata } from 'next'
import Link from 'next/link'
import { COMPANY } from '@/lib/company'

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  const isId = params.locale === 'id'
  return {
    title: isId ? 'Informasi Bisnis' : 'Business Information',
    description: isId ? 'Identitas, layanan, proses pemesanan, dan kontak resmi DagangOS.' : 'Official DagangOS identity, services, ordering process, and contact details.',
    alternates: { canonical: `/${isId ? 'id' : 'en'}/business` },
  }
}

export default function BusinessPage({ params }: { params: { locale: string } }) {
  const isId = params.locale === 'id'
  const products = isId
    ? ['Website bisnis dan company profile', 'Website e-commerce', 'Aplikasi web khusus', 'POS, inventori, dan layanan implementasi terkait']
    : ['Business and company-profile websites', 'E-commerce websites', 'Custom web applications', 'POS, inventory, and associated implementation services']
  const steps = isId
    ? ['Pelanggan memilih paket.', 'Pelanggan mengonfigurasi kebutuhan proyek.', 'Pelanggan meninjau ruang lingkup dan total.', 'Pelanggan melakukan pembayaran.', 'Proyek masuk proses produksi.', 'Hasil proyek diserahkan sesuai ruang lingkup yang disepakati.']
    : ['The customer selects a package.', 'The customer configures project requirements.', 'The customer reviews the scope and total.', 'The customer completes payment.', 'The project enters production.', 'The project is delivered under the agreed scope.']

  return (
    <div className="min-h-screen bg-[#f7fafc] text-slate-950">
      <section className="relative isolate overflow-hidden py-20 text-white dagangos-aurora">
        <div className="absolute inset-0 dagangos-grid opacity-35" />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-200">{isId ? 'Informasi bisnis resmi' : 'Official business information'}</p>
          <h1 className="mt-5 text-4xl font-black tracking-[-0.045em] sm:text-6xl">{COMPANY.legalName}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-300">{isId ? 'Pengembangan dan penjualan layanan website, software, serta platform operasional bisnis.' : 'Development and sale of website, software, and business-operations platform services.'}</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 py-16 md:grid-cols-2">
        <article className="rounded-[1.5rem] border border-slate-200 bg-white p-7 shadow-sm">
          <h2 className="text-2xl font-black">{isId ? 'Produk dan layanan' : 'Products and services'}</h2>
          <ul className="mt-5 space-y-3 text-slate-700">{products.map((product) => <li key={product} className="flex gap-3"><span className="font-black text-emerald-600">✓</span><span>{product}</span></li>)}</ul>
        </article>
        <article className="rounded-[1.5rem] border border-slate-200 bg-white p-7 shadow-sm">
          <h2 className="text-2xl font-black">{isId ? 'Cara pemesanan' : 'How ordering works'}</h2>
          <ol className="mt-5 space-y-3 text-slate-700">{steps.map((step, index) => <li key={step} className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-950 text-xs font-black text-white">{index + 1}</span><span>{step}</span></li>)}</ol>
        </article>

        <article className="rounded-[1.5rem] border border-slate-200 bg-white p-7 shadow-sm">
          <h2 className="text-2xl font-black">{isId ? 'Identitas dan kontak' : 'Identity and contact'}</h2>
          <dl className="mt-5 space-y-4 text-sm">
            <div><dt className="font-bold text-slate-500">{isId ? 'Nama usaha' : 'Business name'}</dt><dd className="mt-1 font-semibold">{COMPANY.legalName}</dd></div>
            <div><dt className="font-bold text-slate-500">{isId ? 'Lokasi' : 'Location'}</dt><dd className="mt-1 font-semibold">{COMPANY.address}</dd></div>
            <div><dt className="font-bold text-slate-500">Email</dt><dd className="mt-1"><a className="font-semibold text-emerald-700" href={`mailto:${COMPANY.supportEmail}`}>{COMPANY.supportEmail}</a></dd></div>
            <div><dt className="font-bold text-slate-500">WhatsApp</dt><dd className="mt-1"><a className="font-semibold text-emerald-700" href="https://wa.me/628999155182">{COMPANY.supportPhone}</a></dd></div>
          </dl>
        </article>
        <article className="rounded-[1.5rem] bg-slate-950 p-7 text-white shadow-sm">
          <h2 className="text-2xl font-black">{isId ? 'Dokumen publik' : 'Public documents'}</h2>
          <div className="mt-5 grid gap-3">
            <Link href={`/${params.locale}/pricing`} className="rounded-xl border border-white/15 px-4 py-3 font-bold">{isId ? 'Harga paket' : 'Package pricing'}</Link>
            <Link href={`/${params.locale}/site/terms`} className="rounded-xl border border-white/15 px-4 py-3 font-bold">{isId ? 'Syarat dan ketentuan' : 'Terms of service'}</Link>
            <Link href={`/${params.locale}/site/privacy`} className="rounded-xl border border-white/15 px-4 py-3 font-bold">{isId ? 'Kebijakan privasi' : 'Privacy policy'}</Link>
            <Link href={`/${params.locale}/site/refund`} className="rounded-xl border border-white/15 px-4 py-3 font-bold">{isId ? 'Pembatalan dan refund' : 'Cancellation and refunds'}</Link>
            <Link href={`/${params.locale}/site/contact`} className="rounded-xl border border-white/15 px-4 py-3 font-bold">{isId ? 'Hubungi kami' : 'Contact us'}</Link>
          </div>
        </article>
      </section>
    </div>
  )
}
