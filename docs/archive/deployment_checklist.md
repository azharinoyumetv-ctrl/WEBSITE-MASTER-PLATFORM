# VPS Deployment Checklist

Follow this checklist to provision, configure, and go live with the Website Master Platform on a production VPS (e.g., DigitalOcean, AWS EC2, or Google Cloud Compute Engine).

## 1. Initial Server Provisioning
- [ ] **OS Setup:** Provision an Ubuntu 22.04 or 24.04 LTS instance.
- [ ] **Update Packages:** Run `sudo apt update && sudo apt upgrade -y`.
- [ ] **Install Node.js:** Install Node.js v20 LTS via NVM or NodeSource.
- [ ] **Install PM2:** Run `npm install -g pm2` to manage the production application.
- [ ] **Install PostgreSQL:** Install Postgres (`sudo apt install postgresql`) or provision a Managed Database.

## 2. Codebase & Dependencies
- [ ] **Clone Repository:** `git clone <your-repo-url> website-master-platform`
- [ ] **Install Packages:** Run `npm install` (or `npm ci` for a clean install).
- [ ] **Build Next.js:** Run `npm run build` to generate the production bundle (`.next`).

## 3. Environment Configuration
- [ ] **Copy Environment File:** `cp .env.example .env`
- [ ] **Configure Core Variables:** 
  - `DATABASE_URL` — Point to your production Postgres instance.
    ⚠️  **URL-encode special characters in the password** — `#` → `%23`, `@` → `%40`.
    An unescaped `#` is treated as a URL fragment separator by the Node URL parser,
    which corrupts the hostname and causes Prisma to throw `EAI_AGAIN` at runtime.
    Example: `postgresql://postgres:MyPass%23Word@localhost:5432/mydb?schema=public`
  - `NEXTAUTH_URL` (Your production domain, e.g., `https://store.dagangos.com`).
  - `NEXTAUTH_SECRET`, `JWT_SECRET`, `JWT_REFRESH_SECRET` (Generate secure random 32-byte hex strings).
  - `ENCRYPTION_KEY` (Required for Xendit/Midtrans API key encryption at rest; must be 32 bytes).
  - `CONTROL_PLANE_SECRET` (Required for `/api/v1` HMAC auth; generate with `openssl rand -hex 32`).
- [ ] **Configure WhatsApp (Optional):**
  - Add `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_TEMPLATE_NAME`, and `PA_WHATSAPP_NUMBER` to enable system-level fallbacks for notifications.

## 4. Database Setup
- [ ] **Push Schema:** Run `npx prisma db push` to synchronize the schema.
- [ ] **Generate Client:** Run `npx prisma generate` to build the database types.
- [ ] **Seed Global Admin (Optional):** Run `node prisma/seed.js` or create the root `SystemTenant` manually via Prisma Studio.

## 5. Web Server & Reverse Proxy
- [ ] **Install Nginx:** `sudo apt install nginx`.
- [ ] **Configure Server Block:** Set up Nginx to reverse proxy port 80/443 to `localhost:4000`.
- [ ] **WebSocket Support:** Ensure Nginx passes `Upgrade` and `Connection` headers for Next.js hot-reloading (if needed) and general Socket connections.
- [ ] **SSL Certificate:** Run `sudo apt install certbot python3-certbot-nginx` and execute `sudo certbot --nginx` to provision a free Let's Encrypt SSL certificate.

## 6. PM2 Process Management
- [ ] **Start Application:** `pm2 start npm --name "website-master-platform" -- start -- -p 4000`
- [ ] **Enable Auto-restart:** Run `pm2 startup` and `pm2 save` to ensure the platform restarts automatically upon server reboot.

## 7. Production Sanity Checks
- [ ] **Verify Payment Gateways:** Log into the Admin Dashboard and securely input the production Xendit and Midtrans API keys under **Settings > Brand & Theme**.
- [ ] **Check Webhooks:** Trigger a test payment and verify that `app/api/webhook/[provider]` is receiving the payload and not rate-limiting unexpectedly.
- [ ] **Check Notifications:** Ensure WhatsApp notifications (if configured) are properly delivered upon successful order payment.
