FROM oven/bun:1.1.16-alpine as base
RUN apk add bash
WORKDIR /app

FROM base AS install
RUN mkdir -p /tmp/{develop,prod}

COPY package.json bun.lockb /tmp/develop/
RUN cd /tmp/develop && \
    bun install --frozen-lockfile

COPY package.json bun.lockb /tmp/prod/
RUN cd /tmp/prod && \
    bun install --frozen-lockfile --production

FROM base AS pre
COPY --from=install /tmp/develop/node_modules node_modules
COPY . .

FROM base AS dist
COPY --from=install /tmp/prod/node_modules node_modules
COPY --from=pre /app/package.json /app/src ./

USER bun
ENTRYPOINT [ "bun", "run", "index.ts" ]
