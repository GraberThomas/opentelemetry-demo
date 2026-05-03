/**
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import CartGateway from "./grpc/cart-gateway.js";

type CartItemReference = {
  productId: string;
};

type CartResponse = Awaited<ReturnType<typeof CartGateway.getCart>>;

function mapCart(cart: CartResponse, userId: string) {
  return {
    ...cart,
    userId: cart.userId || userId,
  };
}

export const resolvers = {
  CartItem: {
    product: (cartItem: CartItemReference) => ({
      __typename: "Product",
      id: cartItem.productId,
    }),
  },

  Query: {
    cart: async (_: unknown, args: { userId: string }) => {
      const cart = await CartGateway.getCart(args.userId);
      return mapCart(cart, args.userId);
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

      const cart = await CartGateway.getCart(args.userId);
      return mapCart(cart, args.userId);
    },

    emptyCart: async (_: unknown, args: { userId: string }) => {
      await CartGateway.emptyCart(args.userId);

      const cart = await CartGateway.getCart(args.userId);
      return mapCart(cart, args.userId);
    },
  },
};