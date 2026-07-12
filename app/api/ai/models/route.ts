import { NextResponse } from 'next/server'
import { getAuthenticatedUser, requirePermission } from '@/lib/rbac'
import { decrypt } from '@/lib/crypto'
import prisma from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser()
    const tokenTenantId = req.headers.get('x-tenant-id') || user.tenantId
    await requirePermission(user.id, tokenTenantId, 'ai', 'read')

    const body = await req.json()
    const { providerKey, customBaseUrl } = body

    const config = await prisma.tenantAiConfiguration.findUnique({
      where: { tenantId: tokenTenantId }
    })

    const apiSecret = config?.encryptedApiSecret ? decrypt(config.encryptedApiSecret) : null

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
