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

    type CartItem {
      productId: ID!
      quantity: Int!
      product: Product!
    }

    input CartItemInput {
      productId: ID!
      quantity: Int!
    }

    type Cart {
      userId: ID!
      items: [CartItem!]!
    }

    type Query {
      cart(userId: ID!): Cart!
    }

    type Mutation {
      addItem(userId: ID!, item: CartItemInput!): Cart!
      emptyCart(userId: ID!): Cart!
    }
  `,
  resolvers,
});