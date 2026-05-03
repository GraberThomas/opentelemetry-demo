/**
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import RecommendationGateway from "./grpc/recommendation-gateway.js";

export const resolvers = {
  Query: {
    recommendations: async (
      _: unknown,
      args: {
        userId: string;
        productIds: string[];
      }
    ) => {
      const response = await RecommendationGateway.listRecommendations(
        args.userId,
        args.productIds
      );

      return response.productIds;
    },
  },
};
