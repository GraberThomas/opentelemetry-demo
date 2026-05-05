/**
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChannelCredentials, Metadata } from "@grpc/grpc-js";
import { context, propagation, SpanStatusCode, trace } from "@opentelemetry/api";
import {
  CurrencyServiceClient,
  GetSupportedCurrenciesResponse,
  Money,
} from "../../protos/demo.js";
import { getRequiredEnv } from "../util.js";

const CURRENCY_ADDR = getRequiredEnv("CURRENCY_ADDR");

const client = new CurrencyServiceClient(
  CURRENCY_ADDR,
  ChannelCredentials.createInsecure()
);

const tracer = trace.getTracer("currency-dgs");

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
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });

      throw error;
    } finally {
      span.end();
    }
  });
}

const CurrencyGateway = () => ({
  convert(from: Money, toCode: string) {
    return tracedCall(
      "currency-dgs.convert",
      {
        "rpc.system": "grpc",
        "rpc.service": "oteldemo.CurrencyService",
        "rpc.method": "Convert",
        "server.address": CURRENCY_ADDR,
        "app.currency.conversion.from": from.currencyCode,
        "app.currency.conversion.to": toCode,
      },
      () =>
        new Promise<Money>((resolve, reject) =>
          client.convert({ from, toCode }, createTraceMetadata(), (error, response) =>
            error ? reject(error) : resolve(response)
          )
        )
    );
  },

  getSupportedCurrencies() {
    return tracedCall(
      "currency-dgs.getSupportedCurrencies",
      {
        "rpc.system": "grpc",
        "rpc.service": "oteldemo.CurrencyService",
        "rpc.method": "GetSupportedCurrencies",
        "server.address": CURRENCY_ADDR,
      },
      () =>
        new Promise<GetSupportedCurrenciesResponse>((resolve, reject) =>
          client.getSupportedCurrencies({}, createTraceMetadata(), (error, response) =>
            error ? reject(error) : resolve(response)
          )
        )
    );
  },
});

export default CurrencyGateway();