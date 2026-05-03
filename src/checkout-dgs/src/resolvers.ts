/**
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { type ServiceError } from "@grpc/grpc-js";
import { GraphQLError } from "graphql";
import CheckoutGateway from "./grpc/checkout-gateway.js";

type PlaceOrderArgs = {
  input: {
    userId: string;
    userCurrency: string;
    address: {
      streetAddress: string;
      city: string;
      state: string;
      country: string;
      zipCode: string;
    };
    email: string;
    creditCard: {
      creditCardNumber: string;
      creditCardCvv: number;
      creditCardExpirationYear: number;
      creditCardExpirationMonth: number;
    };
  };
};

type OrderItemReference = {
  productId: string;
};

function requireField<T>(value: T | null | undefined, fieldName: string): T {
  if (value === null || value === undefined) {
    throw new GraphQLError(`Checkout order response is missing ${fieldName}.`, {
      extensions: {
        code: "CHECKOUT_RESPONSE_MAPPING_FAILED",
      },
    });
  }

  return value;
}

function mapCheckoutError(error: unknown): never {
  const grpcError = error as ServiceError;
  const message = grpcError.details || grpcError.message || String(error);

  if (message.includes("Credit card info is invalid")) {
    throw new GraphQLError("Payment failed: invalid credit card information.", {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }

  if (message.includes("shipping quote failure")) {
    throw new GraphQLError(
      "Checkout failed while calculating the shipping quote. The cart may be empty or invalid.",
      {
        extensions: {
          code: "CHECKOUT_SHIPPING_QUOTE_FAILED",
          originalMessage: message,
        },
      }
    );
  }

  if (message.includes("shipping error")) {
    throw new GraphQLError("Checkout failed while shipping the order.", {
      extensions: {
        code: "CHECKOUT_SHIPPING_FAILED",
        originalMessage: message,
      },
    });
  }

  throw new GraphQLError("Checkout failed.", {
    extensions: {
      code: "CHECKOUT_FAILED",
      originalMessage: message,
    },
  });
}

function mapOrder(order: any) {
  return {
    orderId: requireField(order.orderId, "orderId"),
    shippingTrackingId: requireField(
      order.shippingTrackingId,
      "shippingTrackingId"
    ),
    shippingCost: requireField(order.shippingCost, "shippingCost"),
    shippingAddress: requireField(order.shippingAddress, "shippingAddress"),
    items: (order.items ?? []).map((orderItem: any, index: number) => {
      const item = requireField(orderItem.item, `items[${index}].item`);
      const cost = requireField(orderItem.cost, `items[${index}].cost`);

      return {
        productId: requireField(
          item.productId,
          `items[${index}].item.productId`
        ),
        quantity: requireField(
          item.quantity,
          `items[${index}].item.quantity`
        ),
        cost,
      };
    }),
  };
}

export const resolvers = {
  OrderItem: {
    product: (orderItem: OrderItemReference) => ({
      __typename: "Product",
      id: orderItem.productId,
    }),
  },

  Mutation: {
    placeOrder: async (_: unknown, args: PlaceOrderArgs) => {
      let response: Awaited<ReturnType<typeof CheckoutGateway.placeOrder>>;

      try {
        response = await CheckoutGateway.placeOrder(args.input);
      } catch (error) {
        console.error("Checkout gRPC error", error);
        mapCheckoutError(error);
      }

      if (!response.order) {
        throw new GraphQLError("Checkout service did not return an order.", {
          extensions: { code: "CHECKOUT_EMPTY_RESPONSE" },
        });
      }

      try {
        return mapOrder(response.order);
      } catch (error) {
        console.error("Failed to map checkout order response", error);
        console.error(JSON.stringify(response.order, null, 2));

        throw error;
      }
    },
  },
};