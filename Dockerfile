FROM oven/bun:1.1.20-alpine as base
WORKDIR /app

FROM base AS build
COPY . .
RUN bun install --frozen-lockfile
RUN bun build src/index.ts --target bun --minify --sourcemap=linked --outdir ./dist
RUN ls -al ./dist && du -h ./dist

FROM base AS dist
COPY --from=build /app/dist ./

ADD https://github.com/krallin/tini/releases/download/v0.19.0/tini /tini
RUN chmod +x /tini
ENTRYPOINT ["/tini", "--"]

USER bun
CMD [ "bun", "run", "/app" ]
