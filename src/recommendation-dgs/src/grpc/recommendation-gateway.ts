/**
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChannelCredentials, Metadata } from "@grpc/grpc-js";
import { context, propagation, SpanStatusCode, trace } from "@opentelemetry/api";
import {
  RecommendationServiceClient,
  type ListRecommendationsResponse,
} from "../../protos/demo.js";
import { getRequiredEnv } from "../util.js";

const RECOMMENDATION_ADDR = getRequiredEnv("RECOMMENDATION_ADDR");

const client = new RecommendationServiceClient(
  RECOMMENDATION_ADDR,
  ChannelCredentials.createInsecure()
);

const tracer = trace.getTracer("recommendation-dgs");

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

const RecommendationGateway = () => ({
  listRecommendations(userId: string, productIds: string[]) {
    return tracedCall(
      "recommendation-dgs.listRecommendations",
      {
        "rpc.system": "grpc",
        "rpc.service": "oteldemo.RecommendationService",
        "rpc.method": "ListRecommendations",
        "server.address": RECOMMENDATION_ADDR,
        "app.user.id": userId,
        "app.product.ids.count": productIds.length,
      },
      () =>
        new Promise<ListRecommendationsResponse>((resolve, reject) =>
          client.listRecommendations(
            {
              userId,
              productIds,
            },
            createTraceMetadata(),
            (error, response) => (error ? reject(error) : resolve(response))
          )
        )
    );
  },
});

export default RecommendationGateway();
