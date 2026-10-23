import { notFound } from 'next/navigation'
import Link from 'next/link'
import { packages } from '@/lib/constants/packages'
import { isDemoEnvironment } from '@/lib/demo-environment'

export default function DemoPage({params,searchParams}:{params:{locale:string};searchParams:{package?:string}}) {
  if (!isDemoEnvironment()) notFound()
  const locale=params.locale==='id'?'id':'en'
  const id=locale==='id'
  const key=searchParams.package && Object.hasOwn(packages,searchParams.package)?searchParams.package:'business_website'
  return <main className="min-h-screen bg-slate-50 px-6 py-16"><div className="mx-auto max-w-5xl">
    <Link href={`https://wmp.dagangos.com/${locale}/site/catalog`} className="text-sm font-semibold text-emerald-700">← {id?'Kembali ke solusi':'Back to solutions'}</Link>
    <p className="mt-12 text-xs font-bold uppercase tracking-widest text-emerald-700">DagangOS Web · {id?'Demo produk':'Product demo'}</p>
    <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight text-slate-950 md:text-6xl">{id?'Coba produk yang sebenarnya.':'Try the actual product.'}</h1>
    <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">{id?'Jelajahi situs dan ruang kerja WMP dengan data contoh. Setiap pengunjung mendapat ruang kerja sendiri, menggunakan aplikasi dan alur kerja produk yang sama.':'Explore a WMP website and workspace with sample data. Each visitor gets a separate workspace running the same application and workflows as the product.'}</p>
    <p className="mt-4 max-w-2xl text-sm text-slate-500">{id?'Gunakan data contoh saja. Pembayaran sungguhan, pesan eksternal, dan layanan yang memerlukan API key tidak tersedia dalam demo.':'Use sample data only. Real payments, external messaging, and services requiring API keys are unavailable in the demo.'}</p>
    <div className="mt-10 grid gap-6 md:grid-cols-2">{[{destination:'website',title:id?'Lihat situs pelanggan':'Explore the customer website',description:id?'Lihat halaman yang diterbitkan melalui CMS WMP.':'See pages published through the real WMP content management system.'},{destination:'dashboard',title:id?'Buka ruang kerja':'Open the workspace',description:id?'Kelola konten, produk, pesanan, dan modul sesuai paket yang dipilih.':'Manage content, products, orders, and the modules for your selected package.'}].map(item=><form key={item.destination} action="/api/demo/session" method="post" className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"><input type="hidden" name="locale" value={locale}/><input type="hidden" name="package" value={key}/><input type="hidden" name="destination" value={item.destination}/><h2 className="text-xl font-bold text-slate-950">{item.title}</h2><p className="mt-3 text-sm leading-relaxed text-slate-600">{item.description}</p><p className="mt-5 text-sm font-semibold text-slate-700">{packages[key].name}</p><button className="mt-5 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white">{id?'Mulai demo':'Start demo'} →</button></form>)}</div>
  </div></main>
}
