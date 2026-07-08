# Tenant Payment Configuration Feature Walkthrough

The payment configuration feature enables seamless multi-tenant scaling by allowing tenants to bring and manage their own payment provider API keys for Xendit and Midtrans directly via the settings UI.

## Database Schema & Encryption

The `TenantWebsite` model has been extended to securely store tenant credentials. The keys are encrypted at rest via AES-256 (`lib/crypto.ts`):

- **Xendit**: `xenditEncryptedSecret`, `xenditEncryptedWebhookToken`, and their respective IV columns.
- **Midtrans**: `midtransEncryptedServerKey` and its IV column.

The `savePaymentConfig` action in `lib/actions/website.ts` guarantees that raw secrets never hit the database, and `getAdminWebsiteConfig` securely sends placeholder strings (e.g. `sk_live_****1234`) to the frontend rather than leaking the raw or encrypted payload.

## Phase 3 Execution - Payment Gateway Configuration

- **Payment Schema Updated:** Added encrypted storage fields for Xendit and Midtrans API keys and webhook tokens (`xenditEncryptedSecret`, `midtransEncryptedServerKey`, etc.). Also added `xenditEnabled` and `midtransEnabled` toggles.
- **Provider Encryption:** Integrated `lib/crypto.ts` for dynamic AES-256 encryption at rest. Keys are decrypted dynamically during checkout (`app/api/checkout/route.ts`).
- **Webhook Routing Cache:** Webhook handlers (`app/api/webhook/[provider]/route.ts`) were optimized with an in-memory cache to prevent global database scans when processing notifications from payment providers.
- **Test Gap Closed:** Playwright test #19 (`Tenant Payment Gateway Configuration`) has been successfully stabilized. The issue was traced to a race condition where page reload interrupted the saving sequence, combined with a Next.js dev server cached Prisma instance issue failing to recognize new schema fields.
- **Action Required by User:** Actual Xendit and Midtrans production keys can now be provided by tenants securely via the Admin Settings interface.

All E2E audit gaps are officially resolved. The system is production-ready.

## Final Production Onboarding 

- **Webhook Rate Limiting:** Introduced an in-memory token bucket rate limiter to `app/api/webhook/[provider]/route.ts` to prevent DDoS or spam payloads from bringing down the database. The system now throttles at 50 requests per minute per IP.
- **WhatsApp API Integration:** Added `.env` system-level fallbacks for `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_TEMPLATE_NAME`, and `PA_WHATSAPP_NUMBER`.
- **Order Notifications:** Hooked up the `sendWhatsAppTemplate` helper in the payment webhook route. Whenever a payment is successfully received and the order transitions to processing, the tenant's configured PA WhatsApp number receives a notification containing the order ID and amount.
- **Deployment Checklist:** Created a comprehensive `deployment_checklist.md` artifact outlining the exact steps required to provision the VPS, sync the database, handle environment variables, and manage the PM2 clustering / Nginx reverse proxy.

All onboarding tasks are completely finalized! section allows them to:
- Enable/disable individual gateways (Xendit/Midtrans).
- Enter their Secret Key and Webhook Verification Token (Xendit) or Server Key (Midtrans) in a secure password input.

## Backend Payment Validation

### Checkout Routing (`app/api/checkout/route.ts`)
When creating a transaction:
1. The route decrypts the tenant's API keys on the fly using `lib/crypto.ts`.
2. For Midtrans, it dynamically parses the prefix of the Server Key (`SB-Mid-server-`) to route requests appropriately to `app.sandbox.midtrans.com` or the live `app.midtrans.com` API endpoint.
3. If a tenant doesn't have custom keys configured, the checkout route safely falls back to `process.env` configurations.

### Webhook Event Handling (`app/api/webhook/[provider]/route.ts`)
Because webhook providers (like Xendit and Midtrans) do not pass the `tenantId` in the headers, the platform now uses an intelligent lookup strategy to validate the payloads.
- **Xendit**: Looks for a matching decrypted token for the `x-callback-token` header among active tenants.
- **Midtrans**: Iterates through active tenants and attempts to generate an identical HMAC SHA-512 `signature_key` using the payload fields (`order_id`, `status_code`, `gross_amount`) and the tenant's decrypted server key.

If all tenant matching fails, it seamlessly falls back to validating via the platform-wide environment variables.
