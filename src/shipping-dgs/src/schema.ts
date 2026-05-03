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

    type ShippingQuote {
      costUsd: Money!
    }

    type ShipOrderResult {
      trackingId: String!
    }

    input CartItemInput {
      productId: String!
      quantity: Int!
    }

    input AddressInput {
      streetAddress: String!
      city: String!
      state: String!
      country: String!
      zipCode: String!
    }

    type Query {
      getShippingQuote(
        items: [CartItemInput!]!
        address: AddressInput
      ): ShippingQuote!
    }

    type Mutation {
      shipOrder(
        items: [CartItemInput!]!
        address: AddressInput
      ): ShipOrderResult!
    }
  `,
  resolvers,
});
