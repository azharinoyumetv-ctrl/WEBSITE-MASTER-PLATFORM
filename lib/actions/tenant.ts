'use server'

import { PrismaClient, TenantStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { requireSuperAdmin } from "@/lib/rbac"

export async function getTenants() {
  try {
    const user = await requireSuperAdmin()
    const tenants = await prisma.systemTenant.findMany({
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

export async function createTenant(data: { companyName: string, subdomain: string, packageKey?: string, addons?: string[] }) {
  try {
    const user = await requireSuperAdmin()

    // Check if subdomain exists
    const existing = await prisma.systemTenant.findUnique({
      where: { subdomain: data.subdomain }
    })

    if (existing) {
      return { success: false, error: 'Subdomain already in use' }
    }

    const packageKey = data.packageKey || 'landing_page'
    const plan = (packageKey === 'custom' || packageKey === 'retail_pos' || packageKey === 'ecommerce') ? 'enterprise' : 'core'

    const tenant = await prisma.systemTenant.create({
      data: {
        companyName: data.companyName,
        subdomain: data.subdomain,
        plan: plan as any
      }
    })

    // Determine modules to enable based on package
    const packageModuleMap: Record<string, string[]> = {
      landing_page: ['website_module', 'admin_module', 'user_management', 'rbac_module'],
      company_profile: ['website_module', 'admin_module', 'user_management', 'rbac_module'],
      business_website: ['website_module', 'admin_module', 'user_management', 'rbac_module', 'notification_module', 'analytics_module'],
      ecommerce: ['website_module', 'admin_module', 'user_management', 'rbac_module', 'catalog_module', 'ecommerce_module', 'payment_module', 'inventory_module', 'notification_module', 'analytics_module'],
      restaurant: ['website_module', 'admin_module', 'user_management', 'rbac_module', 'catalog_module', 'booking_module', 'notification_module', 'analytics_module'],
      retail_pos: ['website_module', 'admin_module', 'user_management', 'rbac_module', 'catalog_module', 'ecommerce_module', 'payment_module', 'pos_module', 'inventory_module', 'notification_module', 'analytics_module'],
      custom: ['website_module', 'admin_module', 'user_management', 'rbac_module', 'catalog_module', 'ecommerce_module', 'payment_module', 'pos_module', 'inventory_module', 'crm_module', 'booking_module', 'ai_module', 'notification_module', 'analytics_module', 'api_module']
    }

    const enabledModules = new Set(packageModuleMap[packageKey] || packageModuleMap.landing_page)
    
    // Add custom addons
    if (data.addons) {
      data.addons.forEach(addon => {
        if (addon === 'ai') enabledModules.add('ai_module')
        if (addon === 'booking') enabledModules.add('booking_module')
        if (addon === 'crm') enabledModules.add('crm_module')
        if (addon === 'api') enabledModules.add('api_module')
      })
    }

    // Enable modules in database
    const allModuleKeys = [
      'website_module', 'admin_module', 'user_management', 'rbac_module',
      'catalog_module', 'ecommerce_module', 'payment_module', 'pos_module',
      'inventory_module', 'crm_module', 'booking_module', 'ai_module',
      'notification_module', 'analytics_module', 'api_module'
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
        siteTitle: data.companyName,
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
          paymentGateway: 'unset',
          xenditEnabled: false,
          midtransEnabled: false,
          whatsappPaNumber: '',
          whatsappPhoneId: '',
          whatsappToken: '',
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
                title: `Welcome to ${data.companyName}`,
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
                  title: `Discover ${data.companyName} store`,
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

    revalidatePath('/admin/tenants')
    return { success: true, tenant }
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
