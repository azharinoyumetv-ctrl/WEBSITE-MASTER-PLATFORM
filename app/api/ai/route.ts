import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { sendWhatsAppTemplate } from '@/lib/whatsapp'

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

    if (process.env.OPENAI_API_KEY) {
      // Basic OpenAI integration if key is present
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt || `Generate a ${tone} ${type} about ${context}` }]
        })
      })
      const data = await res.json()
      return NextResponse.json({ result: data.choices[0].message.content })
    }

    // Dummy response if no key is found
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    let dummyResponse = ''
    if (type) {
      dummyResponse = `Here is your ${tone} ${type} about ${context}:\n\nThis is a highly optimized, conversion-focused piece of content tailored for your audience. Enjoy!\n\n(Note: Set OPENAI_API_KEY in your .env to enable real AI generation.)`
    } else {
      dummyResponse = `Here is a drafted response based on your request: "${prompt}".\n\n(Note: Set OPENAI_API_KEY in your .env to enable real AI generation.)`
    }

    return NextResponse.json({ result: dummyResponse })

  } catch (error: any) {
    console.error('AI generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate content' },
      { status: 500 }
    )
  }
}
