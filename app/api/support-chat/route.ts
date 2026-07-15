import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import {
  assessSupportChatMessage,
  isSafeSupportReply,
  OUT_OF_SCOPE_REPLY,
  SUPPORT_CHAT_POLICY_VERSION,
  SUPPORT_CHAT_SCOPE,
} from '@/lib/support-chat-policy'

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

  const assessment = assessSupportChatMessage(message)
  if (!assessment.allowed) {
    return NextResponse.json({ success: true, reply: assessment.reply, policyBlocked: true })
  }

  const webhookUrl = process.env.HERMES_CHAT_WEBHOOK_URL
  const apiKey = process.env.HERMES_CHAT_API_KEY
  if (!webhookUrl || !apiKey) {
    return NextResponse.json({ error: 'Live support chat is being configured. Please use the contact form for now.' }, { status: 503 })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12_000)

  try {
    const event = {
      event: 'support_message',
      source: 'storefront',
      conversationId,
      message: assessment.normalized,
      occurredAt: new Date().toISOString(),
      policy: {
        version: SUPPORT_CHAT_POLICY_VERSION,
        enforced: true,
        ...SUPPORT_CHAT_SCOPE,
      },
    }
    const serializedEvent = JSON.stringify(event)
    const signature = createHmac('sha256', apiKey).update(serializedEvent).digest('hex')

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'DagangOS-Support-Relay/1.0',
        'X-DagangOS-Policy-Version': SUPPORT_CHAT_POLICY_VERSION,
        'X-DagangOS-Signature': `sha256=${signature}`,
      },
      body: serializedEvent,
      signal: controller.signal,
      cache: 'no-store',
    })

    if (!response.ok) {
      console.error('Hermes support webhook rejected message', { status: response.status })
      return NextResponse.json({ error: 'Support chat is temporarily unavailable. Please try again shortly.' }, { status: 502 })
    }

    const payload = await response.json().catch(() => ({})) as { reply?: unknown, policyVersion?: unknown, policyAccepted?: unknown }
    const reply = typeof payload.reply === 'string' ? payload.reply.slice(0, 4000) : undefined

    // Hermes must explicitly acknowledge the currently enforced policy before
    // its answer can reach a visitor. An older or misconfigured integration
    // therefore fails closed instead of silently widening the agent's scope.
    if (payload.policyVersion !== SUPPORT_CHAT_POLICY_VERSION || payload.policyAccepted !== true || (reply && !isSafeSupportReply(reply))) {
      console.error('Hermes support webhook returned an untrusted policy response')
      return NextResponse.json({ success: true, reply: OUT_OF_SCOPE_REPLY, policyBlocked: true })
    }

    return NextResponse.json({ success: true, reply })
  } catch (error) {
    console.error('Hermes support webhook request failed', { name: error instanceof Error ? error.name : 'unknown' })
    return NextResponse.json({ error: 'Support chat is temporarily unavailable. Please try again shortly.' }, { status: 502 })
  } finally {
    clearTimeout(timeout)
  }
}
