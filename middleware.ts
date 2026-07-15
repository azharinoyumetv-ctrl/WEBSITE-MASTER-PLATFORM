import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}

import { locales, defaultLocale } from './i18n'

function parseAcceptLanguage(request: NextRequest): string | null {
  const raw = request.headers.get('accept-language')
  if (!raw) return null
  const parsed = raw
    .split(',')
    .map(part => part.trim().split(';')[0].toLowerCase())
  const idMatch = parsed.find(part => part === 'id' || part.startsWith('id-'))
  return idMatch ? 'id' : null
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
  const hostnameWithoutPort = hostname.split(':')[0].toLowerCase()
  const baseDomain = BASE_DOMAIN.toLowerCase()
  
  if (hostnameWithoutPort === baseDomain || hostnameWithoutPort === 'localhost' || hostnameWithoutPort.startsWith('www.')) {
    return 'default'
  } else if (hostnameWithoutPort.endsWith(`.${baseDomain}`)) {
    return hostnameWithoutPort.replace(`.${baseDomain}`, '')
  } else if (hostnameWithoutPort.endsWith('.localhost')) {
    return hostnameWithoutPort.replace('.localhost', '')
  } else {
    return hostnameWithoutPort
  }
}

function createContentSecurityPolicy(nonce: string) {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com${isDevelopment ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
    "style-src-attr 'unsafe-inline'",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://challenges.cloudflare.com",
    "frame-src https://challenges.cloudflare.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ')

  return csp
}

function applySecurityHeaders(res: NextResponse, csp: string) {

  res.headers.set('Content-Security-Policy', csp)
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  return res
}

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const nonce = btoa(crypto.randomUUID())
  const csp = createContentSecurityPolicy(nonce)
  const requestHeaders = new Headers(request.headers)

  // Next reads this request header during SSR and adds the nonce to its Flight
  // bootstrap scripts. Without it, a strict CSP blocks hydration completely.
  requestHeaders.set('Content-Security-Policy', csp)
  requestHeaders.set('x-nonce', nonce)

  const isSecure = process.env.NEXTAUTH_URL?.startsWith('https://') || request.headers.get('x-forwarded-proto') === 'https'
  const hostname = request.headers.get('host') || ''
  const hostTenantId = getTenantFromHost(hostname)

  const nextAction = request.headers.get('next-action')
  const referer = request.headers.get('referer') || ''
  const isProtectedAction = nextAction && referer.includes('/admin')

  const isProtected = (
    (pathname.match(/^\/(en|id)\/admin/) || pathname.startsWith('/admin')) && 
    !pathname.includes('/auth/login')
  ) || isProtectedAction

  const token = (hostTenantId !== 'default' || isProtected)
    ? await getToken({ 
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
        secureCookie: isSecure
      })
    : null

  // 1. Cross-tenant routing validation if user has active session
  if (token && hostTenantId !== 'default') {
    const userRoles = (token.roles as string[]) || []
    const isSuperAdmin = userRoles.some(r => r.toLowerCase() === 'super-admin')
    
    if (token.tenantId !== hostTenantId && !isSuperAdmin) {
      console.warn(`Rejecting cross-tenant access from tenant ${token.tenantId} to target ${hostTenantId}`);
      if (request.headers.has('next-action') || pathname.startsWith('/api')) {
        return applySecurityHeaders(NextResponse.json({ error: 'Unauthorized tenant access' }, { status: 403 }), csp)
      }
      const origin = getBaseUrl(request)
      const locale = parseAcceptLanguage(request) || defaultLocale
      return applySecurityHeaders(NextResponse.redirect(new URL(`/${locale}/auth/login`, origin)), csp)
    }
  }

  // 2. Auth check for protected admin routes and admin server actions

  if (isProtected) {
    let isAuthorized = false
    
    if (token) {
      const userRoles = (token.roles as string[]) || []
      const hasAnyRole = userRoles.length > 0
      const isPlatformOwner = userRoles.some(r => r.toLowerCase() === 'platform_owner' || r.toLowerCase() === 'platform owner')
      const isSuperAdmin = userRoles.some(r => r.toLowerCase() === 'super-admin')
      
      if (hasAnyRole && (hostTenantId === 'default' || token.tenantId === hostTenantId || isPlatformOwner || isSuperAdmin)) {
        isAuthorized = true
      }
    }
    
    if (!isAuthorized) {
      if (request.headers.has('next-action') || pathname.startsWith('/api')) {
        return applySecurityHeaders(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), csp)
      }

      // Determine locale to redirect to
      const localeMatch = pathname.match(/^\/(en|id)(\/|$)/)
      const locale = localeMatch ? localeMatch[1] : parseAcceptLanguage(request) || defaultLocale
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
      return applySecurityHeaders(response, csp)
    }
  }

  // 3. Run our routing logic (which extracts tenant and locale)
  return applySecurityHeaders(handleRouting(request, token, requestHeaders), csp)
}

function handleRouting(
  request: NextRequest,
  token: Awaited<ReturnType<typeof getToken>> | null | undefined,
  requestHeaders: Headers,
) {
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
  } else if ((token as any)?.tenantId) {
    tenantId = String((token as any).tenantId)
  }

  requestHeaders.set('x-tenant-id', tenantId)

  if (pathname.startsWith('/api')) {
    // API routes bypass locale redirects and rewriting
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  // Redirect to localized URL if missing
  if (!localeInUrl) {
    const locale = parseAcceptLanguage(request) || defaultLocale
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
      pathWithoutLocale.startsWith('/project-setup') ||
      pathWithoutLocale.startsWith('/orders') ||
      pathWithoutLocale === '/shop' ||
      pathWithoutLocale === '/about' ||
      pathWithoutLocale === '/privacy' ||
      pathWithoutLocale === '/terms'
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
