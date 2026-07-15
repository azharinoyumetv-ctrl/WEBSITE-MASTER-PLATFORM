import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const rateWindowMs = 60_000
const maxMessagesPerWindow = 8
const requestLog = new Map<string, number[]>()

function isRateLimited(request: NextRequest) {
  const client = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const now = Date.now()
  const recent = (requestLog.get(client) || []).filter(timestamp => now - timestamp < rateWindowMs)
  if (recent.length >= maxMessagesPerWindow) return true
  recent.push(now)
  requestLog.set(client, recent)
  return false
}

export async function POST(request: NextRequest) {
  if (isRateLimited(request)) {
    return NextResponse.json({ error: 'Please wait a moment before sending another message.' }, { status: 429 })
  }

  const body = await request.json().catch(() => null)
  const message = typeof body?.message === 'string' ? body.message.trim() : ''
  const conversationId = typeof body?.conversationId === 'string' ? body.conversationId.slice(0, 120) : undefined

  if (!message || message.length > 2000) {
    return NextResponse.json({ error: 'Please enter a message up to 2,000 characters.' }, { status: 400 })
  }

  const webhookUrl = process.env.HERMES_CHAT_WEBHOOK_URL
  const apiKey = process.env.HERMES_CHAT_API_KEY
  if (!webhookUrl || !apiKey) {
    return NextResponse.json({ error: 'Live support chat is being configured. Please use the contact form for now.' }, { status: 503 })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12_000)

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'DagangOS-Support-Relay/1.0',
      },
      body: JSON.stringify({
        event: 'support_message',
        source: 'storefront',
        conversationId,
        message,
        occurredAt: new Date().toISOString(),
      }),
      signal: controller.signal,
      cache: 'no-store',
    })

    if (!response.ok) {
      console.error('Hermes support webhook rejected message', { status: response.status })
      return NextResponse.json({ error: 'Support chat is temporarily unavailable. Please try again shortly.' }, { status: 502 })
    }

    const payload = await response.json().catch(() => ({})) as { reply?: unknown }
    return NextResponse.json({ success: true, reply: typeof payload.reply === 'string' ? payload.reply.slice(0, 4000) : undefined })
  } catch (error) {
    console.error('Hermes support webhook request failed', { name: error instanceof Error ? error.name : 'unknown' })
    return NextResponse.json({ error: 'Support chat is temporarily unavailable. Please try again shortly.' }, { status: 502 })
  } finally {
    clearTimeout(timeout)
  }
}
