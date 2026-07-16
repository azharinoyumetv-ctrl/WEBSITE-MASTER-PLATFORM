import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../globals.css'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/components/providers'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { COMPANY } from '@/lib/company'
import { DeploymentRecovery } from '@/components/deployment-recovery'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: `${COMPANY.legalName} | ${COMPANY.productName}`,
    template: `%s | ${COMPANY.legalName}`,
  },
  description: 'Enterprise-grade multi-tenant SaaS platform — built for agencies and their clients',
  keywords: ['DagangOS', 'self-hosted', 'platform', 'website', 'ecommerce', 'Indonesia'],
  openGraph: {
    type: 'website',
    title: `${COMPANY.legalName} | ${COMPANY.productName}`,
    description: 'Self-hosted digital business platforms for Indonesian businesses.',
    siteName: COMPANY.legalName,
    images: [{
      url: '/dagangos-web-wordmark.png',
      width: 1672,
      height: 941,
      alt: 'DagangOS Web',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${COMPANY.legalName} | ${COMPANY.productName}`,
    description: 'Self-hosted digital business platforms for Indonesian businesses.',
    images: ['/dagangos-web-wordmark.png'],
  },
  alternates: {
    canonical: 'https://store.dagangos.com',
  },
  icons: {
        icon: [{ url: '/dagangos-tab-icon.png?v=2', type: 'image/png', sizes: '512x512' }],
        shortcut: '/favicon.ico?v=2',
        apple: [{ url: '/dagangos-tab-icon.png?v=2', type: 'image/png', sizes: '512x512' }],
  },
  manifest: '/site.webmanifest',
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
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
