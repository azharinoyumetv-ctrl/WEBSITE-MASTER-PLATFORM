'use server'

import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function registerTenantAdmin(data: any) {
  try {
    const { firstName, lastName, email, companyName, password } = data

    if (!email || !password || !companyName || !firstName || !lastName) {
      return { success: false, error: "All fields are required." }
    }

    // Generate a simple subdomain from companyName (e.g. "Acme Corp" -> "acmecorp")
    let baseSubdomain = companyName.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (!baseSubdomain) {
      baseSubdomain = 'tenant'
    }
    
    // Ensure subdomain uniqueness
    let subdomain = baseSubdomain
    let counter = 1
    while (await prisma.systemTenant.findUnique({ where: { subdomain } })) {
      subdomain = `${baseSubdomain}${counter}`
      counter++
    }

    // Ensure email uniqueness globally (or at least check if it exists)
    const existingUser = await prisma.user.findFirst({
      where: { email }
    })

    if (existingUser) {
      return { success: false, error: "Email is already in use." }
    }

    const passwordHash = await bcrypt.hash(password, 10)

    // Run creation in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Create Tenant
      const tenant = await tx.systemTenant.create({
        data: {
          companyName,
          subdomain,
          status: "active",
          plan: "core"
        }
      })

      // 2. Create User
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email,
          passwordHash,
          firstName,
          lastName,
          status: "active"
        }
      })

      // 3. Create Auth Credential
      await tx.tenantAuthCredential.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          passwordHash
        }
      })

      // 4. Create Admin Role
      const adminRole = await tx.role.create({
        data: {
          tenantId: tenant.id,
          name: 'Admin',
          description: 'Super Administrator',
          permissions: {
            system: ['read', 'write'],
            catalog: ['read', 'write', 'delete'],
            orders: ['read', 'write'],
            payments: ['read'],
            inventory: ['read', 'write'],
            pos: ['read', 'write'],
            crm: ['read', 'write'],
            booking: ['read', 'write']
          }
        }
      })

      // 5. Assign Role to User
      await tx.tenantUserRole.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          roleId: adminRole.id
        }
      })

      // 6. Create User Profile
      await tx.tenantUserProfile.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          preferences: { locale: 'en', timezone: 'UTC' }
        }
      })

      // 7. Create default Website Config
      await tx.tenantWebsite.create({
        data: {
          tenantId: tenant.id,
          siteTitle: companyName,
          themeConfig: {
            colors: {
              primary: '#0F172A',
              secondary: '#3B82F6',
              background: '#FFFFFF'
            },
            typography: {
              base_font: 'Inter',
              headings: 'Geist'
            },
            layout_density: 'comfortable'
          }
        }
      })
    })

    return { success: true }
  } catch (error: any) {
    console.error("Registration error:", error)
    return { success: false, error: error.message || "An unexpected error occurred." }
  }
}
