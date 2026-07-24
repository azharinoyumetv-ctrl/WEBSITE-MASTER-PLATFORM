import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { headers } from 'next/headers'
import '../globals.css'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/components/providers'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { COMPANY } from '@/lib/company'
import { DeploymentRecovery } from '@/components/deployment-recovery'

const geistSans = localFont({
  src: '../fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  display: 'swap',
})

const geistMono = localFont({
  src: '../fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  display: 'swap',
})

function getMetadataBase() {
  const headersList = headers()
  const host = headersList.get('x-forwarded-host') || headersList.get('host')
  const protocol = headersList.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https')
  const fallback = process.env.NEXT_PUBLIC_SITE_URL
    || (process.env.NEXT_PUBLIC_BASE_DOMAIN ? `https://${process.env.NEXT_PUBLIC_BASE_DOMAIN}` : 'https://store.dagangos.com')

  try {
    return new URL(host ? `${protocol}://${host}` : fallback)
  } catch {
    return new URL('https://store.dagangos.com')
  }
}

export function generateMetadata({ params: { locale } }: { params: { locale: string } }): Metadata {
  const isIndonesian = locale === 'id'
  const title = `${COMPANY.legalName} | ${COMPANY.productName}`
  const description = isIndonesian
    ? 'Platform bisnis digital self-hosted sekali bayar untuk website, perdagangan, dan operasional bisnis Indonesia.'
    : 'One-time, self-hosted digital business platforms for Indonesian websites, commerce, and operations.'
  const canonical = `/${isIndonesian ? 'id' : 'en'}`

  return {
    metadataBase: getMetadataBase(),
    title: {
      default: title,
      template: `%s | ${COMPANY.legalName}`,
    },
    description,
    keywords: ['DagangOS', 'self-hosted', 'platform', 'website', 'ecommerce', 'POS', 'Indonesia'],
    alternates: {
      canonical,
      languages: {
        en: '/en',
        id: '/id',
        'x-default': '/en',
      },
    },
    openGraph: {
      type: 'website',
      url: canonical,
      locale: isIndonesian ? 'id_ID' : 'en_US',
      alternateLocale: isIndonesian ? ['en_US'] : ['id_ID'],
      title,
      description,
      siteName: COMPANY.legalName,
      images: [{
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'DagangOS Web — self-hosted digital business platforms',
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og.png'],
    },
    icons: {
      icon: [{ url: '/dagangos-tab-icon.png?v=2', type: 'image/png', sizes: '512x512' }],
      shortcut: '/favicon.ico?v=2',
      apple: [{ url: '/dagangos-tab-icon.png?v=2', type: 'image/png', sizes: '512x512' }],
    },
    manifest: '/site.webmanifest',
  }
}

export default async function RootLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  const messages = await getMessages()

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <AuthProvider>
            <DeploymentRecovery />
            {children}
          </AuthProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#0F172A',
                color: '#F8FAFC',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                fontSize: '14px',
                fontFamily: 'Inter, system-ui, sans-serif',
              },
              success: {
                iconTheme: { primary: '#10B981', secondary: '#FFFFFF' },
              },
              error: {
                iconTheme: { primary: '#EF4444', secondary: '#FFFFFF' },
              },
            }}
          />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
