/**
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChannelCredentials, Metadata } from "@grpc/grpc-js";
import { context, propagation, SpanStatusCode, trace } from "@opentelemetry/api";
import { Cart, CartItem, CartServiceClient } from "../../protos/demo.js";
import { getRequiredEnv } from "../util.js";

const CART_ADDR = getRequiredEnv("CART_ADDR");

const client = new CartServiceClient(
  CART_ADDR,
  ChannelCredentials.createInsecure()
);

const tracer = trace.getTracer("cart-dgs");

function createTraceMetadata() {
  const metadata = new Metadata();

  propagation.inject(context.active(), metadata, {
    set: (carrier, key, value) => {
      carrier.set(key, value);
    },
  });

  return metadata;
}

async function tracedCall<T>(
  spanName: string,
  attributes: Record<string, string | number | boolean>,
  fn: () => Promise<T>
): Promise<T> {
  return tracer.startActiveSpan(spanName, async (span) => {
    span.setAttributes(attributes);

    try {
      const response = await fn();

      span.setStatus({ code: SpanStatusCode.OK });
      return response;
    } catch (error) {
      const exception =
        error instanceof Error ? error : new Error(String(error));

      span.recordException(exception);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: exception.message,
      });

      throw error;
    } finally {
      span.end();
    }
  });
}

const CartGateway = () => ({
  addItem(userId: string, item: CartItem) {
    return tracedCall(
      "cart-dgs.addItem",
      {
        "rpc.system": "grpc",
        "rpc.service": "oteldemo.CartService",
        "rpc.method": "AddItem",
        "server.address": CART_ADDR,
        "app.user.id": userId,
        "app.product.id": item.productId,
        "app.product.quantity": item.quantity,
      },
      () =>
        new Promise<void>((resolve, reject) =>
          client.addItem({ userId, item }, createTraceMetadata(), (error) =>
            error ? reject(error) : resolve()
          )
        )
    );
  },

  getCart(userId: string) {
    return tracedCall(
      "cart-dgs.getCart",
      {
        "rpc.system": "grpc",
        "rpc.service": "oteldemo.CartService",
        "rpc.method": "GetCart",
        "server.address": CART_ADDR,
        "app.user.id": userId,
      },
      () =>
        new Promise<Cart>((resolve, reject) =>
          client.getCart({ userId }, createTraceMetadata(), (error, response) =>
            error ? reject(error) : resolve(response)
          )
        )
    );
  },

  emptyCart(userId: string) {
    return tracedCall(
      "cart-dgs.emptyCart",
      {
        "rpc.system": "grpc",
        "rpc.service": "oteldemo.CartService",
        "rpc.method": "EmptyCart",
        "server.address": CART_ADDR,
        "app.user.id": userId,
      },
      () =>
        new Promise<void>((resolve, reject) =>
          client.emptyCart({ userId }, createTraceMetadata(), (error) =>
            error ? reject(error) : resolve()
          )
        )
    );
  },
});

export default CartGateway();