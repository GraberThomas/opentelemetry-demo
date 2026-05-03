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
        import: ["@key"]
      )

    type Product @key(fields: "id", resolvable: false) {
      id: ID!
    }

    type Query {
      recommendations(userId: ID!, productIds: [ID!]!): [Product!]!
    }
  `,
  resolvers,
});