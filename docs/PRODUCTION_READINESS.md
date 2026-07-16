# DagangOS production-readiness tracker

This is a deliberately small, versioned list of remaining production work. It records only real gaps; the interface must not substitute demo figures for any of them.

## Open

- [ ] **Workspace invitation email delivery** — configure and test the DagangOS SMTP gateway. Invitations are otherwise fully usable through the secure copy-link fallback. Verified absent for the DagangOS company tenant on 2026-07-16.
- [ ] **Storefront payments** — configure and verify one production payment gateway (DOKU, Xendit, or Midtrans) in the DagangOS tenant settings. DOKU Checkout now requires only its Client ID and Secret Key; the DOKU business account is still under provider review and its production Secret Key must be entered through the protected admin form before a live checkout can be verified. Verified absent on 2026-07-16.

## Completed

- [x] **First platform owner** — the DagangOS owner account is active with `platform_owner` and `super-admin` access; its bcrypt credential and the live sign-in flow were verified.
- [x] Public storefront bootstrap creates the DagangOS company tenant, active website configuration, and production module records without sample data.
- [x] Storefront analytics records persistent anonymous page-view sessions and dashboard analytics derives from recorded events and paid orders.
- [x] API Portal synthetic traffic and monitoring uptime claims removed; visible values are now sourced from live configuration or measured checks.
- [x] **API request telemetry** — tenant-scoped control-plane request logs record route, final status, and latency; the API Portal reports the 30-day request count, P95 latency, error rate, and recent requests from that store.
- [x] **Control-plane API activation** — a server-only `CONTROL_PLANE_SECRET` is configured on the DagangOS VPS. A signed production request to `/api/v1/modules/sync` was authenticated and reached the route's request validation on 2026-07-16.
- [x] **Workspace invitations** — authorized administrators issue a 48-hour single-use invitation with only a token digest stored. Recipients can set a password, receive their assigned role, and sign in; email delivery is used when configured, with an explicit secure copy-link fallback otherwise.
- [x] **Hermes internal support API** — the local OpenAI-compatible service is active and reachable with its server-only URL, key, and model configured. A live public pre-sales support-chat request was verified; the public relay remains read-only and policy-scoped.
