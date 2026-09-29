FROM node:22.14.0-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/content/package.json ./packages/content/package.json
RUN npm ci --omit=dev
COPY apps/web ./apps/web
RUN mkdir -p apps/web/public/vendor \
  && cp node_modules/pixi.js/dist/pixi.mjs apps/web/public/vendor/pixi.mjs \
  && rm -rf node_modules
USER node
EXPOSE 4173
CMD ["node", "apps/web/server.mjs"]
