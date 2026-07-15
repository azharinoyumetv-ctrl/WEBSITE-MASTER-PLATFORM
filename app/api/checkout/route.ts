import { NextRequest, NextResponse } from 'next/server'

/**
 * @deprecated
 * This endpoint has been superseded by the /project-setup flow.
 * All new project orders must go through POST /api/project-setup.
 *
 * The legacy cart checkout logic has been archived below as a comment
 * and can be restored if a standard e-commerce product flow is re-enabled.
 * See: lib/actions/ecommerce.ts → createOrder()
 */
export async function POST(_req: NextRequest) {
  return NextResponse.json(
    {
      error: 'This checkout endpoint is deprecated.',
      message: 'Please use the /project-setup flow to place a new project order.',
      redirect: '/project-setup',
    },
    { status: 410 }
  )
}

/*
 * ─── ARCHIVED LEGACY IMPLEMENTATION ────────────────────────────────────────
 *
 * The original cart-based checkout flow has been moved here for reference.
 * It accepted Xendit / Midtrans payment gateway callbacks and created
 * TenantOrder + TenantPayment records server-side.
 *
 * To restore: move this body back into the POST handler above and
 * reinstate all imports (prisma, decrypt, validateCheckoutNonce).
 *
 * Original flow:
 *  1. Validate nonce via validateCheckoutNonce()
 *  2. Validate required fields: name, phone, email, items[]
 *  3. Fetch catalog items, compute server-side total (never trust client amount)
 *  4. Create TenantOrder + TenantOrderItem records
 *  5. Create initiated TenantPayment record
 *  6. If gateway === 'xendit' → POST /v2/invoices → return { url }
 *  7. If gateway === 'midtrans' → POST /snap/v1/transactions → return { url }
 * ────────────────────────────────────────────────────────────────────────────
 */
