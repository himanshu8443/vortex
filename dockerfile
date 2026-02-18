# -----------------------------------------------------------------------------
# 1. Base Image
# -----------------------------------------------------------------------------
FROM node:22-alpine AS base

# -----------------------------------------------------------------------------
# 2. Dependencies
# -----------------------------------------------------------------------------
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# -----------------------------------------------------------------------------
# 3. Builder
# -----------------------------------------------------------------------------
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Push schema to create template database (devDependencies available here)
ENV DATABASE_URL="file:./template.db.sqlite"
RUN npx drizzle-kit push --force

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=1
RUN npm run build

# -----------------------------------------------------------------------------
# 4. Production Runner
# -----------------------------------------------------------------------------
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    git \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://download.docker.com/linux/static/stable/x86_64/docker-25.0.3.tgz \
    | tar xz -C /usr/local/bin --strip-components=1 docker/docker

# INSTALL RAILPACK
ARG RAILPACK_VERSION=v0.17.2
RUN set -eux; \
        arch="$(uname -m)"; \
        case "$arch" in \
            x86_64) target="x86_64-unknown-linux-musl" ;; \
            aarch64|arm64) target="arm64-unknown-linux-musl" ;; \
            *) echo "Unsupported architecture: $arch"; exit 1 ;; \
        esac; \
        curl -fsSL "https://github.com/railwayapp/railpack/releases/download/${RAILPACK_VERSION}/railpack-${RAILPACK_VERSION}-${target}.tar.gz" \
            | tar -xz -C /usr/local/bin railpack; \
        chmod +x /usr/local/bin/railpack; \
        railpack --version

# Copy only what's needed
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/template.db.sqlite ./template.db.sqlite

# Copy entrypoint
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Ensure DB directory exists
RUN mkdir -p /app/data

EXPOSE 3000
ENV PORT=3000
ENV DATABASE_URL="file:/app/data/db.sqlite"

ENTRYPOINT ["./docker-entrypoint.sh"]