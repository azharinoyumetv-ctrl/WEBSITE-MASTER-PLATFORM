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

    // To resolve customerName, we need to try finding a User or CrmContact with that customerId
    const customerIds = Array.from(new Set(bookings.map(b => b.customerId)))
    const users = await prisma.user.findMany({ where: { id: { in: customerIds } } })
    const crmContacts = await prisma.tenantCrmContact.findMany({ where: { id: { in: customerIds } } })

    const mappedBookings = bookings.map(b => {
      let customerName = 'Guest Customer'
      const user = users.find(u => u.id === b.customerId)
      const crmContact = crmContacts.find(c => c.id === b.customerId)
      
      if (user) customerName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
      else if (crmContact) customerName = `${crmContact.firstName} ${crmContact.lastName}`

      return {
        ...b,
        customerName,
        resourceName: b.resource?.resourceName || 'Unknown Resource'
      }
    })

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
    
    // Try to find CRM contact if no user matches or if it's meant to be a CRM contact
    const contact = await prisma.tenantCrmContact.findFirst({
      where: { tenantId }
    })

    const customerId = user ? user.id : (contact ? contact.id : '00000000-0000-0000-0000-000000000000')


    const booking = await prisma.tenantBooking.create({
      data: {
        tenantId,
        resourceId: data.resourceId,
        customerId: customerId,
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

// Resource CRUD
export async function createBookingResource(tenantId: string, data: { resourceName: string, resourceType: string }) {
  try {
    const resource = await prisma.tenantBookingResource.create({
      data: { ...data, tenantId }
    })
    revalidatePath('/admin/booking')
    return { success: true, resource }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateBookingResource(tenantId: string, id: string, data: any) {
  try {
    const resource = await prisma.tenantBookingResource.update({
      where: { id, tenantId },
      data
    })
    revalidatePath('/admin/booking')
    return { success: true, resource }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteBookingResource(tenantId: string, id: string) {
  try {
    await prisma.tenantBookingResource.delete({
      where: { id, tenantId }
    })
    revalidatePath('/admin/booking')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Calendar API
export async function getBookingsByDateRange(tenantId: string, startDate: Date, endDate: Date) {
  try {
    const bookings = await prisma.tenantBooking.findMany({
      where: {
        tenantId,
        startTime: { gte: startDate },
        endTime: { lte: endDate }
      },
      include: { resource: true }
    })

    const customerIds = Array.from(new Set(bookings.map(b => b.customerId)))
    const users = await prisma.user.findMany({ where: { id: { in: customerIds } } })
    const crmContacts = await prisma.tenantCrmContact.findMany({ where: { id: { in: customerIds } } })

    const mappedBookings = bookings.map(b => {
      let customerName = 'Guest Customer'
      const user = users.find(u => u.id === b.customerId)
      const crmContact = crmContacts.find(c => c.id === b.customerId)
      
      if (user) customerName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
      else if (crmContact) customerName = `${crmContact.firstName} ${crmContact.lastName}`

      return {
        ...b,
        customerName,
        resourceName: b.resource?.resourceName || 'Unknown Resource'
      }
    })

    return { success: true, bookings: mappedBookings }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
