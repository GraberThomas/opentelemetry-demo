/**
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { createServer } from "node:http";
import { createYoga } from "graphql-yoga";
import { schema } from "./schema.js";
import { getRequiredEnv } from "./util.js";

const port = Number(getRequiredEnv("PRODUCT_REVIEWS_DGS_PORT"));
const enableUi = process.env.GRAPHQL_ENABLE_UI === "true";

const yoga = createYoga({
  schema,
  graphqlEndpoint: "/graphql",
  graphiql: enableUi,
});

const server = createServer(yoga);

server.listen(port, "0.0.0.0", () => {
  console.log(
    `product-reviews-dgs listening on http://0.0.0.0:${port}/graphql`
  );
});
