import Link from 'next/link'
export function DemoBanner({locale}:{locale:string}) {
  const id=locale==='id'
  return <aside className="fixed inset-x-0 bottom-0 z-[100] flex flex-wrap items-center justify-between gap-2 border-t border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-950" aria-label="Demo workspace notice"><p><strong>{id?'Ruang kerja demo':'Demo workspace'}</strong> · {id?'Gunakan data contoh saja. Tidak ada pembayaran sungguhan.':'Use sample data only. No real payments.'}</p><nav className="flex gap-4 font-bold"><Link href={`/${locale}`}>{id?'Lihat situs':'View website'}</Link><Link href={`/${locale}/admin/dashboard`}>{id?'Ruang kerja':'Workspace'}</Link><Link href={`/${locale}/demo`}>{id?'Pilihan demo':'Demo choices'}</Link></nav></aside>
}
