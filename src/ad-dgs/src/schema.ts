/**
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { buildSubgraphSchema } from "@apollo/subgraph";
import { gql } from "graphql-tag";
import { resolvers } from "./resolvers.js";

export const schema = buildSubgraphSchema({
  typeDefs: gql`
    type Ad {
      text: String!
      redirectUrl: String!
    }

    type Query {
      ads(contextKeys: [String!]!): [Ad!]!
    }
  `,
  resolvers,
});