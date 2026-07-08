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

    let apiKey = process.env.OPENAI_API_KEY
    let modelName = 'gpt-4o-mini'

    if (tenantId && tenantId !== 'default') {
      const aiConfig = await prisma.tenantAiConfiguration.findUnique({ where: { tenantId } })
      if (aiConfig) {
        if (aiConfig.encryptedApiSecret) {
          const decryptedKey = decrypt(aiConfig.encryptedApiSecret)
          if (decryptedKey) apiKey = decryptedKey
        }
        if (aiConfig.selectedModelName) {
          modelName = aiConfig.selectedModelName
        }
      }
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI features are disabled: Missing OpenAI provider configuration.' },
        { status: 400 }
      )
    }

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
    return NextResponse.json({ result: data.choices[0].message.content })

  } catch (error: any) {
    console.error('AI generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate content' },
      { status: 500 }
    )
  }
}
