import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { providerKey, apiSecret, customBaseUrl } = body

    if (!apiSecret || !providerKey) {
      return NextResponse.json({ error: 'Missing provider or API key' }, { status: 400 })
    }

    let baseUrl = ''
    if (providerKey === 'openai') baseUrl = 'https://api.openai.com/v1'
    else if (providerKey === 'deepseek') baseUrl = 'https://api.deepseek.com'
    else if (providerKey === 'grok') baseUrl = 'https://api.x.ai/v1'
    else if (providerKey === 'kimi') baseUrl = 'https://api.moonshot.cn/v1'
    else if (providerKey === 'custom' && customBaseUrl) {
      baseUrl = customBaseUrl.endsWith('/chat/completions') 
        ? customBaseUrl.replace('/chat/completions', '') 
        : customBaseUrl.replace(/\/$/, '')
    }

    if (!baseUrl) {
      // Anthropic and Gemini don't have a standard /models endpoint in the same way,
      // or we don't support dynamic fetching for them right now.
      return NextResponse.json({ models: [] })
    }

    const res = await fetch(`${baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${apiSecret}`
      }
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch models from provider' }, { status: res.status })
    }

    const data = await res.json()
    const models = data.data ? data.data.map((m: any) => m.id) : []

    return NextResponse.json({ models })
  } catch (error: any) {
    console.error('Model fetch error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
