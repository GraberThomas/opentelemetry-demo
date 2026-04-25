# Copyright The OpenTelemetry Authors
# SPDX-License-Identifier: Apache-2.0

FROM node:22-alpine AS build

WORKDIR /usr/src/app

COPY ./src/gateway/package.json package.json
COPY ./src/gateway/package-lock.json package-lock.json
COPY ./src/gateway/tsconfig.json tsconfig.json

RUN npm ci

COPY ./src/gateway/src ./src

RUN npm run build

# -----------------------------------------------------------------------------

FROM node:22-alpine

WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY ./src/gateway/package.json package.json
COPY ./src/gateway/package-lock.json package-lock.json

RUN npm ci --omit=dev

COPY --from=build /usr/src/app/dist ./dist

EXPOSE ${GRAPHQL_GATEWAY_PORT}

CMD ["npm", "start"]