# Use official Node 18 LTS image
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies based on lock file for reproducibility
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the rest of the source code
COPY . .

# Build the Next.js production bundle
RUN npm run build

# ---------- Runtime image ----------
FROM node:18-alpine AS runner
WORKDIR /app

# Copy only the built assets and production dependencies
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Expose default Next.js port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start the app
CMD ["npm", "start"]
