import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../globals.css'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/components/providers'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Website Master Platform',
    template: '%s | Website Master Platform',
  },
  description: 'Enterprise-grade multi-tenant SaaS platform — built for agencies and their clients',
  keywords: ['saas', 'multi-tenant', 'platform', 'cms', 'ecommerce', 'crm'],
  openGraph: {
    type: 'website',
    title: 'Website Master Platform',
    description: 'Enterprise-grade multi-tenant SaaS platform',
    siteName: 'Website Master Platform',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Website Master Platform',
    description: 'Enterprise-grade multi-tenant SaaS platform',
  },
  alternates: {
    canonical: 'https://store.dagangos.com',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
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
