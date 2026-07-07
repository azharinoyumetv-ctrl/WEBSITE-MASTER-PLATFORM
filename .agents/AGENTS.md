# Project-Scoped Agent Rules

## 1. Next-Intl Multi-Tenant Middleware Routing
**Context:** When using `next-intl` with a multi-tenant middleware that rewrites URLs (e.g., from `dagangos.localhost` to `/en/site/...`), the internal `getRequestConfig` often fails to receive the `locale` parameter from the dynamic route segment.
**Rule:** When configuring `i18n.ts` for a multi-tenant application, you MUST explicitly pass the locale via a custom header (e.g., `x-next-intl-locale`) in `middleware.ts` and read it using `headers()` inside `getRequestConfig`. Do not rely solely on the `locale` parameter passed by the `next-intl` function signature.

## 2. Prisma Deletion Constraints in Multi-Tenant Models
**Context:** When deleting a record, we often want to scope the deletion to a specific `tenantId` for security (e.g., `where: { id: id, tenantId: tenantId }`).
**Rule:** If `id` and `tenantId` do not form a formal composite `@unique` key in the Prisma schema, using `prisma.model.delete()` will throw a typing error because it expects a strictly unique identifier. You MUST use `prisma.model.deleteMany()` instead when scoping by `tenantId`.
