FROM node:20-alpine AS build

WORKDIR /app/contrafactico-mcp-server

COPY contrafactico-mcp-server/package.json contrafactico-mcp-server/package-lock.json ./
RUN npm ci

COPY contrafactico-mcp-server/tsconfig.json ./
COPY contrafactico-mcp-server/src ./src
RUN npm run build

FROM node:20-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app/contrafactico-mcp-server

COPY contrafactico-mcp-server/package.json contrafactico-mcp-server/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/contrafactico-mcp-server/dist ./dist
COPY --chown=node:node corpus /app/corpus

EXPOSE 3000
USER node

CMD ["node", "dist/index.js"]
