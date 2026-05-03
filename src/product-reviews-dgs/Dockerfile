# Copyright The OpenTelemetry Authors
# SPDX-License-Identifier: Apache-2.0

FROM docker.io/library/node:22-slim AS builder

WORKDIR /usr/src/app/

COPY ./src/product-reviews-dgs/package.json package.json
COPY ./src/product-reviews-dgs/package-lock.json package-lock.json

RUN npm ci

COPY ./src/product-reviews-dgs/tsconfig.json tsconfig.json
COPY ./src/product-reviews-dgs/src/ src/
COPY ./src/product-reviews-dgs/protos/ protos/

RUN npm run build
RUN npm prune --omit=dev

# -----------------------------------------------------------------------------

FROM gcr.io/distroless/nodejs22-debian12:nonroot

WORKDIR /usr/src/app/

COPY --from=builder /usr/src/app/node_modules/ node_modules/
COPY --from=builder /usr/src/app/dist/ dist/

EXPOSE ${PRODUCT_REVIEWS_DGS_PORT}

CMD ["dist/src/index.js"]
