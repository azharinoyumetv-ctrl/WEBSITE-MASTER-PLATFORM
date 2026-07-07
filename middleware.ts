import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}

const locales = ['en', 'id']
const defaultLocale = 'en'

function getLocale(request: NextRequest) {
  // 1. Check cookies
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value
  if (cookieLocale && locales.includes(cookieLocale)) {
    return cookieLocale
  }
  // 2. Check Accept-Language
  const acceptLanguage = request.headers.get('accept-language')
  if (acceptLanguage) {
    if (acceptLanguage.includes('id')) return 'id'
  }
  return defaultLocale
}

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // 1. Auth check for protected admin routes
  const isProtected = pathname.match(/^\/(en|id)\/admin/) || pathname.startsWith('/admin')

  if (isProtected) {
    const token = await getToken({ req: request })
    if (!token) {
      // Determine locale to redirect to
      const localeMatch = pathname.match(/^\/(en|id)(\/|$)/)
      const locale = localeMatch ? localeMatch[1] : getLocale(request)
      const url = new URL(`/${locale}/auth/login`, request.url)
      url.searchParams.set('callbackUrl', encodeURI(request.url))
      return NextResponse.redirect(url)
    }
  }

  // 2. Run our routing logic (which extracts tenant and locale)
  return handleRouting(request)
}

function handleRouting(request: NextRequest) {
  const url = request.nextUrl
  const hostname = request.headers.get('host') || ''
  const pathname = url.pathname

  // Parse Locale from URL
  const localeMatch = pathname.match(/^\/(en|id)(\/|$)/)
  const localeInUrl = localeMatch ? localeMatch[1] : null
  const pathWithoutLocale = localeInUrl ? pathname.replace(`/${localeInUrl}`, '') || '/' : pathname

  // Domain parsing
  const isAdminSubdomain = hostname.startsWith('admin.') || pathWithoutLocale.startsWith('/auth') || pathWithoutLocale.startsWith('/admin')
  const isPublicSite = !isAdminSubdomain

  let tenantId = 'default'
  if (isPublicSite || pathname.startsWith('/api')) {
    // Determine tenant even for API routes if they are public facing or admin
    const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'shop.dagangos.com'
    const hostnameWithoutPort = hostname.split(':')[0]
    
    if (hostname === BASE_DOMAIN || hostnameWithoutPort === 'localhost' || hostname.startsWith('www.')) {
      tenantId = 'default'
    } else if (hostname.endsWith(`.${BASE_DOMAIN}`)) {
      tenantId = hostname.replace(`.${BASE_DOMAIN}`, '')
    } else if (hostnameWithoutPort.endsWith('.localhost')) {
      tenantId = hostnameWithoutPort.replace('.localhost', '')
    } else {
      tenantId = hostname
    }
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-tenant-id', tenantId)

  if (pathname.startsWith('/api')) {
    // API routes bypass locale redirects and rewriting
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  // Redirect to localized URL if missing
  if (!localeInUrl) {
    const locale = getLocale(request)
    const redirectUrl = new URL(`/${locale}${pathname}${url.search}`, request.url)
    return NextResponse.redirect(redirectUrl)
  }

  // We have a locale in the URL.
  // Set X-Next-Intl-Locale for next-intl server components
  requestHeaders.set('X-Next-Intl-Locale', localeInUrl)

  if (isPublicSite) {
    // Prevent double rewrite
    if (pathWithoutLocale === '/site' || pathWithoutLocale.startsWith('/site/')) {
      return NextResponse.next({ request: { headers: requestHeaders } })
    }
    // Rewrite to /en/site or /en/site/about
    const targetPath = pathWithoutLocale === '/' ? '' : pathWithoutLocale
    const finalUrl = new URL(`/${localeInUrl}/site${targetPath}`, request.url)
    return NextResponse.rewrite(finalUrl, {
      request: { headers: requestHeaders },
    })
  }

  return NextResponse.next({ request: { headers: requestHeaders } })
}
