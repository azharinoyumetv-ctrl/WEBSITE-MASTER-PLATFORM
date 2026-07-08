import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { sendWhatsAppTemplate } from '@/lib/whatsapp'
import { decrypt } from '@/lib/crypto'
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { prompt, type, context, tone } = body
    const tenantId = request.headers.get('x-tenant-id') || 'default'

    // Handoff check
    if (prompt && /(help|human|support|escalate|agent)/i.test(prompt)) {
      if (tenantId !== 'default') {
        const website = await prisma.tenantWebsite.findUnique({ where: { tenantId } })
        const themeConfig = website?.themeConfig as any || {}
        const { whatsappPaNumber, whatsappPhoneId, whatsappToken, whatsappTemplate } = themeConfig
        
        if (whatsappPaNumber && whatsappPhoneId && whatsappToken && whatsappTemplate) {
          await sendWhatsAppTemplate({
            to: whatsappPaNumber,
            templateName: whatsappTemplate,
            parameters: ['AI Chatbot Escalaion', prompt.substring(0, 100)],
            credentials: { token: whatsappToken, phoneNumberId: whatsappPhoneId }
          }).catch(console.error)
        }
      }
      return NextResponse.json({ result: "I've escalated your request to a human support agent. They will get back to you shortly." })
    }

    let apiKey = ''
    let modelName = 'gpt-4o-mini'
    let provider = 'openai'

    if (tenantId === 'default') {
      apiKey = process.env.OPENAI_API_KEY || ''
      provider = 'openai'
    } else if (tenantId) {
      const aiConfig = await prisma.tenantAiConfiguration.findUnique({ where: { tenantId } })
      if (aiConfig) {
        if (aiConfig.encryptedApiSecret) {
          const decryptedKey = decrypt(aiConfig.encryptedApiSecret)
          if (decryptedKey) apiKey = decryptedKey
        }
        if (aiConfig.selectedModelName) {
          modelName = aiConfig.selectedModelName
        }
        if (aiConfig.providerKey && aiConfig.providerKey !== 'platform_managed') {
          provider = aiConfig.providerKey
        }
      }
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI features are disabled: Missing provider API key. Please configure it in your Settings.' },
        { status: 400 }
      )
    }

    let resultText = ''

    if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: modelName,
          messages: [{ role: 'user', content: prompt || `Generate a ${tone} ${type} about ${context}` }]
        })
      })
      if (!res.ok) {
        const errorData = await res.json()
        return NextResponse.json({ error: errorData.error?.message || 'OpenAI API error' }, { status: res.status })
      }
      const data = await res.json()
      resultText = data.choices[0].message.content
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
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt || `Generate a ${tone} ${type} about ${context}` }]
        })
      })
      if (!res.ok) {
        const errorData = await res.json()
        return NextResponse.json({ error: errorData.error?.message || 'Anthropic API error' }, { status: res.status })
      }
      const data = await res.json()
      resultText = data.content[0].text
    } else if (provider === 'gemini') {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt || `Generate a ${tone} ${type} about ${context}` }] }]
        })
      })
      if (!res.ok) {
        const errorData = await res.json()
        return NextResponse.json({ error: errorData.error?.message || 'Gemini API error' }, { status: res.status })
      }
      const data = await res.json()
      resultText = data.candidates[0].content.parts[0].text
    } else {
      return NextResponse.json({ error: 'Unsupported AI provider selected.' }, { status: 400 })
    }

    return NextResponse.json({ result: resultText })

  } catch (error: any) {
    console.error('AI generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate content' },
      { status: 500 }
    )
  }
}
