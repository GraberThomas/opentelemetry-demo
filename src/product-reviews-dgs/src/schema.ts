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
        import: ["@key", "@external"]
      )

    type ProductReview {
      username: String!
      description: String!
      score: String!
    }

    extend type Product @key(fields: "id") {
      id: ID! @external
      reviews: [ProductReview!]!
      averageReviewScore: String!
      aiReviewSummary(question: String!): String
    }
  `,
  resolvers,
});
