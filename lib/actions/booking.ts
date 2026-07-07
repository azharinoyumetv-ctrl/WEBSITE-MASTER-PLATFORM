'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from 'next/cache'

export async function getBookingData(tenantId: string) {
  try {
    const resources = await prisma.tenantBookingResource.findMany({
      where: { tenantId }
    })

    const bookings = await prisma.tenantBooking.findMany({
      where: { tenantId },
      include: {
        resource: true
      },
      orderBy: { startTime: 'desc' }
    })

    // Map bookings to match frontend expectations (adding customerName and resourceName dynamically)
    const mappedBookings = bookings.map(b => ({
      ...b,
      customerName: 'Guest Customer', // Fallback display name
      resourceName: b.resource?.resourceName || 'Unknown Resource'
    }))

    return { success: true, resources, bookings: mappedBookings }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function createBooking(tenantId: string, data: any) {
  try {
    const user = await prisma.user.findFirst({
      where: { tenantId }
    })
    
    if (!user) {
      return { success: false, error: 'No tenant admin user found to associate booking.' }
    }

    const booking = await prisma.tenantBooking.create({
      data: {
        tenantId,
        resourceId: data.resourceId,
        customerId: user.id,
        bookingStatus: 'confirmed',
        startTime: data.startTime,
        endTime: data.endTime,
        notes: data.notes || ''
      },
      include: {
        resource: true
      }
    })

    const mappedBooking = {
      ...booking,
      customerName: data.customerName || 'Guest Customer',
      resourceName: booking.resource?.resourceName || 'Unknown Resource'
    }
    
    revalidatePath('/admin/booking')
    return { success: true, booking: mappedBooking }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateBookingStatus(tenantId: string, bookingId: string, status: any) {
  try {
    const booking = await prisma.tenantBooking.update({
      where: { id: bookingId, tenantId },
      data: { bookingStatus: status }
    })
    
    revalidatePath('/admin/booking')
    return { success: true, booking }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
