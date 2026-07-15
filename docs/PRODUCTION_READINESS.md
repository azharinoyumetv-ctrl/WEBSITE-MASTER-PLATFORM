# DagangOS production-readiness tracker

This is a deliberately small, versioned list of remaining production work. It records only real gaps; the interface must not substitute demo figures for any of them.

## Open

- [ ] **API request telemetry** — add a tenant-scoped request-log store and middleware/instrumentation for authenticated API traffic. Then expose request volume, latency percentiles, and failure rate in the API Portal from that data.
- [ ] **Workspace invitation delivery** — configure and test the DagangOS platform SMTP gateway. Provisioning already creates a seven-day, single-use password-setup link and provides a copy-link fallback; this item closes the automated delivery verification gap.
- [ ] **Storefront payments** — configure and verify one production payment gateway (DOKU, Xendit, or Midtrans) in the DagangOS tenant settings. Project Setup is live, but no gateway credentials are stored for the new company tenant yet.

- [ ] **Hermes support-chat bridge** — configure Hermes with a real HTTPS webhook endpoint and server-side API key, or provide the Telegram bot token, chat ID, and callback design for a two-way Telegram bridge. The storefront UI and secure relay are ready; ChatGPT subscription credentials must not be used as API credentials.

## Completed

- [x] **First platform owner** — the DagangOS owner account is active with `platform_owner` and `super-admin` access; its bcrypt credential and the live sign-in flow were verified.
- [x] Public storefront bootstrap creates the DagangOS company tenant, active website configuration, and production module records without sample data.
- [x] Storefront analytics records persistent anonymous page-view sessions and dashboard analytics derives from recorded events and paid orders.
- [x] API Portal synthetic traffic and monitoring uptime claims removed; visible values are now sourced from live configuration or measured checks.
