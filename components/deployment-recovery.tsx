'use client'

import { useEffect } from 'react'

const RECOVERY_KEY_PREFIX = 'dagangos-deployment-recovery:'

function isStaleDeploymentError(value: unknown) {
  const message = value instanceof Error
    ? value.message
    : typeof value === 'string'
      ? value
      : String(value ?? '')

  return message.includes('Failed to find Server Action') ||
    message.includes('older or newer deployment')
}

/**
 * An admin tab can outlive a deployment. A stale Server Action identifier
 * cannot be recovered by client routing, so do one guarded full reload.
 */
export function DeploymentRecovery() {
  useEffect(() => {
    const recover = (value: unknown) => {
      if (!isStaleDeploymentError(value)) return

      const key = `${RECOVERY_KEY_PREFIX}${window.location.pathname}`
      if (window.sessionStorage.getItem(key)) return

      window.sessionStorage.setItem(key, '1')
      window.location.reload()
    }

    const onError = (event: ErrorEvent) => recover(event.error || event.message)
    const onUnhandledRejection = (event: PromiseRejectionEvent) => recover(event.reason)

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onUnhandledRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
    }
  }, [])

  return null
}
