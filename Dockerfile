# ==========================================
# Stage 1: Build Frontend (Client)
# ==========================================
FROM node:22-bookworm-slim AS client-builder
WORKDIR /app/client

COPY client/package.json ./
RUN npm install

COPY client/ ./
RUN npm run build

# ==========================================
# Stage 2: Build Backend (Server)
# ==========================================
FROM node:22-bookworm-slim AS server-builder
WORKDIR /app/server

COPY server/package.json ./
RUN npm install

COPY server/ ./
RUN npm run build

# ==========================================
# Stage 3: Production Runtime
# ==========================================
FROM node:22-bookworm-slim AS runner

# Install system dependencies for Chromium (Headless Screenshot Engine)
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    fonts-noto-color-emoji \
    fonts-roboto \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PORT=8267 \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Copy server package and install production dependencies only
COPY server/package.json ./server/
RUN cd server && npm install --omit=dev

# Copy compiled backend
COPY --from=server-builder /app/server/dist ./server/dist

# Copy compiled frontend static assets
COPY --from=client-builder /app/client/dist ./client/dist

# Set user permissions for security
RUN chown -R node:node /app
USER node

EXPOSE 8267

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8267/health || exit 1

WORKDIR /app/server
CMD ["node", "dist/index.js"]
