# syntax=docker/dockerfile:1
#
# Two stages so the build toolchain doesn't ship in the runtime image. Native deps
# that need a compiler here: @hiveio/dhive pulls secp256k1 ^3.8.0, which is old
# enough that prebuilds for Node 20 are unlikely, and `irc` has optional native
# deps it tries to build.
FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential python3 ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
# NOT --omit=dev: `npm start` is `tsx lit-bot.js` (lib/nostr-bot.ts is TypeScript)
# and tsx is a devDependency, so it is required at runtime.
RUN npm ci

FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
# rss-state.json lives here, bind-mounted from /opt/bots/lit-data. It is the only
# real application state in the stack: lose it and the bot reposts every live
# notification it has ever seen.
ENV STATE_DIR=/data
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p /data && chown node:node /data
VOLUME ["/data"]
# Drop root. node:20 ships a `node` user at uid 1000, matching the uid the rest of
# this box's containers run as.
USER node
EXPOSE 3334
CMD ["npx", "tsx", "lit-bot.js"]
