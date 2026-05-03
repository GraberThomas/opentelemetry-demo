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

    type Product @key(fields: "id", resolvable: false) {
      id: ID!
    }

    type Money @shareable {
      currencyCode: String!
      units: Int!
      nanos: Int!
    }

    type Address {
      streetAddress: String!
      city: String!
      state: String!
      country: String!
      zipCode: String!
    }

    input AddressInput {
      streetAddress: String!
      city: String!
      state: String!
      country: String!
      zipCode: String!
    }

    input CreditCardInfoInput {
      creditCardNumber: String!
      creditCardCvv: Int!
      creditCardExpirationYear: Int!
      creditCardExpirationMonth: Int!
    }

    input PlaceOrderInput {
      userId: ID!
      userCurrency: String!
      address: AddressInput!
      email: String!
      creditCard: CreditCardInfoInput!
    }

    type OrderItem {
      productId: ID!
      quantity: Int!
      product: Product!
      cost: Money!
    }

    type OrderResult {
      orderId: ID!
      shippingTrackingId: String!
      shippingCost: Money!
      shippingAddress: Address!
      items: [OrderItem!]!
    }

    type Mutation {
      placeOrder(input: PlaceOrderInput!): OrderResult!
    }
  `,
  resolvers,
});