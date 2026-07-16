import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getTenantWhatsAppConfig, sendWhatsAppTemplate } from '@/lib/whatsapp'
import { decrypt } from '@/lib/crypto'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rl = await checkRateLimit(ip, 'ai_chat', 30, 60 * 1000)
    if (rl.limited) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    const body = await request.json()
    const { prompt, type, context, tone } = body
    const tenantId = request.headers.get('x-tenant-id') || 'default'

    // Handoff check
    if (prompt && /(help|human|support|escalate|agent)/i.test(prompt)) {
      if (tenantId !== 'default') {
        const whatsAppConfig = await getTenantWhatsAppConfig(tenantId)
        if (whatsAppConfig?.recipientNumber && whatsAppConfig.templateName) {
          await sendWhatsAppTemplate({
            to: whatsAppConfig.recipientNumber,
            templateName: whatsAppConfig.templateName,
            parameters: ['Support Escalation', prompt.substring(0, 100)],
            credentials: whatsAppConfig,
          }).catch(console.error)
        }
      }
      return NextResponse.json({ result: "I've escalated your request to a human support agent. They will get back to you shortly." })
    }

    let apiKey = process.env.OPENAI_API_KEY || ''
    let modelName = 'gpt-4o-mini'
    let provider = 'openai'
    let customBaseUrl = ''

    // Every tenant, including DagangOS itself, may override the platform
    // fallback with an encrypted provider key and a dashboard-selected model.
    const aiConfig = tenantId
      ? await prisma.tenantAiConfiguration.findUnique({ where: { tenantId } })
      : null
    if (aiConfig) {
      const [configuredModel, configuredBaseUrl] = aiConfig.selectedModelName.split('|url:')
      modelName = configuredModel || modelName
      customBaseUrl = configuredBaseUrl || ''

      if (aiConfig.providerKey && aiConfig.providerKey !== 'platform_managed') {
        provider = aiConfig.providerKey
        if (aiConfig.encryptedApiSecret) {
          const decryptedKey = decrypt(aiConfig.encryptedApiSecret)
          if (decryptedKey) apiKey = decryptedKey
        }
      }
    }

    let systemPrompt = 'You are a helpful AI assistant.'
    if (tenantId !== 'default') {
      if (aiConfig && (aiConfig as any).systemPrompt) {
        systemPrompt = (aiConfig as any).systemPrompt
      }
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI features are disabled: Missing provider API key. Please configure it in your Settings.' },
        { status: 400 }
      )
    }

    let resultText = ''

    if (provider === 'openai' || provider === 'deepseek' || provider === 'grok' || provider === 'kimi' || provider === 'custom') {
      let baseUrl = 'https://api.openai.com/v1/chat/completions'
      if (provider === 'deepseek') baseUrl = 'https://api.deepseek.com/chat/completions'
      if (provider === 'grok') baseUrl = 'https://api.x.ai/v1/chat/completions'
      if (provider === 'kimi') baseUrl = 'https://api.moonshot.cn/v1/chat/completions'
      if (provider === 'custom') {
        const cUrl = customBaseUrl || ''
        baseUrl = cUrl.endsWith('/chat/completions') ? cUrl : cUrl.replace(/\/$/, '') + '/chat/completions'
      }

      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt || `Generate a ${tone} ${type} about ${context}` }
          ]
        })
      })
      if (!res.ok) {
        const errorData = await res.json()
        return NextResponse.json({ error: errorData.error?.message || `${provider} API error` }, { status: res.status })
      }
      const data = await res.json()
      resultText = data.choices[0].message.content
      return NextResponse.json({ result: resultText, provider })
    } else if (provider === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: modelName,
          system: systemPrompt,
          messages: [{ role: 'user', content: prompt || `Generate a ${tone} ${type} about ${context}` }],
          max_tokens: 1000
        })
      })
      if (!res.ok) {
        const errorData = await res.json()
        return NextResponse.json({ error: errorData.error?.message || 'Anthropic API error' }, { status: res.status })
      }
      const data = await res.json()
      resultText = data.content[0].text
      return NextResponse.json({ result: resultText, provider })
    } else if (provider === 'gemini') {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: [{ parts: [{ text: prompt || `Generate a ${tone} ${type} about ${context}` }] }]
        })
      })
      if (!res.ok) {
        const errorData = await res.json()
        return NextResponse.json({ error: errorData.error?.message || 'Gemini API error' }, { status: res.status })
      }
      const data = await res.json()
      resultText = data.candidates[0].content.parts[0].text
      return NextResponse.json({ result: resultText, provider })
    } else {
      return NextResponse.json({ error: 'Unsupported AI provider selected.' }, { status: 400 })
    }

  } catch (error: any) {
    console.error('[ai/chat] Internal error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
