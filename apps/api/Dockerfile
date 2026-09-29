FROM node:22.14.0-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY package.json ./package.json
COPY packages ./packages
COPY apps/api ./apps/api
# The optional prototype state adapter runs as the unprivileged node user.
RUN mkdir -p /data && chown -R node:node /data
USER node
EXPOSE 3000
CMD ["node", "apps/api/src/server.mjs"]
