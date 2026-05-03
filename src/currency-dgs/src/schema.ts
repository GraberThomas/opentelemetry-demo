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
      @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@shareable"])

    type Money @shareable {
      currencyCode: String!
      units: Int!
      nanos: Int!
    }

    input MoneyInput {
      currencyCode: String!
      units: Int!
      nanos: Int!
    }

    type Query {
      supportedCurrencies: [String!]!
      convertCurrency(from: MoneyInput!, toCode: String!): Money!
    }
  `,
  resolvers,
});