/**
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChannelCredentials } from "@grpc/grpc-js";
import {
  CheckoutServiceClient,
  type PlaceOrderResponse,
} from "../../protos/demo.js";
import { getRequiredEnv } from "../util.js";

const CHECKOUT_ADDR = getRequiredEnv("CHECKOUT_ADDR");

const client = new CheckoutServiceClient(
  CHECKOUT_ADDR,
  ChannelCredentials.createInsecure()
);

type AddressInput = {
  streetAddress: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
};

type CreditCardInfoInput = {
  creditCardNumber: string;
  creditCardCvv: number;
  creditCardExpirationYear: number;
  creditCardExpirationMonth: number;
};

type PlaceOrderInput = {
  userId: string;
  userCurrency: string;
  address: AddressInput;
  email: string;
  creditCard: CreditCardInfoInput;
};

const CheckoutGateway = () => ({
  placeOrder(input: PlaceOrderInput) {
    return new Promise<PlaceOrderResponse>((resolve, reject) =>
      client.placeOrder(
        {
          userId: input.userId,
          userCurrency: input.userCurrency,
          address: input.address,
          email: input.email,
          creditCard: input.creditCard,
        },
        (error, response) => (error ? reject(error) : resolve(response))
      )
    );
  },
});

export default CheckoutGateway();
