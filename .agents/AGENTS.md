# Project-Scoped Agent Rules

## 1. Next-Intl Multi-Tenant Middleware Routing
**Context:** When using `next-intl` with a multi-tenant middleware that rewrites URLs (e.g., from `dagangos.localhost` to `/en/site/...`), the internal `getRequestConfig` often fails to receive the `locale` parameter from the dynamic route segment.
**Rule:** When configuring `i18n.ts` for a multi-tenant application, you MUST explicitly pass the locale via a custom header (e.g., `x-next-intl-locale`) in `middleware.ts` and read it using `headers()` inside `getRequestConfig`. Do not rely solely on the `locale` parameter passed by the `next-intl` function signature.

## 2. Prisma Deletion Constraints in Multi-Tenant Models
**Context:** When deleting a record, we often want to scope the deletion to a specific `tenantId` for security (e.g., `where: { id: id, tenantId: tenantId }`).
**Rule:** If `id` and `tenantId` do not form a formal composite `@unique` key in the Prisma schema, using `prisma.model.delete()` will throw a typing error because it expects a strictly unique identifier. You MUST use `prisma.model.deleteMany()` instead when scoping by `tenantId`.

## 3. AI Provider Agnosticism
**Context:** AI models and providers change rapidly. Predefined dropdowns for model names quickly become outdated (e.g., Claude 3.5 Sonnet being replaced by newer versions).
**Rule:** When building settings UI or API integrations for AI, DO NOT hardcode or predefine the available AI models in a static dropdown. 
- ALWAYS fetch the available models dynamically from the provider's API (e.g., `GET /v1/models`) and display them in a dropdown so the user can see what models are actually available to their key/subscription.
- If dynamic fetching fails, provide a free-text input field for the "Language Model" (e.g., `<input type="text" />`) as a fallback so the user can freely specify their desired model version (e.g., `claude-3-5-sonnet-latest`, `gpt-4o`).
- ALLOW custom API keys and base URLs without unnecessary validation, accepting any OpenAI-compatible AI provider to prevent needing code updates in the future.
