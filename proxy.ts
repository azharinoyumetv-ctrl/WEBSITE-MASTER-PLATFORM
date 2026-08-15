import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export const config = {
  matcher: [
    // Public files must bypass locale routing; otherwise images such as the
    // company logo are redirected to a non-existent localized path.
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)',
  ],
}

import { locales, defaultLocale } from './i18n'
import {
  getWmpBaseDomain,
  isHostnameForTenant,
  isReservedNonWmpHostname,
  normalizeHostname,
} from './lib/wmp-domain'

function parseAcceptLanguage(request: NextRequest): string | null {
  const raw = request.headers.get('accept-language')
  if (!raw) return null

  const preferences = raw
    .split(',')
    .map((part, index) => {
      const [languageRange, ...parameters] = part.trim().toLowerCase().split(';')
      const qualityParameter = parameters.find(parameter => parameter.trim().startsWith('q='))
      const parsedQuality = qualityParameter
        ? Number.parseFloat(qualityParameter.trim().slice(2))
        : 1
      return {
        languageRange,
        quality: Number.isFinite(parsedQuality) ? parsedQuality : 0,
        index,
      }
    })
    .filter(preference => preference.languageRange && preference.quality > 0)
    .sort((left, right) => right.quality - left.quality || left.index - right.index)

  for (const preference of preferences) {
    if (preference.languageRange === '*') return defaultLocale
    const language = preference.languageRange.split('-')[0]
    if (locales.includes(language)) return language
  }

  return null
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
  const baseDomain = getWmpBaseDomain()
  const hostnameWithoutPort = normalizeHostname(hostname)

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
    "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com",
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
  const cacheControl = res.headers.get('Cache-Control')
  if (cacheControl) {
    if (!cacheControl.includes('no-transform')) {
      res.headers.set('Cache-Control', `${cacheControl}, no-transform`)
    }
  } else {
    // Cloudflare's email obfuscation rewrites React's server HTML before
    // hydration. Keeping dynamic responses private and non-transformable
    // preserves the exact DOM React expects.
    res.headers.set('Cache-Control', 'private, no-cache, no-store, max-age=0, must-revalidate, no-transform')
  }
  res.headers.set('Content-Security-Policy', csp)
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  if (process.env.NODE_ENV === 'production') {
    res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }
  return res
}

function preventAdminResponseCaching(res: NextResponse) {
  // Admin Flight/HTML responses contain Server Action references. Serving one
  // from a prior deployment leaves the dashboard unable to submit actions.
  res.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate')
  res.headers.set('CDN-Cache-Control', 'no-store')
  res.headers.set('Cloudflare-CDN-Cache-Control', 'no-store')
  return res
}

