FROM node:24-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
FROM base AS dependencies
COPY package.json package-lock.json ./
RUN npm ci
FROM base AS builder
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
# Next.js substitutes NEXT_PUBLIC_* into browser code as literals at BUILD time.
# .dockerignore excludes .env.*, so without these args the builder has no values
# and every NEXT_PUBLIC_* is baked as `undefined` — getPublicEnv() then throws
# z.url() in the browser and admin sign-in fails. The compose `env_file` only
# reaches runtime, which fixes server code but cannot patch an already-built
# bundle. Only public values are passed here; SUPABASE_SERVICE_ROLE_KEY is
# deliberately absent so it can never reach a browser bundle.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
RUN npm run build
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 NODE_USE_SYSTEM_CA=1 PORT=3000 HOSTNAME=0.0.0.0
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
