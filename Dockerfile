FROM node:12-alpine AS builder
WORKDIR /action
COPY package*.json ./
RUN npm ci
COPY tsconfig*.json ./
COPY src/ src/
RUN npm run build \
  && npm prune --production

FROM node:12-alpine
RUN apk add --no-cache tini
COPY --from=builder action/package.json .
COPY --from=builder action/lib lib/
COPY --from=builder action/node_modules node_modules/
ENTRYPOINT [ "/sbin/tini", "--", "node", "/lib/main.js" ]