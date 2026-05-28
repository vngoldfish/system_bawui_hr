# syntax=docker/dockerfile:1

# ---------- Build stage ----------
FROM node:20-alpine AS builder
WORKDIR /app

# Install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy source files
COPY . .

# Build Next.js application
RUN npm run build

# ---------- Runtime stage ----------
FROM node:20-alpine AS runner
WORKDIR /app

# Copy production dependencies and built assets from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./

# Copy production environment variables (do NOT include dev .env)
COPY .env.production ./

# Expose the port used by the app (3001 as configured)
EXPOSE 3001

# Create a non‑root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Entrypoint runs migrations then starts the server
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
