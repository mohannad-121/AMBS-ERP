FROM node:24-bookworm-slim
WORKDIR /work
RUN npm install --no-save playwright@1.65.1 && npx playwright install --with-deps chromium
ENTRYPOINT ["node"]
