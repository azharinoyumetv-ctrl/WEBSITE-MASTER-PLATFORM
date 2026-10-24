/** Keep old public entry links working without taking over tenant CMS slugs. */
export function resolvePublicRouteAlias(pathname: string, platformHost: boolean) {
  const authRoutes: Record<string,string> = {'/login':'/auth/login','/register':'/auth/register'}
  if (Object.hasOwn(authRoutes,pathname)) return authRoutes[pathname]
  if (!platformHost) return null
  const platformRoutes: Record<string,string> = {'/pricing':'/site/shop','/business':'/site/about','/refund-policy':'/site/refund'}
  return Object.hasOwn(platformRoutes,pathname) ? platformRoutes[pathname] : null
}
