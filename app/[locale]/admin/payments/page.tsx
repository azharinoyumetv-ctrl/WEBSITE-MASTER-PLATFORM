import { getPayments, getDisputes } from '@/lib/actions/payments'
import { PaymentsClient } from './payments-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AdminState } from '../admin-state'

export default async function PaymentsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    redirect('/auth/login')
  }

  const tenantId = (session.user as any).tenantId
  
  if (!tenantId) {
    return <AdminState kind="context" title="Workspace context unavailable" description="Sign in through your assigned workspace before opening payments." />
  }

  const [res, disputesRes] = await Promise.all([
    getPayments(tenantId),
    getDisputes(tenantId)
  ])

  if (!res.success) {
    const errorMsg = (res as any).error || 'Unknown error'
    console.error('[admin-payments] Failed to load payments:', errorMsg)
    return <AdminState title="Payments could not be loaded" description="Payment and dispute data is temporarily unavailable. Please retry shortly; no transaction state was changed." />
  }

  const initialPayments = res.payments!
  const initialDisputes = disputesRes.success ? disputesRes.disputes! : []

  return <PaymentsClient initialPayments={initialPayments} initialDisputes={initialDisputes} tenantId={tenantId} />
}
