import { getPayments } from '@/lib/actions/payments'
import { PaymentsClient } from './payments-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function PaymentsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    redirect('/auth/login')
  }

  const tenantId = (session.user as any).tenantId
  
  if (!tenantId) {
    return <div className="p-8 text-red-500">Error: No tenant context found.</div>
  }

  const res = await getPayments(tenantId)
  const initialPayments = res.success ? res.payments : []

  return <PaymentsClient initialPayments={initialPayments} />
}
