/**
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChannelCredentials } from "@grpc/grpc-js";
import {
  Cart,
  CartItem,
  CartServiceClient,
} from "../../protos/demo.js";
import { getRequiredEnv } from '../util.js'

const CART_ADDR = getRequiredEnv("CART_ADDR");

const client = new CartServiceClient(
  CART_ADDR,
  ChannelCredentials.createInsecure()
);

const CartGateway = () => ({
  addItem(userId: string, item: CartItem) {
    return new Promise<void>((resolve, reject) =>
      client.addItem({ userId, item }, (error) =>
        error ? reject(error) : resolve()
      )
    );
  },

  getCart(userId: string) {
    return new Promise<Cart>((resolve, reject) =>
      client.getCart({ userId }, (error, response) =>
        error ? reject(error) : resolve(response)
      )
    );
  },

  emptyCart(userId: string) {
    return new Promise<void>((resolve, reject) =>
      client.emptyCart({ userId }, (error) =>
        error ? reject(error) : resolve()
      )
    );
  },
});

export default CartGateway();