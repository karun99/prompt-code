# syntax=docker/dockerfile:1
# PromptPro Arena API + static frontend.
#
# SUPABASE_URL / SUPABASE_SERVICE_KEY are optional. Without them the app uses
# the JSON files baked into the image, which is enough for a demo deployment.

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3001

COPY prompt-code/package.json prompt-code/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY prompt-code/ ./

RUN addgroup -S app && adduser -S app -G app \
    && mkdir -p /app/db \
    && chown -R app:app /app
USER app

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
