/**
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChannelCredentials } from "@grpc/grpc-js";
import {
  ProductReviewServiceClient,
  type GetProductReviewsResponse,
  type GetAverageProductReviewScoreResponse,
  type AskProductAIAssistantResponse,
} from "../../protos/demo.js";
import { getRequiredEnv } from "../util.js";

const PRODUCT_REVIEWS_ADDR = getRequiredEnv("PRODUCT_REVIEWS_ADDR");

const client = new ProductReviewServiceClient(
  PRODUCT_REVIEWS_ADDR,
  ChannelCredentials.createInsecure()
);

const ProductReviewsGateway = () => ({
  getProductReviews(productId: string) {
    return new Promise<GetProductReviewsResponse>((resolve, reject) =>
      client.getProductReviews({ productId }, (error, response) =>
        error ? reject(error) : resolve(response)
      )
    );
  },

  getAverageProductReviewScore(productId: string) {
    return new Promise<GetAverageProductReviewScoreResponse>((resolve, reject) =>
      client.getAverageProductReviewScore({ productId }, (error, response) =>
        error ? reject(error) : resolve(response)
      )
    );
  },

  askProductAiAssistant(productId: string, question: string) {
    return new Promise<AskProductAIAssistantResponse>((resolve, reject) =>
      client.askProductAiAssistant(
        { productId, question },
        (error, response) => (error ? reject(error) : resolve(response))
      )
    );
  },
});

export default ProductReviewsGateway();
