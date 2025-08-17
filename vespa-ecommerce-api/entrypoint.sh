# Security: Use specific version
FROM node:22.12.0-alpine AS builder

# Security: Update packages
RUN apk update && apk upgrade

WORKDIR /app

# Logging: Set build-time environment
ENV NODE_ENV=production
ENV NPM_CONFIG_AUDIT_LEVEL=moderate

COPY package*.json ./

# Security: Run audit and install dependencies
# We need devDependencies here for Prisma build steps
RUN npm ci --only=production=false && \
    npm audit --audit-level moderate

COPY . .
RUN npm run build && \
    npm ci --only=production && \
    npm cache clean --force

# --- Production stage ---
FROM node:22.12.0-alpine AS production

# Security: Install security tools and update
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init curl && \
    rm -rf /var/cache/apk/*

# Resource: Set memory limits and performance
ENV NODE_OPTIONS="--max-old-space-size=512"
ENV NODE_ENV=production

# Logging: Configure structured logging
ENV LOG_LEVEL="info"
ENV LOG_FORMAT="json"

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

WORKDIR /app

# Security: Set proper ownership and permissions
# Hanya copy file yang dibutuhkan untuk runtime
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./

# === PERUBAHAN DIMULAI DI SINI ===

# 1. Salin script entrypoint dan berikan izin eksekusi
COPY --chown=nestjs:nodejs ./entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# 2. Hapus `prisma generate` dari sini dan pindahkan ke entrypoint.sh
RUN chmod -R 750 /app && \
    rm -rf /tmp/* /root/.npm

USER nestjs

EXPOSE 4000
ENV PORT=4000

# Resource & Monitoring: Enhanced health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:4000/health || exit 1

# Security: Add metadata labels
LABEL maintainer="fatidaprilian" \
    security.scan="enabled" \
    version="1.0" \
    description="Vespa E-commerce API"

# 3. Tetapkan entrypoint ke script yang baru dibuat
ENTRYPOINT ["./entrypoint.sh"]

# 4. CMD sekarang menjadi perintah yang akan dieksekusi OLEH entrypoint.sh
CMD ["dumb-init", "--", "node", "dist/main"]