'use client'

import { useEffect } from 'react'
import { useLocale } from 'next-intl'

// The first-generation admin screens predate next-intl. Localize only exact,
// known interface phrases so tenant and customer data are never altered.
const ID: Record<string, string> = {
  'Core': 'Utama', 'Identity': 'Identitas', 'Commerce': 'Perdagangan', 'Operations': 'Operasional', 'Intelligence': 'Kecerdasan', 'Developer': 'Pengembang', 'Config': 'Konfigurasi',
  'Dashboard': 'Dasbor', 'Welcome to your workspace': 'Selamat datang di ruang kerja Anda', 'DagangOS control centre': 'Pusat kendali DagangOS',
  'Last 7 Days': '7 Hari Terakhir', 'Last 30 Days': '30 Hari Terakhir', 'Last 90 Days': '90 Hari Terakhir', 'Export': 'Ekspor', 'Widgets': 'Widget',
  'Workspace active': 'Ruang kerja aktif', 'Connectivity healthy': 'Konektivitas sehat', 'A clear view of the commercial and operational signals that matter today.': 'Tampilan ringkas sinyal perdagangan dan operasional yang penting hari ini.', 'modules active': 'modul aktif', ' of ': ' dari ', 'modules activated': 'modul diaktifkan', 'enterprise plan': 'penerapan enterprise', '· enterprise plan': '· penerapan enterprise', 'Revenue & Orders — Last': 'Pendapatan & Pesanan —', 'Days': 'Hari Terakhir', 'Total Revenue': 'Total Pendapatan', 'Page Views': 'Tayangan Halaman', 'Total Orders': 'Total Pesanan', 'Conversion Rate': 'Rasio Konversi', 'View details': 'Lihat detail',
  'Daily revenue performance': 'Kinerja pendapatan harian', 'Revenue': 'Pendapatan', 'Orders': 'Pesanan', 'Workspace health': 'Kesehatan ruang kerja', 'Live database and application check': 'Pemeriksaan langsung database dan aplikasi', 'Connectivity checks are healthy.': 'Pemeriksaan konektivitas sehat.', 'No active incidents recorded.': 'Tidak ada insiden aktif.',
  'Recent orders': 'Pesanan terbaru', 'Latest commercial activity': 'Aktivitas perdagangan terbaru', 'Orders will appear here when customers submit them.': 'Pesanan akan muncul di sini ketika pelanggan mengirimkannya.', 'Inventory attention': 'Perhatian inventaris', 'Items requiring a stock decision': 'Item yang memerlukan keputusan stok', 'Stock levels are within their current thresholds.': 'Level stok berada dalam ambang saat ini.',
  'Workspace activity': 'Aktivitas ruang kerja', 'Audited administrative actions': 'Tindakan administratif yang diaudit', 'Activity will be recorded here as the workspace is configured.': 'Aktivitas akan tercatat di sini saat ruang kerja dikonfigurasi.', 'Enabled capabilities': 'Kemampuan aktif',
  'User Management': 'Manajemen Pengguna', 'Tenant Management': 'Manajemen Penyewa', 'Module Manager': 'Manajer Modul', 'System Monitoring': 'Pemantauan Sistem', 'Feature Flags': 'Fitur', 'Workspace Settings': 'Pengaturan Ruang Kerja', 'My Profile': 'Profil Saya', 'Access Control (RBAC)': 'Kontrol Akses (RBAC)', 'API & Webhooks': 'API & Webhook', 'Analytics': 'Analitik', 'Notifications': 'Notifikasi', 'Catalog': 'Katalog', 'Inventory Management': 'Manajemen Inventaris', 'E-commerce Orders': 'Pesanan E-commerce', 'Payment Ledger': 'Buku Besar Pembayaran', 'Booking & Scheduling': 'Pemesanan & Penjadwalan', 'AI Assistant': 'Asisten AI', 'CMS Pages': 'Halaman CMS',
  'Save Changes': 'Simpan Perubahan', 'Saving...': 'Menyimpan...', 'Cancel': 'Batal', 'Search...': 'Cari...', 'Search users...': 'Cari pengguna...', 'Search tenants...': 'Cari penyewa...', 'New Tenant': 'Penyewa Baru', 'New User': 'Pengguna Baru', 'Invite User': 'Undang Pengguna', 'Deployment': 'Penerapan', 'Status': 'Status', 'Created': 'Dibuat', 'Actions': 'Tindakan', 'Manage': 'Kelola', 'Edit': 'Ubah', 'Delete': 'Hapus', 'Active': 'Aktif', 'Suspended': 'Ditangguhkan', 'Platform Owner': 'Pemilik Platform', 'All Systems Operational': 'Semua Sistem Beroperasi', 'View Site': 'Lihat Situs',
  'Open Shift': 'Buka Shift', 'Opening Float (Register Balance)': 'Kas Awal (Saldo Kasir)', 'Current Cart': 'Keranjang Saat Ini', 'Close Shift': 'Tutup Shift', 'Open navigation menu': 'Buka menu navigasi', 'Close navigation menu': 'Tutup menu navigasi', 'Open notifications': 'Buka notifikasi', 'Change language': 'Ubah bahasa', 'Toggle Theme': 'Ubah tema',
}

