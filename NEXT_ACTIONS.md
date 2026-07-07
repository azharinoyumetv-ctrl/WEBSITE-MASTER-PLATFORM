# Next Actions: Deployment & Production Staging

This task list outlines the steps required to transition the **Website Master Platform** from local development to a live VPS environment.

- `[ ]` **1. VPS Server Provisioning & Setup**
  - `[ ]` Launch a clean Ubuntu Linux LTS VPS instance (e.g., DigitalOcean, Hetzner, AWS EC2)
  - `[ ]` Set up non-root sudo user and update firewall (UFW)
  - `[ ]` Install system dependencies:
    - Node.js (v18 or v20 LTS) & npm
    - PostgreSQL database server
    - PM2 (for Next.js process management)
    - Nginx (for reverse proxy and SSL routing)

- `[ ]` **2. Database Setup & Remote Migration**
  - `[ ]` Configure PostgreSQL to listen to secure local connections
  - `[ ]` Create database `website_master` and configure credentials matching `.env`
  - `[ ]` Run Prisma migrations remotely:
    ```bash
    npx prisma migrate deploy
    npx prisma db seed
    ```

- `[ ]` **3. Code Deployment & Process Management**
  - `[ ]` Clone the repository from GitHub:
    ```bash
    git clone https://github.com/YOUR_USERNAME/WEBSITE-MASTER-PLATFORM.git
    ```
  - `[ ]` Install dependencies on the server (`npm ci --production`)
  - `[ ]` Set up the production `.env` file with secure secrets and DATABASE_URL
  - `[ ]` Configure `NEXT_PUBLIC_BASE_DOMAIN="store.dagangos.com"` in `.env` (Matches your live platform domain)
  - `[ ]` Build the Next.js application:
    ```bash
    npm run build
    ```
  - `[ ]` Start the application with PM2 (it will run on port 4000 automatically via the npm scripts):
    ```bash
    pm2 start npm --name "website-master-store" -- run start
    pm2 save
    pm2 startup
    ```

- `[ ]` **4. Nginx Reverse Proxy & Multi-Tenant Routing**
  - `[ ]` Configure Nginx server block to proxy port `3000` (Next.js server)
  - `[ ]` Enable wildcard subdomain routing (`*.yourdomain.com`) in Nginx configuration to support dynamic multi-tenancy
  - `[ ]` Install Certbot and generate Let's Encrypt SSL certificates:
    ```bash
    sudo certbot --nginx -d yourdomain.com -d *.yourdomain.com
    ```

- `[ ]` **5. Production Sanity Check**
  - `[ ]` Verify homepage renders in both English (`/en`) and Indonesian (`/id`)
  - `[ ]` Run e2e/smoke tests against the VPS IP/domain to ensure tenant onboarding is fully operational
