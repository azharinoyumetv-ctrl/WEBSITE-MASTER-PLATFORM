'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from 'next/cache'



export async function getProfile(tenantId: string, userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId, tenantId },
      include: { profile: true }
    })
    return { success: true, user }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateProfile(tenantId: string, userId: string, data: { firstName: string, lastName: string, phoneNumber: string }) {
  try {
    const user = await prisma.user.update({
      where: { id: userId, tenantId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        profile: {
          upsert: {
            create: { tenantId, phoneNumber: data.phoneNumber },
            update: { phoneNumber: data.phoneNumber }
          }
        }
      },
      include: { profile: true }
    })
    
    revalidatePath('/admin/profile')
    return { success: true, user }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
