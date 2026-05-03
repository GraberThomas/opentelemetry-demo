/**
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ApolloGateway, IntrospectAndCompose } from "@apollo/gateway";
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { ApolloServerPluginLandingPageLocalDefault } from "@apollo/server/plugin/landingPage/default";
import { getRequiredEnv, getRequiredNumberEnv } from "./util.js";

const port = getRequiredNumberEnv("GRAPHQL_GATEWAY_PORT");

const currencyDgsUrl = getRequiredEnv("CURRENCY_DGS_ADDR");
const cartDgsUrl = getRequiredEnv("CART_DGS_ADDR");
const adDgsUrl = getRequiredEnv("AD_DGS_ADDR");
const shippingDgsUrl = getRequiredEnv("SHIPPING_DGS_ADDR");
const recommendationDgsUrl = getRequiredEnv("RECOMMENDATION_DGS_ADDR");
const productCatalogDgsUrl = getRequiredEnv("PRODUCT_CATALOG_DGS_ADDR");
const productReviewsDgsUrl = getRequiredEnv("PRODUCT_REVIEWS_DGS_ADDR");

const enableUi = process.env.GRAPHQL_ENABLE_UI === "true";
const enableIntrospection =
  process.env.GRAPHQL_ENABLE_INTROSPECTION === "true";

if (enableUi && !enableIntrospection) {
  console.warn("UI enabled but introspection disabled → UI may not work properly");
}

async function main() {
  const gateway = new ApolloGateway({
    supergraphSdl: new IntrospectAndCompose({
      subgraphs: [
        {
          name: "currency",
          url: currencyDgsUrl,
        },
        {
          name: "cart",
          url: cartDgsUrl
        },
        {
          name: "ad",
          url: adDgsUrl
        },
        {
          name: "shipping",
          url: shippingDgsUrl
        },
        {
          name: "recommendation",
          url: recommendationDgsUrl
        },
        {
          name: "productCatalog",
          url: productCatalogDgsUrl
        },
        {
          name: "productReviews",
          url: productReviewsDgsUrl
        }
      ],
    }),
  });

  const server = new ApolloServer({
    gateway,
    introspection: enableIntrospection,
    plugins: enableUi
      ? [ApolloServerPluginLandingPageLocalDefault()]
      : [],
  });

  const { url } = await startStandaloneServer(server, {
    listen: {
      port,
    },
  });

  console.log(`Gateway listening at ${url}`);
}

main().catch((error) => {
  console.error("Failed to start GraphQL Gateway", error);
  process.exit(1);
});