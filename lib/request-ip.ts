import { isIP } from 'net'

function normalizeIp(value: string): string {
  const trimmed = value.trim()
  return trimmed.startsWith('::ffff:') ? trimmed.slice(7) : trimmed
}

/**
 * Route handlers do not expose the socket peer address. Forwarded headers are
 * therefore ignored unless the deployment explicitly declares that the origin
 * is reachable only through its trusted reverse proxy.
 */
export function getTrustedHeaderClientIp(request: Pick<Request, 'headers'>): string {
  if (process.env.TRUST_PROXY_HEADERS !== 'true') return 'unknown'

  if (process.env.TRUST_CLOUDFLARE_IP_HEADER === 'true') {
    const cloudflareIp = normalizeIp(request.headers.get('cf-connecting-ip') || '')
    if (isIP(cloudflareIp) !== 0) return cloudflareIp
  }

  const forwardedChain = (request.headers.get('x-forwarded-for') || '')
    .split(',')
    .map(normalizeIp)
    .filter(candidate => isIP(candidate) !== 0)
  const closestForwardedHop = forwardedChain.at(-1)
  if (closestForwardedHop) return closestForwardedHop

  const realIp = normalizeIp(request.headers.get('x-real-ip') || '')
  return isIP(realIp) !== 0 ? realIp : 'unknown'
}
