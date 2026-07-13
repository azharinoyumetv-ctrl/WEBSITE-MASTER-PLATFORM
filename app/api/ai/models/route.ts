import { NextRequest, NextResponse } from 'next/server'
import { getTempAiSecret } from '@/lib/actions/website'

export async function POST(req: NextRequest) {
  try {
    const { providerKey, secretToken, customBaseUrl } = await req.json()
    
    if (!secretToken) {
      return NextResponse.json({ models: [] })
    }
    
    const apiKey = await getTempAiSecret(secretToken)
    if (!apiKey) {
      return NextResponse.json({ error: 'API key token expired or invalid' }, { status: 401 })
    }

    let models: string[] = []

    if (providerKey === 'gemini' || providerKey === 'google') {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
      if (res.ok) {
        const data = await res.json()
        if (data.models) {
          models = data.models
            .map((m: any) => m.name.replace('models/', ''))
            .filter((name: string) => name.startsWith('gemini-'))
        }
      }
    } else if (providerKey === 'openai' || customBaseUrl) {
      const url = `${customBaseUrl || 'https://api.openai.com/v1'}/models`
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      })
      if (res.ok) {
        const data = await res.json()
        if (data.data) {
          models = data.data.map((m: any) => m.id)
        }
      }
    } else if (providerKey === 'claude' || providerKey === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        }
      })
      if (res.ok) {
        const data = await res.json()
        if (data.data) {
          models = data.data.map((m: any) => m.id)
        }
      }
      if (models.length === 0) {
        // Fallback for Claude if endpoint has issues
        models = [
          'claude-3-5-sonnet-latest',
          'claude-3-5-haiku-latest',
          'claude-3-opus-latest'
        ]
      }
    }

    return NextResponse.json({ models })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
