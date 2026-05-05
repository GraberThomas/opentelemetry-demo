# Copyright The OpenTelemetry Authors
# SPDX-License-Identifier: Apache-2.0

FROM docker.io/library/node:22-slim AS builder

WORKDIR /usr/src/app/

COPY ./src/cart-dgs/package.json package.json
COPY ./src/cart-dgs/package-lock.json package-lock.json

RUN npm ci

COPY ./src/cart-dgs/tsconfig.json tsconfig.json
COPY ./src/cart-dgs/src/ src/
COPY ./src/cart-dgs/protos/ protos/

RUN npm run build
RUN npm prune --omit=dev

# -----------------------------------------------------------------------------

FROM gcr.io/distroless/nodejs22-debian12:nonroot

WORKDIR /usr/src/app/

COPY --from=builder /usr/src/app/node_modules/ node_modules/
COPY --from=builder /usr/src/app/dist/ dist/

EXPOSE ${CART_DGS_PORT}

CMD ["--import", "./dist/src/instrumentation.js", "dist/src/index.js"]
