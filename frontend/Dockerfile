FROM node:24-bookworm-slim
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
RUN mkdir -p /app/.next && chown node:node /app /app/.next
USER node
COPY --chown=node:node package*.json ./
COPY --chown=node:node scripts/patch-next-router.mjs ./scripts/patch-next-router.mjs
RUN npm ci --no-audit --no-fund
COPY --chown=node:node . .
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]
