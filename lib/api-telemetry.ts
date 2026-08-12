import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'

type TenantApiTelemetryInput = {
  tenantId: string
  request: Request
  response: NextResponse
  startedAt: number
  source?: 'control_plane' | 'developer_api'
}

/**
 * Persists a tenant-owned API request after the handler has determined its
 * final HTTP status. We deliberately do not log request bodies, credentials,
 * IP addresses, or unaffiliated requests here.
 */
export async function withTenantApiTelemetry({
  tenantId,
  request,
  response,
  startedAt,
  source = 'control_plane'
}: TenantApiTelemetryInput): Promise<NextResponse> {
  try {
    await prisma.tenantApiRequestLog.create({
      data: {
        tenantId,
        route: new URL(request.url).pathname,
        method: request.method.toUpperCase().slice(0, 10),
        statusCode: response.status,
        latencyMs: Math.max(0, Date.now() - startedAt),
        source
      }
    })
  } catch (error) {
    // Telemetry must never turn a successful control-plane operation into an error.
    console.error('[api-telemetry] Failed to record tenant API request', error)
  }

  return response
}
