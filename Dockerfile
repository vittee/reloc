FROM oven/bun:1.1.20-alpine as base
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

ADD https://github.com/krallin/tini/releases/download/v0.19.0/tini /tini
RUN chmod +x /tini
ENTRYPOINT ["/tini", "--"]

USER bun
CMD [ "bun", "run", "index.ts" ]
