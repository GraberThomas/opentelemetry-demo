/**
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import ProductReviewsGateway from "./grpc/product-reviews-gateway.js";

type ProductReference = {
  id: string;
};

export const resolvers = {
  Product: {
    reviews: async (product: ProductReference) => {
      const response = await ProductReviewsGateway.getProductReviews(product.id);
      return response.productReviews;
    },

    averageReviewScore: async (product: ProductReference) => {
      const response =
        await ProductReviewsGateway.getAverageProductReviewScore(product.id);

      return response.averageScore;
    },

    aiReviewSummary: async (
      product: ProductReference,
      args: { question: string }
    ) => {
      const response = await ProductReviewsGateway.askProductAiAssistant(
        product.id,
        args.question
      );

      return response.response;
    },
  },
};
