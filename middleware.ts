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

function getBaseUrl(request: NextRequest) {
  const host = request.headers.get('host')
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  if (host) {
    return `${proto}://${host}`
  }
  return process.env.NEXTAUTH_URL || request.nextUrl.origin
}

function getTenantFromHost(hostname: string): string {
  const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'store.dagangos.com'
  const hostnameWithoutPort = hostname.split(':')[0]
  
  if (hostname === BASE_DOMAIN || hostnameWithoutPort === 'localhost' || hostname.startsWith('www.')) {
    return 'default'
  } else if (hostname.endsWith(`.${BASE_DOMAIN}`)) {
    return hostname.replace(`.${BASE_DOMAIN}`, '')
  } else if (hostnameWithoutPort.endsWith('.localhost')) {
    return hostnameWithoutPort.replace('.localhost', '')
  } else {
    return hostname
  }
}

function applySecurityHeaders(res: NextResponse) {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "connect-src 'self' https://challenges.cloudflare.com",
    "frame-ancestors 'none'",
  ].join('; ')

  res.headers.set('Content-Security-Policy', csp)
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  return res
}

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // 1. Auth check for protected admin routes
  const isProtected = (pathname.match(/^\/(en|id)\/admin/) || pathname.startsWith('/admin')) && !pathname.includes('/auth/login')

  if (isProtected) {
    const isSecure = process.env.NEXTAUTH_URL?.startsWith('https://') || request.headers.get('x-forwarded-proto') === 'https'
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: isSecure
    })
    
    let isAuthorized = false
    
    if (token) {
      const hostname = request.headers.get('host') || ''
      const targetTenantId = getTenantFromHost(hostname)
      
      const userRoles = (token.roles as string[]) || []
      const hasAnyRole = userRoles.length > 0
      const isSuperAdmin = userRoles.some(r => r.toLowerCase() === 'super-admin')
      
      if (hasAnyRole && (token.tenantId === targetTenantId || isSuperAdmin)) {
        isAuthorized = true
      }
    }
    
    if (!isAuthorized) {
      // Determine locale to redirect to
      const localeMatch = pathname.match(/^\/(en|id)(\/|$)/)
      const locale = localeMatch ? localeMatch[1] : getLocale(request)
      const origin = getBaseUrl(request)
      const redirectUrl = new URL(`/${locale}/auth/login`, origin)
      const callback = new URL(request.nextUrl.pathname + request.nextUrl.search, origin).href
      redirectUrl.searchParams.set('callbackUrl', callback)
      
      const response = NextResponse.redirect(redirectUrl)
      // Force clearing of the session cookie if they are logged in but unauthorized
      if (token) {
        const cookieName = isSecure ? '__Secure-next-auth.session-token' : 'next-auth.session-token'
        response.cookies.delete(cookieName)
      }
      return applySecurityHeaders(response)
    }
  }

  // 2. Run our routing logic (which extracts tenant and locale)
  return applySecurityHeaders(handleRouting(request))
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
    tenantId = getTenantFromHost(hostname)
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
    const origin = getBaseUrl(request)
    const redirectUrl = new URL(`/${locale}${pathname}${request.nextUrl.search}`, origin)
    return NextResponse.redirect(redirectUrl)
  }

  // We have a locale in the URL.
  // Set X-Next-Intl-Locale for next-intl server components
  requestHeaders.set('X-Next-Intl-Locale', localeInUrl)

  if (pathWithoutLocale === '/login') {
    const origin = getBaseUrl(request)
    const redirectUrl = new URL(`/${localeInUrl}/auth/login${request.nextUrl.search}`, origin)
    return NextResponse.redirect(redirectUrl)
  }

  if (isPublicSite) {
    // Prevent double rewrite and exclude fixed public routes
    if (
      pathWithoutLocale === '/site' || 
      pathWithoutLocale.startsWith('/site/') ||
      pathWithoutLocale.startsWith('/checkout') ||
      pathWithoutLocale.startsWith('/orders')
    ) {
      return NextResponse.next({ request: { headers: requestHeaders } })
    }
    // Rewrite to /en/site or /en/site/about
    const targetPath = pathWithoutLocale === '/' ? '' : pathWithoutLocale
    const origin = getBaseUrl(request)
    const finalUrl = new URL(`/${localeInUrl}/site${targetPath}`, origin)
    return NextResponse.rewrite(finalUrl, {
      request: { headers: requestHeaders },
    })
  }

  return NextResponse.next({ request: { headers: requestHeaders } })
}
