/**
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import CartGateway from "./grpc/cart-gateway.js";

export const resolvers = {
  Query: {
    cart: async (_: unknown, args: { userId: string }) => {
      return CartGateway.getCart(args.userId);
    },
  },

  Mutation: {
    addItem: async (
      _: unknown,
      args: {
        userId: string;
        item: {
          productId: string;
          quantity: number;
        };
      }
    ) => {
      await CartGateway.addItem(args.userId, args.item);
      return CartGateway.getCart(args.userId);
    },

    emptyCart: async (_: unknown, args: { userId: string }) => {
      await CartGateway.emptyCart(args.userId);
      return true;
    },
  },
};