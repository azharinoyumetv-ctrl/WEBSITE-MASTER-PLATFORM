'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

interface AnalyticsTrackerProps {
  tenantId: string
}

/**
 * AnalyticsTracker
 * A lightweight, client-side component that records a 'pageview' event
 * to the /api/analytics/event endpoint on every route change.
 *
 * Mount this in the site layout (not the admin layout) so only public site
 * visits are counted. The tenantId prop is sourced server-side from the layout.
 */
export function AnalyticsTracker({ tenantId }: AnalyticsTrackerProps) {
  const pathname = usePathname()
  // Use a ref to avoid double-firing on strict mode
  const lastTrackedPath = useRef<string | null>(null)

  useEffect(() => {
    // Skip if tenantId is not set or is the placeholder 'default'
    if (!tenantId || tenantId === 'default') return

    // Avoid double-tracking the same path (e.g., React StrictMode double-invoke)
    if (lastTrackedPath.current === pathname) return
    lastTrackedPath.current = pathname

    const payload = {
      tenantId,
      eventName: 'pageview',
      pageUrl: pathname,
      metadata: {
        referrer: typeof document !== 'undefined' ? document.referrer : '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        timestamp: new Date().toISOString()
      }
    }

    // Fire-and-forget — don't block the UI
    fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      // keepalive allows the request to complete even if the page is unloading
      keepalive: true
    }).catch(() => {
      // Silently ignore errors — analytics should never break the user experience
    })
  }, [pathname, tenantId])

  // Renders nothing — purely a side-effect component
  return null
}