export default async function proxy(request: NextRequest) {
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

  // store.dagangos.com and shop.dagangos.com are reserved for other DagangOS
  // products. If DNS still reaches this origin during migration, WMP must not
  // render or redirect them. The edge/DNS layer can later route them elsewhere.
  if (isReservedNonWmpHostname(hostname)) {
    return applySecurityHeaders(new NextResponse('Not Found', { status: 404 }), csp)
  }

  const hostTenantId = getTenantFromHost(hostname)

  const nextAction = request.headers.get('next-action')
  const referer = request.headers.get('referer') || ''
  const isProtectedAction = nextAction && referer.includes('/admin')

  const isProtected = (
    (pathname.match(/^\/(en|id)\/admin/) || pathname.startsWith('/admin')) &&
    !pathname.includes('/auth/login')
  ) || isProtectedAction

  // Public pages do not need JWT parsing. Protected admin routes and Server
  // Actions still validate the session before tenant routing continues.
  const token = isProtected
    ? await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
        secureCookie: isSecure
      })
    : null

  const tokenMatchesTenantHost = token
    ? isHostnameForTenant(hostname, {
        id: String(token.tenantId || ''),
        subdomain: typeof token.tenantSubdomain === 'string' ? token.tenantSubdomain : null,
        customDomain: typeof token.tenantCustomDomain === 'string' ? token.tenantCustomDomain : null,
      })
    : false

  // 1. Cross-tenant routing validation if user has active session. Hostnames
  // identify tenants by subdomain or custom domain, while the JWT stores the
  // tenant UUID; compare like-for-like tenant identities before rejecting.
  if (token && hostTenantId !== 'default') {
    const userRoles = (token.roles as string[]) || []
    const isSuperAdmin = userRoles.some(r => r.toLowerCase() === 'super-admin')

    if (!tokenMatchesTenantHost && !isSuperAdmin) {
      console.warn(`Rejecting cross-tenant access from tenant ${token.tenantId} to target ${hostTenantId}`)
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

      if (hasAnyRole && (hostTenantId === 'default' || tokenMatchesTenantHost || isPlatformOwner || isSuperAdmin)) {
        isAuthorized = true
      }
    }

    if (!isAuthorized) {
      if (request.headers.has('next-action') || pathname.startsWith('/api')) {
        return applySecurityHeaders(preventAdminResponseCaching(NextResponse.json({ error: 'Unauthorized' }, { status: 401 })), csp)
      }

      const localeMatch = pathname.match(/^\/(en|id)(\/|$)/)
      const locale = localeMatch ? localeMatch[1] : parseAcceptLanguage(request) || defaultLocale
      const origin = getBaseUrl(request)
      const redirectUrl = new URL(`/${locale}/auth/login`, origin)
      const callback = new URL(request.nextUrl.pathname + request.nextUrl.search, origin).href
      redirectUrl.searchParams.set('callbackUrl', callback)

      const response = NextResponse.redirect(redirectUrl)
      if (token) {
        const cookieName = isSecure ? '__Secure-next-auth.session-token' : 'next-auth.session-token'
        response.cookies.delete(cookieName)
      }
      return applySecurityHeaders(preventAdminResponseCaching(response), csp)
    }
  }

  // 3. Run our routing logic (which extracts tenant and locale)
  const response = handleRouting(request, token, requestHeaders)
  if (isProtected) {
    preventAdminResponseCaching(response)
  }
  return applySecurityHeaders(response, csp)
}

function handleRouting(
  request: NextRequest,
  token: Awaited<ReturnType<typeof getToken>> | null | undefined,
  requestHeaders: Headers,
) {
  const url = request.nextUrl
  const hostname = request.headers.get('host') || ''
  const pathname = url.pathname

  const localeMatch = pathname.match(/^\/(en|id)(\/|$)/)
  const localeInUrl = localeMatch ? localeMatch[1] : null
  const pathWithoutLocale = localeInUrl ? pathname.replace(`/${localeInUrl}`, '') || '/' : pathname

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
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  if (!localeInUrl) {
    const locale = parseAcceptLanguage(request) || defaultLocale
    const origin = getBaseUrl(request)
    const redirectUrl = new URL(`/${locale}${pathname}${request.nextUrl.search}`, origin)
    return NextResponse.redirect(redirectUrl)
  }

  requestHeaders.set('X-Next-Intl-Locale', localeInUrl)

  if (pathWithoutLocale === '/login') {
    const origin = getBaseUrl(request)
    const redirectUrl = new URL(`/${localeInUrl}/auth/login${request.nextUrl.search}`, origin)
    return NextResponse.redirect(redirectUrl)
  }

  if (isPublicSite) {
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

    const targetPath = pathWithoutLocale === '/' ? '' : pathWithoutLocale
    const finalUrl = request.nextUrl.clone()
    finalUrl.pathname = `/${localeInUrl}/site${targetPath}`
    return NextResponse.rewrite(finalUrl, {
      request: { headers: requestHeaders },
    })
  }

  return NextResponse.next({ request: { headers: requestHeaders } })
}
