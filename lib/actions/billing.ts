'use server'

import prisma from "@/lib/prisma"
import { requirePermission, getAuthenticatedUser } from "@/lib/rbac"
import { createDokuCheckout } from './payments'

export async function generateBillingInvoice(tenantId: string, planId: 'core' | 'professional' | 'enterprise') {
  try {
    const user = await getAuthenticatedUser()
    await requirePermission(user.id, tenantId, 'settings', 'write')

    const tenant = await prisma.systemTenant.findUnique({ where: { id: tenantId } })
    if (!tenant) throw new Error("Tenant not found")

    let amount = 0;
    if (planId === 'professional') amount = 500000;
    else if (planId === 'enterprise') amount = 2000000;
    else amount = 0; // core is free, though usually they won't invoice for free.
    
    if (amount === 0) {
       return { success: true, invoiceUrl: null, message: "Plan is free, no invoice needed." }
    }

    const website = await prisma.tenantWebsite.findUnique({ where: { tenantId } })
    const orderId = `upgrade-${tenantId}-${Date.now()}`
    const isProd = process.env.NODE_ENV === 'production'
    const platformDokuClientId = isProd ? process.env.DOKU_PRODUCTION_CLIENT_ID : process.env.DOKU_SANDBOX_CLIENT_ID

    // Try DOKU first
    if (website?.dokuEnabled || platformDokuClientId) {
      const dokuRes = await createDokuCheckout(tenantId, orderId, amount, 'IDR', {
        email: user.email,
        name: tenant.companyName
      })
      if (dokuRes.success && dokuRes.paymentUrl) {
        return { success: true, invoiceUrl: dokuRes.paymentUrl }
      }
    }

    // Try Xendit second
    if (process.env.XENDIT_SECRET_KEY) {
      const auth = Buffer.from(process.env.XENDIT_SECRET_KEY + ':').toString('base64')
      const xenditRes = await fetch('https://api.xendit.co/v2/invoices', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          external_id: orderId,
          amount,
          description: `Platform Upgrade to ${planId.toUpperCase()} for ${tenant.companyName}`,
          customer: {
            email: user.email
          },
          currency: 'IDR'
        })
      })

      if (xenditRes.ok) {
        const data = await xenditRes.json()
        return { success: true, invoiceUrl: data.invoice_url }
      }
    }

    // Fallback to Midtrans
    if (process.env.MIDTRANS_SERVER_KEY) {
      const auth = Buffer.from(process.env.MIDTRANS_SERVER_KEY + ':').toString('base64')
      const isProduction = process.env.NODE_ENV === 'production'
      const apiUrl = isProduction ? 'https://app.midtrans.com/snap/v1/transactions' : 'https://app.sandbox.midtrans.com/snap/v1/transactions'
      
      const midtransRes = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          transaction_details: {
            order_id: `upgrade-${tenantId}-${Date.now()}`,
            gross_amount: amount
          },
          customer_details: {
            email: user.email,
            first_name: tenant.companyName
          }
        })
      })

      if (midtransRes.ok) {
        const data = await midtransRes.json()
        return { success: true, invoiceUrl: data.redirect_url }
      }
    }

    return { success: false, error: "BILLING_NOT_CONFIGURED", message: "No billing provider configured on the platform. Please set XENDIT_SECRET_KEY or MIDTRANS_SERVER_KEY." }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getBillingInvoices(tenantId: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'settings', 'read')

    const invoices = await prisma.tenantPaymentLedger.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    })
    return { success: true, invoices }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