const attributes = ['placeholder', 'title', 'aria-label'] as const

function translateText(node: Text) {
  const parent = node.parentElement
  if (!parent || parent.closest('[data-no-auto-translate], script, style, code, pre, textarea')) return
  const value = node.nodeValue || ''
  const original = value.trim()
  let translated = ID[original]
  if (!translated && /^(\d+) modules active$/.test(original)) translated = original.replace(/^(\d+) modules active$/, '$1 modul aktif')
  if (!translated && /^(\d+) of (\d+) modules activated$/.test(original)) translated = original.replace(/^(\d+) of (\d+) modules activated$/, '$1 dari $2 modul diaktifkan')
  if (!translated && /^Revenue & Orders — Last (\d+) Days$/.test(original)) translated = original.replace(/^Revenue & Orders — Last (\d+) Days$/, 'Pendapatan & Pesanan — $1 Hari Terakhir')
  if (!translated && /^(.*) · (core|enterprise|agency) plan$/.test(original)) translated = original.replace(/^(.*) · (core|enterprise|agency) plan$/, '$1 · penerapan $2')
  if (translated) node.nodeValue = value.replace(original, translated)
}

function translate(element: Element) {
  if (element.closest('[data-no-auto-translate], script, style, code, pre, textarea')) return
  for (const attribute of attributes) {
    const value = element.getAttribute(attribute)
    if (value && ID[value]) element.setAttribute(attribute, ID[value])
  }
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()
  while (node) {
    translateText(node as Text)
    node = walker.nextNode()
  }
}

export function AdminLocaleBridge() {
  const locale = useLocale()

  useEffect(() => {
    if (locale !== 'id') return
    const main = document.getElementById('main-content')
    if (!main) return

    // Observing the whole document and translating synchronously for every
    // mutation competes with React hydration. Batch only newly inserted admin
    // content; text-node mutations are intentionally ignored to avoid reacting
    // to our own translation writes.
    translate(main)
    const pendingRoots = new Set<Element>()
    let frameId: number | null = null

    const flush = () => {
      frameId = null
      const roots = Array.from(pendingRoots)
      pendingRoots.clear()
      roots.forEach((root) => {
        const isNestedInQueuedRoot = roots.some((candidate) => candidate !== root && candidate.contains(root))
        if (!isNestedInQueuedRoot && root.isConnected) translate(root)
      })
    }

    const observer = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) pendingRoots.add(node as Element)
          if (node.nodeType === Node.TEXT_NODE && node.parentElement) pendingRoots.add(node.parentElement)
        })
      })

      if (pendingRoots.size > 0 && frameId === null) {
        frameId = window.requestAnimationFrame(flush)
      }
    })

    observer.observe(main, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      if (frameId !== null) window.cancelAnimationFrame(frameId)
    }
  }, [locale])

  return null
}
