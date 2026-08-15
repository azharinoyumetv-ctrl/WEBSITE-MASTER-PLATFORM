# Tenant VPS deployment

This package runs one isolated WMP tenant deployment behind Nginx or a Cloudflare Tunnel.

## Required environment

Create `.env.production` on the VPS. Do not commit it.

```dotenv
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://tenant.example.com
NEXT_PUBLIC_APP_URL=https://tenant.example.com
NEXT_PUBLIC_BASE_DOMAIN=tenant.example.com
ENCRYPTION_KEY=...
CONTROL_PLANE_SECRET=...
```

Add only the payment, email, AI, storage, and monitoring credentials enabled for that tenant. Generate distinct secrets per deployment and keep the file readable only by the deployment account.

## Build and start

```sh
docker compose -f docker-compose.tenant.yml build
docker compose -f docker-compose.tenant.yml run --rm wmp npx prisma migrate deploy
docker compose -f docker-compose.tenant.yml up -d
docker compose -f docker-compose.tenant.yml ps
```

The application binds to `127.0.0.1:4000` by default. Override `WMP_PORT` only when another local service already uses that port.

## Reverse proxy

Terminate TLS at Nginx or Cloudflare and proxy only the assigned tenant hostname to the local port. Forward `Host`, `X-Forwarded-For`, and `X-Forwarded-Proto`. Do not use a catch-all virtual host that exposes this deployment on unrelated domains.

## Verification

```sh
curl --fail http://127.0.0.1:4000/api/health
curl --fail http://127.0.0.1:4000/api/ready
docker compose -f docker-compose.tenant.yml logs --tail=100 wmp
```

Then verify the public homepage, locale login, admin redirect, tenant storefront, checkout readiness, and the configured payment webhook URLs.

## Upgrade and rollback

Tag every image with the Git commit SHA:

```sh
WMP_IMAGE_TAG=<commit-sha> docker compose -f docker-compose.tenant.yml build
WMP_IMAGE_TAG=<commit-sha> docker compose -f docker-compose.tenant.yml up -d
```

Retain the prior image tag. To roll back, restore the previous tag and run `up -d` again. Database changes must use backward-compatible migrations before a rolling upgrade.
