# Production Onboarding Finalization

This plan tackles the remaining items in the production onboarding backlog concurrently, ensuring the platform is stable, rate-limited, and properly configured for launch.

## User Review Required

> [!IMPORTANT]
> - **In-Memory Rate Limiting:** The webhook rate limit will be in-memory (tracking requests globally per second). Since this is running on a single PM2 instance (VPS), this is sufficient. If you scale horizontally across multiple instances in the future, you'll need to upgrade this to Redis (e.g., Upstash).
> - **WhatsApp Notifications:** I will wire the checkout webhook to fire a WhatsApp notification to the tenant's PA whenever an order transitions to `succeeded` (Paid).

## Open Questions

None at this time.

## Proposed Changes

### Webhook API Route
- **Description**: Add rate-limiting to prevent high-volume attacks or bursts from bringing down the database. Connect WhatsApp notifications for successful payments.
#### [MODIFY] [route.ts](file:///d:/Fullstack%20Apps/website-master-platform/app/api/webhook/%5Bprovider%5D/route.ts)
- Add a simple token bucket / sliding window rate limiter at the top of the route handler.
- If the rate limit is exceeded, return `HTTP 429 Too Many Requests`.
- After a successful order payment update, retrieve the `tenantId` and `themeConfig` to send a WhatsApp notification using `sendWhatsAppTemplate()` to alert the merchant of a new paid order.

### Environment Configuration
- **Description**: Add WhatsApp API placeholders to the global VPS `.env` file.
#### [MODIFY] [.env](file:///d:/Fullstack%20Apps/website-master-platform/.env)
- Add `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_TEMPLATE_NAME`, `PA_WHATSAPP_NUMBER`.

### Deployment Checklist
- **Description**: Create a comprehensive deployment checklist artifact.
#### [NEW] [deployment_checklist.md](file:///C:/Users/azhar/.gemini/antigravity-ide/brain/81a390eb-29b4-462e-b9e8-aa9aff64357c/deployment_checklist.md)
- Step-by-step guide on VPS provisioning, Postgres setup, Environment variables, PM2 clustering, and Nginx reverse proxy configuration.

## Verification Plan

### Automated Tests
- Run `npx playwright test tests/e2e.spec.ts` to ensure no webhook routing regressions.

### Manual Verification
- Provide instructions on how to simulate a webhook payload via cURL and verify that a 429 Too Many Requests is triggered when spammed.
