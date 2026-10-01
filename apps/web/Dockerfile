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
  && mkdir -p apps/web/public/app \
  && cp apps/web/index.html apps/web/public/index.html \
  && cp apps/web/sw.js apps/web/public/sw.js \
  && cp -R apps/web/src/. apps/web/public/app/ \
  && rm -rf apps/web/public/app/game/demo \
  && rm -f apps/web/public/app/renderer-demo.js apps/web/public/app/renderer-demo.css \
  && find apps/web/public/app -type f ! \( -name '*.js' -o -name '*.mjs' -o -name '*.css' \) -delete \
  && sed -i -e 's#\./public/#./#g' -e 's#\./src/#./app/#g' apps/web/public/index.html apps/web/public/sw.js \
  && find apps/web/public/app -type f \( -name '*.js' -o -name '*.mjs' -o -name '*.css' \) -exec sed -i 's#\./public/assets#./assets#g' {} + \
  && rm -rf apps/web/src apps/web/index.html apps/web/sw.js apps/web/renderer-demo.html apps/web/README.md apps/web/Dockerfile \
  && rm -rf node_modules
ENV WEB_ROOT=/app/apps/web/public
USER node
EXPOSE 4173
CMD ["node", "apps/web/server.mjs"]
