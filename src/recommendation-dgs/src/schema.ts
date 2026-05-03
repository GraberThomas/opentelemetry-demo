/**
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { buildSubgraphSchema } from "@apollo/subgraph";
import { gql } from "graphql-tag";
import { resolvers } from "./resolvers.js";

export const schema = buildSubgraphSchema({
  typeDefs: gql`
    type Query {
      recommendations(userId: ID!, productIds: [ID!]!): [ID!]!
    }
  `,
  resolvers,
});
