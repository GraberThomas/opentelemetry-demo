/**
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChannelCredentials, Metadata } from "@grpc/grpc-js";
import { context, propagation, SpanStatusCode, trace } from "@opentelemetry/api";
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

const tracer = trace.getTracer("checkout-dgs");

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

const CheckoutGateway = () => ({
  placeOrder(input: PlaceOrderInput) {
    return tracedCall(
      "checkout-dgs.placeOrder",
      {
        "rpc.system": "grpc",
        "rpc.service": "oteldemo.CheckoutService",
        "rpc.method": "PlaceOrder",
        "server.address": CHECKOUT_ADDR,
        "app.user.id": input.userId,
        "app.currency": input.userCurrency,
      },
      () =>
        new Promise<PlaceOrderResponse>((resolve, reject) =>
          client.placeOrder(
            {
              userId: input.userId,
              userCurrency: input.userCurrency,
              address: input.address,
              email: input.email,
              creditCard: input.creditCard,
            },
            createTraceMetadata(),
            (error, response) => (error ? reject(error) : resolve(response))
          )
        )
    );
  },
});

export default CheckoutGateway();
