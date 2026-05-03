/**
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { buildSubgraphSchema } from "@apollo/subgraph";
import { gql } from "graphql-tag";
import { resolvers } from "./resolvers.js";

export const schema = buildSubgraphSchema({
  typeDefs: gql`
    extend schema
      @link(
        url: "https://specs.apollo.dev/federation/v2.3"
        import: ["@key", "@shareable"]
      )

    type Money @shareable {
      currencyCode: String!
      units: Int!
      nanos: Int!
    }

    type Product @key(fields: "id") {
      id: ID!
      name: String!
      description: String!
      picture: String!
      priceUsd: Money!
      categories: [String!]!
    }

    type Query {
      products: [Product!]!
      product(id: ID!): Product
      searchProducts(query: String!): [Product!]!
    }
  `,
  resolvers,
});
