'use server'

import { TenantStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import prisma from "@/lib/prisma"
import { requireSuperAdmin } from "@/lib/rbac"
import { dispatchNotification } from '@/lib/actions/notifications'
import { getTenantPublicUrl } from '@/lib/tenant-url'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { addonModuleMap, addonsList, getBillableAddonKeys, packageModuleMap, packages } from '@/lib/constants/packages'

export async function getTenants() {
  try {
    const user = await requireSuperAdmin()
    const tenants = await prisma.systemTenant.findMany({
      where: { id: { not: user.tenantId } },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { users: true }
        }
      }
    })
    return { success: true, tenants }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function createTenant(data: { companyName: string, subdomain: string, adminEmail: string, packageKey?: string, addons?: string[], logoUrl?: string }) {
  try {
    const user = await requireSuperAdmin()

    const companyName = data.companyName.trim()
    const subdomain = data.subdomain.trim().toLowerCase()
    const adminEmail = data.adminEmail.trim().toLowerCase()
    const logoUrl = data.logoUrl?.trim() || ''
    if (!companyName || companyName.length > 255 || !/^[a-z0-9-]{2,63}$/.test(subdomain)) {
      return { success: false, error: 'Provide a company name and a valid subdomain (lowercase letters, numbers, and hyphens).' }
    }
    if (adminEmail.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
      return { success: false, error: 'Provide a valid workspace administrator email.' }
    }
    if (logoUrl && (!/^data:image\/(png|jpeg);base64,/i.test(logoUrl) || logoUrl.length > 700_000)) {
      return { success: false, error: 'Use a PNG or JPG logo smaller than 500 KB.' }
    }

    // Check if subdomain exists
    const existing = await prisma.systemTenant.findUnique({
      where: { subdomain }
    })

    if (existing) {
      return { success: false, error: 'Subdomain already in use' }
    }

    const existingAdmin = await prisma.user.findFirst({ where: { email: adminEmail } })
    if (existingAdmin) {
      return { success: false, error: 'This administrator email already belongs to an existing workspace.' }
    }

    const packageKey = data.packageKey || 'landing_page'
    if (!packages[packageKey]) {
      return { success: false, error: 'The selected package is invalid.' }
    }
    const plan = (packageKey === 'custom' || packageKey === 'retail_pos' || packageKey === 'ecommerce') ? 'enterprise' : 'core'

    const tenant = await prisma.systemTenant.create({
      data: {
        companyName,
        subdomain,
        plan: plan as any,
        logoUrl: logoUrl || null,
      }
    })

    // Determine modules to enable based on package.
    const enabledModules = new Set(packageModuleMap[packageKey])
    
    const submittedAddons = Array.from(new Set(data.addons || []))
    const hasInvalidAddon = submittedAddons.some(key => !addonsList.some(addon => addon.key === key))
    if (hasInvalidAddon) {
      await prisma.systemTenant.delete({ where: { id: tenant.id } })
      return { success: false, error: 'One or more selected add-ons are invalid.' }
    }
    const selectedAddons = getBillableAddonKeys(packageKey, submittedAddons)

    for (const addonKey of selectedAddons) {
      const moduleKey = addonModuleMap[addonKey]
      if (moduleKey) enabledModules.add(moduleKey)
    }

    // Enable modules in database
    const allModuleKeys = [
      'website_module', 'admin_module', 'user_management', 'rbac_module',
      'catalog_module', 'ecommerce_module', 'payment_module', 'pos_module',
      'inventory_module', 'crm_module', 'booking_module', 'ai_module',
      'notification_module', 'whatsapp_module', 'analytics_module', 'api_module'
    ]

    await prisma.tenantModule.createMany({
      data: allModuleKeys.map(key => ({
        tenantId: tenant.id,
        moduleKey: key,
        isEnabled: enabledModules.has(key),
        configuredProperties: {}
      }))
    })

    // Also initialize the TenantWebsite config
    await prisma.tenantWebsite.create({
      data: {
        tenantId: tenant.id,
        siteTitle: companyName,
        themeConfig: {
          colors: {
            primary: '#4f46e5',
            secondary: '#10b981',
            background: '#ffffff',
            text: '#111827'
          },
          typography: {
            headings: 'Geist',
            base_font: 'Inter'
          },
          baseCurrency: 'IDR',
          paymentGateway: 'unset',
          xenditEnabled: false,
          midtransEnabled: false,
          whatsappPaNumber: '',
          whatsappPhoneId: '',
          whatsappTemplate: 'order_confirmation'
        }
      }
    })

    // Provision page templates depending on the package
    if (packageKey === 'landing_page') {
      await prisma.tenantPage.create({
        data: {
          tenantId: tenant.id,
          slug: 'home',
          title: 'Welcome',
          isPublished: true,
          layoutBlocks: [
            {
              type: 'hero',
              sortOrder: 1,
              config: {
                title: `Welcome to ${companyName}`,
                subtitle: 'Your modern conversion-focused landing page template setup.',
                ctaText: 'Get Started Today',
                ctaUrl: '/contact'
              }
            },
            {
              type: 'features',
              sortOrder: 2,
              config: {
                title: 'Our Premium Offerings',
                items: [
                  { title: 'Modular Blocks', description: 'Plug-and-play layout elements.' },
                  { title: 'RLS Security', description: 'Fully isolated tenant transactions.' }
                ]
              }
            }
          ]
        }
      })
    } else if (packageKey === 'ecommerce' || packageKey === 'retail_pos') {
      // Seed E-commerce pages
      await prisma.tenantPage.createMany({
        data: [
          {
            tenantId: tenant.id,
            slug: 'home',
            title: 'Store Home',
            isPublished: true,
            layoutBlocks: [
              {
                type: 'hero',
                sortOrder: 1,
                config: {
                  title: `Discover ${companyName} store`,
                  subtitle: 'Explore our catalog and order premium products online.',
                  ctaText: 'Shop Catalog Now',
                  ctaUrl: '/shop'
                }
              },
              {
                type: 'catalog_grid',
                sortOrder: 2,
                config: {
                  title: 'Featured Inventory',
                  limit: 4
                }
              }
            ] as any
          }
        ]
      })
    }

    // Issue access only after an administrator provisions the workspace. The
    // user receives a one-time set-password link rather than a shared password.
    const invitationToken = crypto.randomBytes(32).toString('hex')
    const provisionalHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12)
    const invitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const adminRole = await prisma.role.create({
      data: {
        tenantId: tenant.id,
        name: 'Admin',
        description: 'Workspace administrator',
        permissions: {
          system: ['read', 'write'], catalog: ['read', 'write', 'delete'], orders: ['read', 'write'],
          payments: ['read'], inventory: ['read', 'write'], pos: ['read', 'write'], crm: ['read', 'write'], booking: ['read', 'write'],
        },
      },
    })

    const owner = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: adminEmail,
        passwordHash: provisionalHash,
        firstName: companyName,
        status: 'pending_verification',
        emailVerified: false,
      },
    })
    await prisma.$transaction([
      prisma.tenantAuthCredential.create({
        data: {
          tenantId: tenant.id,
          userId: owner.id,
          passwordHash: provisionalHash,
          passwordResetToken: invitationToken,
          passwordResetExpires: invitationExpiresAt,
        },
      }),
      prisma.tenantUserRole.create({ data: { tenantId: tenant.id, userId: owner.id, roleId: adminRole.id } }),
      prisma.tenantUserProfile.create({ data: { tenantId: tenant.id, userId: owner.id, preferences: { locale: 'id', timezone: 'Asia/Jakarta' } } }),
    ])

    const workspaceUrl = getTenantPublicUrl({ subdomain })
    const accessUrl = `${workspaceUrl}/auth/reset-password?token=${invitationToken}`
    const notification = await dispatchNotification(user.tenantId, adminEmail, 'email', 'workspace_invitation', {
      company_name: companyName,
      workspace_url: workspaceUrl,
      access_url: accessUrl,
      expires_at: invitationExpiresAt.toLocaleDateString('id-ID'),
    })

    revalidatePath('/admin/tenants')
    return { success: true, tenant, workspaceUrl, accessUrl, invitationQueued: notification.success }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateTenantStatus(id: string, status: TenantStatus) {
  try {
    const user = await requireSuperAdmin()

    const tenant = await prisma.systemTenant.update({
      where: { id },
      data: { status }
    })
    revalidatePath('/admin/tenants')
    return { success: true, tenant }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getTenantById(tenantId: string) {
  try {
    await requireSuperAdmin()

    const tenant = await prisma.systemTenant.findUnique({
      where: { id: tenantId },
      include: {
        modules: true,
        users: {
          select: { id: true, email: true, firstName: true, lastName: true, userRoles: true }
        }
      }
    })
    if (!tenant) return { success: false, error: 'Tenant not found' }
    return { success: true, tenant }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteTenant(tenantId: string) {
  try {
    const user = await requireSuperAdmin()

    // Delete related records first (if cascading deletes aren't fully configured)
    await prisma.tenantModule.deleteMany({ where: { tenantId } })
    
    // We should be careful about deleting users if they are cross-tenant, but in this isolated model they belong to the tenant.
    await prisma.user.deleteMany({ where: { tenantId } })
    
    await prisma.tenantWebsite.deleteMany({ where: { tenantId } })
    
    await prisma.systemTenant.delete({
      where: { id: tenantId }
    })
    
    revalidatePath('/admin/tenants')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
