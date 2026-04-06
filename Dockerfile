# ─────────────────────────────────────────────────────────────
# Stage 1: Build shared types
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS shared-builder
WORKDIR /app

COPY package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/shared/tsconfig.json packages/shared/
COPY packages/shared/src/ packages/shared/src/
COPY tsconfig.json ./

RUN npm install --workspace=packages/shared
RUN npm run build -w packages/shared

# ─────────────────────────────────────────────────────────────
# Stage 2: Build React frontend
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS client-builder
WORKDIR /app

COPY package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/client/package.json packages/client/
COPY tsconfig.json ./

# Copy built shared dist
COPY --from=shared-builder /app/packages/shared/dist packages/shared/dist

RUN npm install --workspace=packages/client

COPY packages/client/ packages/client/

RUN npm run build -w packages/client

# ─────────────────────────────────────────────────────────────
# Stage 3: Build Node.js backend
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS server-builder
WORKDIR /app

COPY package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY tsconfig.json ./

COPY --from=shared-builder /app/packages/shared/dist packages/shared/dist

RUN npm install --workspace=packages/server

COPY packages/server/ packages/server/

RUN npm run build -w packages/server

# ─────────────────────────────────────────────────────────────
# Stage 4: Production image
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Only production dependencies
COPY package.json ./
COPY packages/server/package.json packages/server/
COPY packages/shared/package.json packages/shared/

COPY --from=shared-builder /app/packages/shared/dist packages/shared/dist
COPY --from=server-builder /app/packages/server/dist packages/server/dist
COPY --from=client-builder /app/packages/client/dist packages/client/dist

RUN npm install --workspace=packages/server --omit=dev

EXPOSE 8080

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

CMD ["node", "packages/server/dist/index.js"]
