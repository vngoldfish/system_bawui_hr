# Production Deployment Guide - Bawuiweb HR Management System

This guide outlines the production deployment architectures, configurations, and best practices for the Bawuiweb Human Resources Management System.

---

## 1. Environment Configuration

In production, you must set secure variables. Create a `.env.production` file at the root:

```ini
# Database (PostgreSQL)
# Use a production-ready database instance. Clean credentials and pooling parameters are mandatory.
DATABASE_URL="postgresql://postgres:production_password@db_host:5432/hr_db?schema=public&connection_limit=20&pool_timeout=30"

# Next.js Server
PORT=3000
NODE_ENV=production
NEXTAUTH_SECRET="use-a-strong-random-64-character-string"
NEXT_PUBLIC_API_URL="https://yourdomain.com"
```

> [!IMPORTANT]
> - Avoid exposing default passwords in production.
> - Configure `connection_limit=20` to prevent exhausting database connections when scaling the Next.js server across multiple cluster workers.

---

## 2. Database Migrations

Never use `prisma db push` in production as it can delete database records or bypass schema histories. Always run migrations:

```bash
# Apply Prisma migrations to the production database safely
npx prisma migrate deploy
```

---

## 3. Deployment Option A: PM2 Cluster Mode (Recommended for Bare-Metal/VPS)

PM2 allows you to run Next.js inside a cluster to maximize CPU cores and ensure zero-downtime hot reloads.

### A. Install PM2
```bash
npm install -g pm2
```

### B. Build Next.js Production Bundle
```bash
npm run build
```

### C. Configure `ecosystem.config.js`
Create a file named `ecosystem.config.js` at the root of the project:

```javascript
module.exports = {
  apps: [
    {
      name: 'bawuiweb-hr',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 'max', // Scales up to all available CPU cores
      exec_mode: 'cluster', // Enables load-balanced clustering
      watch: false,
      max_memory_restart: '1G', // Restarts worker if memory leaks exceed 1GB
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
```

### D. Start & Manage the Cluster
```bash
# Start the production cluster
pm2 start ecosystem.config.js

# Save process list to restore automatically on server reboot
pm2 save
pm2 startup

# Reload the system with ZERO-DOWNTIME (hot reload)
pm2 reload bawuiweb-hr

# View live cluster status and resource usage
pm2 list
pm2 monit
```

---

## 4. Deployment Option B: Docker Containerization (Recommended for Cloud/K8s)

A multi-stage, highly optimized `Dockerfile` that packages the application, runs database migrations, and exposes the app server securely.

### A. Multi-Stage `Dockerfile`
Create a `Dockerfile` at the root directory:

```dockerfile
# --- Stage 1: Dependency Builder ---
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# --- Stage 2: Application Builder ---
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production
RUN npm run build

# --- Stage 3: Production Runner ---
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy essential files only
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs

EXPOSE 3000

# Script to run database migrations and start server
CMD ["sh", "-c", "npx prisma migrate deploy && node_modules/next/dist/bin/next start"]
```

### B. Compose Layout (`docker-compose.yml`)
For local production tests or single-host VM deployment:

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:prod_pass@db:5432/hr_db?schema=public
      - NEXTAUTH_SECRET=some_jwt_production_secret_key_string
    depends_on:
      db:
        condition: service_healthy
    restart: always

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=prod_pass
      - POSTGRES_DB=hr_db
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d hr_db"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: always

volumes:
  pgdata:
```

Launch the cluster stack:
```bash
docker-compose up --build -d
```

---

## 5. Nginx Reverse Proxy & SSL Setup

Nginx should act as the entrypoint reverse-proxy to handle SSL termination, rate-limiting, and compression.

Create a server config in `/etc/nginx/sites-available/yourdomain.com`:

```nginx
# Rate Limiting: 10 requests per second limit per IP
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect all HTTP requests to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Certs (Managed by Let's Encrypt Certbot)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305';

    # Enable Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_min_length 1000;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    location / {
        proxy_pass http://localhost:3000; # Forward requests to PM2 node instance
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Apply Rate Limiting specifically to API endpoints
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}
```

Enable the site and reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/yourdomain.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 6. Log Monitoring & Backups

### Live Logs
To monitor live requests and errors:
```bash
# View Next.js/PM2 logs in real time
pm2 logs bawuiweb-hr --lines 100

# View nginx access/error logs
tail -f /var/log/nginx/error.log
```

### Automated Database Backups
Create a cron job to backup the Postgres database daily. Add this to `/etc/cron.daily/db-backup`:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/postgres"
DB_NAME="hr_db"
DATE=$(date +%Y-%m-%d)
mkdir -p "$BACKUP_DIR"
pg_dump -U postgres "$DB_NAME" | gzip > "$BACKUP_DIR/$DB_NAME-$DATE.sql.gz"
# Keep backups for 30 days
find "$BACKUP_DIR" -type f -mtime +30 -name "*.sql.gz" -delete
```
Make it executable:
```bash
chmod +x /etc/cron.daily/db-backup
```
