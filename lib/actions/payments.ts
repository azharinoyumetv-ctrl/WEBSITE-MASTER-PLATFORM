'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from 'next/cache'
import { getAuthenticatedUser, requirePermission } from '@/lib/rbac'
import { decrypt } from '@/lib/crypto'
import crypto from 'crypto'
import { sendOrderConfirmationEmail } from './notifications'

async function getXenditAuth(tenantId: string) {
  const website = await prisma.tenantWebsite.findUnique({ where: { tenantId } })
  if (!website?.xenditEnabled || !website.xenditEncryptedSecret) {
    throw new Error('Xendit is not configured or enabled for this tenant');
  }
  // If the secret doesn't have 2 colons (it's legacy iv:ciphertext), handle it or expect it was rotated
  let encryptedData = website.xenditEncryptedSecret;
  if (website.xenditEncryptedSecretIv && !encryptedData.includes(':')) {
     encryptedData = `${website.xenditEncryptedSecretIv}:${website.xenditEncryptedSecret}`;
  }
  const secret = decrypt(encryptedData);
  if (!secret) throw new Error('Failed to decrypt Xendit secret');
  return Buffer.from(secret + ':').toString('base64');
}

export async function createInvoice(tenantId: string, orderId: string, amount: number, customerEmail?: string) {
  try {
    const authHeader = await getXenditAuth(tenantId);
    const res = await fetch('https://api.xendit.co/v2/invoices', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        external_id: orderId,
        amount: amount,
        payer_email: customerEmail || 'guest@example.com',
        description: `Invoice for order ${orderId}`
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to create Xendit invoice');

    return { success: true, invoiceUrl: data.invoice_url, invoiceId: data.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getPayments(tenantId: string) {
  try {
    const user = await getAuthenticatedUser()
    await requirePermission(user.id, tenantId, 'payments', 'read')

    const payments = await prisma.tenantPayment.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    })
    return { success: true, payments }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function refundPayment(tenantId: string, paymentId: string) {
  try {
    const user = await getAuthenticatedUser()
    await requirePermission(user.id, tenantId, 'payments', 'write')

    const payment = await prisma.tenantPayment.findUnique({ where: { id: paymentId, tenantId } })
    if (!payment) return { success: false, error: 'Payment not found' }
    if (payment.paymentStatus === 'refunded') return { success: false, error: 'Already refunded' }
    if (!payment.externalTransactionId) return { success: false, error: 'No external transaction ID to refund' }
    
    // Call Xendit Refund API (for invoices/ewallet/etc depending on channel, usually Refunds API)
    // Here we assume it's a generic charge that supports /refunds
    const authHeader = await getXenditAuth(tenantId);
    const res = await fetch(`https://api.xendit.co/refunds`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        charge_id: payment.externalTransactionId,
        amount: Number(payment.amount),
        reason: 'REQUESTED_BY_CUSTOMER'
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Refund failed via gateway');

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.tenantPayment.update({
        where: { id: paymentId },
        data: { paymentStatus: 'refunded' }
      })
      await tx.tenantPaymentLedger.create({
        data: {
          tenantId,
          paymentId,
          orderId: p.orderId,
          type: 'refund',
          amount: Number(p.amount), // negative amount usually for refunds, or just absolute? Let's use negative
          currency: p.currency,
          gateway: p.processorKey,
          gatewayTxId: p.externalTransactionId,
          status: 'success'
        }
      })
      return p
    })
    
    revalidatePath('/admin/payments')
    return { success: true, payment: updated }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function capturePayment(tenantId: string, paymentId: string) {
  try {
    const user = await getAuthenticatedUser()
    await requirePermission(user.id, tenantId, 'payments', 'write')

    const payment = await prisma.tenantPayment.findUnique({ where: { id: paymentId, tenantId } })
    if (!payment) return { success: false, error: 'Payment not found' }
    if (payment.paymentStatus === 'succeeded') return { success: false, error: 'Already captured' }
    if (!payment.externalTransactionId) return { success: false, error: 'No external transaction ID to capture' }
    
    const authHeader = await getXenditAuth(tenantId);
    const res = await fetch(`https://api.xendit.co/credit_card_charges/${payment.externalTransactionId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: Number(payment.amount)
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Capture failed via gateway');

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.tenantPayment.update({
        where: { id: paymentId },
        data: { paymentStatus: 'succeeded' }
      })
      await tx.tenantPaymentLedger.create({
        data: {
          tenantId,
          paymentId,
          orderId: p.orderId,
          type: 'capture',
          amount: Number(p.amount),
          currency: p.currency,
          gateway: p.processorKey,
          gatewayTxId: p.externalTransactionId,
          status: 'success'
        }
      })
      return p
    })
    
    revalidatePath('/admin/payments')
    return { success: true, payment: updated }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function manualAdjustPayment(tenantId: string, paymentId: string, adjustAmount: number, reason: string) {
  try {
    const user = await getAuthenticatedUser()
    await requirePermission(user.id, tenantId, 'payments', 'write')

    const payment = await prisma.tenantPayment.findUnique({ where: { id: paymentId, tenantId } })
    if (!payment) return { success: false, error: 'Payment not found' }

    const updated = await prisma.$transaction(async (tx) => {
      const newAmount = Number(payment.amount) + adjustAmount
      const p = await tx.tenantPayment.update({
        where: { id: paymentId },
        data: { amount: newAmount }
      })
      await tx.tenantPaymentLedger.create({
        data: {
          tenantId,
          paymentId,
          orderId: p.orderId,
          type: 'manual_adjustment',
          amount: adjustAmount,
          currency: p.currency,
          gateway: p.processorKey,
          gatewayTxId: p.externalTransactionId,
          status: 'success'
        }
      })
      // optional log of reason
      return p
    })
    
    return { success: true, payment: updated }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

async function getDokuAuth(tenantId: string) {
  const website = await prisma.tenantWebsite.findUnique({ where: { tenantId } })
  
  let clientId = '';
  let sharedKey = '';
  let environment = 'sandbox';
  let preferredChannel = 'all';
  let merchantPublicKey = null;
  let snapTokenUrl = null;

  if (website?.dokuEnabled && website.dokuClientId && website.dokuSharedKey) {
    clientId = decrypt(website.dokuClientId);
    sharedKey = decrypt(website.dokuSharedKey);
    environment = website.dokuEnvironment || 'sandbox';
    preferredChannel = website.dokuPreferredChannel || 'all';
    merchantPublicKey = website.dokuMerchantPublicKey ? decrypt(website.dokuMerchantPublicKey) : null;
    snapTokenUrl = website.dokuSnapTokenUrl ? decrypt(website.dokuSnapTokenUrl) : null;
  } else {
    // Fallback to platform environment variables
    const isProd = process.env.NODE_ENV === 'production';
    environment = isProd ? 'production' : 'sandbox';
    clientId = (isProd ? process.env.DOKU_PRODUCTION_CLIENT_ID : process.env.DOKU_SANDBOX_CLIENT_ID) || '';
    sharedKey = (isProd ? process.env.DOKU_PRODUCTION_SHARED_KEY : process.env.DOKU_SANDBOX_SHARED_KEY) || '';
  }

  if (!clientId || !sharedKey) {
    throw new Error('DOKU is not configured or enabled');
  }

  return {
    clientId,
    sharedKey,
    environment,
    preferredChannel,
    merchantPublicKey,
    snapTokenUrl
  };
}

export async function createDokuCheckout(
  tenantId: string,
  orderId: string,
  amount: number,
  currency: string,
  customer?: { name?: string; email?: string; phone?: string }
) {
  try {
    const auth = await getDokuAuth(tenantId);
    const tenant = await prisma.systemTenant.findUnique({
      where: { id: tenantId }
    });
    if (!tenant) throw new Error("Tenant not found");

    let host = '';
    if (tenant.customDomain) {
      host = `https://${tenant.customDomain}`;
    } else {
      const subdomain = tenant.subdomain;
      const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'store.dagangos.com';
      host = `https://${subdomain}.${baseDomain}`;
    }
    
    // Jokul Checkout API URL
    const baseUrl = auth.environment === 'production'
      ? 'https://api.doku.com'
      : 'https://api-sandbox.doku.com';
    const requestTarget = '/checkout/v1/payment';
    const url = `${baseUrl}${requestTarget}`;

    // Map channels
    let methodTypes: string[] = [];
    if (auth.preferredChannel === 'va' || auth.preferredChannel === 'all') {
      methodTypes.push(
        'VIRTUAL_ACCOUNT_BCA',
        'VIRTUAL_ACCOUNT_BANK_MANDIRI',
        'VIRTUAL_ACCOUNT_BRI',
        'VIRTUAL_ACCOUNT_BNI',
        'VIRTUAL_ACCOUNT_BANK_PERMATA'
      );
    }
    if (auth.preferredChannel === 'ewallet' || auth.preferredChannel === 'all') {
      methodTypes.push(
        'EMONEY_SHOPEEPAY',
        'EMONEY_OVO',
        'EMONEY_DANA'
      );
    }
    if (auth.preferredChannel === 'minimart' || auth.preferredChannel === 'all') {
      methodTypes.push('ONLINE_TO_OFFLINE_ALFA');
    }
    if (methodTypes.length === 0) {
      // default fallback to all
      methodTypes = [
        'VIRTUAL_ACCOUNT_BCA', 'VIRTUAL_ACCOUNT_BANK_MANDIRI', 'VIRTUAL_ACCOUNT_BRI', 'VIRTUAL_ACCOUNT_BNI', 'VIRTUAL_ACCOUNT_BANK_PERMATA',
        'EMONEY_SHOPEEPAY', 'EMONEY_OVO', 'EMONEY_DANA',
        'ONLINE_TO_OFFLINE_ALFA'
      ];
    }

    const uniqueInvoiceNumber = `${orderId}_${Date.now()}`;

    const body = {
      order: {
        amount: Math.round(amount),
        invoice_number: uniqueInvoiceNumber,
        currency: 'IDR',
        callback_url: `${host}/api/webhook/doku/result`,
        callback_url_result: `${host}/api/webhook/doku/result`
      },
      payment: {
        payment_due_date: 60,
        payment_method_types: methodTypes
      },
      customer: {
        name: customer?.name || 'Guest Customer',
        email: customer?.email || 'guest@example.com',
        phone: customer?.phone || ''
      }
    };

    const timestamp = new Date().toISOString().slice(0, 19) + 'Z';
    const requestId = crypto.randomUUID();
    
    // Generate Digest
    const bodyJSON = JSON.stringify(body);
    const digest = crypto.createHash('sha256').update(bodyJSON).digest('base64');

    // Generate Signature
    const signatureString = `Client-Id:${auth.clientId}\n` +
      `Request-Id:${requestId}\n` +
      `Request-Timestamp:${timestamp}\n` +
      `Request-Target:${requestTarget}\n` +
      `Digest:${digest}`;

    const signature = 'HMACSHA256=' + crypto.createHmac('sha256', auth.sharedKey).update(signatureString).digest('base64');

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Client-Id': auth.clientId,
        'Request-Id': requestId,
        'Request-Timestamp': timestamp,
        'Signature': signature,
        'Content-Type': 'application/json'
      },
      body: bodyJSON
    });

    const data = await res.json();
    if (!res.ok) {
      const errorMsg = data.error_messages?.join(', ') || data.message || 'Failed to create DOKU checkout';
      throw new Error(errorMsg);
    }

    const paymentUrl = data.payment?.url || data.response?.payment?.payment_url || data.payment_url;
    const invoiceId = data.payment?.token || data.response?.uuid || data.uuid || uniqueInvoiceNumber;

    if (!paymentUrl) {
      throw new Error('DOKU API response did not contain a payment URL');
    }

    // Save payment details inside transaction to be safe
    await prisma.tenantPayment.upsert({
      where: { externalTransactionId: invoiceId },
      create: {
        tenantId,
        orderId,
        processorKey: 'doku',
        externalTransactionId: invoiceId,
        amount: Math.round(amount),
        currency: 'IDR',
        paymentStatus: 'initiated',
        metadata: data as any
      },
      update: {
        paymentStatus: 'initiated',
        metadata: data as any
      }
    });

    return { success: true, paymentUrl, invoiceId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createMidtransCheckout(tenantId: string, orderId: string, amount: number, customerEmail?: string) {
  try {
    const website = await prisma.tenantWebsite.findUnique({ where: { tenantId } })
    if (!website?.midtransEnabled || !website.midtransEncryptedServerKey) {
      throw new Error('Midtrans is not configured or enabled for this tenant');
    }
    
    let serverKey = website.midtransEncryptedServerKey;
    if (website.midtransEncryptedServerKeyIv && !serverKey.includes(':')) {
       serverKey = `${website.midtransEncryptedServerKeyIv}:${website.midtransEncryptedServerKey}`;
    }
    const decryptedKey = decrypt(serverKey);
    if (!decryptedKey) throw new Error('Failed to decrypt Midtrans server key');

    const authHeader = Buffer.from(decryptedKey + ':').toString('base64');
    const isProduction = !(decryptedKey.startsWith('SB-') || decryptedKey.toLowerCase().includes('sandbox'));
    const apiUrl = isProduction ? 'https://app.midtrans.com/snap/v1/transactions' : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: orderId,
          gross_amount: amount
        },
        customer_details: {
          email: customerEmail || 'guest@example.com'
        }
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to create Midtrans Snap transaction');

    await prisma.tenantPayment.upsert({
      where: { externalTransactionId: orderId },
      create: {
        tenantId,
        orderId,
        processorKey: 'midtrans',
        externalTransactionId: orderId,
        amount,
        currency: 'IDR',
        paymentStatus: 'initiated',
        metadata: data as any
      },
      update: {
        paymentStatus: 'initiated',
        metadata: data as any
      }
    });

    return { success: true, redirectUrl: data.redirect_url, token: data.token };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function handleDokuNotification(req: Request) {
  try {
    const headersList = req.headers;
    const bodyText = await req.text();
    const body = JSON.parse(bodyText);

    const rawInvoiceNumber = body.order?.invoice_number || body.invoice_number;
    if (!rawInvoiceNumber) {
      return { status: 400, body: { error: 'Missing invoice number' } };
    }
    const invoiceNumber = rawInvoiceNumber.includes('_') ? rawInvoiceNumber.split('_')[0] : rawInvoiceNumber;

    // Look up the order to identify the tenant
    const order = await prisma.tenantOrder.findFirst({
      where: { id: invoiceNumber }
    });
    
    let tenantId = '';
    let orderId = '';
    let totalAmount = 0;

    if (order) {
      tenantId = order.tenantId;
      orderId = order.id;
      totalAmount = Number(order.totalAmount);
    } else {
      // Fallback: search in TenantPayment by externalTransactionId
      const paymentRecord = await prisma.tenantPayment.findFirst({
        where: { externalTransactionId: invoiceNumber }
      });
      if (!paymentRecord) {
        return { status: 404, body: { error: 'Order/Payment not found' } };
      }
      tenantId = paymentRecord.tenantId;
      orderId = paymentRecord.orderId;
      totalAmount = Number(paymentRecord.amount);
    }

    const auth = await getDokuAuth(tenantId);

    // Verify DOKU signature
    const clientId = headersList.get('client-id') || '';
    const requestId = headersList.get('request-id') || '';
    const timestamp = headersList.get('request-timestamp') || '';
    const incomingSignature = headersList.get('signature') || '';

    // Calculate Digest
    const digest = crypto.createHash('sha256').update(bodyText).digest('base64');
    
    // Reconstruct Request Target Path from URL
    const url = new URL(req.url);
    const requestTarget = url.pathname;

    const signatureString = `Client-Id:${clientId}\n` +
      `Request-Id:${requestId}\n` +
      `Request-Timestamp:${timestamp}\n` +
      `Request-Target:${requestTarget}\n` +
      `Digest:${digest}`;

    const calculatedSignature = 'HMACSHA256=' + crypto.createHmac('sha256', auth.sharedKey).update(signatureString).digest('base64');

    if (calculatedSignature !== incomingSignature) {
      console.error('Doku webhook signature verification failed.');
      return { status: 401, body: { error: 'Unauthorized webhook signature' } };
    }

    // Determine internal payment status
    const dokuStatus = body.transaction?.status || body.status;
    let paymentStatus: 'succeeded' | 'failed' | 'cancelled' | 'pending' | 'refunded' | 'expired' = 'pending';
    if (dokuStatus === 'SUCCESS') {
      paymentStatus = 'succeeded';
    } else if (dokuStatus === 'FAILED') {
      paymentStatus = 'failed';
    } else if (dokuStatus === 'CANCEL') {
      paymentStatus = 'cancelled';
    } else if (dokuStatus === 'REFUND' || dokuStatus === 'DISPUTE' || dokuStatus === 'CHARGEBACK') {
      paymentStatus = 'refunded';
    }

    const externalTransactionId = body.transaction?.token || body.transaction?.reference_id || invoiceNumber;

    // Retrieve or create payment record
    const updated = await prisma.$transaction(async (tx) => {
      let payment = await tx.tenantPayment.findFirst({
        where: {
          OR: [
            { orderId },
            { externalTransactionId }
          ]
        }
      });

      const oldStatus = payment?.paymentStatus;

      if (!payment) {
        payment = await tx.tenantPayment.create({
          data: {
            tenantId,
            orderId,
            processorKey: 'doku',
            externalTransactionId,
            amount: totalAmount,
            currency: 'IDR',
            paymentStatus: paymentStatus as any,
            metadata: body as any
          }
        });
      } else {
        payment = await tx.tenantPayment.update({
          where: { id: payment.id },
          data: {
            paymentStatus: paymentStatus as any,
            externalTransactionId,
            metadata: body as any
          }
        });
      }

      // Write ledger entry if status changed
      if (oldStatus !== paymentStatus) {
        await tx.tenantPaymentLedger.create({
          data: {
            tenantId,
            paymentId: payment.id,
            orderId,
            type: paymentStatus === 'succeeded' ? 'capture' : 'reversal',
            amount: payment.amount,
            currency: payment.currency,
            gateway: 'doku',
            gatewayTxId: externalTransactionId,
            status: paymentStatus === 'succeeded' ? 'success' : 'failed',
            metadata: body as any
          }
        });
      }

      // If succeeded, update orderStatus to 'paid'
      if (paymentStatus === 'succeeded') {
        await tx.tenantOrder.update({
          where: { id: orderId },
          data: { 
            orderStatus: 'paid',
            receiptUrl: `/orders/${orderId}/receipt`
          }
        });
      } else if (paymentStatus === 'failed' || paymentStatus === 'cancelled' || paymentStatus === 'refunded') {
        await tx.tenantOrder.update({
          where: { id: orderId },
          data: { orderStatus: 'cancelled' }
        });
      }

      return payment;
    });

    // Send confirmation email asynchronously after transaction success
    if (paymentStatus === 'succeeded') {
      const emailRecipient = order?.guestEmail || body.customer?.email || 'customer@example.com';
      sendOrderConfirmationEmail(tenantId, orderId, emailRecipient)
        .catch(err => console.error("Failed to send async Doku order confirmation email", err));
    }

    return { status: 200, body: { success: true, paymentId: updated.id } };
  } catch (error: any) {
    console.error('Error handling DOKU notification:', error);
    return { status: 500, body: { error: error.message } };
  }
}

export async function getPaymentStatus(tenantId: string, orderId: string) {
  try {
    const payment = await prisma.tenantPayment.findFirst({
      where: {
        tenantId,
        OR: [
          { orderId },
          { externalTransactionId: orderId }
        ]
      },
      select: {
        paymentStatus: true
      }
    });
    return { success: true, status: payment?.paymentStatus || 'not_found' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
