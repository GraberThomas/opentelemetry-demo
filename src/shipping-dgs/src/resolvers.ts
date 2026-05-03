/**
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import ShippingGateway from "./http/shipping-gateway.js";

export const resolvers = {
  Query: {
    shippingQuote: async (
      _: unknown,
      args: {
        items: {
          productId: string;
          quantity: number;
        }[];
        address?: {
          streetAddress: string;
          city: string;
          state: string;
          country: string;
          zipCode: string;
        };
      }
    ) => {
      return ShippingGateway.getQuote(args);
    },
  },

  Mutation: {
    shipOrder: async (
      _: unknown,
      args: {
        items: {
          productId: string;
          quantity: number;
        }[];
        address?: {
          streetAddress: string;
          city: string;
          state: string;
          country: string;
          zipCode: string;
        };
      }
    ) => {
      return ShippingGateway.shipOrder(args);
    },
  },
};
