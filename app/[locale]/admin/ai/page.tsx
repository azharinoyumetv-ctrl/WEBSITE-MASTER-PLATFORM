import { AIClient } from './ai-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'

export default async function AIPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    redirect('/auth/login')
  }

  const tenantId = (session.user as any).tenantId
  
  if (!tenantId) {
    return <div className="p-8 text-red-500">Error: No tenant context found.</div>
  }

  // Check if AI is configured
  const aiConfig = await prisma.tenantAiConfiguration.findUnique({
    where: { tenantId }
  })
  
  let isAiConfigured = false
  if (aiConfig && aiConfig.providerKey && aiConfig.providerKey !== 'platform_managed' && aiConfig.encryptedApiSecret) {
    isAiConfigured = true
  } else if (aiConfig && aiConfig.providerKey === 'platform_managed') {
    isAiConfigured = true
  }

  return <AIClient tenantId={tenantId} isAiConfigured={isAiConfigured} />
}
