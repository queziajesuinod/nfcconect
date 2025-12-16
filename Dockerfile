# ========= BUILDER =========
FROM node:20 AS builder
WORKDIR /app

RUN npm install -g pnpm
RUN git clone --depth 1 https://github.com/queziajesuinod/nfcconect.git .

RUN pnpm install --frozen-lockfile
RUN pnpm build


# ========= RUNNER =========
FROM node:20 AS runner
WORKDIR /app

RUN npm install -g pnpm

# manifests
COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./

# ✅ necessário por causa do patch no lockfile
COPY --from=builder /app/patches ./patches

# instala só produção
RUN pnpm install --frozen-lockfile --prod

# artefatos do build
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
EXPOSE 3008
CMD ["pnpm", "start"]
