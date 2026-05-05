/**
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChannelCredentials, Metadata } from "@grpc/grpc-js";
import { context, propagation, SpanStatusCode, trace } from "@opentelemetry/api";
import {
  AdRequest,
  AdResponse,
  AdServiceClient,
} from "../../protos/demo.js";
import { getRequiredEnv } from "../util.js";

const AD_ADDR = getRequiredEnv("AD_ADDR");

const client = new AdServiceClient(
  AD_ADDR,
  ChannelCredentials.createInsecure()
);

const tracer = trace.getTracer("ad-dgs");

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
      const exception = error instanceof Error ? error : new Error(String(error));

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

const AdGateway = () => ({
  getAds(request: AdRequest) {
    return tracedCall(
      "ad-dgs.getAds",
      {
        "rpc.system": "grpc",
        "rpc.service": "oteldemo.AdService",
        "rpc.method": "GetAds",
        "server.address": AD_ADDR,
        "app.ad.context_keys.count": request.contextKeys?.length ?? 0,
        "app.ad.context_keys": request.contextKeys?.join(",") ?? "",
      },
      () =>
        new Promise<AdResponse>((resolve, reject) =>
          client.getAds(request, createTraceMetadata(), (error, response) =>
            error ? reject(error) : resolve(response)
          )
        )
    );
  },
});

export default AdGateway();