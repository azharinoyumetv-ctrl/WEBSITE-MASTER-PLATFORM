import { getBookingData } from '@/lib/actions/booking'
import { BookingClient } from './booking-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function BookingPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    redirect('/auth/login')
  }

  const tenantId = (session.user as any).tenantId
  
  if (!tenantId) {
    return <div className="p-8 text-red-500">Error: No tenant context found.</div>
  }

  const res = await getBookingData(tenantId)
  const initialResources = res.resources || []
  const initialBookings = res.bookings || []

  return <BookingClient initialResources={initialResources} initialBookings={initialBookings} tenantId={tenantId} />
}
