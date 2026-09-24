# The scores API: plain Node (TypeScript run by type stripping, SQLite built in), no npm
# dependencies. Build from the repository root: it needs shared/ too.
FROM node:24-alpine
WORKDIR /app
COPY package.json ./
COPY shared ./shared
COPY server ./server
# Created here so the named volume mounted on /data starts out owned by node.
RUN mkdir /data && chown node:node /data
USER node
ENV PORT=3000 DB_PATH=/data/shelter.db
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server/main.ts"]
