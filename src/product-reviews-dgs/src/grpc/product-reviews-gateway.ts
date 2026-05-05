/**
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChannelCredentials, Metadata } from "@grpc/grpc-js";
import { context, propagation, SpanStatusCode, trace } from "@opentelemetry/api";
import {
  ProductReviewServiceClient,
  type AskProductAIAssistantResponse,
  type GetAverageProductReviewScoreResponse,
  type GetProductReviewsResponse,
} from "../../protos/demo.js";
import { getRequiredEnv } from "../util.js";

const PRODUCT_REVIEWS_ADDR = getRequiredEnv("PRODUCT_REVIEWS_ADDR");

const client = new ProductReviewServiceClient(
  PRODUCT_REVIEWS_ADDR,
  ChannelCredentials.createInsecure()
);

const tracer = trace.getTracer("product-reviews-dgs");

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

const ProductReviewsGateway = () => ({
  getProductReviews(productId: string) {
    return tracedCall(
      "product-reviews-dgs.getProductReviews",
      {
        "rpc.system": "grpc",
        "rpc.service": "oteldemo.ProductReviewService",
        "rpc.method": "GetProductReviews",
        "server.address": PRODUCT_REVIEWS_ADDR,
        "app.product.id": productId,
      },
      () =>
        new Promise<GetProductReviewsResponse>((resolve, reject) =>
          client.getProductReviews(
            { productId },
            createTraceMetadata(),
            (error, response) => (error ? reject(error) : resolve(response))
          )
        )
    );
  },

  getAverageProductReviewScore(productId: string) {
    return tracedCall(
      "product-reviews-dgs.getAverageProductReviewScore",
      {
        "rpc.system": "grpc",
        "rpc.service": "oteldemo.ProductReviewService",
        "rpc.method": "GetAverageProductReviewScore",
        "server.address": PRODUCT_REVIEWS_ADDR,
        "app.product.id": productId,
      },
      () =>
        new Promise<GetAverageProductReviewScoreResponse>((resolve, reject) =>
          client.getAverageProductReviewScore(
            { productId },
            createTraceMetadata(),
            (error, response) => (error ? reject(error) : resolve(response))
          )
        )
    );
  },

  askProductAiAssistant(productId: string, question: string) {
    return tracedCall(
      "product-reviews-dgs.askProductAiAssistant",
      {
        "rpc.system": "grpc",
        "rpc.service": "oteldemo.ProductReviewService",
        "rpc.method": "AskProductAIAssistant",
        "server.address": PRODUCT_REVIEWS_ADDR,
        "app.product.id": productId,
      },
      () =>
        new Promise<AskProductAIAssistantResponse>((resolve, reject) =>
          client.askProductAiAssistant(
            { productId, question },
            createTraceMetadata(),
            (error, response) => (error ? reject(error) : resolve(response))
          )
        )
    );
  },
});

export default ProductReviewsGateway();
