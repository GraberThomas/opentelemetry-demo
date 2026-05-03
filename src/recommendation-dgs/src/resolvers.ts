/**
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import RecommendationGateway from "./grpc/recommendation-gateway.js";

type RecommendationsArgs = {
  userId: string;
  productIds: string[];
};

export const resolvers = {
  Query: {
    recommendations: async (_: unknown, args: RecommendationsArgs) => {
      const response = await RecommendationGateway.listRecommendations(
        args.userId,
        args.productIds
      );

      return response.productIds.map((id) => ({
        __typename: "Product",
        id,
      }));
    },
  },
};